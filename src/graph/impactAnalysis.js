/**
 * Impact Analysis
 * Calculate blast radius and change impact
 */

import { reverseBfs } from './traversal.js';

/**
 * Calculate impact of changing files
 */
export function calculateImpact(graph, changedFiles) {
  const impactedFiles = new Set(changedFiles);
  const impactLevels = new Map();
  
  // Mark changed files as level 0
  for (const file of changedFiles) {
    impactLevels.set(file, 0);
  }
  
  // Traverse dependents to find impacted files
  for (const changedFile of changedFiles) {
    reverseBfs(graph, changedFile, (node, depth) => {
      if (!impactedFiles.has(node.id)) {
        impactedFiles.add(node.id);
        impactLevels.set(node.id, depth);
      }
    });
  }
  
  // Categorize by impact level
  const byLevel = {
    direct: [], // Level 0 (changed files)
    immediate: [], // Level 1 (direct dependents)
    secondary: [], // Level 2
    tertiary: [] // Level 3+
  };
  
  for (const [file, level] of impactLevels.entries()) {
    if (level === 0) {
      byLevel.direct.push(file);
    } else if (level === 1) {
      byLevel.immediate.push(file);
    } else if (level === 2) {
      byLevel.secondary.push(file);
    } else {
      byLevel.tertiary.push(file);
    }
  }
  
  return {
    totalImpacted: impactedFiles.size,
    impactedFiles: Array.from(impactedFiles),
    byLevel,
    impactLevels: Object.fromEntries(impactLevels),
    blastRadius: impactedFiles.size - changedFiles.length
  };
}

/**
 * Calculate risk score for changes
 */
export function calculateRiskScore(graph, changedFiles) {
  const impact = calculateImpact(graph, changedFiles);
  
  let riskScore = 0;
  let riskFactors = [];
  
  // Factor 1: Blast radius
  const blastRadius = impact.blastRadius;
  if (blastRadius > 20) {
    riskScore += 40;
    riskFactors.push(`High blast radius: ${blastRadius} files`);
  } else if (blastRadius > 10) {
    riskScore += 25;
    riskFactors.push(`Medium blast radius: ${blastRadius} files`);
  } else if (blastRadius > 5) {
    riskScore += 10;
    riskFactors.push(`Low blast radius: ${blastRadius} files`);
  }
  
  // Factor 2: God nodes affected
  let godNodesAffected = 0;
  for (const file of changedFiles) {
    const metrics = graph.getNodeMetrics(file);
    if (metrics && metrics.totalConnections > 10) {
      godNodesAffected++;
    }
  }
  
  if (godNodesAffected > 0) {
    riskScore += godNodesAffected * 15;
    riskFactors.push(`${godNodesAffected} critical files affected`);
  }
  
  // Factor 3: Circular dependencies
  const cycles = graph.detectCircularDependencies();
  const affectedCycles = cycles.filter(cycle => 
    cycle.some(node => changedFiles.includes(node))
  );
  
  if (affectedCycles.length > 0) {
    riskScore += affectedCycles.length * 10;
    riskFactors.push(`${affectedCycles.length} circular dependencies affected`);
  }
  
  // Factor 4: Deep dependency chains
  let maxDepth = 0;
  for (const file of changedFiles) {
    const dependents = graph.getTransitiveDependents(file);
    for (const dep of dependents) {
      maxDepth = Math.max(maxDepth, dep.depth);
    }
  }
  
  if (maxDepth > 5) {
    riskScore += 15;
    riskFactors.push(`Deep dependency chain: ${maxDepth} levels`);
  }
  
  // Normalize to 0-100
  riskScore = Math.min(100, riskScore);
  
  return {
    score: riskScore,
    level: getRiskLevel(riskScore),
    factors: riskFactors,
    impact
  };
}

/**
 * Get risk level from score
 */
