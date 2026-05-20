/**
 * Timeline Formatter
 * Formats edit timeline for terminal display
 */

import chalk from 'chalk';

/**
 * Format timeline report for terminal
 */
export function formatTimelineReport(report) {
  const lines = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('           EDIT REPLAY TIMELINE'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');

  // Summary
  lines.push(formatSummary(report.summary));
  lines.push('');

  // Recent Activity
  if (report.recentActivity && report.recentActivity.length > 0) {
    lines.push(formatRecentActivity(report.recentActivity));
    lines.push('');
  }

  // Most Changed Files
  if (report.mostChangedFiles && report.mostChangedFiles.length > 0) {
    lines.push(formatMostChangedFiles(report.mostChangedFiles));
    lines.push('');
  }

  // High Risk Changes
  if (report.highRiskChanges && report.highRiskChanges.length > 0) {
    lines.push(formatHighRiskChanges(report.highRiskChanges));
    lines.push('');
  }

  // Recent Timeline
  if (report.timeline && report.timeline.length > 0) {
    lines.push(formatTimeline(report.timeline.slice(0, 10)));
    lines.push('');
  }

  // Footer
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.gray(`Total Changes: ${report.summary.totalChanges}`));
  lines.push('');

  return lines.join('\n');
}

/**
 * Format summary section
 */
