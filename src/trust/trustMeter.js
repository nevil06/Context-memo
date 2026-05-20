/**
 * AI Trust Meter
 * Tracks and displays AI operation confidence and trust metrics
 */

/**
 * AI Trust Meter Class
 */
export class TrustMeter {
  constructor(context) {
    this.context = context;
    this.registry = context.registry;
    this.graph = context.graph;
    this.validator = context.validator;
    this.history = [];
  }

  /**
   * Generate complete trust report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: await this.getOverallTrust(),
      symbolVerification: await this.getSymbolVerificationMetrics(),
      importValidation: await this.getImportValidationMetrics(),
      hallucinationRisk: await this.getHallucinationRisk(),
      validationHistory: await this.getValidationHistory(),
      trustTrend: await this.getTrustTrend(),
      verifiedSymbols: await this.getVerifiedSymbols(),
      unverifiedSymbols: await this.getUnverifiedSymbols(),
      recommendations: []
    };

    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * Get overall trust score (0-100)
   */
  async getOverallTrust() {
    let score = 100;
    const factors = [];

    // Factor 1: Symbol verification rate
    const symbolMetrics = await this.getSymbolVerificationMetrics();
    const symbolRate = symbolMetrics.verificationRate;
    
    if (symbolRate < 100) {
      const deduction = (100 - symbolRate) * 0.3;
      score -= deduction;
      factors.push({
        name: 'Symbol Verification',
        rate: symbolRate,
        deduction,
        status: symbolRate >= 95 ? 'good' : symbolRate >= 85 ? 'fair' : 'poor'
      });
    }

    // Factor 2: Import validation rate
    const importMetrics = await this.getImportValidationMetrics();
    const importRate = importMetrics.validationRate;
    
    if (importRate < 100) {
      const deduction = (100 - importRate) * 0.4;
      score -= deduction;
      factors.push({
        name: 'Import Validation',
        rate: importRate,
        deduction,
        status: importRate >= 95 ? 'good' : importRate >= 85 ? 'fair' : 'poor'
      });
    }

    // Factor 3: Hallucination risk
    const hallucinationRisk = await this.getHallucinationRisk();
    if (hallucinationRisk.score > 0) {
      const deduction = hallucinationRisk.score * 0.3;
      score -= deduction;
      factors.push({
        name: 'Hallucination Risk',
        risk: hallucinationRisk.score,
        deduction,
        status: hallucinationRisk.level
      });
    }

    // Factor 4: Validation history success rate
    const history = await this.getValidationHistory();
    if (history.successRate < 100) {
      const deduction = (100 - history.successRate) * 0.2;
      score -= deduction;
      factors.push({
        name: 'Validation History',
        rate: history.successRate,
        deduction,
        status: history.successRate >= 90 ? 'good' : history.successRate >= 75 ? 'fair' : 'poor'
      });
    }

    score = Math.max(0, score);

    return {
      score,
      grade: this.getTrustGrade(score),
      level: this.getTrustLevel(score),
      factors,
      status: this.getTrustStatus(score)
    };
  }

  /**
   * Get symbol verification metrics
   */
  async getSymbolVerificationMetrics() {
    const stats = this.registry.getStats();
    
    const totalSymbols = stats.functions + stats.classes + stats.exports;
    const verifiedSymbols = stats.uniqueFunctions + stats.uniqueClasses + stats.uniqueExports;
    
    // Calculate verification rate
    const verificationRate = totalSymbols > 0 
      ? (verifiedSymbols / totalSymbols) * 100 
      : 100;

    return {
      totalSymbols,
      verifiedSymbols,
      unverifiedSymbols: totalSymbols - verifiedSymbols,
      verificationRate: Math.round(verificationRate * 100) / 100,
      breakdown: {
        functions: {
          total: stats.functions,
          verified: stats.uniqueFunctions,
          rate: stats.functions > 0 ? (stats.uniqueFunctions / stats.functions) * 100 : 100
        },
        classes: {
          total: stats.classes,
          verified: stats.uniqueClasses,
          rate: stats.classes > 0 ? (stats.uniqueClasses / stats.classes) * 100 : 100
        },
        exports: {
          total: stats.exports,
          verified: stats.uniqueExports,
          rate: stats.exports > 0 ? (stats.uniqueExports / stats.exports) * 100 : 100
        }
      }
    };
  }

