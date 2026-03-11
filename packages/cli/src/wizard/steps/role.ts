import * as p from "@clack/prompts";
import { isCancelled, type WizardContext } from "../context.ts";

export async function stepRole(ctx: Partial<WizardContext>): Promise<Partial<WizardContext>> {
  const role = await p.select({
    message: "What role will this machine play?",
    options: [
      {
        value: "tom" as const,
        label: "🐱 Tom — Orchestrator",
        hint: "Always-on, delegates work, watches Jerry",
      },
      {
        value: "jerry" as const,
        label: "🐭 Jerry — Executor",
        hint: "Sleeps until needed, GPU/compute heavy lifting",
      },
    ],
  });

  if (isCancelled(role)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  p.log.info(`This machine will be ${role === "tom" ? "🐱 Tom (orchestrator)" : "🐭 Jerry (executor)"}.`);

  return { ...ctx, role };
}
