# `hh completion`

Print a shell completion script to stdout. Source it once to get tab completion for all `hh` commands, subcommands, and flags.

## Synopsis

```
hh completion [shell] [options]
```

| Argument | Description |
|----------|-------------|
| `shell`  | Target shell: `bash`, `zsh`, `fish`, or `powershell`. Auto-detected from `$SHELL` if omitted. |

## Options

| Flag | Description |
|------|-------------|
| `--no-hint` | Suppress the install hint written to stderr |

## Supported Shells

| Shell | Install method |
|-------|---------------|
| bash | `eval "$(hh completion bash)"` |
| zsh | `eval "$(hh completion zsh)"` |
| fish | `hh completion fish \| source` |
| PowerShell | `hh completion powershell \| Out-String \| Invoke-Expression` |

## Quickstart

### bash

```bash
# Temporary (current session)
eval "$(hh completion bash)"

# Permanent — add to ~/.bashrc or ~/.bash_profile
echo 'eval "$(hh completion bash)"' >> ~/.bashrc
source ~/.bashrc
```

### zsh

```zsh
# Temporary (current session)
eval "$(hh completion zsh)"

# Permanent — add to ~/.zshrc
echo 'eval "$(hh completion zsh)"' >> ~/.zshrc
source ~/.zshrc
```

### fish

```fish
# Temporary (current session)
hh completion fish | source

# Permanent — save to completions directory
hh completion fish > ~/.config/fish/completions/hh.fish
```

### PowerShell

```powershell
# Temporary (current session)
hh completion powershell | Out-String | Invoke-Expression

# Permanent — add to your $PROFILE
Add-Content $PROFILE "`nhh completion powershell | Out-String | Invoke-Expression"
```

## What Gets Completed

Once installed, pressing <kbd>Tab</kbd> after `hh` completes:

- **Top-level subcommands** — `send`, `status`, `doctor`, `schedule`, etc.
- **Sub-subcommands** — `hh capabilities <Tab>` → `scan`, `advertise`, `fetch`, `show`, `route`
- **Flags** — `hh send --<Tab>` → `--peer`, `--wait`, `--timeout`, `--notify`, …
- **Per-command context** — flags only show for the subcommand they apply to

### Example session

```
$ hh <Tab>
onboard  pair     status   wake     send     replay   cancel   result
heartbeat  task-status  doctor  budget  capabilities  peers  discover
logs     config   test    upgrade  monitor  watch    schedule  notify
chat     prune    export  completion

$ hh send --<Tab>
--peer  --wait  --timeout  --auto  --latent  --auto-latent  --notify  --max-retries  --dry-run

$ hh schedule <Tab>
add  list  remove  enable  disable  run
```

## Auto-detection

If you omit the shell argument, `hh completion` reads `$SHELL` and infers:

| `$SHELL` value | Inferred shell |
|----------------|----------------|
| `/bin/bash` | bash |
| `/bin/zsh` | zsh |
| `/usr/bin/fish` | fish |
| *(Windows / no `$SHELL`)* | powershell |

If detection fails, an error is printed and the command exits with code 1.

## Keeping completions up to date

Completions are embedded in the binary — no network access required. When you upgrade `hh`, re-run the install command to pick up new subcommands and flags:

```bash
# bash — re-evaluate to pick up changes
eval "$(hh completion bash)"
```

Or re-run `hh upgrade` and re-source your shell config.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Script printed successfully |
| `1` | Unknown shell or detection failed |

## See also

- [`hh upgrade`](/reference/upgrade) — keep `hh` up to date
- [`hh config`](/reference/config) — read and write configuration values
- [`hh doctor`](/reference/doctor) — diagnose connectivity issues
