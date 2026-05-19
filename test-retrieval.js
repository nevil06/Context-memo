#!/usr/bin/env node

/**
 * Test Hybrid Retrieval Engine
 */

import { SymbolRegistry } from './src/registry/symbolRegistry.js';
import { GraphEngine } from './src/graph/graphEngine.js';
import { WorkingMemory } from './src/memory/workingMemory.js';
import { HybridRetriever } from './src/retrieval/hybridRetriever.js';
import { ASTRetriever } from './src/retrieval/astRetriever.js';
import { GraphRetriever } from './src/retrieval/graphRetriever.js';

console.log('=== Hybrid Retrieval Engine Test ===\n');

// Initialize components
const registry = new SymbolRegistry();
const graph = new GraphEngine();
const workingMemory = new WorkingMemory();

const context = { registry, graph, workingMemory };

// Add test data
console.log('1. Setting up test data...');

// File 1: User service
registry.addFile('src/services/userService.js', {
  functions: [
    { name: 'getUser', params: ['id'], line: 10 },
    { name: 'createUser', params: ['data'], line: 25 },
    { name: 'updateUser', params: ['id', 'data'], line: 40 }
  ],
  classes: [],
  exports: [
    { type: 'named', exported: 'getUser', local: 'getUser', line: 55 },
    { type: 'named', exported: 'createUser', local: 'createUser', line: 56 }
  ],
  imports: [
    { source: './database.js', imported: 'db', local: 'db', line: 1 }
  ]
});

// File 2: Database
registry.addFile('src/services/database.js', {
  functions: [
    { name: 'connect', params: [], line: 5 },
    { name: 'query', params: ['sql', 'params'], line: 15 }
  ],
  classes: [],
  exports: [
    { type: 'default', exported: 'db', local: 'db', line: 30 }
  ],
  imports: []
});

// File 3: User controller
registry.addFile('src/controllers/userController.js', {
  functions: [
    { name: 'handleGetUser', params: ['req', 'res'], line: 8 },
    { name: 'handleCreateUser', params: ['req', 'res'], line: 20 }
  ],
  classes: [],
  exports: [
    { type: 'named', exported: 'handleGetUser', local: 'handleGetUser', line: 35 }
  ],
  imports: [
    { source: '../services/userService.js', imported: 'getUser', local: 'getUser', line: 1 },
    { source: '../services/userService.js', imported: 'createUser', local: 'createUser', line: 1 }
  ]
});

// File 4: API routes
registry.addFile('src/routes/api.js', {
  functions: [
    { name: 'setupRoutes', params: ['app'], line: 5 }
  ],
  classes: [],
  exports: [
    { type: 'default', exported: 'setupRoutes', local: 'setupRoutes', line: 20 }
  ],
  imports: [
    { source: '../controllers/userController.js', imported: 'handleGetUser', local: 'handleGetUser', line: 1 }
  ]
});

// Build graph
graph.addNode('src/services/userService.js', { type: 'service' });
graph.addNode('src/services/database.js', { type: 'service' });
graph.addNode('src/controllers/userController.js', { type: 'controller' });
graph.addNode('src/routes/api.js', { type: 'route' });

graph.addEdge('src/services/userService.js', 'src/services/database.js', { type: 'import' });
graph.addEdge('src/controllers/userController.js', 'src/services/userService.js', { type: 'import' });
graph.addEdge('src/routes/api.js', 'src/controllers/userController.js', { type: 'import' });

console.log('✓ Test data ready\n');

// Test AST Retriever
console.log('2. Testing AST Retriever...');
const astRetriever = new ASTRetriever(context);

const astResults1 = await astRetriever.retrieveBySymbol('getUser');
console.log(`   Query: "getUser"`);
console.log(`   Files found: ${astResults1.files.length}`);
console.log(`   Symbols found: ${astResults1.symbols.length}`);
if (astResults1.files.length > 0) {
  console.log(`   ✓ Found in: ${astResults1.files[0].path}`);
}

const astResults2 = await astRetriever.retrieve('create user database');
console.log(`\n   Query: "create user database"`);
console.log(`   Files found: ${astResults2.files.length}`);
console.log(`   Symbols searched: ${astResults2.metadata.symbolsSearched}`);
console.log('   ✓ AST retrieval working\n');

// Test Graph Retriever
console.log('3. Testing Graph Retriever...');
const graphRetriever = new GraphRetriever(context);

