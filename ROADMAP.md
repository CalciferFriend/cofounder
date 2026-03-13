# Roadmap — his-and-hers

> Goal: someone with two machines runs `npx hh onboard`, answers a few questions,
> and has two agents talking in under 10 minutes — with whatever models they want.

---

## Phase 1 — Foundation ✅ (2026-03-11)

- [x] Protocol design (HHMessage, HHHandoff, HHHeartbeat, HHPair)
- [x] Core transport (Tailscale, SSH, WOL)
- [x] Gateway wake implementation (reverse-engineered OpenClaw WS protocol)
- [x] Socat proxy pattern for H1 (loopback + tailscale)
- [x] Reference implementation: Calcifer (AWS/Linux) ↔ GLaDOS (Home PC/Windows)
- [x] First bidirectional agent-to-agent message confirmed
- [x] First inter-agent code review completed
- [x] Bug fixes from code review (tailscale ping flag, wake id tracking, systemd path)

---

## Phase 2 — Plug & Play 🚧 (current)

> Owned by: Calcifer (H1/Linux) + GLaDOS (H2/Windows) in parallel

### 2a. Onboard wizard — core flow (Calcifer) ✅ (2026-03-12)
- [x] Prerequisites check (Node ≥ 22, Tailscale running, OpenClaw installed)
- [x] Role selection (H1/H2) with clear explanation of each
- [x] Identity setup (name, emoji, model provider)
- [x] Peer connection (Tailscale hostname/IP, SSH user/key, live test)
- [x] Gateway config write (loopback for H1, tailscale for H2)
- [x] Round-trip validation before declaring success

### 2b. Onboard wizard — Windows/H2 steps (GLaDOS)
- [x] AutoLogin registry setup (with recovery prompt)
- [x] Startup bat generation (`start-hh.bat` — gateway + hh watch --serve-capabilities)
- [x] Scheduled Task installation (logon trigger, belt-and-suspenders)
- [x] Windows Firewall rule for gateway port (stepFirewall, wizard step 9)
- [x] WOL prerequisites check (BIOS guidance, NIC settings)
- [ ] Test boot chain end-to-end

### 2c. Model provider abstraction (Calcifer) ✅ (2026-03-12)
- [x] Provider enum: `anthropic | openai | ollama | lmstudio | custom`
- [x] API key setup per provider (OS keychain via keytar)
- [x] Ollama auto-detect (is it running locally? list models)
- [x] Provider-specific OpenClaw config generation
- [x] Cost-routing: lightweight tasks → cloud, heavy → local (H2/Ollama)

### 2d. `hh send` pipeline (both)
- [x] H1: ping peer → WOL if needed → build HHMessage → send via wakeAgent
- [x] Timeout + retry logic
- [x] `hh send --wait` polls for result via task state file
- [x] H2: `hh result <id> <output>` — receive + store result back (code complete + 17 tests; GLaDOS pending real-machine test)
- [ ] Streaming results (partial updates while H2 works) — Phase 3
- [ ] `hh send "generate an image of X"` → wakes GLaDOS, runs diffusion, returns path — Phase 3

### 2e. `hh status` — live checks (Calcifer) ✅ (2026-03-11)
- [x] Tailscale reachability ping
- [x] Gateway health check (HTTP /health)
- [x] Last heartbeat timestamp
- [x] Current model + cost tracking
- [x] WOL capability indicator

### 2f. Docker H1 template (Calcifer) ✅ (2026-03-11)
- [x] `Dockerfile` for H1 node (Alpine + Node + OpenClaw + his-and-hers)
- [x] `docker-compose.yml` with env-var config
- [x] One-liner: `docker run -e ANTHROPIC_API_KEY=... calcifierai/h1`
- [x] Auto-registers with Tailscale on first boot (entrypoint.sh)

### 2g. HHMessage discriminated union (both) ✅ (2026-03-11)
- [x] `HHTaskMessage`, `HHResultMessage`, `HHHeartbeatMessage` typed envelopes
- [x] Zod discriminated union on `type` field
- [x] Typed payload per message type (no more `JSON.parse(payload)`)

### 2h. Agent-to-agent messaging script (Calcifer) ✅ (2026-03-12)
- [x] `send-to-agent.js` — standalone script, no build required
- [x] Resolves peer URL + token from config or CLI flags
- [x] Used by crons, CI, and agent sync protocols

