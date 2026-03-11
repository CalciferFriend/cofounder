# tom-and-jerry

Two agents. Separate machines. One command to wire them.

[![CI](https://github.com/CalciferFriend/tom-and-jerry/actions/workflows/ci.yml/badge.svg)](https://github.com/CalciferFriend/tom-and-jerry/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/tom-and-jerry)](https://www.npmjs.com/package/tom-and-jerry)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

An open protocol and setup wizard for connecting two [OpenClaw](https://github.com/openclaw/openclaw) agents on physically separate machines.

**Tom** is the orchestrator — always-on, always watching, delegates work.
**Jerry** is the executor — sleeps until needed, wakes on demand, does the heavy lifting.

Tom can't catch Jerry but can't function without him. Jerry runs fast, disappears when done. The dynamic is the product.

## Quickstart

```bash
npx tom-and-jerry
```

Run that on each machine. The wizard handles everything — role selection, model provider, Tailscale pairing, Wake-on-LAN, gateway config, Windows AutoLogin, startup scripts. Under 10 minutes from zero to two agents talking.

**Requirements:** Node ≥ 22, [Tailscale](https://tailscale.com) installed on both machines, [OpenClaw](https://github.com/openclaw/openclaw) installed on both machines.

Or install globally:

```bash
npm install -g tom-and-jerry
tj          # wizard on first run, status thereafter
tj onboard  # explicit wizard
tj status   # show both nodes + connectivity
tj send "generate a hero image for the landing page"
```

## What the wizard does

`tj onboard` walks you through the full setup in 12 steps:

1. **Prerequisites** — checks Node >= 22, Tailscale running, OpenClaw installed
2. **Role** — Tom (orchestrator) or Jerry (executor)
3. **Identity** — agent name, emoji, persona
4. **LLM provider** — API key stored in OS keychain (never plaintext)
5. **Peer connection** — remote Tailscale hostname, SSH user/key, live connectivity test
6. **Wake-on-LAN** — MAC address, broadcast IP, router port forward (if Jerry sleeps)
7. **Gateway bind** — loopback for Tom, Tailscale interface for Jerry, remote config update via SSH
8. **Windows AutoLogin** — registry instructions for headless WOL boot (if Jerry is Windows)
9. **Startup script** — installs `start-gateway.bat/.sh` on Jerry (Startup folder + Scheduled Task on Windows, crontab on Linux)
10. **Templates** — personalized SOUL.md, IDENTITY.md, AGENTS.md for the role
11. **Validation** — full round-trip: WOL → Tailscale ping → SSH → gateway health
12. **Finalize** — writes config, generates 6-digit pairing code

## Architecture

```
┌──────────────────────┐         Tailscale          ┌──────────────────────┐
│   Tom (Orchestrator)  │◄──────────────────────────►│   Jerry (Executor)    │
│                       │                            │                       │
│  Always-on server     │     TJMessage protocol     │  GPU workstation      │
│  Lightweight tasks    │◄──────────────────────────►│  Heavy compute        │
│  Web / API / social   │                            │  Inference / GenAI    │
│                       │         WOL packet         │                       │
│  Gateway: loopback    │───────────────────────────►│  Gateway: tailscale   │
│                       │                            │  (wakes from sleep)   │
└──────────────────────┘                             └──────────────────────┘
```

### The protocol: TJMessage

Every cross-machine communication uses a typed envelope:

```json
{
  "version": "0.1.0",
  "id": "uuid",
  "from": "Calcifer",
  "to": "GLaDOS",
  "turn": 0,
  "type": "task",
  "payload": "Generate a hero image for the landing page",
  "wake_required": true,
  "shutdown_after": true,
  "done": false,
  "timestamp": "2026-03-10T15:00:00Z"
}
```

Message types: `task`, `result`, `heartbeat`, `handoff`, `wake`, `error`

### Transport layers

| Layer | Purpose |
|-------|---------|
| **Tailscale** | Peer discovery, reachability polling, encrypted tunnel |
| **SSH** | Command execution on remote node |
| **WOL** | Wake sleeping machines via magic packet |
| **Gateway** | OpenClaw gateway health checks, task routing |

### Trust model

- One-time 6-digit pairing code (SHA-256 hashed, never stored plaintext)
- Peer allowlist by Tailscale IP
- API keys in OS keychain via keytar
- Config file permissions `0o600`

## CLI Commands

| Command | Description |
|---------|-------------|
| `tj onboard` | Setup wizard — configure this node, pair with remote |
| `tj pair --code <code>` | Complete pairing with a 6-digit code |
| `tj status` | Show both nodes, connectivity, last heartbeat |
| `tj wake` | Send WOL magic packet to wake Jerry |
| `tj send <task>` | Send a task to the peer node |
| `tj doctor` | Diagnose connectivity and configuration issues |

## Config

Written to `~/.tom-and-jerry/tj.json` with `0o600` permissions. Contains:

- This node's role, name, Tailscale identity
- Peer node's connection details (SSH, Tailscale, WOL)
- Gateway bind mode and port
- Pairing state and trust status
- Protocol settings (heartbeat interval, done signal)

## Packages

| Package | Description |
|---------|-------------|
| `@tom-and-jerry/core` | Protocol schemas (Zod), transport (Tailscale, SSH, WOL), trust model, gateway helpers |
| `@tom-and-jerry/cli` | CLI commands + onboard wizard |
| `@tom-and-jerry/skills` | OpenClaw SKILL.md files for cross-node agent communication |

## Reference implementation

The **Calcifer / GLaDOS** pair is the canonical reference — an EC2 server (Tom) paired with a home Windows PC with an RTX 3070 Ti (Jerry). Fully operational, including the hardest part: Wake-on-LAN → Windows AutoLogin → Tailscale wait → gateway bind.

See [`docs/reference/calcifer-glados.md`](docs/reference/calcifer-glados.md) for the full annotated walkthrough.

## Development

```bash
git clone https://github.com/CalciferFriend/tom-and-jerry
cd tom-and-jerry
pnpm install
pnpm build
pnpm test
```

## Core tenet

**Agents must run on separate machines.** Every design decision encodes physical separation. No same-host agents. The cat always knows where the mouse is.

## License

MIT
