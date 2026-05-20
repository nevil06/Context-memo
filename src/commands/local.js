/**
 * Local Command
 * Manage local-first runtime
 */

import { LocalRuntime } from '../local/localRuntime.js';
import { 
  formatLocalStatus, 
  formatInitResult, 
  formatModelTest,
  formatEmbeddingStats,
  formatSearchResults,
  formatCodeAnalysis
} from '../local/localFormatter.js';
import chalk from 'chalk';

/**
 * Execute local command
 */
export async function executeLocalCommand(action, options = {}) {
  const context = {}; // Minimal context for local runtime

  const runtime = new LocalRuntime(context);
  await runtime.load();
  await runtime.loadEmbeddings();

  try {
    switch (action) {
      case 'init':
        await handleInit(runtime, options);
        break;
      
      case 'status':
        await handleStatus(runtime);
        break;
      
      case 'test':
        await handleTest(runtime, options);
        break;
      
      case 'search':
        await handleSearch(runtime, options);
        break;
      
      case 'analyze':
        await handleAnalyze(runtime, options);
        break;
      
      case 'embeddings':
        await handleEmbeddings(runtime, options);
        break;
      
      default:
        console.log(chalk.red(`Unknown action: ${action}`));
        console.log(chalk.gray('Available actions: init, status, test, search, analyze, embeddings'));
    }
  } catch (error) {
    console.error(chalk.red(`\n✗ Local runtime error: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Handle init action
 */
async function handleInit(runtime, options) {
  console.log(chalk.cyan('\n🚀 Initializing local runtime...\n'));

  const result = await runtime.initialize({
    provider: options.provider || 'ollama',
    model: options.model || 'llama2',
    embeddingModel: options.embeddingModel || 'nomic-embed-text',
    apiUrl: options.apiUrl || 'http://localhost:11434'
  });

  console.log(formatInitResult(result));
}

/**
 * Handle status action
 */
async function handleStatus(runtime) {
  console.log(chalk.cyan('\n📊 Checking local runtime status...\n'));

  const status = await runtime.getStatus();
  console.log(formatLocalStatus(status));
}

/**
 * Handle test action
 */
async function handleTest(runtime, options) {
  const testType = options.type || 'both';

  console.log(chalk.cyan('\n🧪 Testing local runtime...\n'));

  if (testType === 'model' || testType === 'both') {
    console.log(chalk.bold('Testing text generation model...'));
    const modelTest = await runtime.testModel();
    console.log(formatModelTest(modelTest));
  }

  if (testType === 'embedding' || testType === 'both') {
    console.log(chalk.bold('Testing embedding model...'));
    const embeddingTest = await runtime.testEmbedding();
    console.log(formatModelTest(embeddingTest));
  }
}

/**
 * Handle search action
 */
async function handleSearch(runtime, options) {
  const { query, documents } = options;

  if (!query) {
    console.log(chalk.red('Error: --query is required'));
    return;
  }

  if (!documents || documents.length === 0) {
    console.log(chalk.red('Error: --documents is required'));
    return;
  }

  console.log(chalk.cyan('\n🔍 Performing semantic search...\n'));

  const results = await runtime.semanticSearch(query, documents, {
    topK: options.topK || 5,
    threshold: options.threshold || 0.3
  });

  console.log(formatSearchResults(results, query));
}

/**
 * Handle analyze action
 */
async function handleAnalyze(runtime, options) {
  const { code, task } = options;

  if (!code) {
    console.log(chalk.red('Error: --code is required'));
    return;
  }

  console.log(chalk.cyan('\n🔬 Analyzing code...\n'));

  const result = await runtime.analyzeCode(code, {
    task: task || 'explain'
  });

  console.log(formatCodeAnalysis(result));
}

/**
 * Handle embeddings action
 */
async function handleEmbeddings(runtime, options) {
  const subAction = options.action || 'stats';

  switch (subAction) {
    case 'stats':
      const stats = runtime.getEmbeddingStats();
      console.log(formatEmbeddingStats(stats));
      break;
    
    case 'clear':
      await runtime.clearEmbeddings();
      console.log(chalk.green('\n✓ Embeddings cache cleared\n'));
      break;
    
    case 'export':
      const exported = await runtime.exportEmbeddings();
      console.log(chalk.green(`\n✓ Exported ${exported.length} embeddings\n`));
      break;
    
    default:
      console.log(chalk.red(`Unknown embeddings action: ${subAction}`));
  }
}

/**
 * Get local runtime status (for programmatic use)
 */
export async function getLocalStatus() {
  try {
    const runtime = new LocalRuntime({});
    await runtime.load();
    return await runtime.getStatus();
  } catch (error) {
    return {
      available: false,
      initialized: false,
      error: error.message
    };
  }
}

/**
 * Check if local runtime is available
 */
export async function isLocalAvailable() {
  const status = await getLocalStatus();
  return status.available;
}
