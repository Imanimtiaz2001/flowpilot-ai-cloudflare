# FlowPilot AI — submission status

FlowPilot AI turns a natural-language goal into a persistent milestone plan, tracks task completion, remembers constraints, and adapts through a streaming AI chat powered by Cloudflare Workers AI.

- **Temporary preview URL:** https://flowpilot-ai-cloudflare.nosy-course.workers.dev — HTML and health checked; short-lived account, not a permanent submission URL
- **GitHub URL:** https://github.com/Imanimtiaz2001/flowpilot-ai-cloudflare (repository created; project upload in progress)
- **Requirements:** Workers AI Llama 3.3 configured; Agents SDK/Durable Object coordination; React streaming chat; SQLite-backed persistent state and chat.
- **Technical highlights:** typed Zod plan schema, server-side model tools, real task mutation and derived progress, responsive workspace, 3 domain tests.
- **Verification:** typecheck, lint, tests, and build passed. The WebSocket Agent handshake returned initial durable state. The full AI/chat scenario remains blocked by Workers AI error 5034 on the temporary preview account; `wrangler whoami` reports no user account login. `/` and `/health` returned HTTP 200.
- **Run locally:** `npm install && npx wrangler login && npm run dev`.
- **Prompt history:** [PROMPT_HISTORY.md](PROMPT_HISTORY.md) contains an honest summary of the instructions and AI-assisted work. The verbatim original prompt is omitted from the public repository after GitHub approval review blocked its publication as private user-authored text; it remains in the private archive.

This document is an accurate preparation status, not a claim that permanent deployment or GitHub publishing succeeded.
