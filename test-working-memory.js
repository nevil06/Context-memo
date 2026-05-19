/**
 * Test Working Memory System
 */

import { createWorkingMemory, updateWorkingMemoryFromGraph } from './src/memory/workingMemory.js';
import { compressRepository, generateCompactContext, estimateContextTokens } from './src/memory/contextCompressor.js';
import { selectSmartContext, explainContextSelection } from './src/memory/relevanceRanker.js';
import { createGraphEngine } from './src/graph/graphEngine.js';
import { createRegistry } from './src/registry/symbolRegistry.js';
import { readFile } from 'fs/promises';

async function testWorkingMemory() {
  console.log('🧪 Testing Working Memory System\n');

  // Load graph and registry
  const graphData = JSON.parse(await readFile('.recall/graph.json', 'utf8'));
  const graph = createGraphEngine(graphData);
  const registry = createRegistry();
  await registry.load();

  console.log('✅ Loaded graph and registry\n');

  // Test 1: Working Memory
  console.log('Test 1: Working Memory Management');
  const wm = createWorkingMemory();
  
  // Simulate file edits
  wm.markHot('src/commands/scan.js');
  wm.markHot('src/utils/graphBuilder.js');
  
  console.log(`  Hot files: ${wm.getHot().length}`);
  console.log(`  Warm files: ${wm.getWarm().length}`);
  console.log(`  Cold files: ${wm.getCold().length}`);
  
  const stats = wm.getStats();
  console.log(`  Most edited:`, stats.mostEdited.slice(0, 2));
  console.log('');

  // Test 2: Update from graph
  console.log('Test 2: Update from Graph');
  const changedFiles = ['src/commands/scan.js'];
  updateWorkingMemoryFromGraph(wm, graph, changedFiles);
  
  console.log(`  Hot files: ${wm.getHot().length}`);
  console.log(`  Warm files: ${wm.getWarm().length}`);
  console.log(`  Cold files: ${wm.getCold().length}`);
  
  console.log('  Hot:', wm.getHot().slice(0, 3));
  console.log('  Warm:', wm.getWarm().slice(0, 3));
  console.log('');

  // Test 3: Repository Compression
  console.log('Test 3: Repository Compression');
  const compressed = compressRepository(graph, registry);
  
  console.log('  Repository Summary:');
  console.log(`    Files: ${compressed.repository.files}`);
  console.log(`    Functions: ${compressed.repository.functions}`);
  console.log(`    Classes: ${compressed.repository.classes}`);
  console.log(`    Avg Connections: ${compressed.repository.avgConnections}`);
  
  console.log('  Modules:', Object.keys(compressed.modules).length);
  console.log('  File Summaries:', Object.keys(compressed.files).length);
  console.log('');

  // Test 4: Compact Context
  console.log('Test 4: Compact Context Generation');
  const context = generateCompactContext(wm, graph, registry, {
    includeHot: true,
    includeWarm: true,
    includeCold: false,
    maxFiles: 10
  });
  
  console.log(`  Active files: ${context.active.length}`);
  console.log(`  Summarized files: ${context.stats.summarizedFiles}`);
  console.log(`  Compression ratio: ${context.stats.compressionRatio}`);
  
  const tokens = estimateContextTokens(context);
  console.log(`  Estimated tokens: ~${tokens}`);
  console.log('');

  // Test 5: Smart Context Selection
  console.log('Test 5: Smart Context Selection');
  const allFiles = graph.getAllNodes().map(n => n.id);
  const selection = selectSmartContext({
    allFiles,
    changedFiles: ['src/commands/scan.js'],
    query: 'validation',
    maxFiles: 15,
    graph,
    registry,
    workingMemory: wm
  });
  
  console.log(`  Selected: ${selection.files.length} files`);
  console.log(`  Stats:`, selection.stats);
  console.log('\n  Explanation:');
  console.log('  ' + explainContextSelection(selection).replace(/\n/g, '\n  '));
  console.log('');

  // Test 6: Save/Load
  console.log('Test 6: Persistence');
  await wm.save();
  console.log('  ✓ Saved working memory');
  
  const wm2 = createWorkingMemory();
  const loaded = await wm2.load();
  console.log(`  ✓ Loaded: ${loaded}`);
  console.log(`  Hot files after load: ${wm2.getHot().length}`);
  console.log('');

  console.log('✅ All working memory tests passed!');
}

testWorkingMemory().catch(console.error);
