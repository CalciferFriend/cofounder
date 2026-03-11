import { z } from "zod";

export const NodeRole = z.enum(["tom", "jerry"]);
export type NodeRole = z.infer<typeof NodeRole>;

export const WOLConfig = z.object({
  enabled: z.boolean().default(false),
  mac: z.string().optional(),
  broadcast_ip: z.string().optional(),
  router_port: z.number().int().default(9),
  wait_timeout_seconds: z.number().int().default(120),
  poll_interval_seconds: z.number().int().default(2),
  health_endpoint: z.string().optional(),
});

export const GatewayConfig = z.object({
  port: z.number().int().default(18789),
  bind: z.enum(["tailscale", "loopback", "lan"]).default("tailscale"),
  auth_token_key: z.string().optional(),
});

export const NodeConfig = z.object({
  role: NodeRole,
  name: z.string(),
  emoji: z.string().optional(),
  persona: z.string().optional(),
  tailscale_hostname: z.string(),
  tailscale_ip: z.string(),
});

export const PeerNodeConfig = NodeConfig.extend({
  ssh_user: z.string(),
  ssh_key_path: z.string(),
  os: z.enum(["linux", "windows", "macos"]).default("linux"),
  windows_autologin_configured: z.boolean().optional(),
  wol: WOLConfig.optional(),
  gateway: GatewayConfig.optional(),
});

export const PairState = z.object({
  established_at: z.string().datetime(),
  pairing_code_hash: z.string(),
  trusted: z.boolean().default(false),
  last_handshake: z.string().datetime().optional(),
  last_heartbeat: z.string().datetime().optional(),
});

export const ProtocolConfig = z.object({
  heartbeat_interval_seconds: z.number().int().default(60),
  handoff_turn_limit: z.number().int().optional(),
  handoff_done_signal: z.string().default("DONE"),
  message_format: z.enum(["json", "markdown"]).default("json"),
});

export const TJConfig = z.object({
  version: z.string().default("0.1.0"),
  this_node: NodeConfig,
  peer_node: PeerNodeConfig,
  pair: PairState.optional(),
  protocol: ProtocolConfig.optional(),
  openclaw: z.object({
    session_tom: z.string().optional(),
    session_jerry: z.string().optional(),
  }).optional(),
});
export type TJConfig = z.infer<typeof TJConfig>;
