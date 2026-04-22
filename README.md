# context-memo 🧠

**Hybrid AI Memory Layer: Local Knowledge Graph + AI-Powered Reasoning**

Never lose context when switching AI coding agents. context-memo combines local code analysis (Graphify-style) with AI-powered task reasoning to create persistent memory that survives agent switches.

## The Problem

When working with AI coding agents (Claude, Cursor, Windsurf, Copilot, etc.) and your credits run out or you switch accounts — the new AI agent has ZERO memory of the project. You waste time and tokens re-explaining everything from scratch.

## The Solution

`context-memo` uses a **hybrid approach**:

1. **Local Knowledge Graph** (Graphify-style) — Zero-cost code understanding
   - Analyzes imports, exports, functions, classes
   - Maps dependencies and relationships
   - Identifies "god nodes" (critical components)
   - 100% private, runs locally

2. **AI-Powered Reasoning** (Gemini API) — Smart task continuation
   - Understands project purpose and progress
   - Tracks what works, what's broken, what's missing
   - Provides exact continuation points
   - Generates handoff messages

3. **Incremental Updates** — Minimal token usage
   - Detects changed files using hashes
   - Only sends changes to API (not full codebase)
   - Saves 60-90% tokens on subsequent scans
   - Local-only mode available (--local flag)

## Features

- 🔍 **Local Knowledge Graph** — Analyzes code structure without API calls
- 🧠 **AI-Powered Reasoning** — Uses Gemini for deep insights
- 📊 **Incremental Updates** — Only scans changed files (saves 60-90% tokens)
- � **Privacy Mode** — Local-only scanning (--local flag)
- 🎯 **Exact Continuation** — Tells next agent exactly where to continue
- 📝 **Decision Log** — Tracks key architectural decisions
- 🤖 **Agent Integration** — Works with Claude, Cursor, Windsurf, Copilot, Aider, etc.
- 👀 **Auto-Scan** — Watch mode for active development
- 🆓 **100% free** — Uses Gemini 2.5 Flash Lite API (no credit card needed)
- 💰 **Token Efficient** — Incremental scans save massive amounts of tokens

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

### `memo scan [--quick] [--local]`
Scan entire project and generate memory.

**Modes:**
- **First scan**: Full analysis with AI
- **Subsequent scans**: Incremental (only changed files) — saves 60-90% tokens
- **--quick**: Faster scan with fewer files
- **--local**: Privacy mode (no API calls, local analysis only)

**What it does:**
1. Builds local knowledge graph (imports, exports, dependencies)
2. Detects changed files (incremental updates)
3. Identifies "god nodes" (most critical components)
4. Calls Gemini API (only for changes, or skip with --local)
5. Generates comprehensive memory.yaml

**Token optimization:**
- First scan: ~15,000 tokens
- Incremental scan: ~2,000-5,000 tokens (60-90% savings!)
- Local mode: 0 tokens

### `memo watch` 🆕
Watch project and auto-scan on file changes.
- Monitors code files for changes
- Auto-scans 10 seconds after changes stop
- Uses incremental scanning (saves tokens)
- Perfect for active development
- Press Ctrl+C to stop

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

context-memo uses a **3-layer hybrid architecture**:

### Layer 1: Local Knowledge Graph (Free, Private)
```bash
memo scan --local  # No API calls
```
- Parses all JS/TS files locally
- Extracts imports, exports, functions, classes
- Builds dependency graph
- Identifies "god nodes" (most connected files)
- Saves to `.recall/graph.json`
- **Cost: $0 | Privacy: 100% local**

### Layer 2: Incremental Change Detection (Smart)
```bash
memo scan  # Automatic after first scan
```
- Hashes all files (MD5)
- Detects changed/added/removed files
- Only sends changes to API (not full codebase)
- Reuses previous memory for unchanged parts
- **Saves 60-90% tokens on subsequent scans**

### Layer 3: AI-Powered Reasoning (When Needed)
```bash
memo scan  # First time or when changes detected
```
- Sends: changed files + graph summary + previous memory
- Gemini analyzes: purpose, progress, issues, next steps
- Generates: comprehensive memory.yaml
- **Smart token usage: only what's needed**

### The Result:
1. **First scan**: `memo scan` → ~15,000 tokens → Full analysis
2. **Edit 3 files**: `memo scan` → ~2,000 tokens → Incremental update (87% savings!)
3. **No changes**: `memo scan` → 0 tokens → Reuses cached memory
4. **Privacy mode**: `memo scan --local` → 0 tokens → Local-only analysis

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
- Use `memo watch` during active development for auto-updates
- Commit `.recall/` folder to git for team sharing
- Use `memo status` for quick project overview
- Use `--quick` flag for faster scans during development

## Auto-Scan Options

### Option 1: Watch Mode (Recommended for Development)
```bash
memo watch
```
Automatically scans when you save files. Perfect for active development!

### Option 2: Git Hook (Recommended for Teams)
```bash
# Run setup script
bash setup-auto-scan.sh    # Unix/Mac/Linux
setup-auto-scan.bat         # Windows
```
Automatically scans before every git commit. Great for keeping team memory in sync!

### Option 3: Manual
```bash
memo scan
```
Run manually when you want to update the memory.

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