  /**
   * Get import validation metrics
   */
  async getImportValidationMetrics() {
    let totalImports = 0;
    let validImports = 0;
    let invalidImports = [];

    const allSymbols = this.registry.getAllSymbols();

    for (const [filePath, symbols] of Object.entries(allSymbols)) {
      for (const imp of symbols.imports || []) {
        totalImports++;

        // Check if import source exists
        const sourceExists = this.registry.getFile(imp.source) !== null;
        
        if (sourceExists) {
          // Check if imported symbols are exported
          let allItemsValid = true;
          
          for (const item of imp.items) {
            if (item.type === 'namespace' || item.type === 'default') {
              continue; // Hard to validate
            }

            const symbolName = item.imported || item.name;
            const isValid = this.registry.verifyImport(imp.source, symbolName);
            
            if (!isValid) {
              allItemsValid = false;
              invalidImports.push({
                file: filePath,
                source: imp.source,
                symbol: symbolName,
                line: imp.line
              });
            }
          }

          if (allItemsValid) {
            validImports++;
          }
        } else {
          // External package or missing file
          if (imp.source.startsWith('.')) {
            // Local import but file not found
            invalidImports.push({
              file: filePath,
              source: imp.source,
              symbol: 'all',
              line: imp.line,
              reason: 'Source file not found'
            });
          } else {
            // External package - assume valid
            validImports++;
          }
        }
      }
    }

    const validationRate = totalImports > 0 
      ? (validImports / totalImports) * 100 
      : 100;

    return {
      totalImports,
      validImports,
      invalidImports: invalidImports.length,
      validationRate: Math.round(validationRate * 100) / 100,
      invalidImportsList: invalidImports.slice(0, 10) // Top 10
    };
  }

  /**
   * Get hallucination risk assessment
   */
  async getHallucinationRisk() {
    let riskScore = 0;
    const risks = [];

    // Risk 1: Unverified symbols
    const symbolMetrics = await this.getSymbolVerificationMetrics();
    if (symbolMetrics.unverifiedSymbols > 0) {
      const risk = Math.min(30, symbolMetrics.unverifiedSymbols * 2);
      riskScore += risk;
      risks.push({
        type: 'unverified_symbols',
        count: symbolMetrics.unverifiedSymbols,
        risk,
        message: `${symbolMetrics.unverifiedSymbols} unverified symbols`
      });
    }

    // Risk 2: Invalid imports
    const importMetrics = await this.getImportValidationMetrics();
    if (importMetrics.invalidImports > 0) {
      const risk = Math.min(40, importMetrics.invalidImports * 5);
      riskScore += risk;
      risks.push({
        type: 'invalid_imports',
        count: importMetrics.invalidImports,
        risk,
        message: `${importMetrics.invalidImports} invalid imports`
      });
    }

    // Risk 3: Orphaned files (potential dead code)
    const orphanedCount = this.countOrphanedFiles();
    if (orphanedCount > 0) {
      const risk = Math.min(15, orphanedCount * 3);
      riskScore += risk;
      risks.push({
        type: 'orphaned_files',
        count: orphanedCount,
        risk,
        message: `${orphanedCount} orphaned files`
      });
    }

    // Risk 4: Circular dependencies (complexity risk)
    const cycles = this.graph.detectCircularDependencies();
    if (cycles.length > 0) {
      const risk = Math.min(15, cycles.length * 5);
      riskScore += risk;
      risks.push({
        type: 'circular_dependencies',
        count: cycles.length,
        risk,
        message: `${cycles.length} circular dependencies`
      });
    }

    riskScore = Math.min(100, riskScore);

    return {
      score: riskScore,
      level: this.getRiskLevel(riskScore),
      risks,
      status: riskScore === 0 ? 'safe' : riskScore < 25 ? 'low' : riskScore < 50 ? 'medium' : riskScore < 75 ? 'high' : 'critical'
    };
  }

  /**
   * Get validation history
   */
  async getValidationHistory() {
    // In a real implementation, this would load from a history file
    // For now, we'll simulate based on current state
    
    const totalValidations = 100; // Simulated
    const successfulValidations = 95; // Simulated
    
    const successRate = (successfulValidations / totalValidations) * 100;

    return {
      totalValidations,
      successfulValidations,
      failedValidations: totalValidations - successfulValidations,
      successRate: Math.round(successRate * 100) / 100,
      recentValidations: [
        { timestamp: new Date().toISOString(), status: 'success', confidence: 98 },
        { timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'success', confidence: 95 },
        { timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'failed', confidence: 45 }
      ]
    };
  }

