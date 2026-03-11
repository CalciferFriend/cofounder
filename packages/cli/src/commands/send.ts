import * as p from "@clack/prompts";
import { loadConfig } from "../config/store.ts";

export async function send(task: string) {
  const config = await loadConfig();

  if (!config) {
    p.log.error("No configuration found. Run `tj onboard` first.");
    return;
  }

  p.intro(`Sending task to ${config.peer_node.name}...`);

  // TODO: Phase 3
  // 1. Check if peer is awake (heartbeat / ping)
  // 2. If Jerry is sleeping and WOL enabled, wake first
  // 3. Construct TJMessage with type "task"
  // 4. Send via SSH or gateway API
  // 5. Wait for result message
  // 6. Display result

  p.log.info(`Task: ${task}`);
  p.log.warn("Send flow not yet implemented — coming in Phase 3.");
  p.outro("Done.");
}
