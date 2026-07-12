/**
 * Confidence Scorer
 * Calculates trust metrics for AI operations
 */

/**
 * Calculate overall confidence score
 */
export function calculateConfidence(metrics) {
  const {
    symbolCoverage = 0,
    validationPass = 0,
    retrievalCoverage = 0,
    dependencyResolution = 0,
    graphCompleteness = 0
  } = metrics;

  // Weighted average
  const weights = {
    symbolCoverage: 0.25,
    validationPass: 0.30,
    retrievalCoverage: 0.20,
    dependencyResolution: 0.15,
    graphCompleteness: 0.10
  };

  const score = 
    symbolCoverage * weights.symbolCoverage +
    validationPass * weights.validationPass +
    retrievalCoverage * weights.retrievalCoverage +
    dependencyResolution * weights.dependencyResolution +
    graphCompleteness * weights.graphCompleteness;

  return {
    score: Math.round(score),
    level: getConfidenceLevel(score),
    metrics,
    weights
  };
}

/**
 * Get confidence level from score
 */
function getConfidenceLevel(score) {
  if (score >= 90) return 'very-high';
  if (score >= 75) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'very-low';
}

/**
 * Calculate symbol coverage
 */
export function calculateSymbolCoverage(registry, graph) {
  const stats = registry.getStats();
  const graphStats = graph.getStats();
  
  if (graphStats.nodes === 0) return 0;
  
  // Coverage = files in registry / files in graph
  const coverage = (stats.files / graphStats.nodes) * 100;
  
  return Math.min(100, coverage);
}

/**
 * Calculate validation pass rate
 */
export function calculateValidationPass(validationResults) {
  if (!validationResults || validationResults.size === 0) return 0;
  
  let passed = 0;
  let total = 0;
  
  for (const result of validationResults.values()) {
    total++;
    if (result.valid) passed++;
  }
  
  return (passed / total) * 100;
}

/**
 * Calculate retrieval coverage
 */
export function calculateRetrievalCoverage(retrievedFiles, totalFiles) {
  if (totalFiles === 0) return 0;
  return (retrievedFiles / totalFiles) * 100;
}

/**
 * Calculate dependency resolution
 */
export function calculateDependencyResolution(graph, registry) {
  let resolved = 0;
  let total = 0;
  
  for (const node of graph.getAllNodes()) {
    const deps = graph.getDirectDependencies(node.id);
    
    for (const dep of deps) {
      total++;
      
      // Check if dependency exists in registry
      if (registry.getFile(dep.file)) {
        resolved++;
      }
    }
  }
  
  if (total === 0) return 100; // No dependencies = fully resolved
  return (resolved / total) * 100;
}

/**
 * Calculate graph completeness
 */
export function calculateGraphCompleteness(graph) {
  const stats = graph.getStats();
  
  // Completeness based on:
  // 1. No isolated nodes
  // 2. Reasonable connectivity
  // 3. No missing edges
  
  let score = 100;
  
  // Check for isolated nodes
  let isolatedNodes = 0;
  for (const node of graph.getAllNodes()) {
    const metrics = graph.getNodeMetrics(node.id);
    if (metrics && metrics.totalConnections === 0) {
      isolatedNodes++;
    }
  }
  
  if (isolatedNodes > 0) {
    score -= (isolatedNodes / stats.nodes) * 20;
  }
  
  // Check connectivity
  if (stats.avgDegree < 1) {
    score -= 20;
  }
  
  return Math.max(0, score);
}

/**
 * Calculate comprehensive confidence
 */
export async function calculateComprehensiveConfidence(context) {
  const {
    graph,
    registry,
    validationResults,
    retrievedFiles,
    totalFiles
  } = context;

  const metrics = {
    symbolCoverage: calculateSymbolCoverage(registry, graph),
    validationPass: validationResults ? calculateValidationPass(validationResults) : 100,
    retrievalCoverage: calculateRetrievalCoverage(retrievedFiles || 0, totalFiles || 1),
    dependencyResolution: calculateDependencyResolution(graph, registry),
    graphCompleteness: calculateGraphCompleteness(graph)
  };

  return calculateConfidence(metrics);
}

/**
 * Calculate confidence for code generation
 */
