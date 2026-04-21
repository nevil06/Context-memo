# How recall-ai Works

## The Problem

```
Day 1: Working with Claude
┌─────────────────────────────────────┐
│ You: "Build a REST API..."         │
│ Claude: "Sure! Let me help..."     │
│ [Works for hours, builds features] │
│ Claude: "I'm running low on..."    │
└─────────────────────────────────────┘
                ❌ Credits run out

Day 2: Switch to Cursor
┌─────────────────────────────────────┐
│ You: "Continue building the API"   │
│ Cursor: "What API? I don't see..." │
│ You: "The one we were building..." │
│ Cursor: "Can you explain from..."  │
└─────────────────────────────────────┘
                ❌ Lost all context
                ⏰ Waste 30 minutes re-explaining
```

## The Solution

```
Day 1: Working with Claude
┌─────────────────────────────────────┐
│ $ recall scan                       │
│ ✅ Scanned 47 files                 │
│ ✅ Built knowledge graph            │
│ ✅ Saved to .recall/memory.yaml     │
└─────────────────────────────────────┘

Day 2: Switch to Cursor
┌─────────────────────────────────────┐
│ $ recall load                       │
│ ✅ Copied briefing to clipboard     │
│ [Paste into Cursor]                 │
│ Cursor: "I understand! This is a   │
│ REST API at 65% complete. The task │
│ assignment bug is in line 87..."    │
└─────────────────────────────────────┘
                ✅ Instant context
                ⏰ Zero time wasted
```

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR PROJECT                             │
│  ├── src/                                                   │
│  ├── package.json                                           │
│  ├── README.md                                              │
│  └── ...                                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ recall scan
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   GEMINI 1.5 FLASH                          │
│                    (FREE API)                               │
│                                                             │
│  Analyzes:                                                  │
│  • Code structure                                           │
│  • Dependencies                                             │
│  • Git history                                              │
│  • Config files                                             │
│  • Documentation                                            │
│                                                             │
│  Generates:                                                 │
│  • Knowledge graph                                          │
│  • Component map                                            │
│  • Progress tracking                                        │
│  • Task continuation                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Saves
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  .recall/memory.yaml                        │
│                                                             │
│  project:                                                   │
│    name: TaskFlow API                                       │
│    purpose: Team task management...                         │
│    stack: Node.js, Express, PostgreSQL...                   │
│                                                             │
│  knowledge_graph:                                           │
│    god_nodes:                                               │
│      - TaskService (critical component)                     │
│    components:                                              │
│      - TaskController → TaskService → TaskRepository        │
│                                                             │
│  progress:                                                  │
│    percent_done: 65                                         │
│    what_works: [auth, CRUD, pagination]                     │
│    what_is_broken: [assignment bug line 87]                 │
│                                                             │
│  task_state:                                                │
│    continue_here:                                           │
│      file: src/controllers/taskController.js                │
│      location: line 87                                      │
│      instruction: Change req.params.taskId to .id           │
│                                                             │
│  handoff_message: |                                         │
│    This is a task management API at 65% complete.           │
│    Fix the assignment bug in line 87 first...               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ recall load
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   AGENT BRIEFING                            │
│                  (~2000 tokens)                             │
│                                                             │
│  # Agent Briefing — TaskFlow API                            │
│  > 65% complete | mid                                       │
│                                                             │
│  ## 🤖 Read This First                                      │
│  This is a task management API built with Node.js...        │
│  Fix the assignment bug in line 87 first...                 │
│                                                             │
│  ## Project                                                 │
│  Purpose: Team task management...                           │
│  Stack: Node.js, Express, PostgreSQL...                     │
│                                                             │
│  ## 🧠 Critical Components                                  │
│  TaskService — Central business logic...                    │
│                                                             │
│  ## Progress — 65% complete                                 │
│  ✅ Working: auth, CRUD, pagination                         │
│  ❌ Broken: assignment bug line 87                          │
│                                                             │
│  ## ▶ Continue Exactly Here                                 │
│  File: src/controllers/taskController.js                    │
│  Location: line 87                                          │
│  Do: Change req.params.taskId to req.params.id              │
│                                                             │
│  ## Next Steps                                              │
│  1. Fix assignment bug                                      │
│  2. Add validation                                          │
│  3. Test endpoint                                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Copy to clipboard
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    ANY AI AGENT                             │
│                                                             │
│  Claude / Cursor / Windsurf / Copilot / Aider / etc.       │
│                                                             │
│  [Paste briefing]                                           │
│                                                             │
│  Agent: "I understand! This is a task management API        │
│  at 65% complete. I can see the assignment bug in           │
│  line 87 of taskController.js. Let me fix that first..."    │
│                                                             │
│  ✅ Instant understanding                                   │
│  ✅ Knows what works                                        │
│  ✅ Knows what's broken                                     │
│  ✅ Knows exactly where to continue                         │
│  ✅ Zero time wasted                                        │
└─────────────────────────────────────────────────────────────┘
```

## Command Flow

### Initial Setup (One Time)
```bash
# 1. Get free API key
https://aistudio.google.com/app/apikey