  /**
   * Get trust trend over time
   */
  async getTrustTrend() {
    // In a real implementation, this would track trust over time
    // For now, we'll simulate a trend
    
    const currentTrust = (await this.getOverallTrust()).score;
    
    return {
      current: currentTrust,
      trend: 'stable', // 'improving', 'stable', 'declining'
      history: [
        { timestamp: new Date(Date.now() - 86400000 * 7).toISOString(), score: currentTrust - 5 },
        { timestamp: new Date(Date.now() - 86400000 * 6).toISOString(), score: currentTrust - 3 },
        { timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), score: currentTrust - 2 },
        { timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), score: currentTrust - 1 },
        { timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), score: currentTrust },
        { timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), score: currentTrust + 1 },
        { timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), score: currentTrust },
        { timestamp: new Date().toISOString(), score: currentTrust }
      ]
    };
  }

  /**
   * Get verified symbols list
   */
  async getVerifiedSymbols() {
    const verified = [];
    const allSymbols = this.registry.getAllSymbols();

    for (const [filePath, symbols] of Object.entries(allSymbols)) {
      // Functions
      for (const func of symbols.functions || []) {
        const locations = this.registry.findFunction(func.name);
        if (locations.length > 0) {
          verified.push({
            type: 'function',
            name: func.name,
            file: filePath,
            line: func.line,
            verified: true
          });
        }
      }

      // Classes
      for (const cls of symbols.classes || []) {
        const locations = this.registry.findClass(cls.name);
        if (locations.length > 0) {
          verified.push({
            type: 'class',
            name: cls.name,
            file: filePath,
            line: cls.line,
            verified: true
          });
        }
      }
    }

    return verified.slice(0, 50); // Top 50
  }

  /**
   * Get unverified symbols list
   */
  async getUnverifiedSymbols() {
    const unverified = [];
    const allSymbols = this.registry.getAllSymbols();

    for (const [filePath, symbols] of Object.entries(allSymbols)) {
      // Check for symbols that might be unverified
      // (In a real implementation, this would track AI-generated symbols)
      
      // For now, we'll identify potential issues
      for (const imp of symbols.imports || []) {
        for (const item of imp.items) {
          if (item.type === 'named') {
            const symbolName = item.imported || item.name;
            const isValid = this.registry.verifyImport(imp.source, symbolName);
            
            if (!isValid && imp.source.startsWith('.')) {
              unverified.push({
                type: 'import',
                name: symbolName,
                file: filePath,
                source: imp.source,
                line: imp.line,
                reason: 'Symbol not exported from source'
              });
            }
          }
        }
      }
    }

    return unverified.slice(0, 50); // Top 50
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(report) {
    const recommendations = [];

    // Symbol verification
    if (report.symbolVerification.verificationRate < 95) {
      recommendations.push({
        priority: 'high',
        category: 'symbol-verification',
        message: `Improve symbol verification rate (currently ${report.symbolVerification.verificationRate.toFixed(1)}%)`,
        action: 'Run validation and fix unverified symbols'
      });
    }

    // Import validation
    if (report.importValidation.invalidImports > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'import-validation',
        message: `Fix ${report.importValidation.invalidImports} invalid imports`,
        action: 'Review and correct import statements'
      });
    }

    // Hallucination risk
    if (report.hallucinationRisk.score > 50) {
      recommendations.push({
        priority: 'critical',
        category: 'hallucination-risk',
        message: `High hallucination risk (${report.hallucinationRisk.score}/100)`,
        action: 'Run comprehensive validation and fix issues'
      });
    } else if (report.hallucinationRisk.score > 25) {
      recommendations.push({
        priority: 'medium',
        category: 'hallucination-risk',
        message: `Moderate hallucination risk (${report.hallucinationRisk.score}/100)`,
        action: 'Review and validate recent changes'
      });
    }

    // Validation history
    if (report.validationHistory.successRate < 90) {
      recommendations.push({
        priority: 'high',
        category: 'validation-history',
        message: `Low validation success rate (${report.validationHistory.successRate.toFixed(1)}%)`,
        action: 'Investigate and fix recurring validation failures'
      });
    }

    // Trust trend
    if (report.trustTrend.trend === 'declining') {
      recommendations.push({
        priority: 'high',
        category: 'trust-trend',
        message: 'Trust score is declining',
        action: 'Review recent changes and run validation'
      });
    }

    return recommendations;
  }

  /**
   * Count orphaned files
   */
  countOrphanedFiles() {
    let count = 0;
    
    for (const node of this.graph.getAllNodes()) {
      const metrics = this.graph.getNodeMetrics(node.id);
      if (metrics && metrics.totalConnections === 0) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Get trust grade from score
   */
  getTrustGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'B+';
    if (score >= 80) return 'B';
    if (score >= 75) return 'C+';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get trust level from score
   */
  getTrustLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'high';
    if (score >= 70) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 50) return 'low';
    return 'critical';
  }

  /**
   * Get trust status from score
   */
  getTrustStatus(score) {
    if (score >= 90) return 'trusted';
    if (score >= 70) return 'mostly-trusted';
    if (score >= 50) return 'caution';
    return 'untrusted';
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }
}

/**
 * Create trust meter
 */
export function createTrustMeter(context) {
  return new TrustMeter(context);
}
