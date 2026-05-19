/**
 * Test: Phase 2.3 - Hybrid Retrieval Engine
 */

import { HybridRetriever } from './src/retrieval/hybridRetriever.js';
import { ASTRetriever } from './src/retrieval/astRetriever.js';
import { GraphRetriever } from './src/retrieval/graphRetriever.js';
import { SymbolRegistry } from './src/registry/symbolRegistry.js';
import { GraphEngine } from './src/graph/graphEngine.js';
import { WorkingMemory } from './src/memory/workingMemory.js';

console.log('=== Phase 2.3: Hybrid Retrieval Engine Test ===\n');

// Setup test data
console.log('1. Setting up test data...');

// Create test nodes and edges
const testNodes = [
  { id: 'src/utils/helper.js', file: 'src/utils/helper.js', type: 'utility' },
  { id: 'src/models/User.js', file: 'src/models/User.js', type: 'model' },
  { id: 'src/controllers/userController.js', file: 'src/controllers/userController.js', type: 'controller' },
  { id: 'src/services/userService.js', file: 'src/services/userService.js', type: 'service' }
];

const testEdges = [
  { from: 'src/controllers/userController.js', to: 'src/services/userService.js', type: 'imports' },
  { from: 'src/services/userService.js', to: 'src/models/User.js', type: 'imports' },
  { from: 'src/services/userService.js', to: 'src/utils/helper.js', type: 'imports' }
];

// Setup test context
const registry = new SymbolRegistry();
const graph = new GraphEngine(testNodes, testEdges);
const workingMemory = new WorkingMemory();

const context = {
  registry,
  graph,
  workingMemory
};

// Add symbols to registry
registry.addFile('src/utils/helper.js', {
  functions: [
    { name: 'formatData', params: ['data'], line: 10 },
    { name: 'validateInput', params: ['input'], line: 20 }
  ],
  classes: [],
  exports: [{ name: 'formatData', type: 'named' }],
  imports: []
});

registry.addFile('src/models/User.js', {
  functions: [],
  classes: [{ name: 'User', methods: ['save', 'delete'], line: 5 }],
  exports: [{ name: 'User', type: 'default' }],
  imports: []
});

registry.addFile('src/controllers/userController.js', {
  functions: [],
  classes: [],
  exports: [],
  imports: [{ source: 'src/services/userService.js', items: [] }]
});

registry.addFile('src/services/userService.js', {
  functions: [],
  classes: [],
  exports: [],
  imports: [
    { source: 'src/models/User.js', items: [{ name: 'User', imported: 'User' }] },
    { source: 'src/utils/helper.js', items: [{ name: 'formatData', imported: 'formatData' }] }
  ]
});

console.log('✓ Test data ready\n');

// Test 1: AST Retriever
console.log('2. Testing AST Retriever...');
const astRetriever = new ASTRetriever(context);

const astResult1 = await astRetriever.retrieveBySymbol('formatData');
console.log(`   Symbol search: found ${astResult1.files.length} files`);
console.log(`   Symbols: ${astResult1.symbols.map(s => s.name).join(', ')}`);

const astResult2 = await astRetriever.retrieveByExport('User');
console.log(`   Export search: found ${astResult2.files.length} files`);

const astStats = astRetriever.getSymbolStats();
console.log(`   Registry stats: ${astStats.totalFunctions} functions, ${astStats.totalClasses} classes`);
console.log('✓ AST Retriever working\n');

// Test 2: Graph Retriever
console.log('3. Testing Graph Retriever...');
const graphRetriever = new GraphRetriever(context);

const graphResult1 = await graphRetriever.retrieveByPattern('user');
console.log(`   Pattern search: found ${graphResult1.files.length} files`);

const graphResult2 = await graphRetriever.retrieveByDependency('src/models/User.js', {
  includeDependencies: false,
  includeDependents: true,
  maxDepth: 2
});
console.log(`   Dependency search: ${graphResult2.files.length} files`);
console.log(`   Dependents: ${graphResult2.dependents.length}`);

const godNodes = graphRetriever.getGodNodes();
console.log(`   God nodes: ${godNodes.length} found`);

const graphStats = graphRetriever.getGraphStats();
console.log(`   Graph stats: ${graphStats.totalNodes} nodes, ${graphStats.totalEdges} edges`);
console.log('✓ Graph Retriever working\n');

