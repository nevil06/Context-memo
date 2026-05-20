/**
 * Health Command
 * Display repository health dashboard
 */

import { HealthDashboard } from '../dashboard/healthDashboard.js';
import { formatHealthReport, formatHealthSummary } from '../dashboard/dashboardFormatter.js';
import { SymbolRegistry } from '../registry/symbolRegistry.js';
import { GraphEngine } from '../graph/graphEngine.js';
import { ChecksumEngine } from '../checksum/checksumEngine.js';
import { getRecallPath, fileExists } from '../utils/fileUtils.js';
import fs from 'fs/promises';
import chalk from 'chalk';

/**
 * Execute health command
 */
export async function executeHealthCommand(options = {}) {
  const { format = 'full', save = false } = options;

  console.log(chalk.cyan('\n🔍 Analyzing repository health...\n'));

  try {
    // Load context
    const context = await loadContext();

    // Generate health report
    const dashboard = new HealthDashboard(context);
    const report = await dashboard.generateReport();

    // Display report
    if (format === 'summary') {
      console.log(formatHealthSummary(report));
    } else {
      console.log(formatHealthReport(report));
    }

    // Save report if requested
    if (save) {
      await saveReport(report);
      console.log(chalk.green('✓ Report saved to .recall/health_report.json\n'));
    }

    // Exit with appropriate code
    if (report.overall.score < 60) {
      process.exit(1); // Critical health
    }

  } catch (error) {
    console.error(chalk.red(`\n✗ Health check failed: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Load context (registry, graph, checksums)
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

  // Load checksums
  const checksums = new ChecksumEngine();
  await checksums.load();

  return {
    registry,
    graph,
    checksums
  };
}

/**
 * Save health report to disk
 */
async function saveReport(report) {
  const reportPath = getRecallPath('health_report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
}

/**
 * Get health score (for programmatic use)
 */
export async function getHealthScore() {
  try {
    const context = await loadContext();
    const dashboard = new HealthDashboard(context);
    const report = await dashboard.generateReport();
    return report.overall.score;
  } catch (error) {
    return 0;
  }
}

/**
 * Check if repository is healthy (score >= 70)
 */
export async function isHealthy() {
  const score = await getHealthScore();
  return score >= 70;
}

