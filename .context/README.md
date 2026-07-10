# .context/ — Cross-Tool AI Memory Layer

This folder mirrors the important parts of `.claude/memory/` in a tool-agnostic
format so that Cursor, Windsurf, Copilot, Cline, or any other AI coding agent
(not just Claude Code) can pick up the same project context.

- `.claude/` → Claude Code specific (commands, skill cache, task board)
- `.context/` → Portable summary any AI agent can read on open

## Read Order (any agent)

1. `.context/project.md` — what this project is, stack, purpose
2. `.context/architecture.md` — system layers, data flow, key decisions
3. `.context/agents/*.md` — role-scoped agent briefs for this codebase
4. `.context/decisions/*.md` — dated architecture decision records

## Keeping in sync

Whenever `.claude/memory/context.md` or `architecture.md` changes in a
meaningful way, reflect the summary here too. This file is intentionally
lighter-weight than `.claude/memory/` — think "onboarding doc", not full log.
