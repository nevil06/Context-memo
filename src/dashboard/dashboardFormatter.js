/**
 * Dashboard Formatter
 * Formats health dashboard for terminal display
 */

import chalk from 'chalk';

/**
 * Format health report for terminal
 */
export function formatHealthReport(report) {
  const lines = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('           REPOSITORY HEALTH DASHBOARD'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');

  // Overall Health
  lines.push(formatOverallHealth(report.overall));
  lines.push('');

  // God Files
  if (report.godFiles.length > 0) {
    lines.push(formatGodFiles(report.godFiles));
    lines.push('');
  }

  // Circular Dependencies
  if (report.circularDependencies.length > 0) {
    lines.push(formatCircularDependencies(report.circularDependencies));
    lines.push('');
  }

  // Architecture Drift
  if (report.architectureDrift.score < 100) {
    lines.push(formatArchitectureDrift(report.architectureDrift));
    lines.push('');
  }

  // Bottlenecks
  if (report.bottlenecks.length > 0) {
    lines.push(formatBottlenecks(report.bottlenecks));
    lines.push('');
  }

  // Unstable Modules
  if (report.unstableModules.length > 0) {
    lines.push(formatUnstableModules(report.unstableModules));
    lines.push('');
  }

  // Orphaned Files
  if (report.orphanedFiles.length > 0) {
    lines.push(formatOrphanedFiles(report.orphanedFiles));
    lines.push('');
  }

  // Complexity Hotspots
  if (report.complexityHotspots.length > 0) {
    lines.push(formatComplexityHotspots(report.complexityHotspots));
    lines.push('');
  }

  // History Grounding
  if (report.historyGrounding) {
    lines.push(formatHistoryGrounding(report.historyGrounding));
    lines.push('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push(formatRecommendations(report.recommendations));
    lines.push('');
  }

  // Footer
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.gray(`Generated: ${new Date(report.timestamp).toLocaleString()}`));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format overall health section
 */
function formatOverallHealth(overall) {
  const lines = [];
  
  lines.push(chalk.bold('📊 OVERALL HEALTH'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  // Score with color
  const scoreColor = getScoreColor(overall.score);
  lines.push(`Score: ${scoreColor(overall.score + '/100')} (Grade: ${scoreColor(overall.grade)})`);
  lines.push(`Status: ${getStatusBadge(overall.status)}`);
  
  if (overall.issues.length > 0) {
    lines.push('');
    lines.push(chalk.yellow('Issues:'));
    for (const issue of overall.issues) {
      lines.push(`  ${chalk.yellow('•')} ${issue}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format god files section
 */
function formatGodFiles(godFiles) {
  const lines = [];
  
  lines.push(chalk.bold('🔥 GOD FILES (Highly Connected)'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.gray(`Found ${godFiles.length} god files`));
  lines.push('');
  
  const top = godFiles.slice(0, 5);
  for (const file of top) {
    const severity = getSeverityBadge(file.severity);
    lines.push(`${severity} ${chalk.cyan(file.file)}`);
    lines.push(`   Connections: ${file.connections} (↑${file.fanOut} deps, ↓${file.fanIn} dependents)`);
    lines.push(`   Symbols: ${file.functions} functions, ${file.classes} classes`);
    lines.push('');
  }
  
  if (godFiles.length > 5) {
    lines.push(chalk.gray(`   ... and ${godFiles.length - 5} more`));
  }
  
  return lines.join('\n');
}

/**
 * Format circular dependencies section
 */
function formatCircularDependencies(cycles) {
  const lines = [];
  
  lines.push(chalk.bold('🔄 CIRCULAR DEPENDENCIES'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.gray(`Found ${cycles.length} circular dependencies`));
  lines.push('');
  
  const top = cycles.slice(0, 3);
  for (const cycle of top) {
    const severity = getSeverityBadge(cycle.severity);
    lines.push(`${severity} Cycle #${cycle.id} (${cycle.length} files)`);
    
    for (let i = 0; i < cycle.files.length; i++) {
      const file = cycle.files[i];
      const arrow = i < cycle.files.length - 1 ? ' → ' : ' ⤴';
      lines.push(`   ${chalk.yellow(file)}${arrow}`);
    }
    lines.push('');
  }
  
  if (cycles.length > 3) {
    lines.push(chalk.gray(`   ... and ${cycles.length - 3} more cycles`));
  }
  
  return lines.join('\n');
}

/**
 * Format architecture drift section
 */
function formatArchitectureDrift(drift) {
  const lines = [];
  
  lines.push(chalk.bold('🏗️  ARCHITECTURE DRIFT'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(`Score: ${getScoreColor(drift.score)(drift.score + '/100')} (${drift.severity})`);
  lines.push('');
  
  if (drift.layerViolations.length > 0) {
    lines.push(chalk.yellow('Layer Violations:'));
    const top = drift.layerViolations.slice(0, 5);
    for (const violation of top) {
      lines.push(`  ${chalk.yellow('•')} ${violation.file}`);
      lines.push(`    ${chalk.gray(violation.violation)}`);
    }
    if (drift.layerViolations.length > 5) {
      lines.push(chalk.gray(`    ... and ${drift.layerViolations.length - 5} more`));
    }
    lines.push('');
  }
  
  if (drift.wrongDirectoryFiles.length > 0) {
    lines.push(chalk.yellow('Wrong Directory:'));
    const top = drift.wrongDirectoryFiles.slice(0, 5);
    for (const file of top) {
      lines.push(`  ${chalk.yellow('•')} ${file.file}`);
      lines.push(`    ${chalk.gray(file.issue)}`);
    }
    if (drift.wrongDirectoryFiles.length > 5) {
      lines.push(chalk.gray(`    ... and ${drift.wrongDirectoryFiles.length - 5} more`));
    }
  }
  
  return lines.join('\n');
}

/**
 * Format bottlenecks section
 */
function formatBottlenecks(bottlenecks) {
  const lines = [];
  
  lines.push(chalk.bold('⚠️  BOTTLENECKS (High Fan-In)'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.gray(`Found ${bottlenecks.length} bottlenecks`));
  lines.push('');
  
  const top = bottlenecks.slice(0, 5);
  for (const bottleneck of top) {
    const severity = getSeverityBadge(bottleneck.severity);
    lines.push(`${severity} ${chalk.cyan(bottleneck.file)}`);
    lines.push(`   Fan-In: ${bottleneck.fanIn} (${bottleneck.dependents.length} direct dependents)`);
  }
  
  if (bottlenecks.length > 5) {
    lines.push(chalk.gray(`   ... and ${bottlenecks.length - 5} more`));
  }
  
  return lines.join('\n');
}

/**
 * Format unstable modules section
 */
function formatUnstableModules(unstable) {
  const lines = [];
  
  lines.push(chalk.bold('📉 UNSTABLE MODULES'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.gray(`Found ${unstable.length} unstable modules`));
  lines.push('');
  
  const top = unstable.slice(0, 5);
  for (const module of top) {
    const severity = getSeverityBadge(module.severity);
    lines.push(`${severity} ${chalk.cyan(module.file)}`);
    lines.push(`   Instability: ${module.instability.toFixed(2)} (↑${module.fanOut} deps, ↓${module.fanIn} dependents)`);
  }
  
  if (unstable.length > 5) {
    lines.push(chalk.gray(`   ... and ${unstable.length - 5} more`));
  }
  
  return lines.join('\n');
}

/**
 * Format orphaned files section
 */
function formatOrphanedFiles(orphaned) {
  const lines = [];
  
  lines.push(chalk.bold('🗑️  ORPHANED FILES'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.gray(`Found ${orphaned.length} orphaned files`));
  lines.push('');
  
  const top = orphaned.slice(0, 5);
  for (const file of top) {
    lines.push(`  ${chalk.gray('•')} ${file.file}`);
  }
  
  if (orphaned.length > 5) {
    lines.push(chalk.gray(`   ... and ${orphaned.length - 5} more`));
  }
  
  return lines.join('\n');
}

/**
 * Format complexity hotspots section
 */
function formatComplexityHotspots(hotspots) {
  const lines = [];
  
  lines.push(chalk.bold('🌡️  COMPLEXITY HOTSPOTS'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.gray(`Found ${hotspots.length} complexity hotspots`));
  lines.push('');
  
  const top = hotspots.slice(0, 5);
  for (const hotspot of top) {
    const severity = getSeverityBadge(hotspot.severity);
    lines.push(`${severity} ${chalk.cyan(hotspot.file)}`);
    lines.push(`   Score: ${hotspot.score.toFixed(1)} (${hotspot.functions} funcs, ${hotspot.classes} classes, ${hotspot.connections} connections)`);
  }
  
  if (hotspots.length > 5) {
    lines.push(chalk.gray(`   ... and ${hotspots.length - 5} more`));
  }
  
  return lines.join('\n');
}

/**
 * Format recommendations section
 */
function formatRecommendations(recommendations) {
  const lines = [];
  
  lines.push(chalk.bold('💡 RECOMMENDATIONS'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push('');
  
  for (const rec of recommendations) {
    const priority = getPriorityBadge(rec.priority);
    lines.push(`${priority} ${rec.message}`);
    
    if (rec.files) {
      for (const file of rec.files.slice(0, 3)) {
        lines.push(`   ${chalk.gray('•')} ${file}`);
      }
    }
    
    if (rec.cycles) {
      for (const cycle of rec.cycles) {
        lines.push(`   ${chalk.gray('•')} Cycle with ${cycle.length} files`);
      }
    }
    
    if (rec.violations) {
      lines.push(`   ${chalk.gray('•')} ${rec.violations} violations found`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Get score color based on value
 */
function getScoreColor(score) {
  if (score >= 90) return chalk.green.bold;
  if (score >= 80) return chalk.green;
  if (score >= 70) return chalk.yellow;
  if (score >= 60) return chalk.red;
  return chalk.red.bold;
}

/**
 * Get status badge
 */
function getStatusBadge(status) {
  const badges = {
    excellent: chalk.green.bold('✓ EXCELLENT'),
    good: chalk.green('✓ GOOD'),
    fair: chalk.yellow('⚠ FAIR'),
    poor: chalk.red('⚠ POOR'),
    critical: chalk.red.bold('✗ CRITICAL')
  };
  return badges[status] || status;
}

/**
 * Get severity badge
 */
function getSeverityBadge(severity) {
  const badges = {
    critical: chalk.red.bold('[CRITICAL]'),
    high: chalk.red('[HIGH]'),
    medium: chalk.yellow('[MEDIUM]'),
    low: chalk.gray('[LOW]')
  };
  return badges[severity] || `[${severity}]`;
}

/**
 * Get priority badge
 */
function getPriorityBadge(priority) {
  const badges = {
    critical: chalk.red.bold('[CRITICAL]'),
    high: chalk.red('[HIGH]'),
    medium: chalk.yellow('[MEDIUM]'),
    low: chalk.gray('[LOW]')
  };
  return badges[priority] || `[${priority}]`;
}

/**
 * Format health summary (compact version)
 */
export function formatHealthSummary(report) {
  const lines = [];
  
  const scoreColor = getScoreColor(report.overall.score);
  lines.push(`Health: ${scoreColor(report.overall.score + '/100')} (${report.overall.grade})`);
  
  const issues = [];
  if (report.godFiles.length > 0) issues.push(`${report.godFiles.length} god files`);
  if (report.circularDependencies.length > 0) issues.push(`${report.circularDependencies.length} cycles`);
  if (report.bottlenecks.length > 0) issues.push(`${report.bottlenecks.length} bottlenecks`);
  if (report.historyGrounding && report.historyGrounding.citationRate < 100) {
    issues.push(`history citation rate ${report.historyGrounding.citationRate}%`);
  }
  
  if (issues.length > 0) {
    lines.push(`Issues: ${issues.join(', ')}`);
  }
  
  return lines.join('\n');
}

/**
 * Format history grounding section
 */
function formatHistoryGrounding(metrics) {
  const lines = [];
  
  lines.push(chalk.bold('🔗 HISTORY GROUNDING (Hallucination Reduction)'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const citationColor = getScoreColor(metrics.citationRate);
  lines.push(`Citation Rate: ${citationColor(metrics.citationRate + '%')}`);
  lines.push(`Checked Claims: ${metrics.checkedClaims}`);
  lines.push(`Cited Claims:   ${metrics.citedClaims}`);
  lines.push(`Uncited Claims: ${metrics.uncitedClaims}`);
  
  if (metrics.flagged && metrics.flagged.length > 0) {
    lines.push('');
    lines.push(chalk.yellow('Flagged Claims (Unverified Facts):'));
    for (const item of metrics.flagged.slice(0, 5)) {
      lines.push(`  ${chalk.yellow('•')} "${item.claim}"`);
    }
    if (metrics.flagged.length > 5) {
      lines.push(chalk.gray(`  ... and ${metrics.flagged.length - 5} more`));
    }
  } else {
    lines.push(chalk.green('\n✓ All factual claims are grounded in past session history.'));
  }
  
  return lines.join('\n');
}

