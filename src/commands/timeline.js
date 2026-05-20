/**
 * Timeline Command
 * Display edit replay timeline
 */

import { EditTimeline } from '../timeline/editTimeline.js';
import { formatTimelineReport, formatFileTimeline, formatChangeComparison } from '../timeline/timelineFormatter.js';
import { SymbolRegistry } from '../registry/symbolRegistry.js';
import { GraphEngine } from '../graph/graphEngine.js';
import { getRecallPath, fileExists } from '../utils/fileUtils.js';
import fs from 'fs/promises';
import chalk from 'chalk';

/**
 * Execute timeline command
 */
export async function executeTimelineCommand(options = {}) {
  const { 
    file = null, 
    compare = null,
    limit = 10,
    save = false 
  } = options;

  console.log(chalk.cyan('\n⏱️  Loading edit timeline...\n'));

  try {
    // Load context
    const context = await loadContext();

    // Create timeline
    const timeline = new EditTimeline(context);
    await timeline.load();

    // Handle different modes
    if (compare) {
      // Compare two changes
      const [id1, id2] = compare.split(',');
      const comparison = await timeline.compareChanges(id1.trim(), id2.trim());
      console.log(formatChangeComparison(comparison));
    } else if (file) {
      // Show timeline for specific file
      const fileTimeline = await timeline.getFileTimeline(file, { limit });
      console.log(formatFileTimeline({ file, events: fileTimeline.events }));
    } else {
      // Show full timeline report
      const report = await timeline.generateReport();
      console.log(formatTimelineReport(report));
    }

    // Save report if requested
    if (save) {
      const report = await timeline.generateReport();
      await saveReport(report);
      console.log(chalk.green('✓ Report saved to .recall/timeline_report.json\n'));
    }

  } catch (error) {
    console.error(chalk.red(`\n✗ Timeline display failed: ${error.message}\n`));
    process.exit(1);
  }
}

/**
 * Record a change event
 */
export async function recordChange(change) {
  try {
    const context = await loadContext();
    const timeline = new EditTimeline(context);
    await timeline.load();
    
    const event = await timeline.recordChange(change);
    return event;
  } catch (error) {
    console.error(chalk.red(`Failed to record change: ${error.message}`));
    return null;
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
    graph
  };
}

/**
 * Save timeline report to disk
 */
async function saveReport(report) {
  const reportPath = getRecallPath('timeline_report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
}

/**
 * Get recent changes (for programmatic use)
 */
export async function getRecentChanges(limit = 10) {
  try {
    const context = await loadContext();
    const timeline = new EditTimeline(context);
    await timeline.load();
    
    const recent = await timeline.getRecentChanges(limit);
    return recent.events;
  } catch (error) {
    return [];
  }
}

/**
 * Get timeline stats (for programmatic use)
 */
export async function getTimelineStats() {
  try {
    const context = await loadContext();
    const timeline = new EditTimeline(context);
    await timeline.load();
    
    return await timeline.getStats();
  } catch (error) {
    return {
      totalChanges: 0,
      avgImpact: 0,
      avgRiskScore: 0,
      highRiskChanges: 0
    };
  }
}
