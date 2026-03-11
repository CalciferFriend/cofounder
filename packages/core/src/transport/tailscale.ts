import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface TailscaleStatus {
  online: boolean;
  hostname: string;
  tailscaleIP: string;
}

/**
 * Get local Tailscale status.
 */
export async function getTailscaleStatus(): Promise<TailscaleStatus> {
  try {
    const { stdout } = await execFileAsync("tailscale", ["status", "--json"]);
    const status = JSON.parse(stdout);
    return {
      online: status.BackendState === "Running",
      hostname: status.Self?.HostName ?? "",
      tailscaleIP: status.TailscaleIPs?.[0] ?? "",
    };
  } catch {
    return { online: false, hostname: "", tailscaleIP: "" };
  }
}

/**
 * Ping a Tailscale peer to check reachability.
 * Returns true if the peer responds within timeout.
 */
export async function pingPeer(
  ip: string,
  timeoutMs = 5000,
): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("tailscale", ["ping", "--c", "1", "--timeout", `${Math.ceil(timeoutMs / 1000)}s`, ip]);
    return stdout.includes("pong");
  } catch {
    return false;
  }
}

/**
 * Poll a Tailscale peer until it's reachable or we time out.
 */
export async function waitForPeer(
  ip: string,
  { intervalMs = 2000, maxAttempts = 60 } = {},
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await pingPeer(ip)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