function getRiskLevel(score) {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

/**
 * Find critical paths (paths through god nodes)
 */
export function findCriticalPaths(graph, fromFile, toFile) {
  const paths = [];
  const visited = new Set();
  
  function dfs(current, target, path, godNodesInPath) {
    if (current === target) {
      paths.push({
        path: [...path],
        godNodes: godNodesInPath,
        critical: godNodesInPath > 0
      });
      return;
    }
    
    if (visited.has(current)) return;
    visited.add(current);
    
    const metrics = graph.getNodeMetrics(current);
    const isGodNode = metrics && metrics.totalConnections > 10;
    
    const deps = graph.getDirectDependencies(current);
    for (const dep of deps) {
      path.push(dep.file);
      dfs(
        dep.file,
        target,
        path,
        godNodesInPath + (isGodNode ? 1 : 0)
      );
      path.pop();
    }
    
    visited.delete(current);
  }
  
  dfs(fromFile, toFile, [fromFile], 0);
  
  // Sort by criticality
  paths.sort((a, b) => b.godNodes - a.godNodes);
  
  return paths;
}

/**
 * Identify bottlenecks (high fan-in nodes)
 */
export function identifyBottlenecks(graph, threshold = 5) {
  const bottlenecks = [];
  
  for (const nodeId of graph.nodes.keys()) {
    const metrics = graph.getNodeMetrics(nodeId);
    if (metrics && metrics.fanIn >= threshold) {
      bottlenecks.push({
        file: nodeId,
        fanIn: metrics.fanIn,
        dependents: graph.getDirectDependents(nodeId).map(d => d.file)
      });
    }
  }
  
  // Sort by fan-in
  bottlenecks.sort((a, b) => b.fanIn - a.fanIn);
  
  return bottlenecks;
}

/**
 * Identify unstable modules (high instability)
 */
export function identifyUnstableModules(graph, threshold = 0.7) {
  const unstable = [];
  
  for (const nodeId of graph.nodes.keys()) {
    const metrics = graph.getNodeMetrics(nodeId);
    if (metrics && metrics.instability >= threshold) {
      unstable.push({
        file: nodeId,
        instability: metrics.instability,
        fanIn: metrics.fanIn,
        fanOut: metrics.fanOut
      });
    }
  }
  
  // Sort by instability
  unstable.sort((a, b) => b.instability - a.instability);
  
  return unstable;
}

/**
 * Generate impact report
 */
export function generateImpactReport(graph, changedFiles) {
  const impact = calculateImpact(graph, changedFiles);
  const risk = calculateRiskScore(graph, changedFiles);
  const bottlenecks = identifyBottlenecks(graph);
  const unstable = identifyUnstableModules(graph);
  
  // Check if any changed files are bottlenecks
  const changedBottlenecks = bottlenecks.filter(b => 
    changedFiles.includes(b.file)
  );
  
  // Check if any changed files are unstable
  const changedUnstable = unstable.filter(u => 
    changedFiles.includes(u.file)
  );
  
  return {
    summary: {
      changedFiles: changedFiles.length,
      totalImpacted: impact.totalImpacted,
      blastRadius: impact.blastRadius,
      riskScore: risk.score,
      riskLevel: risk.level
    },
    impact,
    risk,
    warnings: [
      ...changedBottlenecks.map(b => 
        `Bottleneck affected: ${b.file} (${b.fanIn} dependents)`
      ),
      ...changedUnstable.map(u => 
        `Unstable module affected: ${u.file} (instability: ${u.instability.toFixed(2)})`
      )
    ],
    recommendations: generateRecommendations(risk, changedBottlenecks, changedUnstable)
  };
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(risk, changedBottlenecks, changedUnstable) {
  const recommendations = [];
  
  if (risk.score >= 75) {
    recommendations.push('⚠️ Critical risk: Consider breaking changes into smaller increments');
  }
  
  if (changedBottlenecks.length > 0) {
    recommendations.push('⚠️ Bottleneck files changed: Extensive testing recommended');
  }
  
  if (changedUnstable.length > 0) {
    recommendations.push('⚠️ Unstable modules changed: Review dependency structure');
  }
  
  if (risk.impact.blastRadius > 20) {
    recommendations.push('⚠️ Large blast radius: Run full test suite');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✓ Low risk changes: Standard testing should suffice');
  }
  
  return recommendations;
}
