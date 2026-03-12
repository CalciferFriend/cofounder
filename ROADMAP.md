# Roadmap — tom-and-jerry

> Goal: someone with two machines runs `npx tj onboard`, answers a few questions,
> and has two agents talking in under 10 minutes — with whatever models they want.

---

## Phase 1 — Foundation ✅ (2026-03-11)

- [x] Protocol design (TJMessage, TJHandoff, TJHeartbeat, TJPair)
- [x] Core transport (Tailscale, SSH, WOL)
- [x] Gateway wake implementation (reverse-engineered OpenClaw WS protocol)
- [x] Socat proxy pattern for Tom (loopback + tailscale)
- [x] Reference implementation: Calcifer (AWS/Linux) ↔ GLaDOS (Home PC/Windows)
- [x] First bidirectional agent-to-agent message confirmed
- [x] First inter-agent code review completed
- [x] Bug fixes from code review (tailscale ping flag, wake id tracking, systemd path)

---

## Phase 2 — Plug & Play 🚧 (current)

> Owned by: Calcifer (Tom/Linux) + GLaDOS (Jerry/Windows) in parallel

### 2a. Onboard wizard — core flow (Calcifer) ✅ (2026-03-12)
- [x] Prerequisites check (Node ≥ 22, Tailscale running, OpenClaw installed)
- [x] Role selection (Tom/Jerry) with clear explanation of each
- [x] Identity setup (name, emoji, model provider)
- [x] Peer connection (Tailscale hostname/IP, SSH user/key, live test)
- [x] Gateway config write (loopback for Tom, tailscale for Jerry)
- [x] Round-trip validation before declaring success

### 2b. Onboard wizard — Windows/Jerry steps (GLaDOS)
- [ ] AutoLogin registry setup (with recovery prompt)
- [ ] Startup bat generation (`start-gateway.bat`)
- [ ] Scheduled Task installation (logon trigger, belt-and-suspenders)
- [ ] Windows Firewall rule for gateway port
- [ ] WOL prerequisites check (BIOS guidance, NIC settings)
- [ ] Test boot chain end-to-end

### 2c. Model provider abstraction (Calcifer) ✅ (2026-03-12)
- [x] Provider enum: `anthropic | openai | ollama | lmstudio | custom`
- [x] API key setup per provider (OS keychain via keytar)
- [x] Ollama auto-detect (is it running locally? list models)
- [x] Provider-specific OpenClaw config generation
- [x] Cost-routing: lightweight tasks → cloud, heavy → local (Jerry/Ollama)

### 2d. `tj send` pipeline (both)
- [x] Tom: ping peer → WOL if needed → build TJMessage → send via wakeAgent
- [x] Timeout + retry logic
- [x] `tj send --wait` polls for result via task state file
- [ ] Jerry: `tj result <id> <output>` — receive + store result back (GLaDOS)
- [ ] Streaming results (partial updates while Jerry works) — Phase 3
- [ ] `tj send "generate an image of X"` → wakes GLaDOS, runs diffusion, returns path — Phase 3

### 2e. `tj status` — live checks (Calcifer) ✅ (2026-03-11)
- [x] Tailscale reachability ping
- [x] Gateway health check (HTTP /health)
- [x] Last heartbeat timestamp
- [x] Current model + cost tracking
- [x] WOL capability indicator

### 2f. Docker Tom template (Calcifer) ✅ (2026-03-11)
- [x] `Dockerfile` for Tom node (Alpine + Node + OpenClaw + tom-and-jerry)
- [x] `docker-compose.yml` with env-var config
- [x] One-liner: `docker run -e ANTHROPIC_API_KEY=... calcifierai/tom`
- [x] Auto-registers with Tailscale on first boot (entrypoint.sh)

### 2g. TJMessage discriminated union (both) ✅ (2026-03-11)
- [x] `TJTaskMessage`, `TJResultMessage`, `TJHeartbeatMessage` typed envelopes
- [x] Zod discriminated union on `type` field
- [x] Typed payload per message type (no more `JSON.parse(payload)`)

### 2h. Agent-to-agent messaging script (Calcifer) ✅ (2026-03-12)
- [x] `send-to-agent.js` — standalone script, no build required
- [x] Resolves peer URL + token from config or CLI flags
- [x] Used by crons, CI, and agent sync protocols

---

## Phase 3 — Intelligence Layer 🚧 (current)

### 3a. Capability registry (Calcifer) ✅ (2026-03-12)
- [x] `TJCapabilityReport` Zod schema: GPU info, Ollama models, skill tags
- [x] Auto-scanner: probes nvidia-smi / rocm-smi / Metal, Ollama /api/tags,
      SD/ComfyUI ports, LM Studio, whisper binary
