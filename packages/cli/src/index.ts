#!/usr/bin/env node
import { Command } from "commander";
import { onboard } from "./commands/onboard.ts";
import { pair } from "./commands/pair.ts";
import { status } from "./commands/status.ts";
import { wake } from "./commands/wake.ts";
import { send } from "./commands/send.ts";
import { doctor } from "./commands/doctor.ts";
import { loadConfig } from "./config/store.ts";

const program = new Command()
  .name("tj")
  .description("Tom & Jerry — two agents, separate machines, one command to wire them.")
  .version("0.1.0")
  // Default action when no subcommand given: onboard if unconfigured, status if already set up
  .action(async () => {
    const config = await loadConfig();
    if (!config) {
      await onboard();
    } else {
      await status();
    }
  });

program
  .command("onboard")
  .description("Run the setup wizard to configure this node and pair with a remote machine")
  .action(onboard);

program
  .command("pair")
  .description("Pair with a remote node using a 6-digit code")
  .requiredOption("--code <code>", "6-digit pairing code from the Tom node")
  .action(pair);

program
  .command("status")
  .description("Show both nodes, connectivity, and last heartbeat")
  .action(status);

program
  .command("wake")
  .description("Manually trigger Wake-on-LAN for the Jerry node")
  .action(wake);

program
  .command("send")
  .description("Send a task to the peer node")
  .argument("<task>", "Task description to send")
  .action(send);

program
  .command("doctor")
  .description("Diagnose connectivity and configuration issues")
  .action(doctor);

program.parseAsync();
