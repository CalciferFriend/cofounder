/**
 * gateway/proxy.ts
 *
 * Tailscale→Loopback TCP proxy for Tom nodes.
 *
 * Problem: OpenClaw's local tools (message, cron, sessions) expect the gateway
 * on loopback (127.0.0.1:18789). But Jerry needs to reach Tom via Tom's
 * Tailscale IP. Binding Tom's gateway to tailscale breaks local tools.
 *
 * Solution: Keep Tom's gateway on loopback. Run a socat proxy that forwards
 * Tom's Tailscale IP:18789 → 127.0.0.1:18789.
 *
 * Architecture:
 *
 *   GLaDOS (Jerry)                              Calcifer (Tom)
 *   ──────────────                              ──────────────
 *   send-to-agent.js                            socat proxy
 *   ws://100.116.25.69:18789 ─── Tailscale ──► :18789 (Tailscale IF)
 *                                                   │
 *                                               forwards to
 *                                                   │
 *                                              127.0.0.1:18789
 *                                              (OpenClaw gateway)
 *
 * The systemd user service that runs this:
 *   ~/.config/systemd/user/calcifer-tailnet-proxy.service
 *
 * Command:
 *   socat TCP-LISTEN:18789,bind=<tailscale-ip>,reuseaddr,fork TCP:127.0.0.1:18789
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ProxyConfig {
  /** Tom's Tailscale IP (e.g. 100.116.25.69) */
  tailscaleIP: string;
  /** Port to listen on and forward to (default: 18789) */
  port?: number;
}

/**
 * Returns the socat command that proxies the Tailscale interface to loopback.
 * This is what runs inside the systemd user service.
 */
export function buildSocatCommand(config: ProxyConfig): string {
  const port = config.port ?? 18789;
  return [
    "socat",
    `TCP-LISTEN:${port},bind=${config.tailscaleIP},reuseaddr,fork`,
    `TCP:127.0.0.1:${port}`,
  ].join(" ");
}

/**
 * Generates the content of the systemd user service file.
 */
export function buildSystemdService(config: ProxyConfig): string {
  const port = config.port ?? 18789;
  return `[Unit]
Description=Tom Tailscale→Loopback Gateway Proxy (port ${port})
After=network.target tailscaled.service openclaw-gateway.service
Requires=openclaw-gateway.service

[Service]
Type=simple
ExecStart=${buildSocatCommand(config)}
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
`;
}

/**
 * Checks whether socat is installed on the current system.
 */
export async function isSocatInstalled(): Promise<boolean> {
  try {
    await execAsync("which socat");
    return true;
  } catch {
    return false;
  }
}
