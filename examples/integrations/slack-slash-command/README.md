# Slack Slash Command Integration

Build a Slack bot that routes commands to your H2 peer for processing.

## Example

In Slack:
```
/hh analyze the latest sales data and generate a summary
/hh render a diagram of our system architecture
/hh search our codebase for all uses of the legacy API
```

## Architecture

```
Slack → Slash Command → Your server (Express) → hh.send() → H2 peer
                            ↓
                    Update Slack with result
```

## Implementation

See `server.js` for a complete Express server that:

1. Receives Slack slash command webhooks
2. Validates Slack signature
3. Sends task to H2 via `@his-and-hers/sdk`
4. Streams progress updates back to Slack
5. Posts final result

## Setup

### 1. Create Slack App

1. Go to https://api.slack.com/apps
2. Create new app → "From scratch"
3. Add Slash Command: `/hh`
   - Request URL: `https://yourserver.com/slack/command`
   - Description: "Delegate tasks to your AI peer"
4. Install app to workspace
5. Copy **Signing Secret** and **Bot Token**

### 2. Configure Server

```bash
export SLACK_SIGNING_SECRET=your_signing_secret
export SLACK_BOT_TOKEN=xoxb-your-bot-token
export HH_PEER=glados
```

### 3. Run Server

```bash
npm install express @slack/web-api @his-and-hers/sdk
node server.js
```

## Features

- ✅ Slash command routing
- ✅ Signature verification
- ✅ Live progress updates (Slack messages update as chunks arrive)
- ✅ Cost tracking (shown in final message)
- ✅ Error handling with helpful messages

## Scaling

For production:
- Use a queue (Redis/RabbitMQ) to handle bursts
- Deploy behind a load balancer
- Add rate limiting per user
- Cache frequent queries
