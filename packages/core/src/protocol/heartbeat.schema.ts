import { z } from "zod";

/**
 * TJHeartbeat — periodic liveness ping between paired nodes.
 */
export const TJHeartbeat = z.object({
  from: z.string(),
  role: z.enum(["tom", "jerry"]),
  tailscale_ip: z.string(),
  gateway_port: z.number().int().default(18789),
  gateway_healthy: z.boolean(),
  uptime_seconds: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});
export type TJHeartbeat = z.infer<typeof TJHeartbeat>;
