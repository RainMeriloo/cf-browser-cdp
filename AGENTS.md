# AGENTS.md — cf-browser-cdp

## Project Overview

A Cloudflare Worker that proxies Chrome DevTools Protocol (CDP) to Cloudflare's Browser Rendering service, enabling remote headless browser control via WebSocket. The worker handles authentication, session acquisition, and binary message chunking for CDP traffic.

- **Runtime**: Cloudflare Workers (with `nodejs_compat` flag)
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm (v10.28.x)
- **Entry Point**: `src/index.ts`

## Architecture

```
src/
├── index.ts    # Worker entry: fetch handler, token authentication
└── cdp.ts      # CDP proxy: WebSocket tunneling, binary chunking protocol
```

- `index.ts` — Exports the Worker `fetch` handler. Verifies `BROWSER_TOKEN` via Bearer header or `?token=` query param.
- `cdp.ts` — Core logic. Acquires browser sessions via `BROWSER` binding, proxies CDP WebSocket traffic with a custom 4-byte little-endian length-prefixed chunking protocol (max chunk: ~1MB).

### Cloudflare Bindings (defined in `worker-configuration.d.ts`)

- `BROWSER: Fetcher` — Browser Rendering API binding
- `BROWSER_TOKEN?: string` — Optional auth token (secret)

Environment is accessed via `import { env } from 'cloudflare:workers'`, NOT the handler's `env` parameter.

## Build & Dev Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start local dev server (wrangler dev --ip 0.0.0.0)
pnpm start            # Start local dev server (wrangler dev)
pnpm deploy           # Deploy to Cloudflare (wrangler deploy)
pnpm cf-typegen       # Regenerate worker-configuration.d.ts (wrangler types)
pnpm lint             # Run formatter + linter (oxfmt && oxlint)
```

### Testing

No test framework is configured. There are no tests in this project.

## Code Style

### Formatting (oxfmt)

Configured in `.oxfmtrc.json`:

- **Single quotes**: `'value'` not `"value"`
- **No semicolons**: Omit trailing semicolons
- **Spaces for indentation** (2-space indent)
- **LF line endings**, UTF-8 charset
- **Trailing newline** at end of file

### Linting (oxlint)

Uses `oxlint` with default rules. No custom config file. Run `pnpm lint` to check.

### TypeScript

- **Target**: ES2024
- **Module**: ES2022 with Bundler resolution
- **Strict mode**: Enabled (all strict checks)
- `noEmit: true` — Wrangler handles bundling
- `isolatedModules: true` — Each file must be independently transpilable

### Imports

- Use ES module imports exclusively
- Cloudflare-specific: `import { env } from 'cloudflare:workers'`
- Relative imports for local modules: `import { proxyCdp } from './cdp'`
- No file extensions in import paths

### Naming Conventions

- **Functions**: `camelCase` — `verifyToken`, `proxyCdp`, `createDecoder`
- **Constants**: `UPPER_SNAKE_CASE` — `CDP_HOST`, `MAX_CHUNK`, `HEADER`
- **Variables**: `camelCase` — `textEncoder`, `sessionId`, `upstream`
- **Types/Interfaces**: `PascalCase` — defined via `Cloudflare.Env` namespace pattern
- **Files**: `kebab-case` or short lowercase — `index.ts`, `cdp.ts`

### Error Handling

- WebSocket event handlers use bare `try-catch` blocks that swallow errors silently (`catch {}`). This is intentional — WebSocket errors in background event listeners should not crash the worker.
- HTTP errors return explicit `Response` objects with status codes (401, 1011).
- Use `ws.close(code, reason)` for WebSocket error signaling.
- Avoid throwing exceptions in async WebSocket flows; handle gracefully.

### Patterns Used in This Codebase

- **`satisfies` operator**: `export default { fetch: handleFetch } satisfies ExportedHandler<Cloudflare.Env>` — ensures type safety on the default export
- **WebSocketPair destructuring**: `const [client, server] = Object.values(new WebSocketPair())`
- **Closure-based state**: `createDecoder()` returns a stateful closure for accumulating chunked binary data
- **No classes**: Pure functions and closures only
- **No external runtime deps**: Only Cloudflare Workers built-in APIs and Web Platform APIs
- **Minimal code**: Two source files, ~180 lines total. Keep it simple.

### Binary Data

- Use `Uint8Array` for binary buffers, `DataView` for reading/writing integers
- Use `TextEncoder`/`TextDecoder` for string↔binary conversion
- Module-level singleton instances: `const textEncoder = new TextEncoder()`

## Configuration Files

| File                        | Purpose                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `wrangler.jsonc`            | Cloudflare Worker config (name, bindings, compat flags)                            |
| `tsconfig.json`             | TypeScript compiler options                                                        |
| `.oxfmtrc.json`             | Formatter config (single quotes, no semis, spaces)                                 |
| `.editorconfig`             | Editor defaults (LF, UTF-8, trim trailing whitespace)                              |
| `worker-configuration.d.ts` | Auto-generated types — **do not edit manually**, regenerate with `pnpm cf-typegen` |

## Key Constraints

1. **No external runtime dependencies** — Only devDependencies. The worker runs on Cloudflare's runtime with zero npm packages at runtime.
2. **`worker-configuration.d.ts` is generated** — Never edit it. Run `pnpm cf-typegen` after changing `wrangler.jsonc` bindings.
3. **WebSocket message size limit** — CDP messages are chunked with a 4-byte LE header prefix because of Cloudflare's ~1MB WebSocket frame limit.
4. **Environment via module import** — Use `import { env } from 'cloudflare:workers'`, not the `env` parameter passed to the fetch handler.
5. **Minified in production** — `"minify": true` in `wrangler.jsonc`. Source maps are uploaded.
6. **Keep it minimal** — This is a small, focused proxy. Avoid adding unnecessary abstractions, frameworks, or dependencies.
