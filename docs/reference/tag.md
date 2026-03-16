# `hh tag` — Task Tagging & Search

`hh tag` lets you label tasks with tags, then filter and search by tag.
Tags help organise task history for reporting, debugging, and retrieval.

## Subcommands

### `hh tag add <id> <tags...>`

Add one or more tags to a task. The task ID can be a prefix — the first
matching task state file is used.

```bash
hh tag add abc123 deploy prod
hh tag add abc123 deploy --note "Shipped v2.1"
hh tag add abc123 urgent --json
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--note <text>` | Attach a note to the tag record |
| `--json` | Output the updated tag record as JSON |

### `hh tag remove <id> <tags...>`

Remove specific tags from a task. Other tags are preserved.

```bash
hh tag remove abc123 urgent
hh tag remove abc123 deploy prod
```

### `hh tag list [id]`

List tags for a specific task (by ID prefix) or all tagged tasks.

```bash
hh tag list                # All tagged tasks
hh tag list abc123         # Tags for one task
hh tag list --json         # Machine-readable output
hh tag list abc123 --json  # JSON for one task
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### `hh tag search <tag>`

Find all tasks that have a specific tag.

```bash
hh tag search deploy
hh tag search deploy --json
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--json` | Output as JSON |

### `hh tag clear <id>`

Remove all tags from a task. Prompts for confirmation unless `--force`.

```bash
hh tag clear abc123
hh tag clear abc123 --force
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--force` | Skip confirmation prompt |

## Tag Rules

- Tag names must be **lowercase**, **alphanumeric + hyphen** only
- Maximum **32 characters** per tag name
- Maximum **20 tags** per task
- Tags are automatically lowercased and trimmed
- Duplicate tags are deduplicated on add

## Output Format

The `--json` flag on `list` and `search` returns `TagListEntry[]`:

```json
[
  {
    "task_id": "abc12345-...",
    "tags": ["deploy", "prod"],
    "note": "Shipped v2.1",
    "tagged_at": "2026-03-16T10:00:00.000Z",
    "task_summary": "Deploy the app to production"
  }
]
```

## Storage

Tag records are stored at `~/.his-and-hers/tags/<task_id>.json`.

## Use Cases

- **Weekly reviews**: Tag completed tasks by project or sprint
- **Debugging**: Tag tasks that failed for a specific reason (`hh tag search flaky`)
- **Filtering**: Combine with `hh logs` for task history workflows
- **Reporting**: Export tagged tasks for stakeholder reports

## Related

- [`hh logs`](./logs) — task history viewer
- [`hh stats`](./stats) — analytics and heatmaps
- [`hh health-report`](./health-report) — weekly health digest
- [`hh export`](./export) — export task history
