# Cloudflare Browser CDP

[English](./README.md)

通过 CDP（Chrome DevTools Protocol）连接 Cloudflare 浏览器渲染服务。

将 Cloudflare 的 [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) 服务封装为标准的 CDP WebSocket 端点，使得任何支持 CDP 协议的工具都可以直接连接使用。

## 工作原理

```
CDP 客户端 ←→ [Worker: 认证 + 代理] ←→ [Cloudflare Browser Rendering]
```

1. 客户端发起 WebSocket 连接至 Worker
2. Worker 验证 Token，通过 `BROWSER` 绑定调用 `/v1/acquire` 获取浏览器会话
3. Worker 建立到 Cloudflare 浏览器渲染服务的上游 WebSocket 连接
4. 双向透明转发 CDP 消息，使用 4 字节小端序长度前缀对大消息进行分块（适配 Cloudflare ~1MB WebSocket 帧限制）

Worker 同时提供 `/json/version` 端点，返回 CDP 版本信息和 WebSocket 调试地址，兼容标准 CDP 发现协议。

## 使用方式

部署后，Worker URL 即为标准的 CDP 端点（以下示例中用 `CDP_ENDPOINT` 表示）。

### Chrome DevTools MCP

[chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) 让 AI 编码助手通过 Chrome DevTools 控制浏览器。

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

[playwright-mcp](https://github.com/microsoft/playwright-mcp) 通过 Playwright 提供浏览器自动化 MCP 服务。

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

[agent-browser](https://github.com/vercel-labs/agent-browser) 是面向 AI Agent 的浏览器自动化 CLI。

```bash
agent-browser --cdp "wss://CDP_ENDPOINT?token=YOUR_TOKEN" open https://example.com
agent-browser snapshot -i
agent-browser click @e1
```

## 服务端配置

### 前置条件

- 开通了 [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) 的 Cloudflare 账户（[免费套餐](https://developers.cloudflare.com/browser-rendering/pricing/)每天 10 分钟，付费套餐每月 10 小时）
- 安装 [Node.js](https://nodejs.org/) 和 [pnpm](https://pnpm.io/)

### 部署

```bash
git clone https://github.com/miantiao-me/cf-browser-cdp.git
cd cf-browser-cdp
pnpm install
pnpm deploy
```

### 认证 Token

```bash
npx wrangler secret put BROWSER_TOKEN
```

所有请求需要携带认证信息：

- **Authorization 请求头**：`Authorization: Bearer <token>`
- **URL 查询参数**：`?token=<token>`（适用于 WebSocket 连接）

### 查询参数

| 参数         | 默认值   | 说明                                |
| ------------ | -------- | ----------------------------------- |
| `token`      | —        | 认证 Token（适用于 WebSocket 连接） |
| `keep_alive` | `120000` | 浏览器会话保活时长，单位为毫秒      |

### 环境变量

| 变量            | 必填 | 说明       |
| --------------- | ---- | ---------- |
| `BROWSER_TOKEN` | 是   | 认证 Token |

### Cloudflare 绑定

| 绑定      | 类型              | 说明                                           |
| --------- | ----------------- | ---------------------------------------------- |
| `BROWSER` | Browser Rendering | 浏览器渲染服务绑定，在 `wrangler.jsonc` 中配置 |

## 开发

```bash
pnpm dev        # 启动本地开发服务器 (0.0.0.0)
pnpm start      # 启动本地开发服务器 (localhost)
pnpm lint       # 运行格式化检查和代码检查
pnpm cf-typegen # 重新生成 Cloudflare 绑定类型
```

## 许可证

MIT
