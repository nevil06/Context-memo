# Context-Memo v2.0 Quick Reference

## Commands

```bash
memo init                    # Initialize .recall/ folder
memo scan                    # Build AST registry + graph
memo scan --local            # Local-only (no API)
memo scan --quick            # Faster scan
memo validate                # Validate repository code
memo health                  # Repository health dashboard
memo trust                   # AI trust meter
memo timeline                # Edit replay timeline
memo local init              # Initialize local runtime
memo load                    # Load memory to clipboard
memo status                  # Show project status
memo watch                   # Auto-scan on changes
memo update                  # Update task state
memo config --key KEY        # Set API key
memo install <agent>         # Install agent integration
```

## API Quick Start

### Symbol Registry
```javascript
import { SymbolRegistry } from './src/registry/symbolRegistry.js';

const registry = new SymbolRegistry();

// Add file symbols
registry.addFile('src/utils/helper.js', {
  functions: [{ name: 'formatData', params: ['data'], line: 10 }],
  classes: [],
  exports: [{ name: 'formatData', type: 'named' }],
  imports: []
});

// Find symbols
const functions = registry.findFunction('formatData');
const classes = registry.findClass('User');
const exports = registry.findExport('apiClient');

// Get file symbols
const symbols = registry.getFile('src/utils/helper.js');

// Statistics
const stats = registry.getStats();
```

### Graph Engine
```javascript
import { GraphEngine } from './src/graph/graphEngine.js';

const nodes = [
  { id: 'src/utils/helper.js', file: 'src/utils/helper.js' }
];
const edges = [
  { from: 'src/api/routes.js', to: 'src/utils/helper.js', type: 'imports' }
];

const graph = new GraphEngine(nodes, edges);

// Dependencies
const deps = graph.getDirectDependencies('src/models/User.js');
const transitive = graph.getTransitiveDependencies('src/models/User.js', 2);

// Dependents
const dependents = graph.getDirectDependents('src/utils/helper.js');
const transitiveDeps = graph.getTransitiveDependents('src/utils/helper.js', 2);

// Path finding
const path = graph.findPath('src/api/routes.js', 'src/db/client.js');

// Impact analysis
const impact = graph.analyzeImpact('src/config/database.js');
// { affected: 12, critical: 3, risk: 'high' }

// Circular dependencies
const circular = graph.detectCircularDependencies();

// Statistics
const stats = graph.getStats();
```

### Hybrid Retrieval
```javascript
import { HybridRetriever } from './src/retrieval/hybridRetriever.js';

const context = { registry, graph, workingMemory };
const retriever = new HybridRetriever(context);

// General retrieval
const result = await retriever.retrieve('formatData', {
  strategy: 'balanced',  // 'ast', 'graph', 'semantic', 'balanced'
  maxFiles: 20,
  includeContext: true,
  rankByRelevance: true
});

// Symbol retrieval
const symbolResult = await retriever.retrieveBySymbol('User', {
  includeUsages: true,
  maxFiles: 20
});

// Pattern retrieval
const patternResult = await retriever.retrieveByPattern('*.js', {
  maxFiles: 20
});

// Dependency retrieval
const depResult = await retriever.retrieveByDependency('src/models/User.js', {
  includeDependencies: true,
  includeDependents: true,
  maxDepth: 2,
  maxFiles: 20
});

// Multi-strategy
const multiResult = await retriever.retrieveMultiStrategy('User', ['ast', 'graph']);

// Statistics
const stats = retriever.getStats();
const log = retriever.getLog();
```

### Tool Execution
```javascript
import { ToolExecutor } from './src/tools/toolExecutor.js';

const executor = new ToolExecutor(context);

// Execute tool
const result = await executor.execute('get_dependencies', {
  filePath: 'src/utils/helper.js',
  maxDepth: 2
});

// Available tools
const tools = executor.getAvailableTools();

// Statistics
const stats = executor.getStats();
const log = executor.getLog();
```

