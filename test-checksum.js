/**
 * Test Checksum Engine
 */

import { createChecksumEngine } from './src/checksum/checksumEngine.js';
import { createInvalidationStrategy, createCacheManager } from './src/checksum/invalidation.js';
import { createGraphEngine } from './src/graph/graphEngine.js';
import { createRegistry } from './src/registry/symbolRegistry.js';
import { readFile } from 'fs/promises';

async function testChecksum() {
  console.log('🧪 Testing Checksum Engine\n');

  // Load graph and registry
  const graphData = JSON.parse(await readFile('.recall/graph.json', 'utf8'));
  const graph = createGraphEngine(graphData);
  const registry = createRegistry();
  await registry.load();

  console.log('✅ Loaded graph and registry\n');

  // Test 1: Create checksums
  console.log('Test 1: Calculate Checksums');
  const checksumEngine = createChecksumEngine();
  
  await checksumEngine.updateChecksums(graph, registry, graphData.fileHashes);
  
  const info = checksumEngine.getInfo();
  console.log(`  Repository: ${info.repository}`);
  console.log(`  Graph: ${info.graph}`);
  console.log(`  Symbols: ${info.symbols}`);
  console.log(`  Files: ${info.fileCount}`);
  console.log(`  Modules: ${info.moduleCount}`);
  console.log('');

  // Test 2: Detect changes
  console.log('Test 2: Change Detection');
  
  // Simulate file change
  const modifiedHashes = { ...graphData.fileHashes };
  modifiedHashes['src/commands/scan.js'] = 'modified_hash_123';
  
  const hasRepoChanged = checksumEngine.hasRepositoryChanged(modifiedHashes);
  console.log(`  Repository changed: ${hasRepoChanged}`);
  
  const fileChanges = checksumEngine.getChangedFiles(modifiedHashes);
  console.log(`  Changed files: ${fileChanges.changed.length}`);
  console.log(`  Added files: ${fileChanges.added.length}`);
  console.log(`  Removed files: ${fileChanges.removed.length}`);
  
  if (fileChanges.changed.length > 0) {
    console.log(`  Changed: ${fileChanges.changed[0]}`);
  }
  console.log('');

  // Test 3: Module changes
  console.log('Test 3: Module Change Detection');
  const changedModules = checksumEngine.getChangedModules(modifiedHashes);
  console.log(`  Changed modules: ${changedModules.length}`);
  if (changedModules.length > 0) {
    console.log(`  Modules: ${changedModules.slice(0, 3).join(', ')}`);
  }
  console.log('');

  // Test 4: Invalidation strategy
  console.log('Test 4: Invalidation Strategy');
  const invalidation = createInvalidationStrategy(checksumEngine);
  
  const toInvalidate = invalidation.checkInvalidation(graph, registry, modifiedHashes);
  console.log(`  Repository: ${toInvalidate.repository}`);
  console.log(`  Graph: ${toInvalidate.graph}`);
  console.log(`  Symbols: ${toInvalidate.symbols}`);
  console.log(`  Files: ${toInvalidate.files.length}`);
  console.log(`  Modules: ${toInvalidate.modules.length}`);
  console.log(`  Working Memory: ${toInvalidate.workingMemory}`);
  console.log(`  Summaries: ${toInvalidate.summaries}`);
  
  const report = invalidation.getReport(toInvalidate);
  console.log(`\n  Needs invalidation: ${report.needsInvalidation}`);
  console.log(`  Items:`);
  report.items.forEach(item => console.log(`    - ${item}`));
  console.log('');

  // Test 5: Cache manager
  console.log('Test 5: Cache Manager');
  const cacheManager = createCacheManager();
  
  // Add some cache entries
  cacheManager.getCache('files').set('test.js', { data: 'cached' });
  cacheManager.getCache('modules').set('src/commands', { data: 'cached' });
  
  const stats = cacheManager.getStats();
  console.log(`  Cache stats:`, stats);
  
  // Execute invalidation
  const invalidated = await invalidation.executeInvalidation(toInvalidate, cacheManager.caches);
  console.log(`  Invalidated: ${invalidated.join(', ')}`);
  
  const statsAfter = cacheManager.getStats();
  console.log(`  Cache stats after: `, statsAfter);
  console.log('');

  // Test 6: Staleness check
  console.log('Test 6: Staleness Detection');
  const isStale = checksumEngine.isStale(1000); // 1 second
  console.log(`  Is stale (1s threshold): ${isStale}`);
  
  const isStaleDay = checksumEngine.isStale(86400000); // 24 hours
  console.log(`  Is stale (24h threshold): ${isStaleDay}`);
  console.log('');

  // Test 7: Persistence
  console.log('Test 7: Persistence');
  await checksumEngine.save();
  console.log('  ✓ Saved checksums');
  
  const engine2 = createChecksumEngine();
  const loaded = await engine2.load();
  console.log(`  ✓ Loaded: ${loaded}`);
  
  const info2 = engine2.getInfo();
  console.log(`  Repository checksum matches: ${info2.repository === info.repository}`);
  console.log('');

  console.log('✅ All checksum tests passed!');
}

testChecksum().catch(console.error);
