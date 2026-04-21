# Installation & Testing Guide

## For Development

```bash
# 1. Install dependencies
npm install

# 2. Test the CLI
node bin/recall.js --help

# 3. Test in this project
node bin/recall.js init
```

## For Global Installation (After Publishing)

```bash
# Install globally from npm
npm install -g recall-ai

# Use anywhere
recall --help
```

## For Local Testing (Before Publishing)

```bash
# Link the package globally
npm link

# Now you can use 'recall' command anywhere
cd /path/to/your-project
recall init
recall scan
```

## Quick Test Workflow

```bash
# 1. Install dependencies
npm install

# 2. Get a free Gemini API key
# Visit: https://aistudio.google.com/app/apikey
# Click "Create API Key"
# Copy your key

# 3. Test in a sample project
cd /path/to/sample-project
node /path/to/recall-ai/bin/recall.js init
node /path/to/recall-ai/bin/recall.js config --key YOUR_GEMINI_KEY
node /path/to/recall-ai/bin/recall.js scan
node /path/to/recall-ai/bin/recall.js status
node /path/to/recall-ai/bin/recall.js load
```

## Verifying Installation

After running `npm install`, verify all dependencies are installed:

```bash
npm list
```

Should show:
- commander
- js-yaml
- clipboardy
- chalk
- inquirer

## Troubleshooting

### "Cannot find package 'commander'"
Run: `npm install`

### "Gemini API key not configured"
Run: `recall config --key YOUR_KEY`

### ".recall/ folder not found"
Run: `recall init` first

### "memory.yaml not found"
Run: `recall scan` after init

## Next Steps

1. Install dependencies: `npm install`
2. Test locally: `node bin/recall.js --help`
3. Try it on a real project
4. Publish to npm: `npm publish`
