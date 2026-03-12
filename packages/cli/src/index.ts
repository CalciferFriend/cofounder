#!/usr/bin/env node
import { Command } from "commander";
import { onboard } from "./commands/onboard.ts";
import { pair } from "./commands/pair.ts";
import { status } from "./commands/status.ts";
import { wake } from "./commands/wake.ts";
import { send } from "./commands/send.ts";
import { doctor } from "./commands/doctor.ts";
import { heartbeat } from "./commands/heartbeat.ts";
import { result } from "./commands/result.ts";
import { taskStatus } from "./commands/task-status.ts";
import { loadConfig } from "./config/store.ts";

const program = new Command()
  .name("tj")
  .description("Tom & Jerry — two agents, separate machines, one command to wire them.")
  .version("0.1.0")
  // Default action when no subcommand given: onboard if unconfigured, status if already set up
  .action(async () => {
    const config = await loadConfig();
    if (!config) {
      await onboard();
    } else {
      await status();
    }
  });

program
  .command("onboard")
  .description("Run the setup wizard to configure this node and pair with a remote machine")
  .action(onboard);

program
  .command("pair")
  .description("Pair with a remote node using a 6-digit code")
  .requiredOption("--code <code>", "6-digit pairing code from the Tom node")
  .action(pair);

program
  .command("status")
  .description("Show both nodes, connectivity, and last heartbeat")
  .action(status);

program
  .command("wake")
  .description("Manually trigger Wake-on-LAN for the Jerry node")
  .action(wake);

program
  .command("send")
  .description("Send a task to the peer node")
  .argument("<task>", "Task description to send")
  .option("--wait", "Wait for the result before exiting")
  .option("--wait-timeout <seconds>", "Max seconds to wait for result (default: 300)", "300")
  .option("--no-state", "Skip writing task state to disk (fire-and-forget)")
  .action((task: string, opts: { wait?: boolean; waitTimeout?: string; state?: boolean }) => {
    return send(task, {
      wait: opts.wait,
      waitTimeoutSeconds: opts.waitTimeout,
      noState: opts.state === false,
    });
  });

program
  .command("result")
  .description("Record the result of a completed task (called by the peer after processing)")
  .argument("<task-id>", "Task ID (or prefix) to mark as complete")
  .argument("[output]", "Result output text")
  .option("--fail", "Mark task as failed instead of completed")
  .option("--output-file <path>", "Read output from a file instead of inline")
  .option("--json <json>", "Full TaskResult JSON payload")
  .option("--tokens <n>", "Number of tokens used")
  .option("--duration-ms <ms>", "Processing duration in milliseconds")
  .option("--artifact <path>", "Add an artifact path (repeatable)", (v: string, prev: string[]) => [...prev, v], [] as string[])
  .action((taskId: string, output: string | undefined, opts: {
    fail?: boolean;
    outputFile?: string;
    json?: string;
    tokens?: string;
    durationMs?: string;
    artifact?: string[];
  }) => {
    return result(taskId, output, {
      fail: opts.fail,
      outputFile: opts.outputFile,
      json: opts.json,
      tokens: opts.tokens,
      durationMs: opts.durationMs,
      artifacts: opts.artifact,
    });
  });

program
  .command("heartbeat")
  .description("Check or send a liveness heartbeat to the peer node")
  .argument("[action]", "Action: send | show | record (default: show)", "show")
  .option("--from <name>", "Peer name (used with record)")
  .option("--at <iso>", "Timestamp to record (used with record, default: now)")
  .action((action: string, opts: { from?: string; at?: string }) => {
    return heartbeat(action as "send" | "show" | "record", opts);
  });

program
  .command("task-status")
  .aliases(["tasks", "ts"])
  .description("Show status of sent tasks")
  .argument("[id]", "Task ID or prefix to inspect (omit for list)")
  .action(taskStatus);

program
  .command("doctor")
  .description("Diagnose connectivity and configuration issues")
  .action(doctor);

program.parseAsync();
