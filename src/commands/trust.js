/**
 * Trust Command
 * Display AI trust meter and confidence metrics
 */

import { TrustMeter } from '../trust/trustMeter.js';
import { formatTrustReport, formatTrustSummary } from '../trust/trustFormatter.js';
import { SymbolRegistry } from '../registry/symbolRegistry.js';
import { GraphEngine } from '../graph/graphEngine.js';
import { getRecallPath, fileExists } from '../utils/fileUtils.js';
import fs from 'fs/promises';
import chalk from 'chalk';

/**
 * Execute trust command
 */
export async function executeTrustCommand(options = {}) {
  const { format = 'full', save = false } = options;

  console.log(chalk.cyan('\n🎯 Analyzing AI trust metrics...\n'));

  try {
    // Load context
    const context = await loadContext();

    // Generate trust report
    const trustMeter = new TrustMeter(context);
    const report = await trustMeter.generateReport();

    // Display report
    if (format === 'summary') {
      console.log(formatTrustSummary(report));
    } else {
      console.log(formatTrustReport(report));
    }

    // Save report if requested
    if (save) {
      await saveReport(report);
      console.log(chalk.green('✓ Report saved to .recall/trust_report.json\n'));
    }

    // Exit with appropriate code
    if (report.overall.score < 70) {
      process.exit(1); // Low trust
    }

  } catch (error) {
    console.error(chalk.red(`\n✗ Trust analysis failed: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Load context (registry, graph)
 */
async function loadContext() {
  // Load symbol registry
  const registry = new SymbolRegistry();
  const registryLoaded = await registry.load();
  
  if (!registryLoaded) {
    throw new Error('Symbol registry not found. Run "memo scan" first.');
  }

  // Load dependency graph
  const graphPath = getRecallPath('graph.json');
  if (!await fileExists(graphPath)) {
    throw new Error('Dependency graph not found. Run "memo scan" first.');
  }

  const graphData = JSON.parse(await fs.readFile(graphPath, 'utf8'));
  const graph = new GraphEngine(graphData.nodes, graphData.edges);

  return {
    registry,
    graph,
    validator: null // Will be added when validator is integrated
  };
}

/**
 * Save trust report to disk
 */
async function saveReport(report) {
  const reportPath = getRecallPath('trust_report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
}

/**
 * Get trust score (for programmatic use)
 */
export async function getTrustScore() {
  try {
    const context = await loadContext();
    const trustMeter = new TrustMeter(context);
    const report = await trustMeter.generateReport();
    return report.overall.score;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if repository is trusted (score >= 80)
 */
export async function isTrusted() {
  const score = await getTrustScore();
  return score >= 80;
}