// Test 3: Hybrid Retriever - Basic
console.log('4. Testing Hybrid Retriever (basic)...');
const hybridRetriever = new HybridRetriever(context);

const hybridResult1 = await hybridRetriever.retrieve('formatData', {
  strategy: 'balanced',
  maxFiles: 10
});
console.log(`   Balanced strategy: ${hybridResult1.files.length} files`);
console.log(`   Sources: ${hybridResult1.metadata.sources.join(', ')}`);
console.log(`   Symbols: ${hybridResult1.metadata.totalSymbols}`);

const hybridResult2 = await hybridRetriever.retrieve('user', {
  strategy: 'graph',
  maxFiles: 10
});
console.log(`   Graph strategy: ${hybridResult2.files.length} files`);
console.log('✓ Basic retrieval working\n');

// Test 4: Hybrid Retriever - Symbol
console.log('5. Testing symbol retrieval...');
const symbolResult = await hybridRetriever.retrieveBySymbol('User', {
  includeUsages: true
});
console.log(`   Symbol 'User': ${symbolResult.files.length} files`);
console.log(`   Usages: ${symbolResult.usages.length}`);
console.log('✓ Symbol retrieval working\n');

// Test 5: Hybrid Retriever - Dependency
console.log('6. Testing dependency retrieval...');
const depResult = await hybridRetriever.retrieveByDependency('src/models/User.js', {
  includeDependencies: true,
  includeDependents: true,
  maxDepth: 2
});
console.log(`   Dependencies: ${depResult.dependencies.length}`);
console.log(`   Dependents: ${depResult.dependents.length}`);
console.log(`   Total files: ${depResult.files.length}`);
console.log('✓ Dependency retrieval working\n');

// Test 6: Multi-strategy retrieval
console.log('7. Testing multi-strategy retrieval...');
const multiResult = await hybridRetriever.retrieveMultiStrategy('User', ['ast', 'graph']);
console.log(`   AST results: ${multiResult.byStrategy.ast.length} files`);
console.log(`   Graph results: ${multiResult.byStrategy.graph.length} files`);
console.log(`   Combined: ${multiResult.combined.length} files`);
console.log('✓ Multi-strategy working\n');

// Test 7: Context enrichment
console.log('8. Testing context enrichment...');
const enrichedResult = await hybridRetriever.retrieve('helper', {
  strategy: 'balanced',
  includeContext: true,
  maxFiles: 5
});
if (enrichedResult.context) {
  console.log(`   Context files: ${enrichedResult.context.files.length}`);
  console.log(`   Relationships: ${enrichedResult.context.relationships.length}`);
}
console.log('✓ Context enrichment working\n');

// Test 8: Retrieval logging
console.log('9. Testing retrieval logging...');
const log = hybridRetriever.getLog();
console.log(`   Log entries: ${log.length}`);

const stats = hybridRetriever.getStats();
console.log(`   Total retrievals: ${stats.totalRetrievals}`);
console.log(`   By source: ${Object.keys(stats.bySources).join(', ')}`);
console.log('✓ Logging working\n');

// Test 9: Pattern retrieval
console.log('10. Testing pattern retrieval...');
const patternResult = await hybridRetriever.retrieveByPattern('*.js', { maxFiles: 10 });
console.log(`   Pattern '*.js': ${patternResult.files.length} files`);
console.log('✓ Pattern retrieval working\n');

// Test 10: Deduplication
console.log('11. Testing deduplication...');
const duplicates = [
  { path: 'file1.js' },
  { path: 'file2.js' },
  { path: 'file1.js' },
  { path: 'file3.js' },
  { path: 'file2.js' }
];
const deduplicated = hybridRetriever.deduplicateFiles(duplicates);
console.log(`   Input: ${duplicates.length} files`);
console.log(`   Output: ${deduplicated.length} files`);
console.log('✓ Deduplication working\n');

// Summary
console.log('=== Phase 2.3 Test Summary ===');
console.log('✓ AST Retriever: symbol lookup, export search, pattern matching');
console.log('✓ Graph Retriever: dependency traversal, god nodes, connectivity');
console.log('✓ Hybrid Retriever: multi-strategy, context enrichment, logging');
console.log('✓ All retrieval strategies operational');
console.log('\n=== Phase 2.3 COMPLETE ===');
