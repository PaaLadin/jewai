# Cross-agent RAG via GitHub raw (one-way, for external agents)

**Status:** proposed 2026-10-26 by Alice (F), recorded by C (Semyon, 5C).
**Problem:** external agents (Alice, Qwen on hosted platforms) cannot run
our local bridge — they have no filesystem, no Python agent on 8768/9222.
They can only produce text in chat.
**Solution (Alice):** publish selected RAG files to a **public** GitHub
repository that JewAI already mirrors, and give the external agent a
**raw.githubusercontent.com** URL. They fetch the page by URL and read it
without copy-paste.

## Scope: ONE-WAY ONLY

- Live -> GitHub -> external agent.
- External agent **cannot** write back to our disk.
- For writes from external agents: their text is copied into the repo
  by a human (operator or on-duty agent), then pulled to live.
- No bidirectional sync. Bidirectional sync risks secrets, private
  logs, and self-referential loops.

## What goes to the public repo

Allowed:
- `rag/procedures/*` (no personal data, no secrets)
- `rag/gamedev/*`
- `rag/knowledge/*`
- `algorithms/*`
- `emergency/0_ACTIVATION.md` (template version, without channel data)

Forbidden (same as `assistant/secrets_policy.md`):
- `logs/*` — dневники, чаты, личные переписки
- `.secrets/*`, `config.json` (already in .gitignore)
- real email addresses, tokens, API keys
- personal data of operator or third parties

Sanitization check before every push (rule from 2C NOTES 2026-10-11):
if `jewai` release contains `@example.com` placeholders and live has real
emails — that is **deliberate sanitization**. Do NOT merge live into the
release repo.

## URL pattern

    https://raw.githubusercontent.com/PaaLadin/jewai/main/<path>

Example: `.../main/rag/procedures/behavior_rules.md`.

## Delivery protocol

1. On-duty agent (any channel) prepares the file in `git/jewai/` working copy
   (a clean checkout, not live).
2. `git add` + `git commit` + `git push` after pre-push checklist
   (`algorithms/github_release.md`).
3. Operator (or agent with CDP to Alice's tab) sends Alice the raw URL via
   `bridge_kick3.py --port 9227`.
4. Alice fetches and quotes what she needs. Her response is plain text in
   her chat; it goes through the same kick channel back to us.

## Why not our bridge

Alice refuses to wrap her messages in `### BEGIN ### ... 