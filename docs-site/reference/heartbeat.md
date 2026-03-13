# `hh heartbeat`

Manage and display heartbeat state for the H1/H2 pair. Heartbeats are lightweight liveness pings that let each agent verify the other is awake, healthy, and reachable.

## Usage

```bash
hh heartbeat           # show last heartbeat (default)
hh heartbeat show      # same as above
hh heartbeat send      # send a heartbeat to peer
hh heartbeat record --from <name> --at <iso>  # record an incoming heartbeat
```

## Subcommands

### `hh heartbeat show` (default)

Display the timestamp and status of the last heartbeat received from your peer.

```
Last heartbeat from GLaDOS: 4m ago (11:37:22 PM)
Gateway: healthy
Uptime: 3h 12m
Model: llama3.2:3b (local)
Tailscale IP: 100.x.x.x
```

### `hh heartbeat send`

Build a `HHHeartbeatMessage` and deliver it to the configured peer via `wakeAgent`. Includes:

- Whether our local gateway `/health` is live
- Process uptime (seconds)
- Our Tailscale IP
- Configured LLM model
- GPU availability flag

The receiving agent's OpenClaw session reads the heartbeat and can call `hh heartbeat record` to update its own config.

### `hh heartbeat record`

Record a heartbeat from an incoming wake message. Typically called by the receiving agent's session after parsing the wake text — not usually called manually.

```bash
hh heartbeat record --from GLaDOS --at 2026-03-13T22:37:22.000Z
```

| Flag | Description |
|------|-------------|
| `--from <name>` | Name of the sending node |
| `--at <iso>` | ISO 8601 timestamp of the heartbeat |

## How heartbeats flow

```
H1 (Calcifer 🔥)                            H2 (GLaDOS 🤖)
─────────────────                            ─────────────────
hh heartbeat send →                         ← wakeAgent delivers heartbeat text
                                             Session parses "[HHHeartbeat from ...]"
                                             hh heartbeat record --from Calcifer --at ...
                                             ← config updated: last_heartbeat = now
H1: hh status shows "last heartbeat: X ago"
```

## Heartbeat payload

The heartbeat is delivered as a human-readable wake text (so the peer's OpenClaw session can parse it) with a structured prefix:

```
[HHHeartbeat from Calcifer] gateway=true uptime=11572s model=claude-sonnet-4 ip=100.x.x.x at=2026-03-13T22:00:00.000Z
```

This is also a valid `HHHeartbeatMessage` in the discriminated union (`type: "heartbeat"`).

## Automatic heartbeats

Heartbeats are typically sent on a cron schedule, not manually. Add to your OpenClaw cron config:

```json
{
  "schedule": "*/30 * * * *",
  "task": "hh heartbeat send"
}
```

Or use `hh schedule add` to set a recurring heartbeat from H1 to H2.

## What `hh status` shows

`hh status` reads `last_heartbeat` from config and displays a human-readable age:

```
Last heartbeat: 4 minutes ago
```

If the age exceeds a threshold (e.g. >1h), status will warn that H2 may be offline.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success (show/send/record completed normally) |
| `1` | Config not found, peer not configured, or delivery failed |

## See also

- [`hh status`](/reference/status) — full peer health check including heartbeat age
- [`hh send`](/reference/send) — send a task (includes implicit reachability check)
- [`hh watch`](/reference/watch) — H2 daemon (receives tasks and can trigger heartbeat responses)
- [`hh schedule`](/reference/schedule) — set up recurring heartbeat crons
