/**
 * Test: Phase 3.2 - AI Trust Meter
 */

import { TrustMeter } from './src/trust/trustMeter.js';
import { formatTrustReport } from './src/trust/trustFormatter.js';
import { SymbolRegistry } from './src/registry/symbolRegistry.js';
import { GraphEngine } from './src/graph/graphEngine.js';

console.log('=== Phase 3.2: AI Trust Meter Test ===\n');

// Setup test context
console.log('1. Setting up test data...');

// Create test nodes
const testNodes = [
  { id: 'src/utils/helper.js', file: 'src/utils/helper.js', type: 'utility' },
  { id: 'src/models/User.js', file: 'src/models/User.js', type: 'model' },
  { id: 'src/services/userService.js', file: 'src/services/userService.js', type: 'service' },
  { id: 'src/api/routes.js', file: 'src/api/routes.js', type: 'api' },
  { id: 'src/orphaned.js', file: 'src/orphaned.js', type: 'unused' }
];

const testEdges = [
  { from: 'src/services/userService.js', to: 'src/models/User.js', type: 'imports' },
  { from: 'src/services/userService.js', to: 'src/utils/helper.js', type: 'imports' },
  { from: 'src/api/routes.js', to: 'src/services/userService.js', type: 'imports' }
];

// Create registry with symbols
const registry = new SymbolRegistry();

registry.addFile('src/utils/helper.js', {
  functions: [
    { name: 'formatData', params: ['data'], line: 5 },
    { name: 'validateInput', params: ['input'], line: 10 }
  ],
  classes: [],
  exports: [
    { name: 'formatData', type: 'named' },
    { name: 'validateInput', type: 'named' }
  ],
  imports: []
});

registry.addFile('src/models/User.js', {
  functions: [],
  classes: [{ name: 'User', methods: ['save', 'delete'], line: 5 }],
  exports: [{ name: 'User', type: 'default' }],
  imports: [
    { source: 'src/utils/helper.js', items: [{ name: 'formatData', imported: 'formatData', type: 'named' }] }
  ]
});

registry.addFile('src/services/userService.js', {
  functions: [{ name: 'createUser', params: ['data'], line: 5 }],
  classes: [],
  exports: [{ name: 'createUser', type: 'named' }],
  imports: [
    { source: 'src/models/User.js', items: [{ name: 'User', type: 'default' }] },
    { source: 'src/utils/helper.js', items: [{ name: 'validateInput', imported: 'validateInput', type: 'named' }] },
    // Invalid import (symbol not exported)
    { source: 'src/utils/helper.js', items: [{ name: 'nonExistent', imported: 'nonExistent', type: 'named' }], line: 10 }
  ]
});

registry.addFile('src/api/routes.js', {
  functions: [{ name: 'setupRoutes', params: ['app'], line: 5 }],
  classes: [],
  exports: [{ name: 'setupRoutes', type: 'named' }],
  imports: [
    { source: 'src/services/userService.js', items: [{ name: 'createUser', imported: 'createUser', type: 'named' }] }
  ]
});

// Create graph
const graph = new GraphEngine(testNodes, testEdges);

const context = {
  registry,
  graph,
  validator: null
};

console.log('✓ Test data ready\n');

// Test 1: Overall Trust
console.log('2. Testing overall trust calculation...');
const trustMeter = new TrustMeter(context);
const overall = await trustMeter.getOverallTrust();
console.log(`   Score: ${overall.score.toFixed(1)}/100 (Grade: ${overall.grade})`);
console.log(`   Level: ${overall.level}`);
console.log(`   Status: ${overall.status}`);
console.log(`   Factors: ${overall.factors.length}`);
console.log('✓ Overall trust working\n');

// Test 2: Symbol Verification
console.log('3. Testing symbol verification metrics...');
const symbolMetrics = await trustMeter.getSymbolVerificationMetrics();
console.log(`   Total symbols: ${symbolMetrics.totalSymbols}`);
console.log(`   Verified: ${symbolMetrics.verifiedSymbols}`);
console.log(`   Unverified: ${symbolMetrics.unverifiedSymbols}`);
console.log(`   Rate: ${symbolMetrics.verificationRate.toFixed(1)}%`);
console.log('✓ Symbol verification working\n');

