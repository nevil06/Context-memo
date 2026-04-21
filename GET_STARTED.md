# Get Started with recall-ai Development

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Test the CLI
```bash
# Run help
node bin/recall.js --help

# Or use the test script
bash test-local.sh        # Unix/Mac/Linux
test-local.bat            # Windows
```

### 3. Get a Free Gemini API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key" (no credit card required)
3. Copy your key

### 4. Test Full Workflow
```bash
# Configure API key
node bin/recall.js config --key YOUR_GEMINI_API_KEY

# Initialize in this project
node bin/recall.js init

# Scan this project
node bin/recall.js scan

# View status
node bin/recall.js status

# Load briefing
node bin/recall.js load
```

## 📁 Project Structure

```
recall-ai/
├── bin/recall.js              # CLI entry point
├── src/
│   ├── commands/              # 7 command implementations
│   └── utils/                 # 6 utility modules
├── package.json               # NPM config
└── [9 documentation files]
```

## 🔧 Development Commands

```bash
# Test CLI locally
node bin/recall.js <command>

# Link globally for testing
npm link
recall --help

# Unlink when done
npm unlink -g recall-ai
```

## 📝 Available Commands

```bash
recall init                    # Initialize .recall/ folder
recall scan [--quick]          # Scan project with Gemini
recall load [--mode=MODE]      # Load briefing (quick|full|onboard)
recall status                  # Show dashboard
recall update [message]        # Update task state
recall install <agent>         # Install agent integration
recall config [--key] [--show] # Configure settings
```

## 🧪 Testing

### Test Help Commands
```bash
bash test-local.sh        # Unix/Mac/Linux
test-local.bat            # Windows
```

### Test in Another Project
```bash
# Link globally
npm link

# Go to test project
cd /path/to/test-project

# Test commands
recall init
recall scan
recall status
recall load
```

## 📦 Publishing

### Prepare for Publishing
1. Ensure all tests pass
2. Update version in package.json if needed
3. Ensure you're logged into npm

### Publish to npm
```bash
npm login
npm publish
```

### After Publishing
Users can install globally:
```bash
npm install -g recall-ai
recall --help
```

## 📚 Documentation Files

1. **README.md** — Main user documentation
2. **QUICKSTART.md** — 5-minute quick start
3. **INSTALL.md** — Installation guide
4. **DEVELOPMENT.md** — Developer guide
5. **PROJECT_SUMMARY.md** — Implementation summary
6. **CHECKLIST.md** — Feature checklist
7. **EXAMPLE_MEMORY.yaml** — Example output
8. **STRUCTURE.txt** — Project structure
9. **FINAL_SUMMARY.md** — Complete summary
10. **GET_STARTED.md** — This file

## 🔍 Key Files to Understand

### Entry Point
- `bin/recall.js` — CLI setup with commander

### Core Commands
- `src/commands/scan.js` — Main scanning logic (most complex)
- `src/commands/load.js` — Briefing generation
- `src/commands/init.js` — Initialization
- `src/commands/status.js` — Dashboard display
- `src/commands/update.js` — Interactive updates
- `src/commands/install.js` — Agent integration
- `src/commands/config.js` — Configuration

### Utilities
- `src/utils/scanner.js` — File scanning logic
- `src/utils/prompt.js` — Gemini prompt builder
- `src/utils/gemini.js` — API wrapper
- `src/utils/assembler.js` — Briefing builder
- `src/utils/fileUtils.js` — File operations
- `src/utils/clipboard.js` — Clipboard operations

## 🐛 Troubleshooting

### "Cannot find package 'commander'"
```bash
npm install
```

### "Permission denied" on bin/recall.js
```bash
chmod +x bin/recall.js
```

### "Gemini API key not configured"
```bash
node bin/recall.js config --key YOUR_KEY
```

### Test in isolated environment
```bash
# Create test directory
mkdir test-recall
cd test-recall

# Link recall-ai
npm link /path/to/recall-ai

# Test
recall init
```

## 🎯 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Test locally: `node bin/recall.js --help`
3. ✅ Get API key: https://aistudio.google.com/app/apikey
4. ✅ Test full workflow: `node bin/recall.js init && scan && load`
5. ✅ Test in another project: `npm link`
6. ✅ Publish to npm: `npm publish`

## 💡 Tips

- Use `node bin/recall.js` for local testing
- Use `npm link` to test as global command
- Test in multiple projects before publishing
- Check all commands work with `test-local.sh`
- Read DEVELOPMENT.md for implementation details

## 🚢 Ready to Ship

All features implemented and tested. Ready to publish to npm!

```bash
npm publish
```

Users can then:
```bash
npm install -g recall-ai
recall init
recall scan
recall load
```

**Never lose AI context again!**
