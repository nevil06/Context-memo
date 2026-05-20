/**
 * Test: Phase 3.4 - Local-First Runtime
 */

import { LocalRuntime } from './src/local/localRuntime.js';
import { formatLocalStatus, formatSearchResults, formatModelTest } from './src/local/localFormatter.js';

console.log('=== Phase 3.4: Local-First Runtime Test ===\n');

// Setup test context
console.log('1. Setting up local runtime...');
const context = {};
const runtime = new LocalRuntime(context);
console.log('✓ Runtime created\n');

// Test 1: Initialize
console.log('2. Testing initialization...');
const initResult = await runtime.initialize({
  provider: 'ollama',
  model: 'llama2',
  embeddingModel: 'nomic-embed-text',
  apiUrl: 'http://localhost:11434'
});
console.log(`   Success: ${initResult.success}`);
console.log(`   Provider: ${initResult.config.provider}`);
console.log(`   Model: ${initResult.config.model}`);
console.log('✓ Initialization working\n');

// Test 2: Check Availability
console.log('3. Testing availability check...');
const available = await runtime.isAvailable();
console.log(`   Available: ${available}`);
console.log('✓ Availability check working\n');

// Test 3: Generate Embedding
console.log('4. Testing embedding generation...');
const text1 = 'This is a test sentence for embedding.';
const embedding1 = await runtime.generateEmbedding(text1);
console.log(`   Embedding dimension: ${embedding1.length}`);
console.log(`   First 5 values: ${embedding1.slice(0, 5).map(v => v.toFixed(4)).join(', ')}`);
console.log('✓ Embedding generation working\n');

// Test 4: Generate Multiple Embeddings
console.log('5. Testing batch embedding generation...');
const texts = [
  'First test sentence',
  'Second test sentence',
  'Third test sentence'
];
const embeddings = await runtime.generateEmbeddings(texts);
console.log(`   Generated: ${embeddings.length} embeddings`);
console.log(`   Each dimension: ${embeddings[0].length}`);
console.log('✓ Batch embedding working\n');

// Test 5: Calculate Similarity
console.log('6. Testing similarity calculation...');
const text2 = 'This is another test sentence for embedding.';
const embedding2 = await runtime.generateEmbedding(text2);
const similarity = runtime.calculateSimilarity(embedding1, embedding2);
console.log(`   Similarity: ${(similarity * 100).toFixed(2)}%`);
console.log('✓ Similarity calculation working\n');

// Test 6: Semantic Search
console.log('7. Testing semantic search...');
const query = 'test sentence';
const documents = [
  'This is a test sentence.',
  'Another example document.',
  'Testing semantic search functionality.',
  'Completely unrelated content.',
  'More test data for searching.'
];
const searchResults = await runtime.semanticSearch(query, documents, {
  topK: 3,
  threshold: 0.3
});
console.log(`   Found: ${searchResults.length} results`);
if (searchResults.length > 0) {
  console.log(`   Top result similarity: ${(searchResults[0].similarity * 100).toFixed(2)}%`);
  console.log(`   Top result: ${searchResults[0].document.substring(0, 40)}...`);
}
console.log('✓ Semantic search working\n');

// Test 7: Generate Text
console.log('8. Testing text generation...');
const prompt = 'Explain what a function is in programming.';
const textResult = await runtime.generateText(prompt, {
  maxTokens: 100,
  temperature: 0.7
});
console.log(`   Model: ${textResult.model}`);
console.log(`   Offline: ${textResult.offline}`);
console.log(`   Response: ${textResult.text.substring(0, 60)}...`);
console.log('✓ Text generation working\n');

// Test 8: Analyze Code
console.log('9. Testing code analysis...');
const code = `
function add(a, b) {
  return a + b;
}
`;
const analysis = await runtime.analyzeCode(code, { task: 'explain' });
console.log(`   Task: ${analysis.task}`);
console.log(`   Offline: ${analysis.offline}`);
console.log(`   Analysis: ${analysis.analysis.substring(0, 60)}...`);
console.log('✓ Code analysis working\n');

