import * as p from "@clack/prompts";
import pc from "picocolors";
import { sshExec } from "@tom-and-jerry/core";
import { ROLE_DEFAULTS } from "../../config/defaults.ts";
import { isCancelled, type WizardContext } from "../context.ts";

export async function stepGatewayBind(ctx: Partial<WizardContext>): Promise<Partial<WizardContext>> {
  const role = ctx.role!;
  const defaults = ROLE_DEFAULTS[role];
  const peerDefaults = ROLE_DEFAULTS[role === "tom" ? "jerry" : "tom"];

  // This node's bind mode
  const thisBindMode = await p.select({
    message: `Gateway bind mode for this node (${ctx.name})`,
    initialValue: defaults.bindMode,
    options: [
      { value: "loopback" as const, label: "Loopback (127.0.0.1)", hint: "local only — safest for orchestrator" },
      { value: "tailscale" as const, label: "Tailscale IP", hint: "reachable by paired peer — required for executor" },
      { value: "lan" as const, label: "LAN (0.0.0.0)", hint: "reachable by anyone on LAN — use with caution" },
    ],
  });

  if (isCancelled(thisBindMode)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  // Peer's gateway port
  const peerGatewayPort = await p.text({
    message: "Gateway port on the peer node",
    initialValue: "18789",
    validate: (v) => {
      const n = parseInt(v, 10);
      if (isNaN(n) || n < 1 || n > 65535) return "Enter a valid port";
    },
  });

  if (isCancelled(peerGatewayPort)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  // If Tom is setting up and peer is reachable, offer to update peer's gateway config via SSH
  const peerBindMode = peerDefaults.bindMode;

  if (role === "tom" && ctx.peerTailscaleIP) {
    const updatePeer = await p.confirm({
      message: `Update the peer's gateway bind to "${peerBindMode}" and add this node's Tailscale IP to trustedProxies?`,
      initialValue: true,
    });

    if (isCancelled(updatePeer)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    if (updatePeer) {
      const spinner = p.spinner();
      spinner.start("Updating peer gateway config via SSH...");

      try {
        // Build a jq-like update command. Works on both Linux and Windows (via powershell).
        const peerOS = ctx.peerOS ?? "linux";

        if (peerOS === "windows") {
          // PowerShell command to update openclaw.json on Windows
          const psCmd = [
            `$f = "$env:USERPROFILE\\.openclaw\\openclaw.json"`,
            `$j = Get-Content $f -Raw | ConvertFrom-Json`,
            `if (-not $j.gateway) { $j | Add-Member -NotePropertyName gateway -NotePropertyValue ([PSCustomObject]@{}) }`,
            `$j.gateway | Add-Member -NotePropertyName bind -NotePropertyValue "tailscale" -Force`,
            `if (-not $j.gateway.tailscale) { $j.gateway | Add-Member -NotePropertyName tailscale -NotePropertyValue ([PSCustomObject]@{}) }`,
            `$j.gateway.tailscale | Add-Member -NotePropertyName mode -NotePropertyValue "on" -Force`,
            `$proxies = @("127.0.0.1", "${ctx.tailscaleIP}")`,
            `$j.gateway | Add-Member -NotePropertyName trustedProxies -NotePropertyValue $proxies -Force`,
            `$j | ConvertTo-Json -Depth 10 | Set-Content $f`,
          ].join("; ");

          await sshExec(
            { host: ctx.peerTailscaleIP, user: ctx.peerSSHUser!, keyPath: ctx.peerSSHKeyPath! },
            `powershell -Command "${psCmd.replace(/"/g, '\\"')}"`,
            15_000,
          );
        } else {
          // Linux/macOS — use node inline script (jq might not be available)
          const nodeCmd = `node -e "
            const fs = require('fs');
            const p = require('os').homedir() + '/.openclaw/openclaw.json';
            let j = {};
            try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch {}
            j.gateway = j.gateway || {};
            j.gateway.bind = 'tailscale';
            j.gateway.tailscale = { mode: 'on' };
            j.gateway.trustedProxies = ['127.0.0.1', '${ctx.tailscaleIP}'];
            fs.writeFileSync(p, JSON.stringify(j, null, 2));
          "`;

          await sshExec(
            { host: ctx.peerTailscaleIP, user: ctx.peerSSHUser!, keyPath: ctx.peerSSHKeyPath! },
            nodeCmd,
            15_000,
          );
        }

        spinner.stop(`${pc.green("✓")} Peer gateway updated: bind=tailscale, trustedProxies includes ${ctx.tailscaleIP}`);
      } catch (err) {
        spinner.stop(`${pc.yellow("!")} Could not update peer gateway config — you may need to do this manually.`);
        p.log.warn("Ensure the peer's openclaw.json has: gateway.bind = 'tailscale', gateway.trustedProxies includes this node's Tailscale IP.");
      }
    }
  }

  return {
    ...ctx,
    thisBindMode: thisBindMode as "loopback" | "tailscale" | "lan",
    peerBindMode: peerBindMode as "loopback" | "tailscale" | "lan",
    peerGatewayPort: parseInt(peerGatewayPort as string, 10),
  };
}