function formatSummary(summary) {
  const lines = [];
  
  lines.push(chalk.bold('📊 SUMMARY'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  lines.push(`Total Changes: ${chalk.cyan(summary.totalChanges)}`);
  lines.push(`Avg Impact: ${chalk.yellow(summary.avgImpact.toFixed(1))} files`);
  lines.push(`Avg Risk Score: ${getRiskColor(summary.avgRiskScore)(summary.avgRiskScore.toFixed(1) + '/100')}`);
  
  if (summary.highRiskChanges > 0) {
    lines.push(`High Risk Changes: ${chalk.red(summary.highRiskChanges)}`);
  }
  
  return lines.join('\n');
}

/**
 * Format recent activity section
 */
function formatRecentActivity(activity) {
  const lines = [];
  
  lines.push(chalk.bold('📈 RECENT ACTIVITY (7 Days)'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  // Sort by date
  const sorted = [...activity].sort((a, b) => 
    new Date(a.day) - new Date(b.day)
  );

  // Find max for scaling
  const max = Math.max(...sorted.map(a => a.count));

  for (const item of sorted) {
    const barLength = Math.round((item.count / max) * 20) + 1;
    const bar = '█'.repeat(barLength);
    lines.push(`  ${item.day.padEnd(12)} ${chalk.cyan(bar)} ${item.count}`);
  }
  
  return lines.join('\n');
}

/**
 * Format most changed files section
 */
function formatMostChangedFiles(files) {
  const lines = [];
  
  lines.push(chalk.bold('🔥 MOST CHANGED FILES'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const top = files.slice(0, 10);
  for (let i = 0; i < top.length; i++) {
    const file = top[i];
    const rank = `${i + 1}.`.padEnd(3);
    lines.push(`  ${chalk.gray(rank)} ${chalk.cyan(file.file)}`);
    lines.push(`       ${chalk.yellow(file.count)} changes`);
  }
  
  return lines.join('\n');
}

/**
 * Format high risk changes section
 */
function formatHighRiskChanges(changes) {
  const lines = [];
  
  lines.push(chalk.bold('⚠️  HIGH RISK CHANGES'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const top = changes.slice(0, 5);
  for (const change of top) {
    const riskColor = getRiskColor(change.impact.riskScore);
    const time = new Date(change.timestamp).toLocaleString();
    
    lines.push(`${getRiskBadge(change.impact.riskScore)} ${chalk.cyan(change.file)}`);
    lines.push(`   ${chalk.gray('Time:')} ${time}`);
    lines.push(`   ${chalk.gray('Risk:')} ${riskColor(change.impact.riskScore + '/100')}`);
    lines.push(`   ${chalk.gray('Impact:')} ${change.impact.blastRadius} files affected`);
    
    if (change.reasoning) {
      lines.push(`   ${chalk.gray('Reason:')} ${change.reasoning}`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Format timeline section
 */
function formatTimeline(events) {
  const lines = [];
  
  lines.push(chalk.bold('⏱️  RECENT CHANGES'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  for (const event of events) {
    const time = new Date(event.timestamp).toLocaleString();
    const typeIcon = getTypeIcon(event.type);
    const riskColor = getRiskColor(event.impact?.riskScore || 0);
    
    lines.push(`${typeIcon} ${chalk.cyan(event.file || 'unknown')}`);
    lines.push(`   ${chalk.gray('Time:')} ${time}`);
    lines.push(`   ${chalk.gray('Type:')} ${event.type}`);
    
    if (event.impact) {
      lines.push(`   ${chalk.gray('Impact:')} ${event.impact.blastRadius} files, Risk: ${riskColor(event.impact.riskScore + '/100')}`);
    }
    
    if (event.reasoning) {
      lines.push(`   ${chalk.gray('Reason:')} ${event.reasoning}`);
    }
    
    if (event.confidence < 100) {
      lines.push(`   ${chalk.gray('Confidence:')} ${event.confidence}%`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Format file timeline
 */
export function formatFileTimeline(timeline) {
  const lines = [];
  
  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan(`           FILE TIMELINE: ${timeline.file || 'Unknown'}`));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');
  
  lines.push(chalk.bold('📝 CHANGE HISTORY'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(`Total Changes: ${timeline.events.length}`);
  lines.push('');
  
  for (const event of timeline.events) {
    const time = new Date(event.timestamp).toLocaleString();
    const typeIcon = getTypeIcon(event.type);
    
    lines.push(`${typeIcon} ${time}`);
    lines.push(`   ${chalk.gray('Type:')} ${event.type}`);
    
    if (event.changes && event.changes.length > 0) {
      lines.push(`   ${chalk.gray('Changes:')}`);
      for (const change of event.changes.slice(0, 3)) {
        lines.push(`     ${chalk.yellow('•')} ${change}`);
      }
      if (event.changes.length > 3) {
        lines.push(`     ${chalk.gray(`... and ${event.changes.length - 3} more`)}`);
      }
    }
    
    if (event.impact) {
      lines.push(`   ${chalk.gray('Impact:')} ${event.impact.dependents.length} dependents affected`);
    }
    
    lines.push('');
  }
  
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Format change comparison
 */
export function formatChangeComparison(comparison) {
  const lines = [];
  
  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('           CHANGE COMPARISON'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');
  
  // Change 1
  lines.push(chalk.bold('📌 CHANGE 1'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(`File: ${chalk.cyan(comparison.change1.file)}`);
  lines.push(`Time: ${new Date(comparison.change1.timestamp).toLocaleString()}`);
  lines.push(`Type: ${comparison.change1.type}`);
  lines.push(`Risk: ${getRiskColor(comparison.change1.impact.riskScore)(comparison.change1.impact.riskScore + '/100')}`);
  lines.push(`Impact: ${comparison.change1.impact.blastRadius} files`);
  lines.push('');
  
  // Change 2
  lines.push(chalk.bold('📌 CHANGE 2'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(`File: ${chalk.cyan(comparison.change2.file)}`);
  lines.push(`Time: ${new Date(comparison.change2.timestamp).toLocaleString()}`);
  lines.push(`Type: ${comparison.change2.type}`);
  lines.push(`Risk: ${getRiskColor(comparison.change2.impact.riskScore)(comparison.change2.impact.riskScore + '/100')}`);
  lines.push(`Impact: ${comparison.change2.impact.blastRadius} files`);
  lines.push('');
  
  // Differences
  lines.push(chalk.bold('📊 DIFFERENCES'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const timeDiffHours = Math.round(comparison.timeDiff / (1000 * 60 * 60));
  lines.push(`Time Difference: ${timeDiffHours} hours`);
  
  const blastDiff = comparison.impactDiff.blastRadiusDiff;
  const blastDiffStr = blastDiff > 0 ? chalk.red(`+${blastDiff}`) : 
                       blastDiff < 0 ? chalk.green(`${blastDiff}`) : 
                       chalk.gray('0');
  lines.push(`Blast Radius: ${blastDiffStr} files`);
  
  const riskDiff = comparison.impactDiff.riskScoreDiff;
  const riskDiffStr = riskDiff > 0 ? chalk.red(`+${riskDiff.toFixed(1)}`) : 
                      riskDiff < 0 ? chalk.green(`${riskDiff.toFixed(1)}`) : 
                      chalk.gray('0');
  lines.push(`Risk Score: ${riskDiffStr}`);
  
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Get type icon
 */
function getTypeIcon(type) {
  const icons = {
    file_created: chalk.green('✚'),
    file_modified: chalk.yellow('✎'),
    file_deleted: chalk.red('✖'),
    symbol_added: chalk.green('+'),
    symbol_modified: chalk.yellow('~'),
    symbol_deleted: chalk.red('-'),
    rollback: chalk.blue('↶')
  };
  return icons[type] || chalk.gray('•');
}

/**
 * Get risk color
 */
function getRiskColor(score) {
  if (score >= 75) return chalk.red.bold;
  if (score >= 50) return chalk.red;
  if (score >= 25) return chalk.yellow;
  return chalk.green;
}

/**
 * Get risk badge
 */
function getRiskBadge(score) {
  if (score >= 75) return chalk.red.bold('[CRITICAL]');
  if (score >= 50) return chalk.red('[HIGH]');
  if (score >= 25) return chalk.yellow('[MEDIUM]');
  return chalk.green('[LOW]');
}

/**
 * Format timeline summary (compact)
 */
export function formatTimelineSummary(stats) {
  const lines = [];
  
  lines.push(`Changes: ${stats.totalChanges}`);
  lines.push(`Avg Risk: ${stats.avgRiskScore.toFixed(1)}/100`);
  
  if (stats.highRiskChanges > 0) {
    lines.push(`High Risk: ${stats.highRiskChanges}`);
  }
  
  return lines.join('\n');
}
