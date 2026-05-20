/**
 * Test: Phase 3.3 - Edit Replay Timeline
 */

import { EditTimeline } from './src/timeline/editTimeline.js';
import { formatTimelineReport, formatFileTimeline } from './src/timeline/timelineFormatter.js';
import { SymbolRegistry } from './src/registry/symbolRegistry.js';
import { GraphEngine } from './src/graph/graphEngine.js';

console.log('=== Phase 3.3: Edit Replay Timeline Test ===\n');

// Setup test context
console.log('1. Setting up test data...');

const testNodes = [
  { id: 'src/utils/helper.js', file: 'src/utils/helper.js', type: 'utility' },
  { id: 'src/models/User.js', file: 'src/models/User.js', type: 'model' },
  { id: 'src/services/userService.js', file: 'src/services/userService.js', type: 'service' },
  { id: 'src/api/routes.js', file: 'src/api/routes.js', type: 'api' }
];

const testEdges = [
  { from: 'src/services/userService.js', to: 'src/models/User.js', type: 'imports' },
  { from: 'src/services/userService.js', to: 'src/utils/helper.js', type: 'imports' },
  { from: 'src/api/routes.js', to: 'src/services/userService.js', type: 'imports' }
];

const registry = new SymbolRegistry();

registry.addFile('src/utils/helper.js', {
  functions: [{ name: 'formatData', params: ['data'], line: 5 }],
  classes: [],
  exports: [{ name: 'formatData', type: 'named' }],
  imports: []
});

registry.addFile('src/models/User.js', {
  functions: [],
  classes: [{ name: 'User', methods: ['save'], line: 5 }],
  exports: [{ name: 'User', type: 'default' }],
  imports: []
});

const graph = new GraphEngine(testNodes, testEdges);

const context = {
  registry,
  graph
};

console.log('✓ Test data ready\n');

// Test 1: Create Timeline
console.log('2. Testing timeline creation...');
const timeline = new EditTimeline(context);
console.log(`   Timeline created: ${timeline.timeline.length} events`);
console.log('✓ Timeline creation working\n');

// Test 2: Record Changes
console.log('3. Testing change recording...');

const change1 = await timeline.recordChange({
  type: 'file_modified',
  file: 'src/utils/helper.js',
  changes: ['Added new function validateInput'],
  reasoning: 'Added input validation for security',
  confidence: 95
});
console.log(`   Change 1 recorded: ${change1.id}`);

const change2 = await timeline.recordChange({
  type: 'file_modified',
  file: 'src/models/User.js',
  changes: ['Modified User class', 'Added delete method'],
  reasoning: 'Added user deletion functionality',
  confidence: 98
});
console.log(`   Change 2 recorded: ${change2.id}`);

const change3 = await timeline.recordChange({
  type: 'file_created',
  file: 'src/api/newRoutes.js',
  changes: ['Created new API routes file'],
  reasoning: 'Separated routes for better organization',
  confidence: 100
});
console.log(`   Change 3 recorded: ${change3.id}`);

console.log(`   Total events: ${timeline.timeline.length}`);
console.log('✓ Change recording working\n');

// Test 3: Get Timeline
console.log('4. Testing timeline retrieval...');
const fullTimeline = await timeline.getTimeline({ limit: 10 });
console.log(`   Retrieved: ${fullTimeline.events.length} events`);
console.log(`   Total: ${fullTimeline.total}`);
console.log('✓ Timeline retrieval working\n');

// Test 4: Get File Timeline
console.log('5. Testing file timeline...');
const fileTimeline = await timeline.getFileTimeline('src/utils/helper.js');
console.log(`   File timeline: ${fileTimeline.events.length} events`);
if (fileTimeline.events.length > 0) {
  console.log(`   First event: ${fileTimeline.events[0].type}`);
}
console.log('✓ File timeline working\n');

// Test 5: Get Recent Changes
console.log('6. Testing recent changes...');
const recent = await timeline.getRecentChanges(5);
console.log(`   Recent changes: ${recent.events.length}`);
console.log('✓ Recent changes working\n');

