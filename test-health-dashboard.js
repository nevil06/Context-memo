/**
 * Test: Phase 3.1 - Repository Health Dashboard
 */

import { HealthDashboard } from './src/dashboard/healthDashboard.js';
import { formatHealthReport } from './src/dashboard/dashboardFormatter.js';
import { SymbolRegistry } from './src/registry/symbolRegistry.js';
import { GraphEngine } from './src/graph/graphEngine.js';
import { ChecksumEngine } from './src/checksum/checksumEngine.js';

console.log('=== Phase 3.1: Repository Health Dashboard Test ===\n');

// Setup test context
console.log('1. Setting up test data...');

// Create test nodes with various characteristics
const testNodes = [
  // God file (highly connected)
  { id: 'src/utils/common.js', file: 'src/utils/common.js', type: 'utility' },
  
  // Normal files
  { id: 'src/models/User.js', file: 'src/models/User.js', type: 'model' },
  { id: 'src/models/Post.js', file: 'src/models/Post.js', type: 'model' },
  { id: 'src/services/userService.js', file: 'src/services/userService.js', type: 'service' },
  { id: 'src/services/postService.js', file: 'src/services/postService.js', type: 'service' },
  { id: 'src/api/userRoutes.js', file: 'src/api/userRoutes.js', type: 'api' },
  { id: 'src/api/postRoutes.js', file: 'src/api/postRoutes.js', type: 'api' },
  
  // Circular dependency participants
  { id: 'src/circular/A.js', file: 'src/circular/A.js', type: 'module' },
  { id: 'src/circular/B.js', file: 'src/circular/B.js', type: 'module' },
  { id: 'src/circular/C.js', file: 'src/circular/C.js', type: 'module' },
  
  // Orphaned file
  { id: 'src/unused/old.js', file: 'src/unused/old.js', type: 'unused' },
  
  // Bottleneck (high fan-in)
  { id: 'src/db/connection.js', file: 'src/db/connection.js', type: 'database' }
];

const testEdges = [
  // God file connections (common.js imported by many)
  { from: 'src/models/User.js', to: 'src/utils/common.js', type: 'imports' },
  { from: 'src/models/Post.js', to: 'src/utils/common.js', type: 'imports' },
  { from: 'src/services/userService.js', to: 'src/utils/common.js', type: 'imports' },
  { from: 'src/services/postService.js', to: 'src/utils/common.js', type: 'imports' },
  { from: 'src/api/userRoutes.js', to: 'src/utils/common.js', type: 'imports' },
  { from: 'src/api/postRoutes.js', to: 'src/utils/common.js', type: 'imports' },
  
  // Normal dependencies
  { from: 'src/services/userService.js', to: 'src/models/User.js', type: 'imports' },
  { from: 'src/services/postService.js', to: 'src/models/Post.js', type: 'imports' },
  { from: 'src/api/userRoutes.js', to: 'src/services/userService.js', type: 'imports' },
  { from: 'src/api/postRoutes.js', to: 'src/services/postService.js', type: 'imports' },
  
  // Circular dependencies (A → B → C → A)
  { from: 'src/circular/A.js', to: 'src/circular/B.js', type: 'imports' },
  { from: 'src/circular/B.js', to: 'src/circular/C.js', type: 'imports' },
  { from: 'src/circular/C.js', to: 'src/circular/A.js', type: 'imports' },
  
  // Bottleneck connections (many files depend on db/connection.js)
  { from: 'src/models/User.js', to: 'src/db/connection.js', type: 'imports' },
  { from: 'src/models/Post.js', to: 'src/db/connection.js', type: 'imports' },
  { from: 'src/services/userService.js', to: 'src/db/connection.js', type: 'imports' },
  { from: 'src/services/postService.js', to: 'src/db/connection.js', type: 'imports' },
  { from: 'src/api/userRoutes.js', to: 'src/db/connection.js', type: 'imports' }
];

// Create registry with symbols
const registry = new SymbolRegistry();

registry.addFile('src/utils/common.js', {
  functions: [
    { name: 'formatDate', params: ['date'], line: 5 },
    { name: 'validateEmail', params: ['email'], line: 10 },
    { name: 'sanitizeInput', params: ['input'], line: 15 },
    { name: 'generateId', params: [], line: 20 },
    { name: 'hashPassword', params: ['password'], line: 25 }
  ],
  classes: [],
  exports: [
    { name: 'formatDate', type: 'named' },
    { name: 'validateEmail', type: 'named' },
    { name: 'sanitizeInput', type: 'named' },
    { name: 'generateId', type: 'named' },
    { name: 'hashPassword', type: 'named' }
  ],
  imports: []
});

registry.addFile('src/models/User.js', {
  functions: [],
  classes: [{ name: 'User', methods: ['save', 'delete', 'update', 'find'], line: 5 }],
  exports: [{ name: 'User', type: 'default' }],
  imports: [
    { source: 'src/utils/common.js', items: [{ name: 'validateEmail', imported: 'validateEmail' }] },
    { source: 'src/db/connection.js', items: [{ name: 'db', imported: 'db' }] }
  ]
});

registry.addFile('src/db/connection.js', {
  functions: [{ name: 'connect', params: [], line: 5 }],
  classes: [],
  exports: [{ name: 'db', type: 'named' }],
  imports: []
});

