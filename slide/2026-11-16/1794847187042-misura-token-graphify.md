# One question. 13,412 tokens. Or 840.

*Measured on Nov 16, 2026 by @shipwithagents. Real numbers on a real app, not a README.*

## The test
Question: **"How does the `/api/jev` route work and where does it save data?"**
Codebase: my own Node app (74 source files, ~780 KB of JavaScript, no frameworks).

| Way | What goes into context | Tokens |
|---|---|---|
| Claude Code, no tools | reads `server.js` (38 KB) + 2 libs to find the route, the model and the log | **13,412** |
| Graphify, `--depth 1` | 22 nodes: route → `jev()` → `post()`, `registra()` → `store.scrivi('jev-registro')` | **~840** |
| Graphify, default depth 2 | 105 nodes, 304 edges | ~7,700 |
| Headroom on the same 3 files | same files | 13,412 (saved 0) |

**Result: −94% at depth 1. Only −43% at default depth.** The answer from the graph was correct.

## Do it yourself (2 minutes)
```bash
uv tool install graphifyy          # package name has two y's
cd your-repo
graphify update . --no-cluster     # builds the graph, no LLM calls (1.7 s for 74 files)
graphify query "how does X work" --seed "<function name>" --depth 1
```
Then give Claude the query output instead of letting it open the files.

## What didn't work
- **Headroom saves 0 on source code.** It compresses logs, JSON and tool outputs (it claims 60–95% on JSON). Use it as a proxy for tool results, not on your repo.
- **`--budget` doesn't cut**: if all nodes fit, Graphify prints everything. The lever is `--depth`.
- Token counts are measured on the context Claude would need to read, with Headroom's Claude tokenizer, not from a billing screen.

## Links
- Graphify: https://github.com/Graphify-Labs/graphify
- Headroom: https://github.com/headroomlabs-ai/headroom

Shipped. See you Monday.