### Multi-Agent Pipeline
```javascript
import { Orchestrator } from './src/agents/orchestrator.js';

const orchestrator = new Orchestrator(context);

// Execute task
const result = await orchestrator.execute({
  task: 'Add logging to error handlers',
  strategy: 'plan-retrieve-code-validate',
  maxIterations: 5
});

// Available agents
const agents = orchestrator.getAvailableAgents();

// Statistics
const stats = orchestrator.getStats();
const log = orchestrator.getLog();
```

### Validation
```javascript
import { Validator } from './src/validation/validator.js';

const validator = new Validator(context);

// Validate file
const result = await validator.validateFile('src/utils/helper.js');

// Validate repository
const repoResult = await validator.validateRepository();

// Validation results
console.log(result.errors);        // Array of errors
console.log(result.confidence);    // Confidence score
console.log(result.status);        // 'pass' or 'fail'
```

### Working Memory
```javascript
import { WorkingMemory } from './src/memory/workingMemory.js';

const memory = new WorkingMemory();

// Add files
memory.addFile('src/utils/helper.js', { lastModified: Date.now() });

// Classify files
memory.classifyFiles(graph);

// Get hot files
const hotFiles = memory.getHotFiles();

// Compress context
const compressed = memory.compressContext();

// Statistics
const stats = memory.getStats();
```

### Checksum Engine
```javascript
import { ChecksumEngine } from './src/checksum/checksumEngine.js';

const checksums = new ChecksumEngine();

// Generate checksums
await checksums.generateRepositoryChecksum('src/');

// Check if changed
const changed = await checksums.hasChanged('src/utils/helper.js');

// Get changed files
const changedFiles = await checksums.getChangedFiles();

// Invalidate cache
checksums.invalidateFile('src/utils/helper.js');
```

### Confidence Scoring
```javascript
import { ConfidenceScorer } from './src/scoring/confidenceScorer.js';

const scorer = new ConfidenceScorer(context);

// Score operation
const score = scorer.scoreOperation({
  type: 'symbol_lookup',
  symbolsFound: 5,
  symbolsSearched: 5,
  validationPassed: true
});

// Repository health
const health = scorer.getRepositoryHealth();

// Statistics
const stats = scorer.getStats();
```

### Health Dashboard (Phase 3)
```javascript
import { HealthDashboard } from './src/dashboard/healthDashboard.js';

const dashboard = new HealthDashboard(context);

// Generate report
const report = await dashboard.generateReport();

// Get overall health
const health = await dashboard.getOverallHealth();
// { score: 88, grade: 'B', status: 'good' }

// Identify issues
const godFiles = await dashboard.identifyGodFiles();
const cycles = await dashboard.findCircularDependencies();
const bottlenecks = await dashboard.identifyBottlenecks();
```

### Trust Meter (Phase 3)
```javascript
import { TrustMeter } from './src/trust/trustMeter.js';

const trustMeter = new TrustMeter(context);

// Generate report
const report = await trustMeter.generateReport();

// Get overall trust
const trust = await trustMeter.getOverallTrust();
// { score: 88.6, grade: 'B+', level: 'high' }

// Get metrics
const symbolMetrics = await trustMeter.getSymbolVerificationMetrics();
const importMetrics = await trustMeter.getImportValidationMetrics();
const risk = await trustMeter.getHallucinationRisk();
```

### Edit Timeline (Phase 3)
```javascript
import { EditTimeline } from './src/timeline/editTimeline.js';

const timeline = new EditTimeline(context);

// Record change
await timeline.recordChange({
  type: 'file_modified',
  file: 'src/utils/helper.js',
  reasoning: 'Added validation',
  confidence: 95
});

// Get timeline
const events = await timeline.getTimeline({ limit: 10 });

// Get file timeline
const fileEvents = await timeline.getFileTimeline('src/utils/helper.js');

// Compare changes
const comparison = await timeline.compareChanges('change_1', 'change_2');

// Statistics
const stats = await timeline.getStats();
```