- [x] Persistent store: `~/.tom-and-jerry/capabilities.json` (Jerry) +
      `peer-capabilities.json` (Tom caches peer's report)
- [x] `tj capabilities scan|advertise|fetch|show|route` CLI
- [x] `routeTask()` — capability-aware routing with keyword heuristic fallback
- [x] 10 new tests (34 total, all passing)

### 3b. Gateway /capabilities endpoint (GLaDOS)
- [ ] Jerry's gateway serves GET /capabilities → returns capabilities.json
- [ ] Auth: verify gateway token before serving (same as /health)

### 3c. Budget tracking (Calcifer) ✅ (2026-03-12)
- [x] Token/cost tracking per session in task state (`TaskResult.cost_usd`, auto-computed)
- [x] Per-token pricing tables: Anthropic (Opus/Sonnet/Haiku), OpenAI (gpt-4o/mini, o3-mini), local ($0)
- [x] `tj budget` command: --today/week/month/all/--tasks/--json
- [x] Cloud vs local token breakdown, local savings estimate
- [x] Budget routing advice when cloud spend is high

### 3d. Handoff continuity (both) ✅ (2026-03-12, Tom side)
- [x] Context summary auto-generated when task completes (template-based, LLM-upgradeable)
- [x] Summary passed in `TJTaskMessage.context_summary` on next task
- [x] Tom retains last N=10 summaries per peer (~/.tom-and-jerry/context/<peer>.json)
- [ ] Jerry side: include `context_summary` in TJResultMessage on result delivery (GLaDOS)

### 3e. Multi-Jerry support (Calcifer) ✅ (2026-03-12)
- [x] Config: `peer_nodes[]` array added alongside `peer_node` (backwards-compatible)
- [x] `tj send --peer <name>` to target a specific Jerry
- [x] `tj send --auto` — capability-aware auto-selection via cached capabilities
- [x] `tj peers` — list all peers with GPU/Ollama/skill info; --ping for live check

### 3f. Jerry skill registry endpoint (GLaDOS)
- [ ] `tj capabilities advertise` runs on Jerry startup (add to startup.bat / systemd)
- [ ] Auto-refresh: re-scan when Ollama model list changes

---

## Phase 4 — Community 🚧

### 4a. Community registry (Calcifer) ✅ (2026-03-12)
- [x] `tj publish` — publish anonymised node card to GitHub Gist registry
- [x] `tj discover` — browse community nodes with GPU/skill/provider/OS filters
- [x] `TJNodeCard` schema with capabilities, WOL support, tags, description

### 4b. Jerry Docker images (Calcifer) ✅ (2026-03-12)
- [x] `docker/jerry/Dockerfile` — CPU/Ollama Jerry image (Debian + Node 22 + Ollama)
- [x] `docker/jerry/Dockerfile.cuda` — NVIDIA CUDA variant (tested: RTX 3070 Ti+)
- [x] `docker/jerry/entrypoint.sh` — Tailscale auth, SSH server, Ollama start, config gen
- [x] `docker/jerry/pull-models.sh` — pull comma-separated models at startup
- [x] `docker-compose.yml` — profiles: `jerry-cpu` and `jerry-cuda` added alongside Tom
- [x] `docker/.env.example` — unified env template for both nodes
- [x] Pre-built M2 Mac instructions (`docs/jerry-profiles/m2-mac.md` — uses `tj onboard`, no Docker)
- [x] Raspberry Pi 5 variant (ARM64 base image + quantized Ollama models) ✅ (2026-03-12)
- [x] RTX 4090 profile docs (`docs/jerry-profiles/rtx-4090.md`) ✅ (2026-03-12)

### 4c. `tj logs` — task history viewer (Calcifer) ✅ (2026-03-12)
- [x] Pretty-printed log view with status badges, relative timestamps, peer name
- [x] Filters: --status, --peer, --since (24h / 7d / 30m), --limit
- [x] --output flag to include result text inline
- [x] --json for machine-readable piping
- [x] --follow mode: live tail with 2s polling, highlights new/updated tasks

### 4d. Discord community + showcase
- [ ] Discord community for tom-and-jerry setups
- [ ] Showcase: what are people building with it?
- [ ] Docs site (VitePress or similar)

---

## Who Owns What

| Area | Owner |
|------|-------|
| Wizard core + Linux steps | Calcifer 🔥 |
| Wizard Windows steps | GLaDOS 🤖 |
| Model provider abstraction | Calcifer 🔥 |
| `tj send` Tom side | Calcifer 🔥 |
| `tj send` Jerry side | GLaDOS 🤖 |
| `tj status` | Calcifer 🔥 |
| Docker Tom template | Calcifer 🔥 |
| Ollama/local model integration | GLaDOS 🤖 |
| TJMessage discriminated union | Calcifer 🔥 |
| Windows boot chain testing | GLaDOS 🤖 |
| npm publish + CI | Calcifer 🔥 |

---

## Sync Protocol

Calcifer and GLaDOS coordinate via wake messages. When either agent completes a
chunk of work and pushes to the repo, they send a wake to the other with a summary
and next ask. Nic can check `git log` or ask either agent for a status update at
any time.

Repo: https://github.com/CalciferFriend/tom-and-jerry