export function calculateGenerationConfidence(context) {
  const {
    symbolsVerified = 0,
    totalSymbols = 1,
    importsVerified = 0,
    totalImports = 1,
    pathsVerified = 0,
    totalPaths = 1,
    syntaxValid = true
  } = context;

  let score = 0;

  // Symbol verification (40%)
  score += (symbolsVerified / totalSymbols) * 40;

  // Import verification (30%)
  score += (importsVerified / totalImports) * 30;

  // Path verification (20%)
  score += (pathsVerified / totalPaths) * 20;

  // Syntax validation (10%)
  score += syntaxValid ? 10 : 0;

  // History citation factor
  if (context.ignoredHistoryFailure) {
    score -= 30;
  } else if (context.citesHistory) {
    score += 10;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score: Math.round(score),
    level: getConfidenceLevel(score),
    breakdown: {
      symbols: Math.round((symbolsVerified / totalSymbols) * 100),
      imports: Math.round((importsVerified / totalImports) * 100),
      paths: Math.round((pathsVerified / totalPaths) * 100),
      syntax: syntaxValid ? 100 : 0
    }
  };
}

/**
 * Calculate confidence for edit operation
 */
export function calculateEditConfidence(edit, graph, registry) {
  const { file, affectedFiles = [] } = edit;
  
  let score = 100;
  
  // Check if file exists in registry
  if (!registry.getFile(file)) {
    score -= 30;
  }
  
  // Check affected files
  for (const affected of affectedFiles) {
    if (!registry.getFile(affected)) {
      score -= 10;
    }
  }
  
  // Check graph connectivity
  const metrics = graph.getNodeMetrics(file);
  if (metrics && metrics.totalConnections > 10) {
    score -= 10; // High-risk edit
  }

  // Check if it ignored known prior-failure history or cited it
  if (edit.ignoredHistoryFailure) {
    score -= 40;
  } else if (edit.citesHistory) {
    score += 10;
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    level: getConfidenceLevel(score),
    risk: metrics?.totalConnections > 10 ? 'high' : 'low'
  };
}

/**
 * Generate confidence report
 */
export function generateConfidenceReport(confidence) {
  const report = {
    score: confidence.score,
    level: confidence.level,
    summary: getConfidenceSummary(confidence),
    recommendations: getRecommendations(confidence),
    metrics: confidence.metrics || {},
    timestamp: new Date().toISOString()
  };

  return report;
}

/**
 * Get confidence summary
 */
function getConfidenceSummary(confidence) {
  const { score, level } = confidence;
  
  if (level === 'very-high') {
    return `Very high confidence (${score}/100). System is highly reliable.`;
  } else if (level === 'high') {
    return `High confidence (${score}/100). System is reliable with minor gaps.`;
  } else if (level === 'medium') {
    return `Medium confidence (${score}/100). Some verification gaps exist.`;
  } else if (level === 'low') {
    return `Low confidence (${score}/100). Significant verification gaps.`;
  } else {
    return `Very low confidence (${score}/100). System reliability is questionable.`;
  }
}

/**
 * Get recommendations based on confidence
 */
function getRecommendations(confidence) {
  const recommendations = [];
  const { metrics } = confidence;

  if (metrics.symbolCoverage < 80) {
    recommendations.push('Run full scan to improve symbol coverage');
  }

  if (metrics.validationPass < 90) {
    recommendations.push('Fix validation errors to improve confidence');
  }

  if (metrics.retrievalCoverage < 70) {
    recommendations.push('Expand context retrieval for better coverage');
  }

  if (metrics.dependencyResolution < 90) {
    recommendations.push('Resolve missing dependencies');
  }

  if (metrics.graphCompleteness < 80) {
    recommendations.push('Rebuild graph to improve completeness');
  }

  if (recommendations.length === 0) {
    recommendations.push('System confidence is optimal');
  }

  return recommendations;
}

/**
 * Track confidence over time
 */
export class ConfidenceTracker {
  constructor() {
    this.history = [];
    this.maxHistory = 100;
  }

  /**
   * Record confidence score
   */
  record(confidence) {
    this.history.push({
      score: confidence.score,
      level: confidence.level,
      timestamp: Date.now()
    });

    // Keep only recent history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Get average confidence
   */
  getAverage() {
    if (this.history.length === 0) return 0;
    
    const sum = this.history.reduce((acc, h) => acc + h.score, 0);
    return sum / this.history.length;
  }

  /**
   * Get trend
   */
  getTrend() {
    if (this.history.length < 2) return 'stable';
    
    const recent = this.history.slice(-10);
    const older = this.history.slice(-20, -10);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((acc, h) => acc + h.score, 0) / recent.length;
    const olderAvg = older.reduce((acc, h) => acc + h.score, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  /**
   * Get statistics
   */
  getStats() {
    if (this.history.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        trend: 'stable'
      };
    }

    const scores = this.history.map(h => h.score);
    
    return {
      count: this.history.length,
      average: this.getAverage(),
      min: Math.min(...scores),
      max: Math.max(...scores),
      trend: this.getTrend()
    };
  }
}

/**
 * Create confidence tracker
 */
export function createConfidenceTracker() {
  return new ConfidenceTracker();
}
