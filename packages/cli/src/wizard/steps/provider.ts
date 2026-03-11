import * as p from "@clack/prompts";
import { isCancelled, type WizardContext } from "../context.ts";

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)", hint: "recommended" },
  { value: "openai", label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "local", label: "Local (Ollama / vLLM)", hint: "no API key needed" },
  { value: "other", label: "Other" },
] as const;

async function tryStoreInKeychain(service: string, account: string, password: string): Promise<boolean> {
  try {
    const keytar = await import("keytar");
    await keytar.default.setPassword(service, account, password);
    return true;
  } catch {
    return false;
  }
}

export async function stepProvider(ctx: Partial<WizardContext>): Promise<Partial<WizardContext>> {
  const provider = await p.select({
    message: "LLM provider for this node",
    options: [...PROVIDERS],
  });

  if (isCancelled(provider)) {
    p.cancel("Setup cancelled.");
    process.exit(0);
  }

  let apiKeyStored = false;

  if (provider !== "local") {
    const apiKey = await p.password({
      message: `API key for ${provider}`,
      validate: (v) => {
        if (!v.trim()) return "API key is required (or choose Local provider)";
      },
    });

    if (isCancelled(apiKey)) {
      p.cancel("Setup cancelled.");
      process.exit(0);
    }

    const spinner = p.spinner();
    spinner.start("Storing API key in OS keychain...");

    apiKeyStored = await tryStoreInKeychain("tom-and-jerry", `${provider}-api-key`, apiKey);

    if (apiKeyStored) {
      spinner.stop("API key stored in OS keychain.");
    } else {
      spinner.stop("Could not access OS keychain — keytar may need native build.");
      p.log.warn(
        "Falling back to environment variable. Set TJ_API_KEY in your shell profile.\n" +
        "Install keytar native dependencies for secure storage: pnpm approve-builds",
      );
    }
  } else {
    p.log.info("Local provider selected — no API key needed.");
    apiKeyStored = true;
  }

  return { ...ctx, provider: provider as string, apiKeyStored };
}
