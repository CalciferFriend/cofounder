/**
 * Gateway bind mode helpers.
 * Determines which network interface the gateway listens on.
 */
export type BindMode = "loopback" | "tailscale" | "lan";

export function getBindAddress(mode: BindMode, tailscaleIP?: string): string {
  switch (mode) {
    case "loopback":
      return "127.0.0.1";
    case "tailscale":
      if (!tailscaleIP) throw new Error("Tailscale IP required for tailscale bind mode");
      return tailscaleIP;
    case "lan":
      return "0.0.0.0";
  }
}
