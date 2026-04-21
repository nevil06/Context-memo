# context-memo 🧠

**Persistent AI memory layer for developers**

Switch AI coding agents without losing context. One command scans your project and generates a master memory file that any new agent can read to instantly understand your codebase.

## The Problem

When working with AI coding agents (Claude, Cursor, Windsurf, Copilot, etc.) and your credits run out or you switch accounts — the new AI agent has ZERO memory of the project. You waste time and tokens re-explaining everything from scratch.

## The Solution

`context-memo` combines two approaches:

1. **Knowledge graph** (like Graphify) — deep code understanding, component mapping, dependency graph, critical nodes
2. **Task continuation layer** — progress %, what works, what's broken, exact file+line to continue from, decision log, handoff message

One command generates `.recall/memory.yaml` that any AI agent can read to get instant context.

## Features

- 🔍 **Smart project scanning** — analyzes code, configs, docs, git history
- 🧠 **Knowledge graph** — maps components, dependencies, critical nodes
- 📊 **Progress tracking** — what works, what's broken, what's missing
- 🎯 **Exact continuation** — tells next agent exactly where to continue
- 📝 **Decision log** — tracks key architectural decisions
- 🤖 **Agent integration** — works with Claude, Cursor, Windsurf, Copilot, Aider, etc.
- 🆓 **100% free** — uses Gemini 1.5 Flash API (no credit card needed)

## Installation

```bash
npm install -g context-memo
```

## Quick Start

```bash
# 1. Initialize in your project
memo init

# 2. Set your free Gemini API key
memo config --key YOUR_KEY

# 3. Scan your project
memo scan

# 4. Load the briefing (copies to clipboard)
memo load
```

Paste the briefing into your AI agent and it instantly understands your entire project.

## Getting a Free Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key" (no credit card required)
3. Copy your key
4. Run: `memo config --key YOUR_KEY`

## Commands

### `memo init`
Initialize `.recall/` folder in your project with blank templates.

### `memo scan [--quick]`
Scan entire project and generate memory using Gemini AI.
- Analyzes code, configs, docs, git history
- Builds knowledge graph and task state
- `--quick` flag for faster scan with fewer files

### `memo load [--mode=quick|full|onboard]`
Load and display agent briefing (copies to clipboard).
- `full` (default): Complete briefing (~2000 tokens)
- `quick`: Condensed briefing (~400 tokens)
- `onboard`: Full briefing + asks agent to confirm understanding

### `memo status`
Show terminal dashboard with project status, progress, components.

### `memo update [message]`
Update task state and progress interactively.

### `memo install <agent>`
Install context-memo integration for AI agents:
- `claude` → `.claude/CLAUDE.md`
- `cursor` → `.cursor/rules/context-memo.md`
- `windsurf` → `.windsurf/rules/context-memo.md`
- `copilot` → `.github/copilot-instructions.md`
- `aider` → `.aider.conf.yml`
- `antigravity` → `.antigravity/rules.md`

### `memo config [--key KEY] [--show]`
Configure settings (API key stored at `~/.recall/config.json`).

## How It Works

1. **Scan**: `memo scan` walks your project, reads code/configs/docs, analyzes git history
2. **Analyze**: Sends context to Gemini 1.5 Flash to build knowledge graph + task state
3. **Generate**: Creates `.recall/memory.yaml` with complete project understanding
4. **Load**: `memo load` generates agent briefing and copies to clipboard
5. **Handoff**: Paste into any AI agent — they instantly understand your project

## Memory Structure

`.recall/memory.yaml` contains:

- **Project DNA**: name, purpose, stack, constraints
- **Knowledge Graph**: components, dependencies, data flow, god nodes
- **Progress**: what works, what's broken, what's missing, tech debt
- **Task State**: last task, current problem, exact continuation point
- **Decisions**: key architectural decisions with reasoning
- **Handoff Message**: 4-6 sentence summary for new agents

## Example Workflow

```bash
# Day 1: Start project with Claude
memo init
memo scan
memo load  # Paste into Claude

# ... work with Claude until credits run out ...

# Day 2: Switch to Cursor
memo update  # Update progress
memo load    # Paste into Cursor
# Cursor instantly knows everything!

# Day 3: Switch to Windsurf
memo load    # Paste into Windsurf
# No re-explanation needed!
```

## Use Cases

- 💳 **Credits ran out** — switch to different AI agent without losing context
- 👥 **Team handoffs** — new developer gets instant project understanding
- 🔄 **Context switching** — return to project after weeks away
- 🤖 **Multi-agent workflows** — use different agents for different tasks
- 📚 **Documentation** — auto-generated project memory as documentation

## File Structure

```
your-project/
├── .recall/
│   ├── memory.yaml        ← Complete project memory
│   ├── task_state.yaml    ← Current task state
│   ├── decisions.log      ← Decision history
│   └── .gitkeep          ← Commit this folder!
```

## Tips

- Run `memo scan` after major changes
- Run `memo update` before switching agents
- Commit `.recall/` folder to git for team sharing
- Use `memo status` for quick project overview
- Use `--quick` flag for faster scans during development

## Tech Stack

- Node.js (ES modules)
- Gemini 1.5 Flash API (free tier)
- commander, js-yaml, chalk, inquirer, clipboardy

## Requirements

- Node.js >= 18.0.0
- Free Gemini API key

## License

MIT

## Contributing

Issues and PRs welcome!

## Credits

Inspired by:
- Graphify (knowledge graphs for code)
- Agent handoff patterns
- The pain of losing AI context when switching agents

---

**Never lose AI context again. One command. Instant understanding.**
