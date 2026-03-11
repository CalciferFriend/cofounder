import type { NodeRole } from "./schema.ts";

export const ROLE_DEFAULTS: Record<NodeRole, {
  emoji: string;
  persona: string;
  bindMode: "loopback" | "tailscale";
}> = {
  tom: {
    emoji: "🐱",
    persona: "Always-on orchestrator. Watches, delegates, never sleeps.",
    bindMode: "loopback",
  },
  jerry: {
    emoji: "🐭",
    persona: "High-powered executor. Wakes fast, works hard, disappears.",
    bindMode: "tailscale",
  },
};