### Local Runtime (Phase 3)
```javascript
import { LocalRuntime } from './src/local/localRuntime.js';

const runtime = new LocalRuntime(context);

// Initialize
await runtime.initialize({
  provider: 'ollama',
  model: 'llama2',
  embeddingModel: 'nomic-embed-text'
});

// Generate embeddings
const embedding = await runtime.generateEmbedding('test text');

// Semantic search
const results = await runtime.semanticSearch('query', documents, {
  topK: 10,
  threshold: 0.5
});

// Analyze code
const analysis = await runtime.analyzeCode(code, { task: 'explain' });

// Get status
const status = await runtime.getStatus();
```

## 12 Repository Tools

1. **read_file** — Read file content
2. **write_file** — Write file content
3. **list_files** — List directory contents
4. **search_code** — Search code patterns
5. **get_symbols** — Get file symbols
6. **get_dependencies** — Get file dependencies
7. **get_dependents** — Get file dependents
8. **trace_imports** — Trace import chain
9. **verify_symbol** — Verify symbol exists
10. **get_file_info** — Get file metadata
11. **analyze_impact** — Analyze change impact
12. **validate_code** — Validate code correctness

## File Structure

```
.recall/
├── memory.yaml           # Project memory
├── task_state.yaml       # Current task state
├── decisions.log         # Decision history
├── graph.json            # Dependency graph
├── symbol_registry.json  # AST symbols
├── checksums.json        # File checksums
├── working_memory.json   # Active context
├── file_hashes.json      # Change detection
├── edit_timeline.json    # Change history (Phase 3)
├── local_config.json     # Local runtime config (Phase 3)
└── local_embeddings.json # Local embeddings cache (Phase 3)
```

## Test Files

```bash
# Phase 1 & 2 Tests
node test-ast-parser.js          # AST parsing
node test-graph-engine.js         # Graph operations
node test-validator.js            # Validation pipeline
node test-working-memory.js       # Context compression
node test-checksum.js             # Checksum engine
node test-confidence.js           # Confidence scoring
node test-orchestrator.js         # Multi-agent pipeline
node test-tools.js                # Tool execution
node test-hybrid-retrieval.js     # Retrieval strategies

# Phase 3 Tests
node test-health-dashboard.js     # Repository health
node test-trust-meter.js          # AI trust metrics
node test-edit-timeline.js        # Change tracking
node test-local-runtime.js        # Local-first runtime
```

## Performance

- **Symbol lookup**: O(1)
- **Graph traversal**: O(V + E)
- **Context compression**: 11.1% ratio
- **Incremental scans**: 60-90% faster

## Verification Guarantees

✅ No hallucinated symbols  
✅ No fake imports  
✅ No invalid paths  
✅ Tool-enforced access  
✅ Multi-layer validation  
✅ Confidence tracking  

## Common Patterns

### Pattern 1: Scan and Validate
```bash
memo scan
memo validate
```

### Pattern 2: Find Symbol Usages
```javascript
const retriever = new HybridRetriever(context);
const result = await retriever.retrieveBySymbol('User', {
  includeUsages: true
});
```

### Pattern 3: Analyze Impact
```javascript
const graph = new GraphEngine(nodes, edges);
const impact = graph.analyzeImpact('src/config/database.js');
```

### Pattern 4: Multi-Agent Task
```javascript
const orchestrator = new Orchestrator(context);
const result = await orchestrator.execute({
  task: 'Add logging to error handlers',
  strategy: 'plan-retrieve-code-validate'
});
```

### Pattern 5: Incremental Scan
```bash
# First scan
memo scan

# Make changes
# ...

# Incremental scan (60-90% faster)
memo scan
```

---

**Quick reference for context-memo v2.0 verification-first runtime**
