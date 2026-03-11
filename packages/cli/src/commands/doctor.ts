import * as p from "@clack/prompts";
import pc from "picocolors";
import { loadConfig } from "../config/store.ts";
import {
  getTailscaleStatus,
  pingPeer,
  testSSH,
  checkGatewayHealth,
} from "@tom-and-jerry/core";

export async function doctor() {
  p.intro(pc.bgCyan(pc.black(" tj doctor ")));

  const config = await loadConfig();
  if (!config) {
    p.log.error("No configuration found. Run `tj onboard` first.");
    return;
  }

  const checks: { name: string; pass: boolean }[] = [];

  // 1. Tailscale status
  const ts = await getTailscaleStatus();
  checks.push({ name: "Tailscale running", pass: ts.online });

  // 2. Peer reachable via Tailscale
  const peerReachable = await pingPeer(config.peer_node.tailscale_ip);
  checks.push({ name: "Peer reachable (Tailscale ping)", pass: peerReachable });

  // 3. SSH connectivity
  const sshOk = await testSSH({
    host: config.peer_node.tailscale_ip,
    user: config.peer_node.ssh_user,
    keyPath: config.peer_node.ssh_key_path,
  });
  checks.push({ name: "SSH to peer", pass: sshOk });

  // 4. Gateway health
  const gwPort = config.peer_node.gateway?.port ?? 18789;
  const gwEndpoint = `http://${config.peer_node.tailscale_ip}:${gwPort}/health`;
  const gwOk = await checkGatewayHealth(gwEndpoint);
  checks.push({ name: "Peer gateway healthy", pass: gwOk });

  // Print results
  for (const check of checks) {
    const icon = check.pass ? pc.green("✓") : pc.red("✗");
    p.log.info(`${icon} ${check.name}`);
  }

  const allPassed = checks.every((c) => c.pass);
  if (allPassed) {
    p.outro(pc.green("All checks passed."));
  } else {
    p.outro(pc.red("Some checks failed. Review the output above."));
  }
}