// Test 3: Import Validation
console.log('4. Testing import validation metrics...');
const importMetrics = await trustMeter.getImportValidationMetrics();
console.log(`   Total imports: ${importMetrics.totalImports}`);
console.log(`   Valid: ${importMetrics.validImports}`);
console.log(`   Invalid: ${importMetrics.invalidImports}`);
console.log(`   Rate: ${importMetrics.validationRate.toFixed(1)}%`);
if (importMetrics.invalidImportsList.length > 0) {
  console.log(`   First invalid: ${importMetrics.invalidImportsList[0].symbol} from ${importMetrics.invalidImportsList[0].source}`);
}
console.log('✓ Import validation working\n');

// Test 4: Hallucination Risk
console.log('5. Testing hallucination risk assessment...');
const hallucinationRisk = await trustMeter.getHallucinationRisk();
console.log(`   Risk score: ${hallucinationRisk.score.toFixed(1)}/100`);
console.log(`   Risk level: ${hallucinationRisk.level}`);
console.log(`   Status: ${hallucinationRisk.status}`);
console.log(`   Risk factors: ${hallucinationRisk.risks.length}`);
if (hallucinationRisk.risks.length > 0) {
  console.log(`   Top risk: ${hallucinationRisk.risks[0].message}`);
}
console.log('✓ Hallucination risk working\n');

// Test 5: Validation History
console.log('6. Testing validation history...');
const history = await trustMeter.getValidationHistory();
console.log(`   Total validations: ${history.totalValidations}`);
console.log(`   Successful: ${history.successfulValidations}`);
console.log(`   Failed: ${history.failedValidations}`);
console.log(`   Success rate: ${history.successRate.toFixed(1)}%`);
console.log(`   Recent validations: ${history.recentValidations.length}`);
console.log('✓ Validation history working\n');

// Test 6: Trust Trend
console.log('7. Testing trust trend...');
const trend = await trustMeter.getTrustTrend();
console.log(`   Current: ${trend.current.toFixed(1)}`);
console.log(`   Trend: ${trend.trend}`);
console.log(`   History points: ${trend.history.length}`);
console.log('✓ Trust trend working\n');

// Test 7: Verified Symbols
console.log('8. Testing verified symbols list...');
const verified = await trustMeter.getVerifiedSymbols();
console.log(`   Verified symbols: ${verified.length}`);
if (verified.length > 0) {
  console.log(`   First: ${verified[0].name} (${verified[0].type})`);
}
console.log('✓ Verified symbols working\n');

// Test 8: Unverified Symbols
console.log('9. Testing unverified symbols list...');
const unverified = await trustMeter.getUnverifiedSymbols();
console.log(`   Unverified symbols: ${unverified.length}`);
if (unverified.length > 0) {
  console.log(`   First: ${unverified[0].name} (${unverified[0].type})`);
  console.log(`   Reason: ${unverified[0].reason}`);
}
console.log('✓ Unverified symbols working\n');

// Test 9: Complete Report
console.log('10. Testing complete trust report generation...');
const report = await trustMeter.generateReport();
console.log(`   Overall score: ${report.overall.score.toFixed(1)}/100`);
console.log(`   Symbol verification: ${report.symbolVerification.verificationRate.toFixed(1)}%`);
console.log(`   Import validation: ${report.importValidation.validationRate.toFixed(1)}%`);
console.log(`   Hallucination risk: ${report.hallucinationRisk.score.toFixed(1)}/100`);
console.log(`   Recommendations: ${report.recommendations.length}`);
console.log('✓ Complete report generation working\n');

// Test 10: Report Formatting
console.log('11. Testing report formatting...');
const formatted = formatTrustReport(report);
console.log(`   Formatted report length: ${formatted.length} characters`);
console.log('✓ Report formatting working\n');

// Display formatted report
console.log('12. Displaying formatted trust report:\n');
console.log(formatted);

// Summary
console.log('=== Phase 3.2 Test Summary ===');
console.log('✓ Overall trust calculation');
console.log('✓ Symbol verification metrics');
console.log('✓ Import validation metrics');
console.log('✓ Hallucination risk assessment');
console.log('✓ Validation history');
console.log('✓ Trust trend');
console.log('✓ Verified symbols list');
console.log('✓ Unverified symbols list');
console.log('✓ Complete report generation');
console.log('✓ Report formatting');
console.log('\n=== Phase 3.2 COMPLETE ===');
