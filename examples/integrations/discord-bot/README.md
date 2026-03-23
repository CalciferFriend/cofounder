# Discord Bot Integration

This example shows how to build a Discord bot that delegates heavy tasks to your H2 peer.

## Features

- Slash commands (`/ask`, `/render`, `/summarize`)
- Automatic task routing based on workload type
- Live progress updates via Discord embeds
- Budget tracking and cost reporting

## Setup

```bash
npm install discord.js @his-and-hers/sdk
```

Set environment variables:

```bash
export DISCORD_TOKEN=your_bot_token
export HH_PEER=glados  # Your H2 peer name
```

## Usage

```bash
node bot.js
```

In Discord:

```
/ask What's the weather in Tokyo?
/render Generate a 4K landscape scene with mountains and a lake
/summarize https://example.com/long-article
```

## How It Works

1. Discord slash command triggers the bot
2. Bot calls `hh.send()` with streaming enabled
3. Bot updates Discord embed as chunks arrive
4. Final result posted when complete
5. Cost tracked and reported

See `bot.js` for full implementation.
