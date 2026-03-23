# GitHub Actions Integration

Use his-and-hers in CI to delegate heavy compute tasks to your H2 peer.

## Official Action

```yaml
- uses: CalciferFriend/his-and-hers@v0.3.0
  with:
    task: "Run the full test suite with coverage"
    peer: glados
    timeout: 600
```

The action handles:
- Installing `hh` CLI
- Writing config from secrets
- Running the task with `hh ci`
- Capturing output and cost

## Custom Implementation

If you need more control, use `hh ci` directly:

```yaml
- name: Install his-and-hers
  run: npm install -g his-and-hers@latest

- name: Configure hh
  env:
    HH_CONFIG: ${{ secrets.HH_CONFIG_BASE64 }}
  run: |
    mkdir -p ~/.his-and-hers
    echo "$HH_CONFIG" | base64 -d > ~/.his-and-hers/hh.json

- name: Run task
  run: |
    hh ci "Run pytest with coverage and upload to codecov" \
      --json \
      --output-file result.txt

- name: Post result
  run: cat result.txt
```

## Secrets Setup

1. Export your hh config:
   ```bash
   cat ~/.his-and-hers/hh.json | base64 > config.b64
   ```

2. Add as GitHub secret `HH_CONFIG_BASE64`

3. Reference in workflow (see above)

## Use Cases

- **Heavy test suites** — offload to GPU-enabled H2
- **Build artifacts** — compile native binaries on different architectures
- **Data processing** — ETL jobs that need more RAM/CPU
- **ML inference** — run model predictions in CI without expensive runners

## Cost Savings

GitHub Actions charges ~$0.08/min for 2-core runners. If you offload to a local H2 with Ollama, you pay $0 for compute (just your own hardware).

For a 10-minute test suite running 50x/month:
- GitHub Actions: $40/mo
- his-and-hers + local H2: $0/mo
