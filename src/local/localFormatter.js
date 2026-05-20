/**
 * Local Runtime Formatter
 * Formats local runtime status and results for terminal display
 */

import chalk from 'chalk';

/**
 * Format local runtime status
 */
export function formatLocalStatus(status) {
  const lines = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('           LOCAL-FIRST RUNTIME STATUS'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');

  // Status
  lines.push(chalk.bold('📡 CONNECTION STATUS'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const availableStatus = status.available ? 
    chalk.green.bold('✓ AVAILABLE') : 
    chalk.red.bold('✗ UNAVAILABLE');
  
  lines.push(`Status: ${availableStatus}`);
  lines.push(`Initialized: ${status.initialized ? chalk.green('Yes') : chalk.red('No')}`);
  lines.push(`Offline Mode: ${status.offline ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
  lines.push('');

  // Configuration
  lines.push(chalk.bold('⚙️  CONFIGURATION'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(`Provider: ${chalk.cyan(status.provider)}`);
  lines.push(`Model: ${chalk.cyan(status.model)}`);
  lines.push(`Embedding Model: ${chalk.cyan(status.embeddingModel)}`);
  lines.push('');

  // Embeddings
  if (status.embeddings) {
    lines.push(chalk.bold('🔢 EMBEDDINGS'));
    lines.push(chalk.gray('─'.repeat(55)));
    lines.push(`Total Embeddings: ${chalk.yellow(status.embeddings.totalEmbeddings)}`);
    lines.push(`Cache Size: ${chalk.yellow(status.embeddings.cacheSize)}`);
    lines.push(`Provider: ${chalk.cyan(status.embeddings.provider)}`);
    lines.push(`Model: ${chalk.cyan(status.embeddings.model)}`);
    lines.push('');
  }

  // Footer
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format semantic search results
 */
export function formatSearchResults(results, query) {
  const lines = [];

  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('           SEMANTIC SEARCH RESULTS'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');

  lines.push(chalk.bold('🔍 QUERY'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.yellow(query));
  lines.push('');

  lines.push(chalk.bold('📊 RESULTS'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(`Found: ${chalk.cyan(results.length)} matches`);
  lines.push('');

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const rank = `${i + 1}.`.padEnd(3);
    const similarity = (result.similarity * 100).toFixed(1);
    const similarityColor = getSimilarityColor(result.similarity);
    
    lines.push(`${chalk.gray(rank)} ${similarityColor(similarity + '%')} similarity`);
    
    const docText = typeof result.document === 'string' ? 
      result.document : 
      result.document.text || JSON.stringify(result.document);
    
    const preview = docText.substring(0, 80);
    lines.push(`    ${chalk.gray(preview)}${docText.length > 80 ? '...' : ''}`);
    lines.push('');
  }

  lines.push(chalk.gray('─'.repeat(55)));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format model test results
 */
export function formatModelTest(testResult) {
  const lines = [];

  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('           MODEL TEST RESULTS'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');

  if (testResult.success) {
    lines.push(chalk.green.bold('✓ MODEL TEST PASSED'));
    lines.push('');
    lines.push(`Model: ${chalk.cyan(testResult.model)}`);
    lines.push(`Offline: ${testResult.offline ? chalk.green('Yes') : chalk.gray('No')}`);
    
    if (testResult.response) {
      lines.push('');
      lines.push(chalk.bold('Response:'));
      lines.push(chalk.gray(testResult.response));
    }
    
    if (testResult.dimension) {
      lines.push('');
      lines.push(`Embedding Dimension: ${chalk.yellow(testResult.dimension)}`);
    }
  } else {
    lines.push(chalk.red.bold('✗ MODEL TEST FAILED'));
    lines.push('');
    lines.push(chalk.red(`Error: ${testResult.error}`));
  }

  lines.push('');
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format embedding statistics
 */
export function formatEmbeddingStats(stats) {
  const lines = [];

  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('           EMBEDDING STATISTICS'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');

  lines.push(chalk.bold('📊 CACHE STATISTICS'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(`Total Embeddings: ${chalk.yellow(stats.totalEmbeddings)}`);
  lines.push(`Cache Size: ${chalk.yellow(stats.cacheSize)}`);
  lines.push(`Provider: ${chalk.cyan(stats.provider)}`);
  lines.push(`Model: ${chalk.cyan(stats.model)}`);
  lines.push('');

  lines.push(chalk.gray('─'.repeat(55)));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format initialization result
 */
export function formatInitResult(result) {
  const lines = [];

  lines.push('');
  
  if (result.success) {
    lines.push(chalk.green.bold('✓ Local runtime initialized successfully'));
    lines.push('');
    lines.push(chalk.bold('Configuration:'));
    lines.push(`  Provider: ${chalk.cyan(result.config.provider)}`);
    lines.push(`  Model: ${chalk.cyan(result.config.model)}`);
    lines.push(`  Embedding Model: ${chalk.cyan(result.config.embeddingModel)}`);
    lines.push(`  API URL: ${chalk.cyan(result.config.apiUrl)}`);
    lines.push(`  Offline Mode: ${result.config.offline ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
  } else {
    lines.push(chalk.red.bold('✗ Initialization failed'));
    lines.push('');
    lines.push(chalk.red(`Error: ${result.error}`));
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format code analysis result
 */
export function formatCodeAnalysis(result) {
  const lines = [];

  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('           CODE ANALYSIS'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');

  lines.push(chalk.bold('📝 ANALYSIS'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(`Task: ${chalk.yellow(result.task)}`);
  lines.push(`Offline: ${result.offline ? chalk.green('Yes') : chalk.gray('No')}`);
  lines.push('');
  lines.push(chalk.bold('Result:'));
  lines.push(result.analysis);
  lines.push('');

  lines.push(chalk.gray('─'.repeat(55)));
  lines.push('');

  return lines.join('\n');
}

/**
 * Get similarity color based on score
 */
function getSimilarityColor(similarity) {
  if (similarity >= 0.8) return chalk.green.bold;
  if (similarity >= 0.6) return chalk.green;
  if (similarity >= 0.4) return chalk.yellow;
  return chalk.gray;
}

/**
 * Format local runtime summary (compact)
 */
export function formatLocalSummary(status) {
  const lines = [];
  
  const statusIcon = status.available ? chalk.green('✓') : chalk.red('✗');
  lines.push(`${statusIcon} Local Runtime: ${status.available ? 'Available' : 'Unavailable'}`);
  lines.push(`Provider: ${status.provider} (${status.model})`);
  
  if (status.embeddings) {
    lines.push(`Embeddings: ${status.embeddings.totalEmbeddings} cached`);
  }
  
  return lines.join('\n');
}
