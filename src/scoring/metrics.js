/**
 * Metrics Definitions
 * Standard metrics for confidence scoring
 */

/**
 * Repository health metrics
 */
export function calculateRepositoryHealth(graph, registry) {
  const graphStats = graph.getStats();
  const registryStats = registry.getStats();
  
  return {
    files: graphStats.nodes,
    functions: registryStats.functions,
    classes: registryStats.classes,
    exports: registryStats.exports,
    connections: graphStats.edges,
    avgConnections: graphStats.avgDegree,
    maxFanIn: graphStats.maxFanIn,
    maxFanOut: graphStats.maxFanOut,
    health: calculateHealthScore(graphStats, registryStats)
  };
}

/**
 * Calculate health score
 */
function calculateHealthScore(graphStats, registryStats) {
  let score = 100;
  
  // Penalize if no files
  if (graphStats.nodes === 0) return 0;
  
  // Penalize if no symbols
  if (registryStats.functions === 0 && registryStats.classes === 0) {
    score -= 30;
  }
  
  // Penalize if low connectivity
  if (graphStats.avgDegree < 1) {
    score -= 20;
  }
  
  // Penalize if very high fan-out (god nodes)
  if (graphStats.maxFanOut > 20) {
    score -= 10;
  }
  
  return Math.max(0, score);
}

/**
 * Code quality metrics
 */
export function calculateCodeQuality(validationResults) {
  if (!validationResults || validationResults.size === 0) {
    return {
      score: 0,
      errors: 0,
      warnings: 0,
      validFiles: 0,
      totalFiles: 0
    };
  }
  
  let errors = 0;
  let warnings = 0;
  let validFiles = 0;
  
  for (const result of validationResults.values()) {
    errors += result.errors?.length || 0;
    warnings += result.warnings?.length || 0;
    if (result.valid) validFiles++;
  }
  
  const totalFiles = validationResults.size;
  const score = (validFiles / totalFiles) * 100;
  
  return {
    score: Math.round(score),
    errors,
    warnings,
    validFiles,
    totalFiles
  };
}

/**
 * Dependency health metrics
 */
export function calculateDependencyHealth(graph) {
  const cycles = graph.detectCircularDependencies();
  const components = graph.getStronglyConnectedComponents();
  
  let score = 100;
  
  // Penalize circular dependencies
  if (cycles.length > 0) {
    score -= cycles.length * 10;
  }
  
  // Penalize large strongly connected components
  for (const component of components) {
    if (component.length > 5) {
      score -= 5;
    }
  }
  
  return {
    score: Math.max(0, score),
    circularDependencies: cycles.length,
    stronglyConnectedComponents: components.length,
    cycles: cycles.slice(0, 5) // First 5 cycles
  };
}

/**
 * Context coverage metrics
 */
export function calculateContextCoverage(workingMemory, graph) {
  const hot = workingMemory.getHot().length;
  const warm = workingMemory.getWarm().length;
  const cold = workingMemory.getCold().length;
  const total = hot + warm + cold;
  
  const graphTotal = graph.getAllNodes().length;
  
  return {
    hot,
    warm,
    cold,
    total,
    coverage: total > 0 ? (total / graphTotal) * 100 : 0,
    hotRatio: total > 0 ? (hot / total) * 100 : 0,
    warmRatio: total > 0 ? (warm / total) * 100 : 0
  };
}

/**
 * Verification metrics
 */
export function calculateVerificationMetrics(registry, graph) {
  let verifiedImports = 0;
  let totalImports = 0;
  let verifiedExports = 0;
  let totalExports = 0;
  
  for (const node of graph.getAllNodes()) {
    const symbols = registry.getFile(node.id);
    if (!symbols) continue;
    
    // Count imports
    for (const imp of symbols.imports || []) {
      totalImports++;
      
      // Check if import source exists
      const sourceSymbols = registry.getFile(imp.source);
      if (sourceSymbols) {
        verifiedImports++;
      }
    }
    
    // Count exports
    totalExports += symbols.exports?.length || 0;
    verifiedExports += symbols.exports?.length || 0; // All exports in registry are verified
  }
  
  return {
    verifiedImports,
    totalImports,
    verifiedExports,
    totalExports,
    importVerificationRate: totalImports > 0 ? (verifiedImports / totalImports) * 100 : 100,
    exportVerificationRate: 100 // All exports in registry are verified
  };
}

/**
 * Performance metrics
 */
export function calculatePerformanceMetrics(checksumEngine) {
  const info = checksumEngine.getInfo();
  
  return {
    fileCount: info.fileCount,
    moduleCount: info.moduleCount,
    lastUpdate: info.lastUpdate,
    age: info.age,
    isStale: checksumEngine.isStale(),
    staleness: info.age ? Math.round(info.age / 60000) : 0 // minutes
  };
}

/**
 * Aggregate all metrics
 */
export function aggregateMetrics(context) {
  const {
    graph,
    registry,
    validationResults,
    workingMemory,
    checksumEngine
  } = context;
  
  return {
    repository: calculateRepositoryHealth(graph, registry),
    codeQuality: calculateCodeQuality(validationResults),
    dependencies: calculateDependencyHealth(graph),
    context: calculateContextCoverage(workingMemory, graph),
    verification: calculateVerificationMetrics(registry, graph),
    performance: calculatePerformanceMetrics(checksumEngine),
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate metrics report
 */
export function generateMetricsReport(metrics) {
  const report = {
    summary: {
      repositoryHealth: metrics.repository.health,
      codeQuality: metrics.codeQuality.score,
      dependencyHealth: metrics.dependencies.score,
      contextCoverage: Math.round(metrics.context.coverage),
      importVerification: Math.round(metrics.verification.importVerificationRate)
    },
    details: metrics,
    alerts: generateAlerts(metrics),
    timestamp: metrics.timestamp
  };
  
  return report;
}

/**
 * Generate alerts based on metrics
 */
function generateAlerts(metrics) {
  const alerts = [];
  
  if (metrics.repository.health < 70) {
    alerts.push({
      level: 'warning',
      message: 'Repository health is below optimal',
      metric: 'repository.health',
      value: metrics.repository.health
    });
  }
  
  if (metrics.codeQuality.errors > 0) {
    alerts.push({
      level: 'error',
      message: `${metrics.codeQuality.errors} validation errors found`,
      metric: 'codeQuality.errors',
      value: metrics.codeQuality.errors
    });
  }
  
  if (metrics.dependencies.circularDependencies > 0) {
    alerts.push({
      level: 'warning',
      message: `${metrics.dependencies.circularDependencies} circular dependencies detected`,
      metric: 'dependencies.circularDependencies',
      value: metrics.dependencies.circularDependencies
    });
  }
  
  if (metrics.context.coverage < 50) {
    alerts.push({
      level: 'info',
      message: 'Low context coverage - consider expanding working memory',
      metric: 'context.coverage',
      value: metrics.context.coverage
    });
  }
  
  if (metrics.verification.importVerificationRate < 90) {
    alerts.push({
      level: 'warning',
      message: 'Low import verification rate',
      metric: 'verification.importVerificationRate',
      value: metrics.verification.importVerificationRate
    });
  }
  
  if (metrics.performance.isStale) {
    alerts.push({
      level: 'warning',
      message: 'Repository data is stale - consider rescanning',
      metric: 'performance.isStale',
      value: true
    });
  }
  
  return alerts;
}