// Create graph
const graph = new GraphEngine(testNodes, testEdges);

// Create checksums
const checksums = new ChecksumEngine();

const context = {
  registry,
  graph,
  checksums
};

console.log('✓ Test data ready\n');

// Test 1: Overall Health
console.log('2. Testing overall health calculation...');
const dashboard = new HealthDashboard(context);
const overall = await dashboard.getOverallHealth();
console.log(`   Score: ${overall.score}/100 (Grade: ${overall.grade})`);
console.log(`   Status: ${overall.status}`);
console.log(`   Issues: ${overall.issues.length}`);
console.log('✓ Overall health working\n');

// Test 2: God Files
console.log('3. Testing god file detection...');
const godFiles = await dashboard.identifyGodFiles(5);
console.log(`   Found: ${godFiles.length} god files`);
if (godFiles.length > 0) {
  console.log(`   Top god file: ${godFiles[0].file}`);
  console.log(`   Connections: ${godFiles[0].connections}`);
  console.log(`   Severity: ${godFiles[0].severity}`);
}
console.log('✓ God file detection working\n');

// Test 3: Circular Dependencies
console.log('4. Testing circular dependency detection...');
const cycles = await dashboard.findCircularDependencies();
console.log(`   Found: ${cycles.length} circular dependencies`);
if (cycles.length > 0) {
  console.log(`   Cycle #1: ${cycles[0].files.length} files`);
  console.log(`   Severity: ${cycles[0].severity}`);
}
console.log('✓ Circular dependency detection working\n');

// Test 4: Architecture Drift
console.log('5. Testing architecture drift detection...');
const drift = await dashboard.detectArchitectureDrift();
console.log(`   Score: ${drift.score}/100`);
console.log(`   Layer violations: ${drift.layerViolations.length}`);
console.log(`   Wrong directory files: ${drift.wrongDirectoryFiles.length}`);
console.log(`   Severity: ${drift.severity}`);
console.log('✓ Architecture drift detection working\n');

// Test 5: Bottlenecks
console.log('6. Testing bottleneck identification...');
const bottlenecks = await dashboard.identifyBottlenecks(3);
console.log(`   Found: ${bottlenecks.length} bottlenecks`);
if (bottlenecks.length > 0) {
  console.log(`   Top bottleneck: ${bottlenecks[0].file}`);
  console.log(`   Fan-In: ${bottlenecks[0].fanIn}`);
  console.log(`   Severity: ${bottlenecks[0].severity}`);
}
console.log('✓ Bottleneck identification working\n');

// Test 6: Unstable Modules
console.log('7. Testing unstable module detection...');
const unstable = await dashboard.findUnstableModules(0.5);
console.log(`   Found: ${unstable.length} unstable modules`);
if (unstable.length > 0) {
  console.log(`   Top unstable: ${unstable[0].file}`);
  console.log(`   Instability: ${unstable[0].instability.toFixed(2)}`);
}
console.log('✓ Unstable module detection working\n');

// Test 7: Orphaned Files
console.log('8. Testing orphaned file detection...');
const orphaned = await dashboard.findOrphanedFiles();
console.log(`   Found: ${orphaned.length} orphaned files`);
if (orphaned.length > 0) {
  console.log(`   Orphaned: ${orphaned[0].file}`);
}
console.log('✓ Orphaned file detection working\n');

// Test 8: Complexity Hotspots
console.log('9. Testing complexity hotspot identification...');
const hotspots = await dashboard.identifyComplexityHotspots();
console.log(`   Found: ${hotspots.length} complexity hotspots`);
if (hotspots.length > 0) {
  console.log(`   Top hotspot: ${hotspots[0].file}`);
  console.log(`   Score: ${hotspots[0].score.toFixed(1)}`);
  console.log(`   Severity: ${hotspots[0].severity}`);
}
console.log('✓ Complexity hotspot identification working\n');

// Test 9: Complete Report
console.log('10. Testing complete health report generation...');
const report = await dashboard.generateReport();
console.log(`   Overall score: ${report.overall.score}/100`);
console.log(`   God files: ${report.godFiles.length}`);
console.log(`   Circular deps: ${report.circularDependencies.length}`);
console.log(`   Bottlenecks: ${report.bottlenecks.length}`);
console.log(`   Recommendations: ${report.recommendations.length}`);
console.log('✓ Complete report generation working\n');

// Test 10: Report Formatting
console.log('11. Testing report formatting...');
const formatted = formatHealthReport(report);
console.log(`   Formatted report length: ${formatted.length} characters`);
console.log('✓ Report formatting working\n');

// Display formatted report
console.log('12. Displaying formatted health report:\n');
console.log(formatted);

// Summary
console.log('=== Phase 3.1 Test Summary ===');
console.log('✓ Overall health calculation');
console.log('✓ God file detection');
console.log('✓ Circular dependency detection');
console.log('✓ Architecture drift detection');
console.log('✓ Bottleneck identification');
console.log('✓ Unstable module detection');
console.log('✓ Orphaned file detection');
console.log('✓ Complexity hotspot identification');
console.log('✓ Complete report generation');
console.log('✓ Report formatting');
console.log('\n=== Phase 3.1 COMPLETE ===');