# 2. Configure
recall config --key YOUR_KEY

# 3. Initialize in project
recall init
```

### Daily Workflow
```bash
# Morning: Start work
recall load
# Paste into AI agent

# During work: Make progress
[Work with AI agent]

# Evening: Before ending
recall update
# Updates progress, task state

# Next day: Switch agents
recall load
# Paste into different AI agent
# They know everything!
```

## What Gets Analyzed

### Code Files
```
✅ All .js, .ts, .py, .java, .go, etc.
✅ Prioritizes: index, main, app, server
✅ Extracts: functions, classes, exports
✅ Maps: dependencies between files
```

### Config Files
```
✅ package.json, requirements.txt, etc.
✅ Extracts: dependencies, scripts, env vars
✅ Understands: project type, stack
```

### Documentation
```
✅ README.md, docs/*.md
✅ Extracts: purpose, features, setup
✅ Understands: project goals
```

### Git History
```
✅ Recent commits (last 15)
✅ Current branch
✅ Working directory status
✅ Infers: recent work, progress
```

## What Gets Generated

### Knowledge Graph
```yaml
god_nodes:
  - Critical components everything depends on

components:
  - All modules with dependencies
  - Status: complete|in_progress|broken

data_flow:
  - End-to-end data flow

api_endpoints:
  - All routes with descriptions
```

### Progress Tracking
```yaml
percent_done: 0-100
phase: just_started|early|mid|nearly_complete|complete

what_works: [list of working features]
what_is_broken: [list of bugs with locations]
what_is_missing: [list of planned features]
technical_debt: [list of TODOs and shortcuts]
```

### Task Continuation
```yaml
continue_here:
  file: exact/file/path.js
  location: function name or line number
  instruction: precise 1-2 sentence instruction

next_steps:
  - Concrete actionable task 1
  - Concrete actionable task 2
  - Concrete actionable task 3
```

### Handoff Message
```yaml
handoff_message: |
  4-6 sentence paragraph for NEW AI agent.
  What the project is, current state, what's broken,
  exactly where to continue, what NOT to touch.
  
  This is the MOST IMPORTANT field — replaces
  thousands of tokens of re-explanation.
```

## Real-World Example

### Before recall-ai
```
You: "Continue building the authentication system"
Agent: "What authentication system?"
You: "The one with JWT tokens and bcrypt"
Agent: "Can you show me the code?"
You: "It's in src/auth/authService.js"
Agent: "What does it do?"
You: "It handles login, register, token validation..."
Agent: "What's the database schema?"
You: "Users table with email, password_hash..."
Agent: "What's working and what's broken?"
You: "Login works but register has a bug..."
Agent: "Where's the bug?"
You: "In the email validation on line 45..."

⏰ 10 minutes wasted explaining
😤 Frustrating experience
```

### With recall-ai
```
You: recall load
[Paste into agent]

Agent: "I understand! This is an authentication system
using JWT and bcrypt. Login works perfectly. There's
a bug in register function at line 45 in authService.js
where email validation fails for plus-sign addresses.
I'll fix that now."

⏰ 0 minutes wasted
😊 Smooth experience
```

## Benefits

### For Individual Developers
- ✅ Switch agents without losing context
- ✅ Return to projects after weeks away
- ✅ Use different agents for different tasks
- ✅ Never re-explain your project

### For Teams
- ✅ Instant onboarding for new developers
- ✅ Shared understanding across team
- ✅ Consistent AI agent knowledge
- ✅ Commit .recall/ folder to git

### For AI Agents
- ✅ Instant project understanding
- ✅ Know what works and what's broken
- ✅ Know exactly where to continue
- ✅ Make better decisions with full context

## Technical Details

### Free Forever
- Uses Gemini 1.5 Flash API
- No credit card required
- No usage limits for reasonable use
- ~10-40 seconds per scan

### Privacy
- All processing happens via Gemini API
- No data stored on external servers
- API key stored locally (~/.recall/config.json)
- Memory files stored in your project

### Compatibility
- Works with ANY AI coding agent
- Works on Windows, Mac, Linux
- Requires Node.js >= 18.0.0
- Pure JavaScript (no compilation needed)

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  recall-ai = Knowledge Graph + Task Continuation           │
│                                                             │
│  One command scans your project                             │
│  One command loads the briefing                             │
│  Any AI agent instantly understands                         │
│                                                             │
│  Never lose context again.                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Get started:** `npm install -g recall-ai`
