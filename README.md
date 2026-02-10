# Cloudflare Browser CDP

[中文文档](./README.zh-CN.md)

Connect Cloudflare [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) via CDP (Chrome DevTools Protocol).

Wraps Cloudflare's Browser Rendering service as a standard CDP WebSocket endpoint, so any CDP-compatible tool can connect directly.

## How It Works

```
CDP Client ←→ [Worker: Auth + Proxy] ←→ [Cloudflare Browser Rendering]
```

1. Client opens a WebSocket connection to the Worker
2. Worker verifies token, calls `/v1/acquire` via the `BROWSER` binding to obtain a browser session
3. Worker establishes an upstream WebSocket to Cloudflare Browser Rendering
4. CDP messages are transparently forwarded in both directions, with a 4-byte little-endian length-prefixed chunking protocol for large messages (~1MB Cloudflare WebSocket frame limit)

The Worker also serves a `/json/version` endpoint returning CDP version info and WebSocket debugger URL, compatible with the standard CDP discovery protocol.

## Usage

After deployment, the Worker URL is a standard CDP endpoint (`CDP_ENDPOINT` in examples below).

### Chrome DevTools MCP

[chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) lets AI coding agents control a browser via Chrome DevTools.

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest", "--wsEndpoint=wss://CDP_ENDPOINT?token=YOUR_TOKEN"]
    }
  }
}
```

### Playwright MCP

[playwright-mcp](https://github.com/microsoft/playwright-mcp) provides browser automation via Playwright as an MCP server.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--cdp-endpoint=wss://CDP_ENDPOINT?token=YOUR_TOKEN"]
    }
  }
}
```

### Agent Browser

[agent-browser](https://github.com/vercel-labs/agent-browser) is a browser automation CLI for AI agents.

```bash
agent-browser --cdp "wss://CDP_ENDPOINT?token=YOUR_TOKEN" open https://example.com
agent-browser snapshot -i
agent-browser click @e1
```

## Server Configuration

### Prerequisites

- A Cloudflare account with [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) enabled ([Free plan](https://developers.cloudflare.com/browser-rendering/pricing/): 10 min/day, Paid plan: 10 hrs/month)
- [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/)

### Deploy

```bash
git clone https://github.com/miantiao-me/cf-browser-cdp.git
cd cf-browser-cdp
pnpm install
pnpm deploy
```

### Auth Token

```bash
npx wrangler secret put BROWSER_TOKEN
```

All requests must include authentication:

- **Authorization header**: `Authorization: Bearer <token>`
- **URL query parameter**: `?token=<token>` (for WebSocket connections)

### Query Parameters

| Parameter    | Default  | Description                                         |
| ------------ | -------- | --------------------------------------------------- |
| `token`      | —        | Auth token (for WebSocket connections)              |
| `keep_alive` | `120000` | Browser session keep-alive duration in milliseconds |

### Environment Variables

| Variable        | Required | Description                    |
| --------------- | -------- | ------------------------------ |
| `BROWSER_TOKEN` | Yes      | Auth token for securing access |

### Cloudflare Bindings

| Binding   | Type              | Description                                                       |
| --------- | ----------------- | ----------------------------------------------------------------- |
| `BROWSER` | Browser Rendering | Browser Rendering service binding, configured in `wrangler.jsonc` |

## Development

```bash
pnpm dev        # Start local dev server (0.0.0.0)
pnpm start      # Start local dev server (localhost)
pnpm lint       # Run formatter and linter
pnpm cf-typegen # Regenerate Cloudflare binding types
```

## License

MIT