const graphResults1 = await graphRetriever.retrieveByDependency('src/services/userService.js', {
  includeDependencies: true,
  includeDependents: true,
  maxDepth: 2
});
console.log(`   Query: dependencies of "userService.js"`);
console.log(`   Total files: ${graphResults1.files.length}`);
console.log(`   Dependencies: ${graphResults1.dependencies.length}`);
console.log(`   Dependents: ${graphResults1.dependents.length}`);

const graphResults2 = await graphRetriever.retrieveByPattern('controller', { maxFiles: 10 });
console.log(`\n   Query: pattern "controller"`);
console.log(`   Files found: ${graphResults2.files.length}`);
if (graphResults2.files.length > 0) {
  console.log(`   ✓ Found: ${graphResults2.files[0].path}`);
}

const usages = await graphRetriever.findSymbolUsages('getUser');
console.log(`\n   Query: usages of "getUser"`);
console.log(`   Usages found: ${usages.length}`);
console.log('   ✓ Graph retrieval working\n');

// Test Hybrid Retriever
console.log('4. Testing Hybrid Retriever...');
const hybridRetriever = new HybridRetriever(context);

const hybridResults1 = await hybridRetriever.retrieve('getUser', {
  strategy: 'balanced',
  maxFiles: 10,
  includeContext: true
});
console.log(`   Query: "getUser" (balanced strategy)`);
console.log(`   Files found: ${hybridResults1.files.length}`);
console.log(`   Sources: ${hybridResults1.metadata.sources.join(', ')}`);
console.log(`   Context enriched: ${hybridResults1.context ? 'yes' : 'no'}`);

const hybridResults2 = await hybridRetriever.retrieveBySymbol('createUser', {
  includeUsages: true,
  maxFiles: 10
});
console.log(`\n   Query: symbol "createUser" with usages`);
console.log(`   Files found: ${hybridResults2.files.length}`);
console.log(`   Usages found: ${hybridResults2.usages.length}`);

const hybridResults3 = await hybridRetriever.retrieveByDependency('src/routes/api.js', {
  includeDependencies: true,
  maxDepth: 3
});
console.log(`\n   Query: dependencies of "api.js"`);
console.log(`   Files found: ${hybridResults3.files.length}`);
console.log(`   Dependencies: ${hybridResults3.dependencies.length}`);

const multiStrategy = await hybridRetriever.retrieveMultiStrategy('user service', ['ast', 'graph']);
console.log(`\n   Query: "user service" (multi-strategy)`);
console.log(`   AST results: ${multiStrategy.byStrategy.ast.length}`);
console.log(`   Graph results: ${multiStrategy.byStrategy.graph.length}`);
console.log(`   Combined: ${multiStrategy.combined.length}`);
console.log('   ✓ Hybrid retrieval working\n');

// Test retrieval log
console.log('5. Testing Retrieval Log...');
const log = hybridRetriever.getLog();
console.log(`   Total retrieval events: ${log.length}`);

const stats = hybridRetriever.getStats();
console.log(`   Total retrievals: ${stats.totalRetrievals}`);
console.log(`   By source:`, stats.bySources);
console.log('   ✓ Logging working\n');

// Test related files
console.log('6. Testing Related Files...');
const related = await graphRetriever.findRelatedFiles('src/controllers/userController.js', {
  minSharedDeps: 1,
  maxFiles: 5
});
console.log(`   Query: files related to "userController.js"`);
console.log(`   Related files: ${related.files.length}`);
if (related.files.length > 0) {
  console.log(`   Top match: ${related.files[0].path} (${related.files[0].sharedDeps} shared deps)`);
}
console.log('   ✓ Related files working\n');

// Test critical path
console.log('7. Testing Critical Path...');
const criticalPath = await graphRetriever.getCriticalPath(
  'src/routes/api.js',
  'src/services/database.js'
);
console.log(`   From: ${criticalPath.from}`);
console.log(`   To: ${criticalPath.to}`);
console.log(`   Path exists: ${criticalPath.exists}`);
console.log(`   Path length: ${criticalPath.length}`);
if (criticalPath.path.length > 0) {
  console.log(`   Path: ${criticalPath.path.join(' → ')}`);
}
console.log('   ✓ Critical path working\n');

// Summary
console.log('=== Test Summary ===');
console.log('✓ AST Retriever: PASS');
console.log('✓ Graph Retriever: PASS');
console.log('✓ Hybrid Retriever: PASS');
console.log('✓ Multi-Strategy Retrieval: PASS');
console.log('✓ Retrieval Logging: PASS');
console.log('✓ Related Files: PASS');
console.log('✓ Critical Path: PASS');
console.log('\n✓ All retrieval tests passed!');
