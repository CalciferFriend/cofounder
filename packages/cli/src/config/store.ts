import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { TJConfig } from "./schema.ts";

const CONFIG_DIR = join(homedir(), ".tom-and-jerry");
const CONFIG_PATH = join(CONFIG_DIR, "tj.json");

/**
 * Load config from ~/.tom-and-jerry/tj.json
 */
export async function loadConfig(): Promise<TJConfig | null> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return TJConfig.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Save config to ~/.tom-and-jerry/tj.json with restrictive permissions.
 */
export async function saveConfig(config: TJConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

/**
 * Get the config path for display purposes.
 */
export function getConfigPath(): string {
  return CONFIG_PATH;
}
