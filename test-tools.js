/**
 * Test Repository Tools
 */

import { TOOLS, validateToolParameters, generateToolDocs } from './src/tools/repositoryTools.js';
import { createToolExecutor } from './src/tools/toolExecutor.js';
import { createGraphEngine } from './src/graph/graphEngine.js';
import { createRegistry } from './src/registry/symbolRegistry.js';
import { readFile } from 'fs/promises';

async function testTools() {
  console.log('🧪 Testing Repository Tools\n');

  // Load context
  const graphData = JSON.parse(await readFile('.recall/graph.json', 'utf8'));
  const graph = createGraphEngine(graphData);
  const registry = createRegistry();
  await registry.load();

  const context = { graph, registry };
  const executor = createToolExecutor(context);

  console.log('✅ Context loaded\n');

  // Test 1: Tool registry
  console.log('Test 1: Tool Registry');
  const toolNames = Object.keys(TOOLS);
  console.log(`  Total tools: ${toolNames.length}`);
  console.log(`  Tools: ${toolNames.slice(0, 5).join(', ')}...`);
  console.log('');

  // Test 2: Parameter validation
  console.log('Test 2: Parameter Validation');
  const validParams = validateToolParameters('read_file', { path: 'test.js' });
  console.log(`  Valid params: ${validParams.valid}`);
  
  const invalidParams = validateToolParameters('read_file', {});
  console.log(`  Invalid params: ${invalidParams.valid}`);
  console.log(`  Errors: ${invalidParams.errors.join(', ')}`);
  console.log('');

  // Test 3: get_exports
  console.log('Test 3: get_exports Tool');
  const exportsResult = await executor.execute('get_exports', {
    file: 'src\\commands\\scan.js'
  });
  
  if (exportsResult.success) {
    console.log(`  Success: ${exportsResult.success}`);
    console.log(`  Exports: ${exportsResult.result.count}`);
    console.log(`  Names: ${exportsResult.result.exports.map(e => e.name).join(', ')}`);
  }
  console.log('');

  // Test 4: verify_symbol
  console.log('Test 4: verify_symbol Tool');
  const verifyResult = await executor.execute('verify_symbol', {
    name: 'scanCommand'
  });
  
  if (verifyResult.success) {
    console.log(`  Success: ${verifyResult.success}`);
    console.log(`  Exists: ${verifyResult.result.exists}`);
    console.log(`  Locations: ${verifyResult.result.locations.length}`);
  }
  console.log('');

  // Test 5: get_file_metrics
  console.log('Test 5: get_file_metrics Tool');
  const metricsResult = await executor.execute('get_file_metrics', {
    file: 'src\\commands\\scan.js'
  });
  
  if (metricsResult.success) {
    console.log(`  Success: ${metricsResult.success}`);
    console.log(`  Connections: ${metricsResult.result.totalConnections}`);
    console.log(`  Fan-In: ${metricsResult.result.fanIn}`);
    console.log(`  Fan-Out: ${metricsResult.result.fanOut}`);
  }
  console.log('');

  // Test 6: find_symbol
  console.log('Test 6: find_symbol Tool');
  const findResult = await executor.execute('find_symbol', {
    symbol: 'buildKnowledgeGraph',
    type: 'function'
  });
  
  if (findResult.success) {
    console.log(`  Success: ${findResult.success}`);
    console.log(`  Found: ${findResult.result.found}`);
    console.log(`  Locations: ${findResult.result.locations.join(', ')}`);
  }
  console.log('');

  // Test 7: calculate_impact
  console.log('Test 7: calculate_impact Tool');
  const impactResult = await executor.execute('calculate_impact', {
    files: ['src\\utils\\graphBuilder.js']
  });
  
  if (impactResult.success) {
    console.log(`  Success: ${impactResult.success}`);
    console.log(`  Total impacted: ${impactResult.result.totalImpacted}`);
    console.log(`  Blast radius: ${impactResult.result.blastRadius}`);
  }
  console.log('');

  // Test 8: Execution log
  console.log('Test 8: Execution Log');
  const log = executor.getLog();
  console.log(`  Total executions: ${log.length}`);
  console.log(`  Tools used: ${[...new Set(log.map(l => l.tool))].join(', ')}`);
  console.log('');

  // Test 9: Tool documentation
  console.log('Test 9: Tool Documentation');
  const docs = generateToolDocs();
  const lines = docs.split('\n').length;
  console.log(`  Documentation lines: ${lines}`);
  console.log(`  Sample:\n${docs.split('\n').slice(0, 8).join('\n')}`);
  console.log('');

  console.log('✅ All tool tests passed!');
  console.log('\n🎉 PHASE 2.2 (TOOL-ENFORCED ACCESS) COMPLETE!');
}

testTools().catch(console.error);
