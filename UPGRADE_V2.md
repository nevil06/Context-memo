# Upgrading to context-memo v2.0

## What's New in v2.0

context-memo v2.0 introduces a **hybrid architecture** that combines local code analysis with AI-powered reasoning.

### Major Features:

1. **Local Knowledge Graph** 🆕
   - Analyzes code structure locally (no API calls)
   - Identifies "god nodes" (critical components)
   - 100% private, zero cost

2. **Incremental Updates** 🆕
   - Detects changed files using hashes
   - Only sends changes to API (not full codebase)
   - Saves 60-90% tokens on subsequent scans

3. **Privacy Mode** 🆕
   - `--local` flag for local-only scanning
   - No API calls, no data leaves your machine
   - Perfect for sensitive projects

4. **Improved Watch Mode** ✨
   - 10-second debounce (was 5 seconds)
   - Uses incremental scanning
   - Tracks changed files

5. **Token Optimization** 💰
   - First scan: ~15,000 tokens
   - Incremental: ~2,000-5,000 tokens (60-90% savings!)
   - Cached: 0 tokens (no changes)

---

## Breaking Changes

### None! 🎉

v2.0 is **100% backward compatible** with v1.0. All existing commands work exactly the same.

---

## Upgrade Steps

### 1. Update the Package

```bash
npm update -g context-memo
```

Or reinstall:
```bash
npm uninstall -g context-memo
npm install -g context-memo
```

### 2. Verify Version

```bash
memo --version
# Should show: 2.0.0
```

### 3. Re-scan Your Project

```bash
cd your-project
memo scan
```

This will:
- Build the new knowledge graph
- Create file hashes for incremental updates
- Generate enhanced memory.yaml

### 4. Check New Files

After scanning, you'll see new files in `.recall/`:
```
.recall/
├── memory.yaml          # Enhanced with graph data
├── task_state.yaml      # Same as before
├── decisions.log        # Same as before
├── graph.json           # 🆕 Local knowledge graph
├── file_hashes.json     # 🆕 For change detection
└── .gitkeep
```

---

## New Commands & Flags

### New Flag: `--local`
```bash
memo scan --local
```
Local-only scanning (no API calls, 100% private)

### Existing Commands (Enhanced)
```bash
memo scan              # Now uses incremental updates!
memo scan --quick      # Faster + incremental
memo watch             # Now uses incremental scanning
```

---

## What Happens on First v2 Scan

1. **Builds knowledge graph** locally
2. **Creates file hashes** for future change detection
3. **Calls Gemini API** (full scan, like v1)
4. **Saves graph.json** and **file_hashes.json**

**Token usage**: Same as v1 (~15,000 tokens)

---

## What Happens on Subsequent Scans

1. **Detects changed files** using hashes
2. **Updates graph** locally
3. **Calls Gemini API** with only changes
4. **Updates memory** incrementally

**Token usage**: 60-90% less than v1! (~2,000-5,000 tokens)

---

## Migration Examples

### Example 1: Existing Project

```bash
# Before (v1.0)
cd my-project
memo scan              # ~15,000 tokens every time

# After (v2.0)
cd my-project
memo scan              # ~15,000 tokens (first time)
# Edit 3 files
memo scan              # ~2,000 tokens (incremental!)
# Edit 1 file
memo scan              # ~800 tokens (incremental!)
```

**Savings**: 87-95% on subsequent scans!

### Example 2: Privacy-Sensitive Project

```bash
# Before (v1.0)
cd sensitive-project
# Had to use API, no choice

# After (v2.0)
cd sensitive-project
memo scan --local      # 0 tokens, 100% private!
memo load              # Get local-only briefing
```

### Example 3: Active Development

```bash
# Before (v1.0)
memo scan              # Manual, every time

# After (v2.0)
memo watch             # Auto-scan with incremental updates!
# Edit files...
# Auto-scan: ~2,000 tokens (not 15,000!)
```

---

## FAQ

### Q: Do I need to delete my old .recall/ folder?
**A**: No! v2.0 will enhance your existing memory.yaml and add new files.

### Q: Will my existing memory.yaml still work?
**A**: Yes! v2.0 reads and enhances v1.0 memory files.

### Q: Do I need a new API key?
**A**: No! Your existing Gemini API key works with v2.0.

### Q: What if I don't want the new features?
**A**: Just use `memo scan` like before. The new features are automatic and transparent.

### Q: Can I disable incremental updates?
**A**: No need to! Incremental updates are automatic and always beneficial (saves tokens).

### Q: What about the --local flag?
**A**: It's optional. Use it only if you want 100% local scanning (no API calls).

### Q: Will this break my CI/CD?
**A**: No! All commands are backward compatible.

---

## Rollback (If Needed)

If you need to rollback to v1.0:

```bash
npm uninstall -g context-memo
npm install -g context-memo@1.0.0
```

Then delete the new files:
```bash
rm .recall/graph.json
rm .recall/file_hashes.json
```

---

## Benefits Summary

### v1.0 → v2.0 Improvements:

| Feature | v1.0 | v2.0 |
|---------|------|------|
| **Token usage (first scan)** | ~15,000 | ~15,000 (same) |
| **Token usage (subsequent)** | ~15,000 | ~2,000-5,000 (60-90% less!) |
| **Privacy mode** | ❌ | ✅ (--local flag) |
| **Local graph** | ❌ | ✅ (graph.json) |
| **Change detection** | ❌ | ✅ (hash-based) |
| **Incremental updates** | ❌ | ✅ (automatic) |
| **Watch mode** | ✅ | ✅ (enhanced) |
| **Backward compatible** | N/A | ✅ (100%) |

---

## Support

If you encounter any issues:

1. Check the [HYBRID_ARCHITECTURE.md](HYBRID_ARCHITECTURE.md) for details
2. Open an issue on GitHub
3. Run `memo scan --local` as a fallback (no API needed)

---

## Conclusion

**v2.0 is a major upgrade with zero breaking changes!**

- ✅ 60-90% token savings
- ✅ Privacy mode
- ✅ Local knowledge graph
- ✅ 100% backward compatible

**Just update and enjoy the benefits!** 🎉
