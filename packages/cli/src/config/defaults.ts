import type { NodeRole } from "./schema.ts";

export const ROLE_DEFAULTS: Record<NodeRole, {
  emoji: string;
  persona: string;
  bindMode: "loopback" | "tailscale";
}> = {
  h1: {
    emoji: "🐱",
    persona: "Always-on orchestrator. Watches, delegates, never sleeps.",
    bindMode: "loopback",
  },
  h2: {
    emoji: "🐭",
    persona: "High-powered executor. Wakes fast, works hard, disappears.",
    bindMode: "tailscale",
  },
};
