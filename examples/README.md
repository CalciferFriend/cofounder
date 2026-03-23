# Examples — his-and-hers

This directory contains real-world examples of how to use his-and-hers for common workflows.

## Directory Structure

- **workflows/** — Named workflow definitions (ready to import with `hh workflow add`)
- **pipelines/** — Pipeline JSON files (ready to run with `hh pipeline --file`)
- **integrations/** — Integration guides and code samples (Discord bots, GitHub Actions, etc.)

## Quick Start

### Import a workflow

```bash
hh workflow add daily-standup --file examples/workflows/daily-standup.json
hh workflow run daily-standup
```

### Run a pipeline

```bash
hh pipeline --file examples/pipelines/code-review-chain.json
```

### Use in CI

```yaml
# .github/workflows/test.yml
- uses: CalciferFriend/his-and-hers@v0.3.0
  with:
    task: "Run the full test suite and report coverage"
    peer: glados
```

## Available Examples

### Workflows

- `daily-standup.json` — Morning digest: git log + calendar + email summary
- `code-review.json` — PR review chain: fetch diff → analyze → suggest improvements
- `image-generation.json` — Batch image generation with quality check
- `data-pipeline.json` — ETL workflow: fetch → clean → transform → upload

### Pipelines

- `code-review-chain.json` — Multi-step code review with automated fixes
- `research-summary.json` — Web research → summarise → post to Slack
- `video-render.json` — Batch video render with progress notifications

### Integrations

- `discord-bot/` — Discord bot using `@his-and-hers/sdk`
- `github-action/` — Custom GitHub Action wrapper
- `slack-slash-command/` — Slack slash command integration
- `ci-runners/` — GitLab CI, CircleCI, Jenkins examples

## Contributing

Have a useful workflow? Open a PR! We'd love to see what you're building.