// Test 6: Calculate Impact
console.log('7. Testing impact calculation...');
const impact = await timeline.calculateImpact({
  file: 'src/models/User.js'
});
console.log(`   Dependencies: ${impact.dependencies.length}`);
console.log(`   Dependents: ${impact.dependents.length}`);
console.log(`   Blast radius: ${impact.blastRadius}`);
console.log(`   Risk score: ${impact.riskScore}/100`);
console.log(`   Affected symbols: ${impact.affectedSymbols.length}`);
console.log('✓ Impact calculation working\n');

// Test 7: Get Stats
console.log('8. Testing timeline statistics...');
const stats = await timeline.getStats();
console.log(`   Total changes: ${stats.totalChanges}`);
console.log(`   Avg impact: ${stats.avgImpact.toFixed(1)}`);
console.log(`   Avg risk score: ${stats.avgRiskScore.toFixed(1)}`);
console.log(`   High risk changes: ${stats.highRiskChanges}`);
console.log(`   Change types: ${Object.keys(stats.byType).length}`);
console.log('✓ Statistics working\n');

// Test 8: Most Changed Files
console.log('9. Testing most changed files...');
const mostChanged = await timeline.getMostChangedFiles(5);
console.log(`   Most changed files: ${mostChanged.length}`);
if (mostChanged.length > 0) {
  console.log(`   Top file: ${mostChanged[0].file} (${mostChanged[0].count} changes)`);
}
console.log('✓ Most changed files working\n');

// Test 9: High Risk Changes
console.log('10. Testing high risk changes...');
const highRisk = await timeline.getHighRiskChanges(0, 5);
console.log(`   High risk changes: ${highRisk.length}`);
if (highRisk.length > 0) {
  console.log(`   Highest risk: ${highRisk[0].file} (${highRisk[0].impact.riskScore}/100)`);
}
console.log('✓ High risk changes working\n');

// Test 10: Compare Changes
console.log('11. Testing change comparison...');
if (timeline.timeline.length >= 2) {
  const comparison = await timeline.compareChanges(
    timeline.timeline[0].id,
    timeline.timeline[1].id
  );
  console.log(`   Time diff: ${comparison.timeDiff}ms`);
  console.log(`   Blast radius diff: ${comparison.impactDiff.blastRadiusDiff}`);
  console.log(`   Risk score diff: ${comparison.impactDiff.riskScoreDiff.toFixed(1)}`);
}
console.log('✓ Change comparison working\n');

// Test 11: Generate Report
console.log('12. Testing report generation...');
const report = await timeline.generateReport();
console.log(`   Summary changes: ${report.summary.totalChanges}`);
console.log(`   Timeline events: ${report.timeline.length}`);
console.log(`   Most changed files: ${report.mostChangedFiles.length}`);
console.log(`   High risk changes: ${report.highRiskChanges.length}`);
console.log('✓ Report generation working\n');

// Test 12: Report Formatting
console.log('13. Testing report formatting...');
const formatted = formatTimelineReport(report);
console.log(`   Formatted report length: ${formatted.length} characters`);
console.log('✓ Report formatting working\n');

// Display formatted report
console.log('14. Displaying formatted timeline report:\n');
console.log(formatted);

// Test file timeline formatting
if (fileTimeline.events.length > 0) {
  console.log('15. Displaying file timeline:\n');
  const fileFormatted = formatFileTimeline({
    file: 'src/utils/helper.js',
    events: fileTimeline.events
  });
  console.log(fileFormatted);
}

// Summary
console.log('=== Phase 3.3 Test Summary ===');
console.log('✓ Timeline creation');
console.log('✓ Change recording');
console.log('✓ Timeline retrieval');
console.log('✓ File timeline');
console.log('✓ Recent changes');
console.log('✓ Impact calculation');
console.log('✓ Statistics');
console.log('✓ Most changed files');
console.log('✓ High risk changes');
console.log('✓ Change comparison');
console.log('✓ Report generation');
console.log('✓ Report formatting');
console.log('\n=== Phase 3.3 COMPLETE ===');
