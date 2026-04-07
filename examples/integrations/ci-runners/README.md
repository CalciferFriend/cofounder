# CI Runner Integrations

Use his-and-hers in your CI/CD pipelines to offload compute-intensive tasks to your H2 node.

## GitHub Actions

See `../github-action/README.md` for the official action.

## GitLab CI

```yaml
# .gitlab-ci.yml
test:
  stage: test
  image: node:22-alpine
  before_script:
    - npm install -g his-and-hers
    - hh config set peer_node.hostname $H2_HOSTNAME
    - hh config set peer_node.ssh_user $H2_USER
    - echo "$H2_SSH_KEY" > ~/.ssh/id_ed25519
    - chmod 600 ~/.ssh/id_ed25519
  script:
    - hh send --wait --peer glados "Run full test suite with coverage"
  variables:
    H2_HOSTNAME: "100.x.x.x"
    H2_USER: "ci"
  only:
    - merge_requests
```

**Environment variables:**
- `H2_HOSTNAME` — Tailscale IP of your H2 node
- `H2_USER` — SSH user on H2
- `H2_SSH_KEY` — Private SSH key (add as protected variable)

---

## CircleCI

```yaml
# .circleci/config.yml
version: 2.1

jobs:
  test:
    docker:
      - image: cimg/node:22.0
    steps:
      - checkout
      - run:
          name: Install his-and-hers
          command: npm install -g his-and-hers
      - run:
          name: Configure H2 connection
          command: |
            hh config set peer_node.hostname $H2_HOSTNAME
            hh config set peer_node.ssh_user $H2_USER
            echo "$H2_SSH_KEY" | base64 -d > ~/.ssh/id_ed25519
            chmod 600 ~/.ssh/id_ed25519
      - run:
          name: Run tests on H2
          command: hh send --wait "npm test"

workflows:
  test:
    jobs:
      - test:
          context: h2-credentials
```

**Context variables (h2-credentials):**
- `H2_HOSTNAME`
- `H2_USER`
- `H2_SSH_KEY` (base64-encoded)

---

## Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        H2_HOSTNAME = credentials('h2-hostname')
        H2_USER = credentials('h2-user')
        H2_SSH_KEY = credentials('h2-ssh-key')
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm install -g his-and-hers'
                sh 'hh config set peer_node.hostname $H2_HOSTNAME'
                sh 'hh config set peer_node.ssh_user $H2_USER'
                sh 'echo "$H2_SSH_KEY" > ~/.ssh/id_ed25519'
                sh 'chmod 600 ~/.ssh/id_ed25519'
            }
        }
        
        stage('Test') {
            steps {
                sh 'hh send --wait "Run full test suite"'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh 'hh send --wait --peer deploy-node "Deploy to production"'
            }
        }
    }
}
```

**Jenkins credentials:**
- `h2-hostname` (Secret text)
- `h2-user` (Secret text)
- `h2-ssh-key` (Secret file or text)

---

## Buildkite

```yaml
# .buildkite/pipeline.yml
steps:
  - label: ":test_tube: Test on H2"
    command: |
      npm install -g his-and-hers
      hh config set peer_node.hostname $H2_HOSTNAME
      hh config set peer_node.ssh_user $H2_USER
      echo "$$H2_SSH_KEY" > ~/.ssh/id_ed25519
      chmod 600 ~/.ssh/id_ed25519
      hh send --wait "npm test"
    agents:
      queue: default
```

**Environment variables (set in Buildkite UI):**
- `H2_HOSTNAME`
- `H2_USER`
- `H2_SSH_KEY`

---

## Common Patterns

### Wake H2 before running task

```bash
hh wake glados --wait
hh send --wait "Heavy computation task"
```

### Route based on capabilities

```bash
# Automatically picks GPU node if available
hh send --auto "Generate 10 images of cats"
```

### Stream progress updates

```bash
hh send --wait "Long running job with progress" | tee build.log
```

### Fail fast on CI

```bash
# Exit with non-zero code if task fails
hh send --wait "pytest" || exit 1
```

### Parallel execution across multiple H2s

```bash
# Run tests in parallel on multiple nodes
hh send --peer glados "pytest tests/unit" &
hh send --peer glados-2 "pytest tests/integration" &
wait
```

---

## Security Best Practices

1. **Use SSH keys, not passwords** — Store private keys as CI secrets
2. **Restrict SSH access** — Create dedicated CI user on H2 with limited permissions
3. **Use Tailscale** — Never expose H2 to public internet
4. **Rotate keys regularly** — Especially for shared/organization-wide CI
5. **Audit logs** — Enable `hh audit` to track all CI-initiated tasks

---

## Troubleshooting

### CI job hangs waiting for H2

**Cause:** H2 node is asleep or unreachable

**Fix:** Add wake step before task:
```bash
hh wake glados --wait --timeout 30000
```

### SSH authentication fails

**Cause:** Key permissions or format issue

**Fix:**
```bash
chmod 600 ~/.ssh/id_ed25519
ssh-keygen -y -f ~/.ssh/id_ed25519  # Verify key is valid
```

### Task times out

**Cause:** Default timeout too short for heavy tasks

**Fix:**
```bash
hh send --wait --timeout 600000 "Long task"  # 10 minutes
```

---

## More Examples

See `../github-action/` for a production-ready GitHub Action wrapper.
