# Troubleshooting

Common issues and how to fix them. Run `hh doctor` first — it catches ~80% of problems automatically.

```bash
hh doctor
```

---

## Setup & Onboarding

### `hh onboard` fails at the Tailscale step

**Symptom:** "Tailscale not found" or "Tailscale not connected"

- Make sure Tailscale is installed: [tailscale.com/download](https://tailscale.com/download)
- Make sure it's running and you're logged in: `tailscale status`
- If behind a corporate firewall, ensure Tailscale isn't blocked

### `hh onboard` fails at the SSH step

**Symptom:** "SSH connection to peer failed"

- Verify the peer's Tailscale IP: `tailscale status`
- Test manually: `ssh <user>@<tailscale-ip>`
- Check the SSH key path is correct and has the right permissions (`chmod 600`)
- On Windows (H2), make sure OpenSSH Server is enabled:
  `Get-WindowsCapability -Online -Name OpenSSH.Server*`

### WOL prerequisites check fails

**Symptom:** "Wake-on-LAN not configured" warning during onboard

- Enter BIOS/UEFI and enable "Wake on LAN" or "Power On By PCIe"
- In Windows: Device Manager → Network Adapter → Properties → Power Management → tick "Allow this device to wake the computer"
- Note: WOL requires the peer to be on the same LAN or have a proper Tailscale subnet route

---

## `hh send` issues

### Task stays `pending` forever

**Likely causes:**

1. **H2 is offline** — run `hh status` to check reachability
2. **`hh watch` isn't running on H2** — SSH in and start it, or check the Scheduled Task
3. **WOL didn't fire** — check `hh status --wol` and BIOS settings

**Fix:**

```bash
# Check if H2 is reachable
hh status

# Manually wake H2
hh wake

# SSH in and start the watch daemon
ssh glados "hh watch --exec 'node run-task.js'"

# Cancel the stuck task and retry
hh cancel <id>
hh replay <id>
```

### `hh send --wait` times out

**Symptom:** "Timed out waiting for result"

- The default timeout is 120s. For long-running tasks, use `--timeout 600`
- Check that H2's executor is actually running: `ssh glados "ps aux | grep run-task"`
- Check H2's task state dir: `ssh glados "ls ~/.his-and-hers/state/tasks/"`

### Webhook delivery fails

**Symptom:** Task completes on H2 but H1 doesn't see the result immediately

- The webhook URL uses H1's Tailscale IP — make sure H1 is reachable from H2
- Check `hh status` on both ends
- The `--wait` polling fallback will still pick up the result (just slower)

---

## Gateway issues

### Gateway won't start

**Symptom:** `openclaw gateway start` fails or `hh status` shows gateway unhealthy

- Check port conflicts: `ss -tlnp | grep 18790` (or your configured port)
- On Windows, check Firewall rules: the gateway port must be open
- Re-run the firewall step: `hh onboard` → step 9 (firewall)
- Check systemd logs on Linux: `journalctl --user -u openclaw-gateway`

### Gateway shows healthy but H1 can't reach H2

**Symptom:** `/health` responds locally on H2 but `hh status` from H1 shows unreachable

- Firewall is the most common culprit: `New-NetFirewallRule` must allow inbound TCP on the gateway port
- Check Tailscale is connected on both ends: `tailscale status`
- Verify the gateway URL in H1's config: `hh config show`

---

## Streaming issues

### No streaming output visible during `hh send --wait`

**Symptom:** Command blocks silently until complete

- Streaming requires H1's Tailscale IP to be reachable *from H2*. If NAT or firewall blocks the connection, chunks won't flow but the final result will still arrive.
- Check H2 can reach H1: `ssh glados "tailscale ping <h1-ip>"`
- The streaming SSE server on H1 binds to the Tailscale interface — make sure it's up

### Chunks appear but out of order

This is expected for very fast executors. Chunks are delivered as they arrive and H1 displays them in receipt order. The final result is always authoritative.

---

## Capability routing issues

### `hh send --auto` always sends to cloud

**Symptom:** GPU tasks not routing to H2

- Check that H2 has scanned and advertised its capabilities: `hh capabilities show`
- H1's cached peer capabilities may be stale: `hh capabilities fetch`
- Re-scan on H2: `ssh glados "hh capabilities scan && hh capabilities advertise"`

### `hh capabilities fetch` fails

- H2 must be running `hh watch --serve-capabilities`
- Check H2's gateway port matches H1's config: `hh config show` on both

---

## Budget tracking issues

### `hh budget` shows $0 for all tasks

- Token tracking requires the executor to pass `--tokens <n>` to `hh result`, or use the `--json` payload with `tokens` and `duration_ms`
- Cloud tasks using OpenClaw auto-tracking populate this automatically
- Local (Ollama) tasks default to $0 — that's correct

---

## Windows-specific

### `start-hh.bat` doesn't run at login

- Check the Scheduled Task: Task Scheduler → `hh-startup`
- Trigger should be "At log on" for the correct user
- Run the task manually to verify it works: right-click → Run
- Check that Node.js is on the system PATH for the account

### AutoLogin isn't working after setup

- `hh onboard` writes AutoLogin registry keys — verify: `reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"`
- If machine is domain-joined, AutoLogin requires different configuration (not supported by `hh onboard` currently)

### WOL packet sent but PC doesn't wake

1. BIOS must have WOL enabled
2. NIC must be set to "Allow this device to wake the computer" in Device Manager
3. Fast Startup (a.k.a. Fast Boot) in Windows can interfere — disable it in Power Options
4. WOL only works on the local LAN or via Tailscale subnet routing — it doesn't traverse the internet by default

---

## Diagnosing unknown issues

```bash
# Full health check with remediation hints
hh doctor

# Check task history and states
hh logs --limit 20

# See raw config
hh config show

# Verbose send with status output
hh send "hello" --json

# Check what H2 is advertising
hh capabilities fetch && hh capabilities show --peer <name>
```

If `hh doctor` passes but something still feels wrong, open an issue on [GitHub](https://github.com/CalciferFriend/his-and-hers) with the output of `hh doctor --json`.

---

## See also

- [`hh doctor`](/reference/doctor) — automated health check
- [`hh status`](/reference/status) — live peer status
- [`hh logs`](/reference/logs) — task history
- [`hh config`](/reference/config) — view and edit config
