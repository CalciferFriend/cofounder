/**
 * commands/send.ts — `tj send <task>`
 *
 * Send a task to the peer node.
 *
 * Flow:
 *   1. Check if peer is awake (Tailscale ping)
 *   2. If offline and WOL configured → send magic packet, wait for boot
 *   3. Verify peer gateway is healthy
 *   4. Build TJTaskMessage, write pending task state
 *   5. Deliver via wakeAgent (injects into peer's OpenClaw session)
 *   6. If --wait: poll ~/.tom-and-jerry/state/tasks/<id>.json for result
 *
 * Result delivery:
 *   After the peer (GLaDOS) completes the task, it calls:
 *     tj result <task-id> "output text here"
 *   …which updates the task state file. Tom's --wait poll picks it up.
 *
 *   GLaDOS can deliver this via SSH, socat, or via wakeAgent injection that
 *   triggers Calcifer to run the command.
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { loadConfig } from "../config/store.ts";
import { wakeAgent } from "@tom-and-jerry/core";
import { pingPeer } from "@tom-and-jerry/core";
import { checkGatewayHealth } from "@tom-and-jerry/core";
import { sendMagicPacket, wakeAndWait } from "@tom-and-jerry/core";
import { suggestRouting } from "@tom-and-jerry/core";
import { createTaskMessage } from "@tom-and-jerry/core";
import { createTaskState, pollTaskCompletion } from "../state/tasks.ts";
import { buildContextSummary } from "@tom-and-jerry/core";
import { getPeer, selectBestPeer, formatPeerList } from "../peers/select.ts";

const WAKE_TIMEOUT_ATTEMPTS = 45; // 45 × 2s = 90s max
const WAKE_POLL_MS = 2000;

export interface SendOptions {
  wait?: boolean;
  waitTimeoutSeconds?: string;
  noState?: boolean;
  /** Target a specific peer by name (for multi-Jerry setups) */
  peer?: string;
  /** Auto-select best peer based on task + capabilities (ignores --peer) */
  auto?: boolean;
}

