# Development Guide

## Setup

```bash
# Install dependencies
npm install

# Test CLI locally
node bin/recall.js --help
```

## Testing Commands

```bash
# Initialize recall in a test project
node bin/recall.js init

# Configure API key
node bin/recall.js config --key YOUR_GEMINI_KEY

# Scan project
node bin/recall.js scan

# Quick scan
node bin/recall.js scan --quick

# Load briefing
node bin/recall.js load
node bin/recall.js load --mode=quick
node bin/recall.js load --mode=onboard

# Show status
node bin/recall.js status

# Update task state
node bin/recall.js update "Completed authentication"

# Install agent integration
node bin/recall.js install claude
node bin/recall.js install cursor

# Show config
node bin/recall.js config --show
```

## Project Structure

```
recall-ai/
├── bin/
│   └── recall.js              # CLI entry point (executable)
├── src/
│   ├── commands/
│   │   ├── init.js            # recall init
│   │   ├── scan.js            # recall scan (core — Gemini analysis)
│   │   ├── update.js          # recall update
│   │   ├── load.js            # recall load
│   │   ├── status.js          # recall status (terminal dashboard)
│   │   ├── install.js         # recall install <agent>
│   │   └── config.js          # recall config
│   └── utils/
│       ├── fileUtils.js       # read/write .recall/ files
│       ├── scanner.js         # reads entire project (code, configs, docs)
│       ├── prompt.js          # builds the Gemini master prompt
│       ├── assembler.js       # builds agent briefing from memory
│       ├── gemini.js          # Gemini API wrapper
│       └── clipboard.js       # clipboard utility
├── package.json
├── README.md
└── .gitignore
```

## Publishing to npm

```bash
# Login to npm
npm login

# Publish
npm publish

# Users can then install globally
npm install -g recall-ai
```

## Testing in Another Project

```bash
# Link locally for testing
npm link

# Now you can use 'recall' command globally
cd /path/to/test-project
recall init
recall scan
```

## Key Implementation Details

### Scanner (scanner.js)
- Walks directory tree (max depth 5)
- Skips: node_modules, .git, .recall, dist, build, etc.
- Categorizes: code files, config files, docs
- Prioritizes: index, main, app, server files
- Limits: 50 code files (20 in quick mode)

### Gemini Prompt (prompt.js)
- Builds comprehensive context from scanned files
- Includes: file tree, git history, configs, docs, code
- Instructs Gemini to return ONLY valid YAML
- Defines exact YAML structure for memory

### Assembler (assembler.js)
- Builds agent briefings from memory.yaml
- Three modes: quick (~400 tokens), full (~2000 tokens), onboard
- Formats with markdown for readability
- Estimates token count

### Commands
- **init**: Creates .recall/ folder with templates
- **scan**: Core command — scans project, calls Gemini, saves memory
- **load**: Generates briefing, copies to clipboard
- **status**: Terminal dashboard with colored output
- **update**: Interactive prompts to update task state
- **install**: Creates agent-specific integration files
- **config**: Manages API key in ~/.recall/config.json

## Error Handling

- Graceful handling of missing .recall/ folder
- Validates Gemini API responses
- Saves debug output on parse failures
- Handles git not available
- Handles clipboard failures

## UX Features

- Colored terminal output (chalk)
- Progress indicators
- Interactive prompts (inquirer)
- Clipboard auto-copy (clipboardy)
- Token count estimates
- Confirmation before overwriting

## API Key Storage

- Stored at: `~/.recall/config.json`
- Format: `{ "geminiApiKey": "YOUR_KEY" }`
- Never committed to project repos
- Shared across all projects

## Memory File Format

See `.recall/memory.yaml` for complete structure. Key sections:
- project: name, purpose, stack, constraints
- knowledge_graph: components, dependencies, god nodes
- progress: what works/broken/missing, tech debt
- task_state: last task, continue_here, next steps
- decisions: architectural decisions with reasoning
- handoff_message: summary for new agents
- _meta: scan metadata (timestamp, file count, etc.)
