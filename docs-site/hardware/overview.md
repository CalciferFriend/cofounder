---
title: Hardware Overview
description: Comparison of all supported Jerry hardware profiles — how to pick, cost, and power tradeoffs.
---

# Hardware Overview

Jerry can run on almost anything — from a Raspberry Pi to an RTX 4090 workstation.
This page helps you pick the right hardware for what you want to do.

---

## Comparison table

| Profile | Hardware | GPU | VRAM | Best model size | Power | Cost estimate |
|---------|----------|-----|------|-----------------|-------|---------------|
| [Pi 5](/hardware/pi5) | Raspberry Pi 5 | CPU only | — | 3B (Q4) | 5–15W | ~$80 |
| [M2 Mac](/hardware/m2-mac) | Apple Silicon Mac | Metal | 8–128 GB unified | 13B–70B+ | 10–40W | $600–$3 000 |
| [RTX 3070 Ti](/hardware/rtx-3070-ti) | Windows PC | CUDA | 8 GB | 7–13B (Q4) | 150–290W | $800–$1 500 |
| [RTX 4090](/hardware/rtx-4090) | Windows/Linux PC | CUDA | 24 GB | 70B (Q4) | 300–450W | $2 000–$4 000 |

> Power figures are for the GPU under full inference load, not total system power.

---

## What can each profile run?

| Task | Pi 5 | M2 16GB | RTX 3070 Ti | RTX 4090 |
|------|------|---------|-------------|----------|
| Embeddings | ✅ Fast | ✅ Fast | ✅ Fast | ✅ Fast |
| 3B chat | ✅ ~5 tok/s | ✅ ~70 tok/s | ✅ ~60 tok/s | ✅ ~80 tok/s |
| 7B chat | ⚠️ Slow | ✅ ~45 tok/s | ✅ ~30 tok/s | ✅ ~50 tok/s |
| 13B chat | ❌ | ✅ ~25 tok/s | ✅ Q4 only | ✅ ~35 tok/s |
| 70B chat | ❌ | ⚠️ M2 Pro/Max only | ❌ | ✅ ~20 tok/s |
| Image gen (SDXL) | ❌ | ⚠️ Slow | ✅ ~12s/img | ✅ ~3s/img |
| Image gen (Flux) | ❌ | ⚠️ M3 Max only | ❌ | ✅ ~8s/img |
| Code (7B) | ✅ | ✅ | ✅ | ✅ |
| Code (34B) | ❌ | ⚠️ Pro/Max | ❌ | ✅ |
| Vision (LLaVA) | ❌ | ✅ | ✅ 7B | ✅ 34B |
| LoRA fine-tuning | ❌ | ❌ | ⚠️ 7B only | ✅ |
| Video gen | ❌ | ❌ | ⚠️ Slow | ✅ |
| Whisper (audio) | ✅ Slow | ✅ Fast | ✅ Fast | ✅ Fast |

---

## How to pick

### "I just want local LLM chat"

→ **M2 Mac** — best performance-per-watt. Always on, quiet, no separate GPU needed.
An M2 with 16 GB can run 13B models at comfortable speed. An M2 Pro or M3 Max
handles 30B–70B.

### "I want image generation"

→ **RTX 3070 Ti** for SDXL (8 GB is enough). **RTX 4090** for Flux or faster throughput.
M2 Mac can do SDXL via Core ML but it's slower.

### "I have a beast PC already"

→ **RTX 4090** — make it a Jerry. 24 GB VRAM handles 70B models, Flux image gen,
and LoRA fine-tuning. Let Tom wake it only when needed to save power.

### "I want always-on, low-power compute"

→ **Pi 5** — 5–15W idle, handles embeddings, summarization, and small chat (3B models).
Great as a dedicated node that's always awake while bigger machines sleep.

### "I want a mix — lightweight routing + heavy GPU on demand"

→ **Pi 5 + RTX 4090** — Pi 5 runs 24/7 for light tasks, Tom wakes the 4090 for
heavy inference or image generation. Cost-efficient and responsive.

---

## Capability tags by profile

| Profile | Default tags |
|---------|-------------|
| Pi 5 | `embeddings`, `summarize`, `chat:small` |
| M2 Mac (16GB) | `ollama`, `gpu-inference`, `code` |
| M2 Mac (32GB+) | `ollama`, `gpu-inference`, `inference:70b`, `code` |
| RTX 3070 Ti | `ollama`, `gpu-inference`, `image-gen` (with ComfyUI) |
| RTX 4090 | `ollama`, `gpu-inference`, `inference:70b`, `image-gen`, `code`, `vision` |

These are auto-detected by `tj capabilities scan`. Add custom tags with
`tj capabilities advertise --tags "your-tag"`.

---

## Power and cost tradeoffs

Running an RTX 4090 24/7 at 300W costs roughly **$260/month** in electricity
(at $0.12/kWh). Using Wake-on-LAN to sleep it when idle and only wake it for tasks
can reduce that to **$20–50/month** depending on usage.

| Setup | Monthly power cost (est.) |
|-------|--------------------------|
| Pi 5 always-on | ~$0.50 |
| M2 Mac mini always-on | ~$3–5 |
| RTX 3070 Ti 24/7 | ~$60–80 |
| RTX 3070 Ti WOL (2h/day) | ~$5–10 |
| RTX 4090 24/7 | ~$200–260 |
| RTX 4090 WOL (2h/day) | ~$15–25 |

**Tip:** Enable WOL on your GPU machines and let Tom wake them only when needed.
See [`tj wake`](/reference/wake) and the [WOL guide](/guide/wol).

---

## Hardware guides

- [Raspberry Pi 5](/hardware/pi5) — setup, Ollama, systemd service
- [M2/M3 Mac](/hardware/m2-mac) — Metal backend, launchd, image generation
- [RTX 3070 Ti](/hardware/rtx-3070-ti) — Windows 11, CUDA, WOL setup
- [RTX 4090](/hardware/rtx-4090) — Linux and Windows, 70B models, Flux, Docker
