/**
 * Trust Meter Formatter
 * Formats trust metrics for terminal display
 */

import chalk from 'chalk';

/**
 * Format trust report for terminal
 */
export function formatTrustReport(report) {
  const lines = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('              AI TRUST METER'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');

  // Overall Trust
  lines.push(formatOverallTrust(report.overall));
  lines.push('');

  // Symbol Verification
  lines.push(formatSymbolVerification(report.symbolVerification));
  lines.push('');

  // Import Validation
  lines.push(formatImportValidation(report.importValidation));
  lines.push('');

  // Hallucination Risk
  lines.push(formatHallucinationRisk(report.hallucinationRisk));
  lines.push('');

  // Validation History
  lines.push(formatValidationHistory(report.validationHistory));
  lines.push('');

  // Trust Trend
  lines.push(formatTrustTrend(report.trustTrend));
  lines.push('');

  // Unverified Symbols
  if (report.unverifiedSymbols.length > 0) {
    lines.push(formatUnverifiedSymbols(report.unverifiedSymbols));
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
 * Format overall trust section
 */
function formatOverallTrust(overall) {
  const lines = [];
  
  lines.push(chalk.bold('🎯 OVERALL TRUST'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  // Score with color
  const scoreColor = getTrustColor(overall.score);
  lines.push(`Score: ${scoreColor(overall.score.toFixed(1) + '/100')} (Grade: ${scoreColor(overall.grade)})`);
  lines.push(`Level: ${getTrustBadge(overall.level)}`);
  lines.push(`Status: ${getStatusBadge(overall.status)}`);
  
  if (overall.factors.length > 0) {
    lines.push('');
    lines.push(chalk.yellow('Trust Factors:'));
    for (const factor of overall.factors) {
      const statusColor = factor.status === 'good' ? chalk.green : 
                         factor.status === 'fair' ? chalk.yellow : chalk.red;
      lines.push(`  ${chalk.yellow('•')} ${factor.name}: ${statusColor(factor.status)}`);
      if (factor.rate !== undefined) {
        lines.push(`    Rate: ${factor.rate.toFixed(1)}% (-${factor.deduction.toFixed(1)} points)`);
      }
      if (factor.risk !== undefined) {
        lines.push(`    Risk: ${factor.risk.toFixed(1)} (-${factor.deduction.toFixed(1)} points)`);
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Format symbol verification section
 */
function formatSymbolVerification(metrics) {
  const lines = [];
  
  lines.push(chalk.bold('✓ SYMBOL VERIFICATION'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const rateColor = metrics.verificationRate >= 95 ? chalk.green : 
                    metrics.verificationRate >= 85 ? chalk.yellow : chalk.red;
  
  lines.push(`Verification Rate: ${rateColor(metrics.verificationRate.toFixed(1) + '%')}`);
  lines.push(`Total Symbols: ${metrics.totalSymbols}`);
  lines.push(`Verified: ${chalk.green(metrics.verifiedSymbols)}`);
  
  if (metrics.unverifiedSymbols > 0) {
    lines.push(`Unverified: ${chalk.red(metrics.unverifiedSymbols)}`);
  }
  
  lines.push('');
  lines.push(chalk.gray('Breakdown:'));
  lines.push(`  Functions: ${metrics.breakdown.functions.verified}/${metrics.breakdown.functions.total} (${metrics.breakdown.functions.rate.toFixed(1)}%)`);
  lines.push(`  Classes: ${metrics.breakdown.classes.verified}/${metrics.breakdown.classes.total} (${metrics.breakdown.classes.rate.toFixed(1)}%)`);
  lines.push(`  Exports: ${metrics.breakdown.exports.verified}/${metrics.breakdown.exports.total} (${metrics.breakdown.exports.rate.toFixed(1)}%)`);
  
  return lines.join('\n');
}

/**
 * Format import validation section
 */
function formatImportValidation(metrics) {
  const lines = [];
  
  lines.push(chalk.bold('📦 IMPORT VALIDATION'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const rateColor = metrics.validationRate >= 95 ? chalk.green : 
                    metrics.validationRate >= 85 ? chalk.yellow : chalk.red;
  
  lines.push(`Validation Rate: ${rateColor(metrics.validationRate.toFixed(1) + '%')}`);
  lines.push(`Total Imports: ${metrics.totalImports}`);
  lines.push(`Valid: ${chalk.green(metrics.validImports)}`);
  
  if (metrics.invalidImports > 0) {
    lines.push(`Invalid: ${chalk.red(metrics.invalidImports)}`);
    
    if (metrics.invalidImportsList.length > 0) {
      lines.push('');
      lines.push(chalk.red('Invalid Imports:'));
      for (const imp of metrics.invalidImportsList.slice(0, 5)) {
        lines.push(`  ${chalk.red('✗')} ${imp.file}:${imp.line}`);
        lines.push(`    ${chalk.gray('Import:')} ${imp.symbol} ${chalk.gray('from')} ${imp.source}`);
        if (imp.reason) {
          lines.push(`    ${chalk.gray('Reason:')} ${imp.reason}`);
        }
      }
      if (metrics.invalidImportsList.length > 5) {
        lines.push(chalk.gray(`    ... and ${metrics.invalidImportsList.length - 5} more`));
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Format hallucination risk section
 */
function formatHallucinationRisk(risk) {
  const lines = [];
  
  lines.push(chalk.bold('⚠️  HALLUCINATION RISK'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const riskColor = risk.score === 0 ? chalk.green :
                    risk.score < 25 ? chalk.yellow :
                    risk.score < 50 ? chalk.red : chalk.red.bold;
  
  lines.push(`Risk Score: ${riskColor(risk.score.toFixed(1) + '/100')}`);
  lines.push(`Risk Level: ${getRiskBadge(risk.level)}`);
  lines.push(`Status: ${getStatusBadge(risk.status)}`);
  
  if (risk.risks.length > 0) {
    lines.push('');
    lines.push(chalk.yellow('Risk Factors:'));
    for (const r of risk.risks) {
      lines.push(`  ${chalk.yellow('•')} ${r.message}`);
      lines.push(`    Risk: ${r.risk.toFixed(1)} points`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format validation history section
 */
function formatValidationHistory(history) {
  const lines = [];
  
  lines.push(chalk.bold('📊 VALIDATION HISTORY'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const rateColor = history.successRate >= 90 ? chalk.green : 
                    history.successRate >= 75 ? chalk.yellow : chalk.red;
  
  lines.push(`Success Rate: ${rateColor(history.successRate.toFixed(1) + '%')}`);
  lines.push(`Total Validations: ${history.totalValidations}`);
  lines.push(`Successful: ${chalk.green(history.successfulValidations)}`);
  
  if (history.failedValidations > 0) {
    lines.push(`Failed: ${chalk.red(history.failedValidations)}`);
  }
  
  if (history.recentValidations.length > 0) {
    lines.push('');
    lines.push(chalk.gray('Recent Validations:'));
    for (const val of history.recentValidations.slice(0, 3)) {
      const statusIcon = val.status === 'success' ? chalk.green('✓') : chalk.red('✗');
      const time = new Date(val.timestamp).toLocaleTimeString();
      lines.push(`  ${statusIcon} ${time} - Confidence: ${val.confidence}%`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format trust trend section
 */
function formatTrustTrend(trend) {
  const lines = [];
  
  lines.push(chalk.bold('📈 TRUST TREND'));
  lines.push(chalk.gray('─'.repeat(55)));
  
  const trendIcon = trend.trend === 'improving' ? chalk.green('↗') :
                    trend.trend === 'stable' ? chalk.yellow('→') :
                    chalk.red('↘');
  
  lines.push(`Current: ${getTrustColor(trend.current)(trend.current.toFixed(1))}`);
  lines.push(`Trend: ${trendIcon} ${trend.trend}`);
  
  if (trend.history.length > 0) {
    lines.push('');
    lines.push(chalk.gray('7-Day History:'));
    
    // Simple ASCII chart
    const max = Math.max(...trend.history.map(h => h.score));
    const min = Math.min(...trend.history.map(h => h.score));
    const range = max - min || 1;
    
    for (const point of trend.history.slice(-7)) {
      const date = new Date(point.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const barLength = Math.round(((point.score - min) / range) * 20) + 1;
      const bar = '█'.repeat(barLength);
      const color = getTrustColor(point.score);
      lines.push(`  ${date.padEnd(8)} ${color(bar)} ${point.score.toFixed(1)}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format unverified symbols section
 */
function formatUnverifiedSymbols(symbols) {
  const lines = [];
  
  lines.push(chalk.bold('❌ UNVERIFIED SYMBOLS'));
  lines.push(chalk.gray('─'.repeat(55)));
  lines.push(chalk.gray(`Found ${symbols.length} unverified symbols`));
  lines.push('');
  
  const top = symbols.slice(0, 10);
  for (const symbol of top) {
    lines.push(`${chalk.red('✗')} ${chalk.cyan(symbol.name)} (${symbol.type})`);
    lines.push(`   File: ${symbol.file}:${symbol.line}`);
    if (symbol.source) {
      lines.push(`   Source: ${symbol.source}`);
    }
    if (symbol.reason) {
      lines.push(`   Reason: ${chalk.gray(symbol.reason)}`);
    }
    lines.push('');
  }
  
  if (symbols.length > 10) {
    lines.push(chalk.gray(`   ... and ${symbols.length - 10} more`));
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
    lines.push(`   ${chalk.gray('Action:')} ${rec.action}`);
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Get trust color based on score
 */
function getTrustColor(score) {
  if (score >= 90) return chalk.green.bold;
  if (score >= 80) return chalk.green;
  if (score >= 70) return chalk.yellow;
  if (score >= 60) return chalk.red;
  return chalk.red.bold;
}

/**
 * Get trust badge
 */
function getTrustBadge(level) {
  const badges = {
    excellent: chalk.green.bold('★★★★★ EXCELLENT'),
    high: chalk.green('★★★★☆ HIGH'),
    good: chalk.yellow('★★★☆☆ GOOD'),
    fair: chalk.yellow('★★☆☆☆ FAIR'),
    low: chalk.red('★☆☆☆☆ LOW'),
    critical: chalk.red.bold('☆☆☆☆☆ CRITICAL')
  };
  return badges[level] || level;
}

/**
 * Get status badge
 */
function getStatusBadge(status) {
  const badges = {
    trusted: chalk.green.bold('✓ TRUSTED'),
    'mostly-trusted': chalk.green('✓ MOSTLY TRUSTED'),
    caution: chalk.yellow('⚠ CAUTION'),
    untrusted: chalk.red.bold('✗ UNTRUSTED'),
    safe: chalk.green.bold('✓ SAFE'),
    low: chalk.yellow('⚠ LOW RISK'),
    medium: chalk.red('⚠ MEDIUM RISK'),
    high: chalk.red.bold('⚠ HIGH RISK'),
    critical: chalk.red.bold('✗ CRITICAL RISK')
  };
  return badges[status] || status;
}

/**
 * Get risk badge
 */
function getRiskBadge(level) {
  const badges = {
    low: chalk.green('[LOW]'),
    medium: chalk.yellow('[MEDIUM]'),
    high: chalk.red('[HIGH]'),
    critical: chalk.red.bold('[CRITICAL]')
  };
  return badges[level] || `[${level}]`;
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
 * Format trust summary (compact version)
 */
export function formatTrustSummary(report) {
  const lines = [];
  
  const scoreColor = getTrustColor(report.overall.score);
  lines.push(`Trust: ${scoreColor(report.overall.score.toFixed(1) + '/100')} (${report.overall.grade})`);
  lines.push(`Status: ${report.overall.status}`);
  
  if (report.hallucinationRisk.score > 0) {
    lines.push(`Hallucination Risk: ${report.hallucinationRisk.score.toFixed(1)}/100 (${report.hallucinationRisk.level})`);
  }
  
  return lines.join('\n');
}