---

## Phase 3 — Intelligence Layer 🚧 (current)

### 3a. Capability registry (Calcifer) ✅ (2026-03-12)
- [x] `HHCapabilityReport` Zod schema: GPU info, Ollama models, skill tags
- [x] Auto-scanner: probes nvidia-smi / rocm-smi / Metal, Ollama /api/tags,
      SD/ComfyUI ports, LM Studio, whisper binary
- [x] Persistent store: `~/.his-and-hers/capabilities.json` (H2) +
      `peer-capabilities.json` (H1 caches peer's report)
- [x] `hh capabilities scan|advertise|fetch|show|route` CLI
- [x] `routeTask()` — capability-aware routing with keyword heuristic fallback
- [x] 10 new tests (34 total, all passing)

### 3b. Gateway /capabilities endpoint (GLaDOS)
- [x] H2's gateway serves GET /capabilities → returns capabilities.json (`hh watch --serve-capabilities`)
- [x] Auth: verify gateway token before serving (same token as /health)
- [ ] GLaDOS: verify endpoint on real Windows machine after boot

### 3c. Budget tracking (Calcifer) ✅ (2026-03-12)
- [x] Token/cost tracking per session in task state (`TaskResult.cost_usd`, auto-computed)
- [x] Per-token pricing tables: Anthropic (Opus/Sonnet/Haiku), OpenAI (gpt-4o/mini, o3-mini), local ($0)
- [x] `hh budget` command: --today/week/month/all/--tasks/--json
- [x] Cloud vs local token breakdown, local savings estimate
- [x] Budget routing advice when cloud spend is high

### 3d. Handoff continuity (both) ✅ (2026-03-12, H1 side)
- [x] Context summary auto-generated when task completes (template-based, LLM-upgradeable)
- [x] Summary passed in `HHTaskMessage.context_summary` on next task
- [x] H1 retains last N=10 summaries per peer (~/.his-and-hers/context/<peer>.json)
- [ ] H2 side: include `context_summary` in HHResultMessage on result delivery (GLaDOS)

### 3e. Multi-H2 support (Calcifer) ✅ (2026-03-12)
- [x] Config: `peer_nodes[]` array added alongside `peer_node` (backwards-compatible)
- [x] `hh send --peer <name>` to target a specific H2
- [x] `hh send --auto` — capability-aware auto-selection via cached capabilities
- [x] `hh peers` — list all peers with GPU/Ollama/skill info; --ping for live check

### 3f. H2 skill registry endpoint (GLaDOS)
- [x] `hh capabilities advertise` runs on H2 startup (wired into `start-hh.bat` via `hh capabilities scan --quiet`)
- [ ] Auto-refresh: re-scan when Ollama model list changes (Phase 4+)

---

## Phase 4 — Community 🚧

### 4a. Community registry (Calcifer) ✅ (2026-03-12)
- [x] `hh publish` — publish anonymised node card to GitHub Gist registry
- [x] `hh discover` — browse community nodes with GPU/skill/provider/OS filters
- [x] `HHNodeCard` schema with capabilities, WOL support, tags, description

### 4b. H2 Docker images (Calcifer) ✅ (2026-03-12)
- [x] `docker/h2/Dockerfile` — CPU/Ollaman H2 image (Debian + Node 22 + Ollama)
- [x] `docker/h2/Dockerfile.cuda` — NVIDIA CUDA variant (tested: RTX 3070 Ti+)
- [x] `docker/h2/entrypoint.sh` — Tailscale auth, SSH server, Ollama start, config gen
- [x] `docker/h2/pull-models.sh` — pull comma-separated models at startup
- [x] `docker-compose.yml` — profiles: `h2-cpu` and `h2-cuda` added alongside H1
- [x] `docker/.env.example` — unified env template for both nodes
- [x] Pre-built M2 Mac instructions (`docs/h2-profiles/m2-mac.md` — uses `hh onboard`, no Docker)
- [x] Raspberry Pi 5 variant (ARM64 base image + quantized Ollama models) ✅ (2026-03-12)
- [x] RTX 4090 profile docs (`docs/h2-profiles/rtx-4090.md`) ✅ (2026-03-12)

### 4c. `hh logs` — task history viewer (Calcifer) ✅ (2026-03-12)
- [x] Pretty-printed log view with status badges, relative timestamps, peer name
- [x] Filters: --status, --peer, --since (24h / 7d / 30m), --limit
- [x] --output flag to include result text inline
- [x] --json for machine-readable piping
- [x] --follow mode: live tail with 2s polling, highlights new/updated tasks

### 4d. Discord community + showcase
- [ ] Discord community for his-and-hers setups
- [ ] Showcase: what are people building with it?
- [x] Docs site (VitePress) ✅ (2026-03-12) — 34 pages across guide/reference/protocol/hardware

---

## Phase 5 — Resilience & Developer Experience 🚧

> Owned by: Calcifer (H1/Linux) + GLaDOS (H2/Windows) in parallel

### 5a. `hh config` command (Calcifer) ✅ (2026-03-12)
- [x] `hh config show` — pretty-print config, redact secrets
- [x] `hh config get <key>` — read a single key (dot-notation)
- [x] `hh config set <key> <value>` — write a key with auto type coercion
- [x] `hh config path` — print config file path

### 5b. `hh test` command (Calcifer) ✅ (2026-03-12)
- [x] Tailscale reachability check with RTT
- [x] Gateway health check
- [x] Round-trip wake message test with RTT
- [x] Summary table output (+ --json flag)
- [x] Exit code 1 on any failure (useful for CI/health scripts)

### 5c. `hh watch` daemon — H2-side task listener (GLaDOS)
- [x] Persistent process that polls for pending tasks from H1
- [x] Auto-dispatches via `--exec <cmd>` executor; emits to stdout when no executor
- [x] Configurable poll interval (default: 5s, `--interval`)
- [x] Graceful shutdown on SIGINT/SIGTERM
- [x] Auto-starts via `start-hh.bat` / `start-hh.sh` (startup scripts wired in Phase 2b)
- [ ] GLaDOS: validate end-to-end on real Windows machine

### 5d. Webhook result push (Calcifer) ✅ (2026-03-12)
- [x] H1 exposes POST /result on its gateway (authenticated, token-gated, one-shot)
- [x] `deliverResultWebhook()` helper in core — H2 calls this to push result back
- [x] `parseWebhookUrl()` parses webhook URL embedded in wake message
- [x] `startResultServer()` binds to Tailscale IP, auto-selects port, auto-closes after delivery
- [x] Fallback to polling if webhook not received (older H2 / network block)
- [x] Tests: 9 tests covering auth, task_id guard, timeout, one-shot close, URL parsing

### 5e. Exponential backoff + retry (Calcifer) ✅ (2026-03-12)
- [x] `hh send` retries on transient failures (gateway down, WS timeout) via `withRetry()`
- [x] Configurable max retries + base delay (`--max-retries` CLI flag)
- [x] Backoff state persisted so cron retries don't duplicate (`~/.his-and-hers/retry/<id>.json`)
- [x] `cronRetryDecision()` — send/skip/retry/backoff logic for cron safety
- [x] Tests: 19 tests covering withRetry, RetryState persistence, cronRetryDecision, nextRetryAt

### 5f. `hh schedule` — recurring task delegation (Calcifer) ✅ (2026-03-13)
- [x] `hh schedule add --cron "..." "<task>"` — register recurring H2 task + install crontab entry
- [x] `hh schedule list` — show all schedules with next-run time
- [x] `hh schedule remove <id>` — unregister + remove crontab entry
- [x] `hh schedule enable/disable <id>` — toggle without removing
- [x] `hh schedule run <id>` — manual trigger (updates last_run)
- [x] Schedule store: ~/.his-and-hers/schedules.json
- [x] Crontab installer/remover (system cron integration)
- [x] Tests: store CRUD + crontab parser

---

## Phase 6 — Latent Communication (Experimental) 🔬

> Target: Q3 2026 · Status: protocol design complete, implementation research

**Vision:** Enable agents to communicate via compressed hidden states instead of text tokens, reducing information loss and improving bandwidth efficiency. Based on Vision Wormhole (arXiv:2602.15382), Interlat (arXiv:2511.09149), and LatentMAS (arXiv:2511.20639).

### 6a. HHLatentMessage protocol type ✅ (2026-03-12)
- [x] HHLatentMessage Zod schema added to discriminated union
- [x] Support for Vision Wormhole codec path (heterogeneous models via visual encoder)
- [x] Support for LatentMAS KV-cache path (same-family models, training-free)
- [x] Mandatory text fallback for backwards compatibility
- [x] Serialization helpers: serializeLatent() and deserializeLatent()
- [x] Fixed: serializeLatent buffer overflow (float32 4B/element, not float16 2B/element)
- [x] Fixed: codec_output_dim/codec_tokens nonnegative (0 valid on KV-cache path)
- [x] Type guards: isLatentMessage()
- [x] Factory helper: createLatentMessage()
- [x] Tests: 9 new tests covering parsing, round-trip serialization, edge cases (all passing)

### 6b. HLCA sender integration (Calcifer) ✅ (2026-03-12)
- [ ] Hook into OpenClaw gateway to extract hidden states mid-inference (awaits upstream codec)
- [ ] Implement Vision Wormhole codec adapter (compress 2048d → 512d via visual encoder)
- [x] Add `--latent` flag to `hh send` command (hard-require latent; error if peer lacks it)
- [x] Add `--auto-latent` flag — prefer latent, fall back to text if peer doesn't support it
- [x] Auto-detect if peer supports latent via cached capability negotiation
- [x] Fallback: if peer doesn't advertise latent support, send text instead

### 6c. HLCA receiver integration (GLaDOS)
- [ ] OpenClaw gateway endpoint to accept HHLatentMessage
- [ ] Inject compressed latent via visual encoder pathway (Vision Wormhole approach)
- [ ] Parse and validate sender_model and codec_version match
- [ ] KV cache injection for LatentMAS path (same-family models)
- [ ] Graceful degradation: use fallback_text if latent parsing fails

### 6d. Capability advertisement (both)
- [x] Add `latent_codecs: ["vw-qwen3vl2b-v1"]` to HHCapabilityReport
- [x] Add `kv_compatible_models: ["llama-3.1-70b"]` for LatentMAS
- [ ] Gateway /capabilities endpoint serves latent support info
- [x] H1 caches peer latent capabilities in peer-capabilities.json

### 6e. Automatic routing and fallback (Calcifer)
- [x] `routeTask()` checks if peer supports latent before choosing message type
- [x] If latent supported: extract hidden state, compress, send HHLatentMessage
- [x] If not supported: fall back to text (existing HHTaskMessage)
- [x] Log compression ratio and bandwidth savings to task state

### 6f. Benchmarks and validation (both)
- [ ] Latency: latent vs text round-trip time on same hardware
- [ ] Accuracy: structured task completion rate (JSON generation, code, math)
- [ ] Bandwidth: bytes transmitted per task (compressed latent vs tokenized text)
- [ ] Test across H2 profiles: RTX 3070 Ti, RTX 4090, M2 Mac, Pi 5
- [ ] Document results in `docs/benchmarks/latent-vs-text.md`

### Research dependencies
- Vision Wormhole codec implementation (not yet open-sourced by authors)
- LatentMAS KV serialization format (reference implementation in PyTorch)
- OpenClaw middleware hooks for mid-inference hidden state extraction

**Note:** Phase 6 is marked experimental because the upstream codec implementations
are not production-ready. The protocol design is complete and ready to use once
the research implementations mature. See `docs/future.md` for detailed research
context and `docs/latent-communication.md` for implementation guide.

---

## Who Owns What

| Area | Owner |
|------|-------|
| Wizard core + Linux steps | Calcifer 🔥 |
| Wizard Windows steps | GLaDOS 🤖 |
| Model provider abstraction | Calcifer 🔥 |
| `hh send` H1 side | Calcifer 🔥 |
| `hh send` H2 side | GLaDOS 🤖 |
| `hh status` | Calcifer 🔥 |
| Docker H1 template | Calcifer 🔥 |
| Ollama/local model integration | GLaDOS 🤖 |
| HHMessage discriminated union | Calcifer 🔥 |
| Windows boot chain testing | GLaDOS 🤖 |
| npm publish + CI | Calcifer 🔥 |

---

## Sync Protocol

Calcifer and GLaDOS coordinate via wake messages. When either agent completes a
chunk of work and pushes to the repo, they send a wake to the other with a summary
and next ask. Nic can check `git log` or ask either agent for a status update at
any time.

Repo: https://github.com/CalciferFriend/his-and-hers
