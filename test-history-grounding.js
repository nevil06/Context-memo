/**
 * Test History Grounding Layer
 * Verifies the historyRetriever, historyValidator, invalidation strategy integration,
 * trust meter, and confidence scorer.
 */

import { HistoryRetriever } from './src/retrieval/historyRetriever.js';
import { validateHistoryClaims } from './src/validation/historyValidator.js';
import { InvalidationStrategy } from './src/checksum/invalidation.js';
import { TrustMeter } from './src/trust/trustMeter.js';
import { calculateEditConfidence, calculateGenerationConfidence } from './src/scoring/confidenceScorer.js';
import { GraphEngine } from './src/graph/graphEngine.js';
import { SymbolRegistry } from './src/registry/symbolRegistry.js';
import assert from 'assert';
import fsSync from 'fs';
import path from 'path';

// Subclass HistoryRetriever to simulate CLI execution
class MockHistoryRetriever extends HistoryRetriever {
  constructor(mockData = {}) {
    super({ enabled: true });
    this.mockData = mockData;
    this.available = true;
  }

  async isAvailable() {
    return true;
  }

  async retrieveForFile(filePath, options = {}) {
    return this.mockData.files?.[filePath] || [];
  }

  async searchHistory(query, options = {}) {
    // If any mocked claim substring is inside the query, return true
    return this.mockData.claims?.some(c => query.toLowerCase().includes(c.toLowerCase())) || false;
  }
}