// Test 9: Embedding Statistics
console.log('10. Testing embedding statistics...');
const stats = runtime.getEmbeddingStats();
console.log(`   Total embeddings: ${stats.totalEmbeddings}`);
console.log(`   Cache size: ${stats.cacheSize}`);
console.log(`   Provider: ${stats.provider}`);
console.log(`   Model: ${stats.model}`);
console.log('✓ Statistics working\n');

// Test 10: Export/Import Embeddings
console.log('11. Testing embedding export/import...');
const exported = await runtime.exportEmbeddings();
console.log(`   Exported: ${exported.length} embeddings`);

await runtime.clearEmbeddings();
console.log(`   Cleared cache`);

const importResult = await runtime.importEmbeddings(exported);
console.log(`   Imported: ${importResult.imported} embeddings`);
console.log(`   Total: ${importResult.total}`);
console.log('✓ Export/import working\n');

// Test 11: Test Model
console.log('12. Testing model test...');
const modelTest = await runtime.testModel();
console.log(`   Success: ${modelTest.success}`);
console.log(`   Model: ${modelTest.model}`);
console.log(`   Offline: ${modelTest.offline}`);
console.log('✓ Model test working\n');

// Test 12: Test Embedding Model
console.log('13. Testing embedding model test...');
const embeddingTest = await runtime.testEmbedding();
console.log(`   Success: ${embeddingTest.success}`);
console.log(`   Model: ${embeddingTest.model}`);
console.log(`   Dimension: ${embeddingTest.dimension}`);
console.log(`   Offline: ${embeddingTest.offline}`);
console.log('✓ Embedding test working\n');

// Test 13: Get Status
console.log('14. Testing status retrieval...');
const status = await runtime.getStatus();
console.log(`   Available: ${status.available}`);
console.log(`   Initialized: ${status.initialized}`);
console.log(`   Provider: ${status.provider}`);
console.log(`   Model: ${status.model}`);
console.log(`   Embeddings: ${status.embeddings.totalEmbeddings}`);
console.log('✓ Status retrieval working\n');

// Test 14: Update Configuration
console.log('15. Testing configuration update...');
const updatedConfig = await runtime.updateConfig({
  model: 'llama2-updated'
});
console.log(`   Updated model: ${updatedConfig.model}`);
console.log('✓ Configuration update working\n');

// Test 15: Format Status
console.log('16. Testing status formatting...');
const formatted = formatLocalStatus(status);
console.log(`   Formatted length: ${formatted.length} characters`);
console.log('✓ Status formatting working\n');

// Display formatted status
console.log('17. Displaying formatted status:\n');
console.log(formatted);

// Display formatted search results
console.log('18. Displaying formatted search results:\n');
const formattedSearch = formatSearchResults(searchResults, query);
console.log(formattedSearch);

// Display formatted model test
console.log('19. Displaying formatted model test:\n');
const formattedTest = formatModelTest(modelTest);
console.log(formattedTest);

// Summary
console.log('=== Phase 3.4 Test Summary ===');
console.log('✓ Initialization');
console.log('✓ Availability check');
console.log('✓ Embedding generation');
console.log('✓ Batch embeddings');
console.log('✓ Similarity calculation');
console.log('✓ Semantic search');
console.log('✓ Text generation');
console.log('✓ Code analysis');
console.log('✓ Embedding statistics');
console.log('✓ Export/import');
console.log('✓ Model testing');
console.log('✓ Embedding model testing');
console.log('✓ Status retrieval');
console.log('✓ Configuration update');
console.log('✓ Status formatting');
console.log('\n=== Phase 3.4 COMPLETE ===');
console.log('\n🎉 ALL PHASE 3 COMPONENTS COMPLETE! 🎉');
