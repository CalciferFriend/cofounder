# Jerry on Apple M2/M3 Mac

Apple Silicon Macs are excellent Jerry nodes. Unified memory means the GPU and CPU share the same fast RAM pool — an M2 with 16 GB can run 13B models comfortably, and an M3 Max with 128 GB can run 70B+.

---

## Hardware configs

| Chip | Unified Memory | Effective VRAM | Best for |
|------|---------------|----------------|---------|
| M2 | 8 GB | ~6 GB for models | 7B models |
| M2 | 16 GB | ~13 GB for models | 13B models |
| M2 Pro | 32 GB | ~28 GB | 30B models |
| M3 Max | 128 GB | ~120 GB | 70B+ models |

> Apple's Metal backend in Ollama is mature and fast. M2/M3 performance often matches NVIDIA GPUs for inference thanks to memory bandwidth advantage.

---

## What it can run (M2 16 GB)

| Model | Min Memory | Speed |
|-------|-----------|-------|
| Llama 3.2 3B | 4 GB | ⚡ ~70 tok/s |
| Mistral 7B | 8 GB | ⚡ ~45 tok/s |
| Llama 3.1 8B | 8 GB | ✓ ~40 tok/s |
| Llama 3.1 13B (Q4) | 10 GB | ✓ ~25 tok/s |
| Llama 3.1 70B (Q4) | 48 GB | ✗ needs M2 Pro 64 GB+ |
| Whisper large-v3 | 3 GB | ⚡ Fast |

---

## Installation

### 1 — Install Ollama

```bash
# Homebrew
brew install ollama

# Start Ollama service
ollama serve &

# Verify Metal GPU detection
ollama run llama3.2
# Should show: loaded on Metal
```

### 2 — Pull models

```bash
ollama pull llama3.2          # general purpose
ollama pull mistral            # best 7B quality
ollama pull codellama          # coding
ollama pull llava              # vision tasks
ollama pull nomic-embed-text   # embeddings
```

### 3 — Install Node + OpenClaw + tom-and-jerry

```bash
# Node 22 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22 && nvm use 22

# OpenClaw + tj
npm install -g openclaw tom-and-jerry
```

### 4 — Install Tailscale

```bash
brew install tailscale
tailscale up --authkey tskey-auth-...
tailscale ip -4   # note this for Tom
```

### 5 — Run the wizard

```bash
tj onboard
# Role: Jerry
# Provider: Ollama (auto-detected)
```

### 6 — Advertise capabilities

```bash
tj capabilities advertise
tj capabilities show
```

```
🖥  My Mac (jerry) — macOS
GPU:    Apple M2 · Metal backend · ~16 GB unified
Ollama: running · 5 models
Skills: ollama, gpu-inference, code, vision
```

---

## Gateway autostart (launchd)

```bash
cat > ~/Library/LaunchAgents/com.tom-and-jerry.gateway.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.tom-and-jerry.gateway</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/openclaw</string>
    <string>gateway</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/tj-gateway.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/tj-gateway.err</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.tom-and-jerry.gateway.plist
```

---

## WOL on Mac

Macs support "Wake for network access" but it's less reliable than PC WOL. Enable in:

**System Settings → Energy → Options → "Wake for network access"**

For best results:
- Leave Mac in **sleep** (not shutdown) — Mac WOL works from sleep, not from off
- Ensure Tailscale maintains connection during sleep
- Consider keeping the Mac always-on if it's a Mini — power draw is only ~10W idle

---

## Image generation (optional)

Stable Diffusion runs well on M2/M3 via Metal:

```bash
# ComfyUI with MPS backend
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI && pip install -r requirements.txt
python main.py --force-fp16

# Or: Draw Things (native macOS app, optimized for Apple Silicon)
# https://apps.apple.com/app/draw-things/id6444050820
```

Advertise:

```bash
tj capabilities advertise --notes "SDXL via ComfyUI, Metal backend"
```

---

## Capability profile

```json
{
  "hardware": "m2-mac",
  "gpu": { "name": "Apple M2", "vram_gb": 16, "backend": "metal" },
  "skill_tags": ["ollama", "gpu-inference", "code", "vision"],
  "ollama_models": ["llama3.2", "mistral", "codellama", "llava", "nomic-embed-text"]
}
```

---

## Troubleshooting

**Ollama not using Metal GPU:**

```bash
system_profiler SPDisplaysDataType | grep "Metal"
# Should show: Metal Family: Metal 3
OLLAMA_GPU_OVERHEAD=0 ollama run llama3.2
```

**Out of memory:**

Reduce context: `ollama run llama3.2 --ctx-size 2048`

**Gateway not reachable from Tom:**

```bash
tailscale ip          # check Tailscale is up
openclaw gateway status   # check gateway is running
```

---

## See also

- [Hardware overview](/hardware/overview) — comparison with other Jerrys
- [Linux/Mac setup](/guide/install-linux) — detailed setup guide
- [LLM providers](/guide/providers) — Ollama and Metal configuration
