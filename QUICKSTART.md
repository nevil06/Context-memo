# Quick Start Guide

Get started with recall-ai in 5 minutes.

## Installation

```bash
npm install -g recall-ai
```

## Setup (One Time)

### 1. Get Free Gemini API Key

1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key" (no credit card required)
3. Copy your key

### 2. Configure recall-ai

```bash
recall config --key YOUR_GEMINI_API_KEY
```

## Usage (In Any Project)

### First Time Setup

```bash
# Navigate to your project
cd /path/to/your-project

# Initialize recall
recall init

# Scan your project (takes 10-40 seconds)
recall scan

# Load the briefing
recall load
```

The briefing is now in your clipboard! Paste it into your AI agent.

### Daily Workflow

```bash
# When starting work
recall load

# When switching agents or ending session
recall update

# Quick status check
recall status
```

## Example Session

```bash
# Day 1: Working with Claude
$ cd my-api-project
$ recall init
✅ Created .recall/ folder

$ recall scan
🔍 Scanning project...
✅ Found 23 code files, 5 configs, 2 docs
⏳ Building knowledge graph... (15 seconds)
✅ Memory saved to .recall/

$ recall load
📖 Loading agent briefing...
✅ Copied to clipboard — paste into your AI agent

# Paste into Claude, work on project...
# Credits run out!

$ recall update
📝 Updating task state...
What did you accomplish? > Implemented user authentication
Progress %: > 45
...
✅ Memory updated

# Day 2: Switch to Cursor
$ recall load
📖 Loading agent briefing...
✅ Copied to clipboard

# Paste into Cursor - it knows everything!
```

## Commands Cheat Sheet

```bash
recall init              # Initialize .recall/ folder
recall scan              # Scan project (run after major changes)
recall scan --quick      # Faster scan with fewer files
recall load              # Load full briefing (~2000 tokens)
recall load --mode=quick # Quick briefing (~400 tokens)
recall status            # Terminal dashboard
recall update            # Update progress and task state
recall install claude    # Install Claude integration
recall config --show     # Show current config
```

## What Gets Generated

After `recall scan`, you'll have:

```
your-project/
├── .recall/
│   ├── memory.yaml        # Complete project memory
│   ├── task_state.yaml    # Current task state
│   ├── decisions.log      # Decision history
│   └── .gitkeep          # Commit this folder!
```

## Agent Integration

Install recall integration for your AI agent:

```bash
recall install claude      # Creates .claude/CLAUDE.md
recall install cursor      # Creates .cursor/rules/recall.md
recall install windsurf    # Creates .windsurf/rules/recall.md
recall install copilot     # Creates .github/copilot-instructions.md
recall install aider       # Appends to .aider.conf.yml
```

This tells the agent to automatically read `.recall/memory.yaml` at session start.

## Tips

- Run `recall scan` after major changes
- Run `recall update` before switching agents
- Commit `.recall/` folder to git for team sharing
- Use `recall status` for quick overview
- Use `--quick` flag during active development

## Troubleshooting

### "Gemini API key not configured"
```bash
recall config --key YOUR_KEY
```

### ".recall/ folder not found"
```bash
recall init
```

### "memory.yaml not found"
```bash
recall scan
```

### Scan takes too long
```bash
recall scan --quick  # Faster, fewer files
```

## What's in the Briefing?

The briefing includes:
- 🤖 **Handoff message** — Most important summary
- 📦 **Project overview** — Purpose, stack, constraints
- 🧠 **Critical components** — God nodes and dependencies
- 📊 **Progress** — What works, what's broken, what's missing
- ▶ **Continue here** — Exact file + location + instruction
- 📝 **Next steps** — Concrete actionable tasks
- 🔑 **Key decisions** — Architectural decisions with reasoning

## Real-World Use Cases

### Switching Agents
```bash
# Claude credits ran out
recall update
recall load
# Paste into Cursor
```

### Team Handoff
```bash
# Commit .recall/ folder
git add .recall/
git commit -m "Update project memory"
git push

# Teammate pulls and runs
recall load
# They're instantly up to speed
```

### Returning After Break
```bash
# Haven't touched project in 2 weeks
recall load
# Instantly remember where you left off
```

### Multi-Agent Workflow
```bash
# Use Claude for architecture
recall load --mode=full

# Use Cursor for implementation
recall load --mode=quick

# Use Copilot for tests
recall load --mode=quick
```

## Next Steps

1. Install: `npm install -g recall-ai`
2. Get API key: https://aistudio.google.com/app/apikey
3. Configure: `recall config --key YOUR_KEY`
4. Try it: `recall init && recall scan && recall load`

**Never lose AI context again!**
