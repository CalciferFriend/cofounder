import * as p from "@clack/prompts";
import pc from "picocolors";
import { loadConfig } from "../config/store.ts";

export async function status() {
  const config = await loadConfig();

  if (!config) {
    p.log.error("No configuration found. Run `tj onboard` first.");
    return;
  }

  p.intro(pc.bgCyan(pc.black(" tj status ")));

  const thisNode = config.this_node;
  const peer = config.peer_node;

  p.log.info(`This node: ${thisNode.emoji ?? ""} ${thisNode.name} (${thisNode.role})`);
  p.log.info(`  Tailscale: ${thisNode.tailscale_hostname} (${thisNode.tailscale_ip})`);

  p.log.info(`Peer node: ${peer.emoji ?? ""} ${peer.name} (${peer.role})`);
  p.log.info(`  Tailscale: ${peer.tailscale_hostname} (${peer.tailscale_ip})`);

  // TODO: live connectivity check — ping peer, check gateway health, show last heartbeat

  p.outro("Status check complete.");
}
