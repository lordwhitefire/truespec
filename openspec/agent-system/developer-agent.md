# The Developer Agent — everything we discussed

**In one line:** We are adding our own agent called **Developer**. Its job is to build.
It needs two things: the **craft** (how to build well) and the **tools** (the products we use).

---

## 1. Why a Developer agent

- The built-in building agent is good, but generic. It does not know our way of working.
- Our other agents each follow a real method from books or papers:
  - Scraper, Designer, Product Manager (Product Manager uses CIRCLES), Ontology Manager (MOBMAS, Tran 2005).
  - The Architect (me) follows OpenSpec + architecture.
- The Developer should follow a real method too. Not "you do this, you do that."
- **Main reason: fewer errors.** Most mistakes come from using a product wrong
  (Neon, Vercel, Supabase, Sanity...). The company's own skill prevents that.
- Some of these skills also help with general work, like debugging.

---

## 2. The name: Developer, not Engineer

| Word | Means | Whose seat |
|---|---|---|
| Engineer | the whole thing — system, lifecycle, architecture | the Architect |
| Developer | the execution — turning a spec into working code | the Developer (new) |

Development is a part of engineering. We use **Developer** so it does not take the
Architect's seat. The Architect decides what should exist; the Developer builds it.

---

## 3. The built-in Builder (facts)

- It is **not a file**. It is compiled inside the opencode program:
  `/home/lordwhitefire/.opencode/bin/opencode` (version **1.18.35**).
- Its identity, exactly as opencode stores it:

| Field | Value |
|---|---|
| name | `build` |
| description | "The default agent. Executes tools based on configured permissions." |
| mode | `primary` (the default agent) |
| native | `true` (means: built in, not a file) |
| permission | everything, plus `question: allow`, `plan_enter: allow` |

- Its siblings (also built in): `plan` (read-only planning), `general` (research,
  multi-step), `explore` (fast search). Each has its own identity text.
- Its opening prompt (pulled out of the binary):
  > "You are opencode, an interactive CLI tool that helps users with software engineering tasks..."
  Its rules: be short and direct, no preamble, no emojis, never guess URLs.

---

## 4. What we can and cannot do to the built-in

- **Cannot** edit it. There is no file to edit.
- **Can** override its fields: `agent: { build: { ... } }` in config (model, permissions).
- **Can** turn it off: `disable: true`.
- **Our choice (Option B):** make our own agent file, like `scraper-agent.md`.
  That new file is the Developer.

---

## 5. The Developer needs two layers

| Layer | What it is | Where it lives |
|---|---|---|
| Craft (identity) | the method — how to build well | the Developer's own file |
| Tools (knowledge) | the products — Neon, Vercel, Supabase, Sanity, Osmani | the skills layer |

Skills are separate from the agent. The agent is found as a file; the skills are found
automatically. So "our Developer should know Neon and Vercel" is solved by the
skills layer, not by editing the agent.

---

## 6. The craft (the method, from books)

The Developer's method is **software construction** — the part of software engineering
that owns building. Anchored in real sources:

| Source | What it is |
|---|---|
| **SWEBOK** — "Software Construction" knowledge area (IEEE Computer Society) | the accepted body of knowledge |
| **Code Complete** — Steve McConnell, 2004 | "A practical handbook of software construction" |
| **The Pragmatic Programmer** — Hunt & Thomas | the craft habits |

In practice: build what the spec says; never change the architecture; if the spec is
wrong, stop and report.

---

## 7. The tools (the skills)

- A skill is a folder containing one `SKILL.md` file. The agent reads it when it fits
  the task. It is just instructions, not code.
- Skills are **data** — they are discovered automatically. The agent does not change.

| Skill pack | Who makes it | What it teaches |
|---|---|---|
| `addyosmani/agent-skills` | Addy Osmani | engineering craft across the whole lifecycle (25 skills) |
| `vercel-labs/agent-skills` | Vercel | Next.js, React, deploy, UI rules |
| `vercel-labs/skills` | Vercel Labs | the **tool** that installs skills (`npx skills`) |
| Neon skills | Neon | how to use Neon (already installed) |

- Already named but to confirm: **Supabase**, **Sanity** — same pattern.
- To check: does **GitHub** publish agent skills?

---

## 8. Where skills are found (paths)

- Global: `~/.config/opencode/skills/`
- Project: `.opencode/skills/`
- External (auto): `~/.claude/skills/`, `~/.agents/skills/`
- Extra paths set in `~/.config/opencode/opencode.jsonc`
  (currently: `alpha-mini`, and the video-editing framework)
- Install command: `npx skills add <owner/repo>` (add `-g` to install for all projects)

---

## 9. Where things live (absolute paths)

| Thing | Absolute path |
|---|---|
| Built-in Builder (inside the program) | `/home/lordwhitefire/.opencode/bin/opencode` |
| Global config (Neon MCP) | `/home/lordwhitefire/.config/opencode/opencode.json` |
| Global config (plugins, skills paths, GitHub MCP) | `/home/lordwhitefire/.config/opencode/opencode.jsonc` |
| Our agent files | `/home/lordwhitefire/.config/opencode/agent/` |
| Installed global skills | `/home/lordwhitefire/.config/opencode/skills/` |
| Project skills | `/home/lordwhitefire/current-project/truespec/.opencode/skills/` |
| **This document** | `/home/lordwhitefire/current-project/truespec/openspec/agent-system/developer-agent.md` |

---

## 10. The bigger point

Product companies are starting to publish skills for using their products.
This will become normal. The Developer's knowledge then comes from these skills,
so it stays correct without us rewriting the agent.

---

## 11. Facts vs decisions

- **Facts:** the built-in Builder's identity, the paths, the skill packs, the version.
- **Decisions:** the name "Developer"; Option B (our own agent file);
  craft anchored in SWEBOK + Code Complete + The Pragmatic Programmer.

---

## 12. Still to confirm

1. Does GitHub publish agent skills?
2. Do Supabase and Sanity publish skills?
3. Where the Developer agent file itself should live (proposed: `.opencode/agent/developer.md`).
