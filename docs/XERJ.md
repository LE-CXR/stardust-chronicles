# XERJ（与 Codex 协作）

本地 AI 搜索引擎，不是某个人。节点默认 `http://127.0.0.1:9200`。

## 本仓

- Cursor 项目 MCP：`.cursor/mcp.json`（指向 LE-desk 上的 `xerj.exe`）
- Codex 用户级：`~/.codex/config.toml` → `[mcp_servers.xerj]`
- 索引前缀：`stardust`（`xerj autoindex <clone> --url http://127.0.0.1:9200 --prefix stardust`）

## 常用

```bash
xerj search --url http://127.0.0.1:9200 --prefix stardust "<关键词>"
```

化学数值只许站点已有字段（CIAAW / NIST），勿编造。
