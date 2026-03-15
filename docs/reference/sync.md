# `hh sync` — Push Local Files to H2

Push a local file or directory to the H2 peer over Tailscale SSH using `rsync`.
Useful for keeping a working directory in sync before delegating a task, sharing
data files, or live-editing code on H2 with `--watch`.

**Phase 7b** — implemented 2026-03-15.

---

## Usage

```sh
hh sync <path> [options]
```

---

## Examples

```sh
# Sync a project directory to ~/project on H2
hh sync ./project

# Sync to an explicit remote destination
hh sync ./data --dest /mnt/data

# Preview what would transfer without writing anything
hh sync . --dry-run

# Delete remote files that no longer exist locally
hh sync ./src --delete

# Watch for local changes and re-sync automatically
hh sync ./workspace --watch

# Target a specific peer in a multi-H2 setup
hh sync ./repo --peer piper

# Sync before sending a task (hh send flag)
hh send "run tests on the latest code" --sync ./project
```

---

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--dest <path>` | `~/basename` | Remote destination path on H2 |
| `--peer <name>` | primary peer | Target peer node by name |
| `--dry-run` | false | Show what would transfer without writing |
| `--delete` | false | Remove remote files not present locally |
| `--watch` | false | Re-sync automatically on local file changes |
| `--watch-interval <ms>` | `1000` | Debounce interval for `--watch` mode |

---

## How It Works

`hh sync` wraps `rsync` with an SSH transport over Tailscale. It builds the
following rsync invocation:

```
rsync -az --stats --human-readable \
  -e "ssh -i <key> -o StrictHostKeyChecking=no -o BatchMode=yes" \
  [--dry-run] [--delete] \
  <local-path>/ \
  <ssh_user>@<tailscale_ip>:<remote-dest>
```

Key details:

- **Trailing slash** is appended to directory sources automatically so rsync
  mirrors the contents of the directory (not a subdirectory named after it).
- **SSH key** is sourced from `peer_node.ssh_key_path` in your `~/.his-and-hers/config.json`.
  If not set, rsync uses SSH agent / default key discovery.
- **`--stats`** is always passed to collect file/byte counts for the summary output.
- **`--delete`** is destructive — it removes files on H2 that don't exist locally.
  Use `--dry-run` first to preview.

---

## `--watch` mode

With `--watch`, `hh sync` performs an initial sync, then monitors the local path
with `fs.watch()` (recursive). Any file change triggers a debounced re-sync after
the configured interval (default 1 s). Press **Ctrl-C** to stop.

```
$ hh sync ./workspace --watch
◆ watch  /home/nic/workspace → nic@100.119.44.38:~/workspace
  Syncing now, then watching for changes. Ctrl-C to stop.
✓ Initial sync complete — 47 files in 312ms
[10:15:32] ↑ 2 files synced
[10:17:44] ↑ 1 file synced
^C
◇ Watch stopped.
```

---

## Sending with `--sync`

The `--sync <path>` flag on `hh send` runs `hh sync` immediately before
dispatching the task. Sync failure is **non-fatal**: a warning is printed and
the send continues.

```sh
hh send "run the test suite" --sync ./project --peer glados --wait
```

Flow:
1. Sync `./project` → H2 (rsync over SSH)
2. Deliver task message to H2 via OpenClaw gateway
3. Wait for result (with `--wait`)

---

## Output

```
◇ sync  /home/nic/project → nic@100.119.44.38:~/project
✓ Sync complete — 12 files, 438ms
◇ /home/nic/project → glados:~/project
```

With `--dry-run`:

```
◇ sync [dry-run]  /home/nic/project → nic@100.119.44.38:~/project
✓ Dry run complete — 12 files, 52ms
◇ /home/nic/project → glados:~/project
```

---

## Requirements

- `rsync` must be installed on H1 (the machine running `hh sync`)
- The H2 peer must be reachable via Tailscale SSH
- `ssh_user` and `tailscale_ip` must be set in `~/.his-and-hers/config.json`

> **Note:** `hh sync` does **not** wake H2 from sleep before syncing.
> If H2 may be asleep, run `hh wake` first or use `hh send --sync <path>` which
> goes through the full wake + health-check flow.

---

## SyncResult (programmatic API via `@his-and-hers/sdk`)

```ts
import { sync } from "@his-and-hers/sdk";

const result = await sync("./project", { dryRun: true });
// {
//   ok: true,
//   localPath: "/home/nic/project",
//   remotePath: "~/project",
//   peer: "glados",
//   dryRun: true,
//   filesTransferred: 12,
//   bytesTransferred: 256000,
//   durationMs: 52,
// }
```

---

## See Also

- [`hh send`](./cli.md#hh-send) — send a task to H2 (supports `--sync`)
- [`hh broadcast`](./broadcast.md) — send the same task to multiple peers
- [`hh peers`](./cli.md#hh-peers) — list configured peer nodes
- [Calcifer / GLaDOS reference setup](./calcifer-glados.md)
