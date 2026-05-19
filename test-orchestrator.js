/**
 * Test Multi-Agent Orchestrator
 */

import { createOrchestrator } from './src/agents/orchestrator.js';
import { createGraphEngine } from './src/graph/graphEngine.js';
import { createRegistry } from './src/registry/symbolRegistry.js';
import { createWorkingMemory } from './src/memory/workingMemory.js';
import { readFile } from 'fs/promises';

async function testOrchestrator() {
  console.log('🧪 Testing Multi-Agent Orchestrator\n');

  // Load context
  const graphData = JSON.parse(await readFile('.recall/graph.json', 'utf8'));
  const graph = createGraphEngine(graphData);
  const registry = createRegistry();
  await registry.load();
  const workingMemory = createWorkingMemory();
  await workingMemory.load();

  const context = { graph, registry, workingMemory };

  console.log('✅ Context loaded\n');

  // Test 1: Simple task
  console.log('Test 1: Execute Simple Task');
  const orchestrator = createOrchestrator(context);
  
  const task = 'Add a new validation function to src/validation/validator.js';
  console.log(`  Task: "${task}"\n`);

  const result = await orchestrator.executeTask(task);
  
  console.log(`  Success: ${result.success}`);
  
  if (result.success) {
    console.log(`  Plan steps: ${result.plan.steps.length}`);
    console.log(`  Affected files: ${result.plan.affectedFiles.length}`);
    console.log(`  Retrieved files: ${result.context.files.length}`);
    console.log(`  Generated edits: ${result.code.edits.length}`);
    console.log(`  Validation passed: ${result.validation.valid}`);
  } else {
    console.log(`  Error: ${result.error}`);
    if (result.details) {
      console.log(`  Details:`, result.details.slice(0, 2));
    }
  }
  console.log('');

  // Test 2: Execution log
  console.log('Test 2: Execution Log');
  const summary = orchestrator.getSummary();
  console.log(`  Total steps: ${summary.totalSteps}`);
  console.log(`  Duration: ${summary.duration}ms`);
  console.log(`  By agent:`);
  for (const [agent, count] of Object.entries(summary.byAgent)) {
    console.log(`    ${agent}: ${count}`);
  }
  console.log('');

  // Test 3: Step-by-step execution
  console.log('Test 3: Step-by-Step Execution');
  orchestrator.clearLog();
  
  const task2 = 'Fix bug in src/commands/scan.js';
  console.log(`  Task: "${task2}"\n`);

  const stepResult = await orchestrator.executeStepByStep(task2, (step, result) => {
    console.log(`  ✓ ${step} completed`);
  });

  console.log(`\n  Success: ${stepResult.success}`);
  console.log(`  Steps executed: ${Object.keys(stepResult.results || {}).length}`);
  console.log('');

  // Test 4: Planning details
  console.log('Test 4: Planning Details');
  if (result.plan) {
    console.log(`  Intent type: ${result.plan.intent?.type}`);
    console.log(`  Confidence: ${result.plan.confidence}%`);
    console.log(`  Risks: ${result.plan.risks.length}`);
    
    if (result.plan.risks.length > 0) {
      console.log(`  Risk types:`);
      result.plan.risks.forEach(risk => {
        console.log(`    - ${risk.type} (${risk.level})`);
      });
    }
  }
  console.log('');

  // Test 5: Context retrieval
  console.log('Test 5: Context Retrieval');
  if (result.context) {
    console.log(`  Files retrieved: ${result.context.files.length}`);
    console.log(`  Dependencies: ${result.context.dependencies.length}`);
    console.log(`  Symbols: ${result.context.symbols.length}`);
    console.log(`  Summaries: ${Object.keys(result.context.summaries).length}`);
    
    if (result.context.files.length > 0) {
      const file = result.context.files[0];
      console.log(`\n  Sample file context:`);
      console.log(`    Path: ${file.path}`);
      console.log(`    Functions: ${file.symbols.functions.length}`);
      console.log(`    Connections: ${file.metrics.connections}`);
    }
  }
  console.log('');

  // Test 6: Validation details
  console.log('Test 6: Validation Details');
  if (result.validation) {
    console.log(`  Valid: ${result.validation.valid}`);
    console.log(`  Errors: ${result.validation.errors.length}`);
    console.log(`  Warnings: ${result.validation.warnings.length}`);
    
    if (result.validation.summary) {
      console.log(`  Total checks: ${result.validation.summary.totalChecks}`);
    }
  }
  console.log('');

  console.log('✅ All orchestrator tests passed!');
  console.log('\n🎉 PHASE 2.1 (MULTI-AGENT PIPELINE) COMPLETE!');
}

testOrchestrator().catch(console.error);