export async function send(task: string, opts: SendOptions = {}) {
  const config = await loadConfig();

  if (!config) {
    p.log.error("No configuration found. Run `tj onboard` first.");
    return;
  }

  // Resolve target peer: --auto selects by capability, --peer selects by name,
  // otherwise falls back to primary peer_node.
  let peer;
  try {
    if (opts.auto) {
      peer = await selectBestPeer(config, task);
      p.log.info(pc.dim(`Auto-selected peer: ${peer.emoji ?? ""} ${peer.name}`));
    } else {
      peer = getPeer(config, opts.peer);
    }
  } catch (err) {
    p.log.error(String(err));
    if ((config.peer_nodes ?? []).length > 0) {
      p.log.info(`Available peers:\n${formatPeerList(config)}`);
    }
    p.outro("Send failed.");
    return;
  }

  p.intro(`${pc.bold("Sending task")} → ${peer.emoji ?? ""} ${peer.name}`);
  p.log.info(`Task: ${pc.italic(task)}`);

  // Routing hint
  const routing = suggestRouting(task);
  if (routing === "jerry-local") {
    p.log.info(`Routing hint: ${pc.yellow("heavy task")} → recommended for ${peer.name} (local GPU)`);
  }

  // Step 1: check if peer is awake
  const s = p.spinner();
  s.start(`Checking if ${peer.name} is reachable...`);
  const reachable = await pingPeer(peer.tailscale_ip, 5000);

  if (!reachable) {
    if (peer.wol_enabled && peer.wol_mac && peer.wol_broadcast) {
      s.stop(pc.yellow(`${peer.name} is offline — sending Wake-on-LAN...`));

      const wakeS = p.spinner();
      wakeS.start(`Sending magic packet to ${peer.wol_mac}...`);
      const peerPort = peer.gateway_port ?? 18789;
      const healthEndpoint = `http://${peer.tailscale_ip}:${peerPort}/health`;

      const woke = await wakeAndWait(
        { mac: peer.wol_mac, broadcastIP: peer.wol_broadcast },
        peer.tailscale_ip,
        healthEndpoint,
        { pollIntervalMs: WAKE_POLL_MS, maxAttempts: WAKE_TIMEOUT_ATTEMPTS },
      );

      if (!woke) {
        wakeS.stop(pc.red(`✗ ${peer.name} didn't come online in time`));
        p.outro("Send failed. Try again once the node is running.");
        return;
      }
      wakeS.stop(pc.green(`✓ ${peer.name} is online`));
    } else {
      s.stop(pc.red(`✗ ${peer.name} is offline and WOL is not configured`));
      p.log.warn(`Start ${peer.name} manually and try again.`);
      p.outro("Send failed.");
      return;
    }
  } else {
    s.stop(pc.green(`✓ ${peer.name} is reachable`));
  }

  // Step 2: check gateway is up
  const gwS = p.spinner();
  gwS.start("Checking peer gateway...");
  const peerPort = peer.gateway_port ?? 18789;
  const gwHealthy = await checkGatewayHealth(
    `http://${peer.tailscale_ip}:${peerPort}/health`,
  );
  if (!gwHealthy) {
    gwS.stop(pc.yellow("Gateway not responding yet — waiting up to 30s..."));
    let ready = false;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      ready = await checkGatewayHealth(
        `http://${peer.tailscale_ip}:${peerPort}/health`,
      );
      if (ready) break;
    }
    if (!ready) {
      gwS.stop(pc.red("Gateway didn't become healthy in time"));
      p.outro("Send failed.");
      return;
    }
  }
  gwS.stop(pc.green("✓ Gateway ready"));

  // Step 3: build TJTaskMessage (attach context summary for multi-turn continuity)
  const contextSummary = await buildContextSummary(peer.name, 3).catch(() => null);
  if (contextSummary) {
    p.log.info(pc.dim(`Context: ${contextSummary.split("\n")[0]}`));
  }
  const msg = createTaskMessage(config.this_node.name, peer.name, {
    objective: task,
    constraints: [],
  }, { context_summary: contextSummary });

  // Step 4: write pending task state (unless --no-state)
  if (!opts.noState) {
    await createTaskState({
      id: msg.id,
      from: msg.from,
      to: msg.to,
      objective: task,
      constraints: [],
      routing_hint: routing,
    });
    p.log.info(`Task ID: ${pc.cyan(msg.id.slice(0, 8))} (full: ${pc.dim(msg.id)})`);
    p.log.info(pc.dim(`  State: ~/.tom-and-jerry/state/tasks/${msg.id}.json`));
  }

  // Step 5: deliver via wakeAgent
  const sendS = p.spinner();
  sendS.start("Delivering task...");
  if (!peer.gateway_token) {
    p.log.error("Peer gateway token not set. Run `tj pair` first.");
    p.outro("Send failed.");
    return;
  }

  const wakeText =
    `[TJMessage:task from ${msg.from} id=${msg.id}] ${task}` +
    `\n\nWhen done, run: tj result ${msg.id} "<your output here>"`;

  const deliveryResult = await wakeAgent({
    url: `ws://${peer.tailscale_ip}:${peerPort}`,
    token: peer.gateway_token,
    text: wakeText,
    mode: "now",
  });

  if (deliveryResult.ok) {
    sendS.stop(pc.green(`✓ Task delivered to ${peer.name}`));
  } else {
    sendS.stop(pc.red(`✗ Delivery failed: ${deliveryResult.error}`));
    p.outro("Send failed.");
    return;
  }

  // Step 6: wait for result if --wait flag
  if (opts.wait) {
    const timeoutMs = opts.waitTimeoutSeconds
      ? parseInt(opts.waitTimeoutSeconds, 10) * 1000
      : 300_000;

    p.log.info(
      pc.dim(
        `Waiting for result (timeout: ${timeoutMs / 1000}s). Press Ctrl+C to detach.`,
      ),
    );

    const waitS = p.spinner();
    waitS.start(`Waiting for ${peer.name} to complete task...`);

    const finalState = await pollTaskCompletion(msg.id, {
      timeoutMs,
      pollIntervalMs: 3000,
    });

    if (!finalState) {
      waitS.stop(pc.red("Task state lost — the state file may have been removed."));
    } else if (finalState.status === "timeout") {
      waitS.stop(pc.yellow("Timed out waiting for result. Task is still pending."));
      p.log.info(`Check later with: ${pc.cyan(`tj task-status ${msg.id}`)}`);
    } else if (finalState.status === "completed") {
      waitS.stop(pc.green("✓ Task completed!"));
      p.log.info(`\n${pc.bold("Result:")}`);
      p.log.info(finalState.result?.output ?? "(empty output)");
      if (finalState.result?.artifacts && finalState.result.artifacts.length > 0) {
        p.log.info(`Artifacts: ${finalState.result.artifacts.join(", ")}`);
      }
      if (finalState.result?.tokens_used) {
        p.log.info(pc.dim(`Tokens used: ${finalState.result.tokens_used.toLocaleString()}`));
      }
    } else if (finalState.status === "failed") {
      waitS.stop(pc.red("Task failed."));
      p.log.error(finalState.result?.error ?? finalState.result?.output ?? "Unknown error");
    }

    p.outro("Done.");
  } else {
    p.log.info(pc.dim(`To wait for result: tj send --wait "${task}"`));
    p.log.info(pc.dim(`To check status:   tj task-status ${msg.id.slice(0, 8)}`));
    p.outro("Task sent.");
  }
}
