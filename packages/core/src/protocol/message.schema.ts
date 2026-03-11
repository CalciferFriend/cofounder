import { z } from "zod";

export const TJMessageType = z.enum([
  "task",
  "result",
  "heartbeat",
  "handoff",
  "wake",
  "error",
]);
export type TJMessageType = z.infer<typeof TJMessageType>;

/**
 * TJMessage — the open protocol envelope.
 * Every cross-machine communication is wrapped in this format.
 */
export const TJMessage = z.object({
  version: z.string().default("0.1.0"),
  id: z.string().uuid(),
  from: z.string(),
  to: z.string(),
  turn: z.number().int().nonnegative(),
  type: TJMessageType,
  payload: z.string(),
  context_summary: z.string().nullable().default(null),
  budget_remaining: z.number().nullable().default(null),
  done: z.boolean().default(false),
  wake_required: z.boolean().default(false),
  shutdown_after: z.boolean().default(false),
  timestamp: z.string().datetime(),
});
export type TJMessage = z.infer<typeof TJMessage>;