async function runTests() {
  console.log('🧪 Running history grounding integration tests...\n');

  // Setup Mock Data
  const mockData = {
    files: {
      'src/utils/prompt.js': [
        { sessionId: 'session_1', eventId: 'event_a', provider: 'openai', snippet: 'Initial prompt builder implementation' },
        { sessionId: 'session_2', eventId: 'event_b', provider: 'anthropic', snippet: 'Refactored buildGeminiPrompt error' }
      ]
    },
    claims: [
      'context-memo',
      'Babel AST-based local parsing',
      'decision log tracks key decisions'
    ]
  };

  const mockRetriever = new MockHistoryRetriever(mockData);

  // Test 1: Retriever formatForPrompt
  console.log('Test 1: Retriever formatForPrompt');
  const historyByFile = {
    'src/utils/prompt.js': mockData.files['src/utils/prompt.js']
  };
  const formatted = mockRetriever.formatForPrompt(historyByFile);
  assert(formatted.includes('File: src/utils/prompt.js'));
  assert(formatted.includes('session_1'));
  assert(formatted.includes('event_b'));
  console.log('  ✓ Successfully formatted prompt history context');

  // Test 2: History Claims Validator
  console.log('\nTest 2: History Claims Validator');
  const draftMemory = `
project:
  name: context-memo
  purpose: Babel AST-based local parsing extracts imports and exports.
  stack: Node.js and TypeScript.
  constraints: [inference] Free tier and offline-first.
  decision log tracks key decisions.
`;

  const validation = await validateHistoryClaims(draftMemory, mockRetriever);
  
  // "context-memo" -> cited
  // "Babel AST-based local parsing" -> cited
  // "decision log tracks key decisions" -> cited
  // "Node.js and TypeScript." -> uncited
  // "Free tier and offline-first." -> ignored (contains "[inference]")
  
  assert.strictEqual(validation.checkedClaims, 4);
  assert.strictEqual(validation.citedClaims, 3);
  assert.strictEqual(validation.uncitedClaims, 1);
  assert.strictEqual(validation.flagged.length, 1); // stack is uncited
  assert(validation.flagged[0].claim.includes('Node.js and TypeScript'));
  console.log('  ✓ Correctly validated cited, uncited, and [inference] claims');

  // Test 3: Invalidation check and stale cache logic
  console.log('\nTest 3: Invalidation cache check');
  // Write a temp config file for history_query_cache
  const mockHashes = {
    'src/utils/prompt.js': 'hash_current',
    'src/utils/scanner.js': 'hash_old'
  };
  
  // We can write to .recall/history_query_cache.json to test invalidation strategy
  const cacheDir = path.join(process.cwd(), '.recall');
  if (!fsSync.existsSync(cacheDir)) {
    fsSync.mkdirSync(cacheDir, { recursive: true });
  }
  fsSync.writeFileSync(
    path.join(cacheDir, 'history_query_cache.json'),
    JSON.stringify({
      'src/utils/prompt.js': 'hash_current',
      'src/utils/scanner.js': 'hash_different'
    }, null, 2),
    'utf8'
  );

  // We mock a simple checksum engine
  const mockChecksumEngine = {
    hasRepositoryChanged: () => false,
    hasGraphChanged: () => false,
    hasSymbolsChanged: () => false,
    getChangedFiles: () => ({ changed: [], added: [], removed: [] }),
    getChangedModules: () => []
  };

  const strategy = new InvalidationStrategy(mockChecksumEngine);
  const invalidationResult = strategy.checkInvalidation(
    new GraphEngine([], []),
    new SymbolRegistry(),
    mockHashes
  );

  // 'src/utils/prompt.js': hash matches -> not stale
  // 'src/utils/scanner.js': hash differs -> stale
  assert.strictEqual(invalidationResult.historyStale['src/utils/prompt.js'], false);
  assert.strictEqual(invalidationResult.historyStale['src/utils/scanner.js'], true);
  assert(invalidationResult.historyStaleFiles.includes('src/utils/scanner.js'));
  console.log('  ✓ Invalidation strategy correctly computes history staleness');

  // Test 4: Trust Meter history factor
  console.log('\nTest 4: Trust Meter integration');
  // Write memory.yaml to recall directory so getHistoryCitationMetrics can read it
  fsSync.writeFileSync(
    path.join(cacheDir, 'memory.yaml'),
    draftMemory,
    'utf8'
  );

  // Mock a context for trust meter
  const mockContext = {
    registry: new SymbolRegistry(),
    graph: new GraphEngine([], []),
    validator: null,
    historyValidation: {
      checkedClaims: 3,
      citedClaims: 2,
      uncitedClaims: 1,
      citationRate: 66.67,
      flagged: [{ claim: 'Node.js and TypeScript', reason: 'no history citation' }]
    }
  };

  const trustMeter = new TrustMeter(mockContext);
  const report = await trustMeter.generateReport();
  
  // Assert History Citation factor is included and scores/deductions are calculated
  const historyFactor = report.overall.factors.find(f => f.name === 'History Citation');
  assert(historyFactor);
  assert.strictEqual(historyFactor.rate, 66.67);
  assert(historyFactor.deduction > 0);
  
  // Assert hallucination risk includes uncited claims count
  const uncitedRisk = report.hallucinationRisk.risks.find(r => r.type === 'uncited_claims');
  assert(uncitedRisk);
  assert.strictEqual(uncitedRisk.count, 1);
  console.log('  ✓ Trust Meter successfully factors in history citation rate and uncited claims');

  // Test 5: Confidence Scorer history awareness
  console.log('\nTest 5: Confidence Scorer citation-awareness');
  const genContextWithHistory = {
    citesHistory: true,
    symbolsVerified: 1,
    totalSymbols: 1,
    importsVerified: 1,
    totalImports: 1,
    pathsVerified: 1,
    totalPaths: 1,
    syntaxValid: true
  };
  const genContextIgnoredFailure = {
    ignoredHistoryFailure: true,
    symbolsVerified: 1,
    totalSymbols: 1,
    importsVerified: 1,
    totalImports: 1,
    pathsVerified: 1,
    totalPaths: 1,
    syntaxValid: true
  };

  const confCites = calculateGenerationConfidence(genContextWithHistory);
  const confIgnored = calculateGenerationConfidence(genContextIgnoredFailure);

  // Bonus for citing history: base score 100 + 10 (capped at 100)
  assert.strictEqual(confCites.score, 100);
  // Penalty for ignoring failure: base score 100 - 30 = 70
  assert.strictEqual(confIgnored.score, 70);
  
  const editCites = calculateEditConfidence({ file: 'src/utils/prompt.js', citesHistory: true }, new GraphEngine([], []), new SymbolRegistry());
  const editIgnored = calculateEditConfidence({ file: 'src/utils/prompt.js', ignoredHistoryFailure: true }, new GraphEngine([], []), new SymbolRegistry());

  // Base edit score for missing registry file is 70.
  // 70 + 10 = 80
  assert.strictEqual(editCites.score, 80);
  // 70 - 40 = 30
  assert.strictEqual(editIgnored.score, 30);
  console.log('  ✓ Confidence Scorer correctly adjusts scores for citing vs ignoring history');

  console.log('\n🎉 All integration tests passed successfully!');
}

runTests().catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
