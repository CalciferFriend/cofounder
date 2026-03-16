/**
 * commands/context.ts — `hh context` subcommand
 *
 * Manage per-peer context history stored in `~/.his-and-hers/context/`.
 *
 * Subcommands:
 *   hh context list                — list all peers with stored context
 *   hh context show <peer>         — print all context entries for a peer
 *   hh context clear <peer>        — clear context for a peer
 *   hh context prune [--days <n>]  — delete entries older than N days
 */

import * as p from "@clack/prompts";
import pc from "picocolors";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  loadContextEntries,
  clearContextEntries,
  type ContextEntry,
} from "@his-and-hers/core/context/store.ts";
import { writeFile } from "node:fs/promises";

const CONTEXT_DIR = join(homedir(), ".his-and-hers", "context");

// ─── List peers with stored context ──────────────────────────────────────────

export async function contextList(): Promise<void> {
  p.intro(pc.bold(pc.cyan("hh context list")));

  try {
    const files = await readdir(CONTEXT_DIR).catch(() => [] as string[]);
    const contextFiles = files.filter((f) => f.endsWith(".json"));

    if (contextFiles.length === 0) {
      p.log.info("No peers with stored context.");
      p.outro(pc.dim("Context is saved when you use `hh send --wait` or `hh chat`."));
      return;
    }

    const peerInfos: Array<{
      peer: string;
      entries: number;
      mostRecent: string | null;
    }> = [];

    for (const file of contextFiles) {
      const peerName = file.replace(/_/g, " ").replace(/\.json$/, "");
      const entries = await loadContextEntries(peerName);
      const mostRecent =
        entries.length > 0 ? entries[entries.length - 1].created_at : null;
      peerInfos.push({ peer: peerName, entries: entries.length, mostRecent });
    }

    // Sort by most recent first
    peerInfos.sort((a, b) => {
      if (!a.mostRecent) return 1;
      if (!b.mostRecent) return -1;
      return new Date(b.mostRecent).getTime() - new Date(a.mostRecent).getTime();
    });

    console.log("");
    for (const { peer, entries, mostRecent } of peerInfos) {
      const timestamp = mostRecent
        ? new Date(mostRecent).toLocaleString()
        : pc.dim("never");
      console.log(
        `  ${pc.bold(peer)}  ${pc.dim("·")}  ${entries} ${entries === 1 ? "entry" : "entries"}  ${pc.dim("·")}  ${timestamp}`,
      );
    }
    console.log("");

    p.outro(pc.dim("Use `hh context show <peer>` to view entries."));
  } catch (error) {
    p.log.error("Failed to list context files.");
    console.error(error);
    process.exitCode = 1;
  }
}

// ─── Show context entries for a peer ─────────────────────────────────────────

export async function contextShow(peerName: string): Promise<void> {
  p.intro(pc.bold(pc.cyan(`hh context show ${peerName}`)));

  try {
    const entries = await loadContextEntries(peerName);

    if (entries.length === 0) {
      p.log.info(`No context stored for peer "${peerName}".`);
      p.outro(pc.dim("Context is saved when you use `hh send --wait` or `hh chat`."));
      return;
    }

    console.log("");
    console.log(pc.bold(`  ${entries.length} ${entries.length === 1 ? "entry" : "entries"} for ${peerName}:`));
    console.log("");

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const timestamp = new Date(entry.created_at).toLocaleString();
      console.log(pc.dim(`  [${i + 1}/${entries.length}] ${timestamp}`));
      console.log(pc.dim(`      Task ID: ${entry.task_id}`));
      console.log("");
      console.log(pc.italic(`      ${entry.summary.replace(/\n/g, "\n      ")}`));
      console.log("");
    }

    p.outro(pc.dim("Use `hh context clear <peer>` to delete all entries."));
  } catch (error) {
    p.log.error(`Failed to load context for "${peerName}".`);
    console.error(error);
    process.exitCode = 1;
  }
}

// ─── Clear context for a peer ────────────────────────────────────────────────

export async function contextClear(peerName: string): Promise<void> {
  p.intro(pc.bold(pc.cyan(`hh context clear ${peerName}`)));

  try {
    await clearContextEntries(peerName);
    p.log.success(`Context cleared for peer "${peerName}".`);
    p.outro(pc.dim("New context will be saved on the next `hh send --wait` or `hh chat`."));
  } catch (error) {
    p.log.error(`Failed to clear context for "${peerName}".`);
    console.error(error);
    process.exitCode = 1;
  }
}

// ─── Prune old context entries ───────────────────────────────────────────────

export async function contextPrune(days: number): Promise<void> {
  p.intro(pc.bold(pc.cyan(`hh context prune --days ${days}`)));

  try {
    const files = await readdir(CONTEXT_DIR).catch(() => [] as string[]);
    const contextFiles = files.filter((f) => f.endsWith(".json"));

    if (contextFiles.length === 0) {
      p.log.info("No context files to prune.");
      p.outro(pc.dim("Done."));
      return;
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let totalRemoved = 0;
    let filesModified = 0;

    for (const file of contextFiles) {
      const peerName = file.replace(/_/g, " ").replace(/\.json$/, "");
      const entries = await loadContextEntries(peerName);
      const before = entries.length;
      const filtered = entries.filter((e) => new Date(e.created_at) > cutoff);

      if (filtered.length < before) {
        const removed = before - filtered.length;
        totalRemoved += removed;
        filesModified++;
        // Write filtered entries back
        const contextPath = join(CONTEXT_DIR, file);
        await writeFile(contextPath, JSON.stringify(filtered, null, 2), { mode: 0o600 });
        p.log.step(
          `${pc.bold(peerName)}: removed ${removed} ${removed === 1 ? "entry" : "entries"} (${filtered.length} remaining)`,
        );
      }
    }

    if (totalRemoved === 0) {
      p.log.info("No entries older than the cutoff date.");
    } else {
      p.log.success(
        `Removed ${totalRemoved} ${totalRemoved === 1 ? "entry" : "entries"} from ${filesModified} ${filesModified === 1 ? "peer" : "peers"}.`,
      );
    }

    p.outro(pc.dim("Done."));
  } catch (error) {
    p.log.error("Failed to prune context entries.");
    console.error(error);
    process.exitCode = 1;
  }
}
