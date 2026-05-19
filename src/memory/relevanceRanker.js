/**
 * Relevance Ranker
 * Ranks files by relevance for context prioritization
 */

/**
 * Rank files by relevance to a query or task
 */
export function rankByRelevance(files, query, graph, registry, workingMemory) {
  const scores = [];
  
  for (const file of files) {
    const score = calculateRelevanceScore(file, query, graph, registry, workingMemory);
    scores.push({ file, score });
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  return scores;
}

/**
 * Calculate relevance score for a file
 */
function calculateRelevanceScore(file, query, graph, registry, workingMemory) {
  let score = 0;
  
  // Factor 1: Temperature (hot files are more relevant)
  const temp = workingMemory.getTemperature(file);
  if (temp === 'hot') score += 50;
  else if (temp === 'warm') score += 25;
  
  // Factor 2: Recent edits
  const priority = workingMemory.getPriority(file);
  score += Math.min(priority, 30);
  
  // Factor 3: Connectivity (god nodes are more relevant)
  const metrics = graph.getNodeMetrics(file);
  if (metrics) {
    const connectionScore = Math.min(metrics.totalConnections * 2, 20);
    score += connectionScore;
  }
  
  // Factor 4: Symbol match (if query contains symbol names)
  if (query) {
    const symbols = registry.getFile(file);
    if (symbols) {
      const queryLower = query.toLowerCase();
      
      // Check function names
      for (const func of symbols.functions || []) {
        if (queryLower.includes(func.name.toLowerCase())) {
          score += 30;
        }
      }
      
      // Check class names
      for (const cls of symbols.classes || []) {
        if (queryLower.includes(cls.name.toLowerCase())) {
          score += 30;
        }
      }
      
      // Check file name
      if (queryLower.includes(file.toLowerCase())) {
        score += 20;
      }
    }
  }
  
  return score;
}

/**
 * Get top N most relevant files
 */
export function getTopRelevant(files, n, query, graph, registry, workingMemory) {
  const ranked = rankByRelevance(files, query, graph, registry, workingMemory);
  return ranked.slice(0, n);
}

/**
 * Rank by dependency distance from changed files
 */
export function rankByDependencyDistance(files, changedFiles, graph) {
  const scores = [];
  
  for (const file of files) {
    let minDistance = Infinity;
    
    for (const changedFile of changedFiles) {
      const path = graph.findPath(changedFile, file);
      if (path) {
        minDistance = Math.min(minDistance, path.length - 1);
      }
      
      // Also check reverse path
      const reversePath = graph.findPath(file, changedFile);
      if (reversePath) {
        minDistance = Math.min(minDistance, reversePath.length - 1);
      }
    }
    
    // Convert distance to score (closer = higher score)
    const score = minDistance === Infinity ? 0 : 100 - (minDistance * 10);
    scores.push({ file, score, distance: minDistance });
  }
  
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

/**
 * Rank by impact (files that affect many others)
 */
export function rankByImpact(files, graph) {
  const scores = [];
  
  for (const file of files) {
    const metrics = graph.getNodeMetrics(file);
    if (!metrics) continue;
    
    // Impact = transitive dependents (who would be affected)
    const impactScore = metrics.transitiveDependents;
    scores.push({ file, score: impactScore, metrics });
  }
  
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

/**
 * Smart context selection
 */
export function selectSmartContext(options) {
  const {
    allFiles,
    changedFiles = [],
    query = '',
    maxFiles = 20,
    graph,
    registry,
    workingMemory
  } = options;
  
  const selected = new Set();
  const scores = new Map();
  
  // Always include changed files
  for (const file of changedFiles) {
    selected.add(file);
    scores.set(file, 100);
  }
  
  // Add hot files
  const hotFiles = workingMemory.getHot();
  for (const file of hotFiles) {
    if (selected.size >= maxFiles) break;
    selected.add(file);
    scores.set(file, 90);
  }
  
  // Add files by relevance
  const relevant = rankByRelevance(
    allFiles.filter(f => !selected.has(f)),
    query,
    graph,
    registry,
    workingMemory
  );
  
  for (const { file, score } of relevant) {
    if (selected.size >= maxFiles) break;
    selected.add(file);
    scores.set(file, score);
  }
  
  // Add dependencies of selected files
  const dependencies = new Set();
  for (const file of selected) {
    const deps = graph.getDirectDependencies(file);
    for (const dep of deps) {
      if (selected.size + dependencies.size >= maxFiles) break;
      dependencies.add(dep.file);
    }
  }
  
  for (const dep of dependencies) {
    if (selected.size >= maxFiles) break;
    selected.add(dep);
    scores.set(dep, 50);
  }
  
  return {
    files: Array.from(selected),
    scores: Object.fromEntries(scores),
    stats: {
      total: selected.size,
      changed: changedFiles.length,
      hot: hotFiles.filter(f => selected.has(f)).length,
      dependencies: dependencies.size
    }
  };
}

/**
 * Generate context explanation
 */
export function explainContextSelection(selection) {
  const explanation = [];
  
  explanation.push(`Selected ${selection.files.length} files for context:`);
  
  if (selection.stats.changed > 0) {
    explanation.push(`  - ${selection.stats.changed} changed files (priority)`);
  }
  
  if (selection.stats.hot > 0) {
    explanation.push(`  - ${selection.stats.hot} hot files (recently edited)`);
  }
  
  if (selection.stats.dependencies > 0) {
    explanation.push(`  - ${selection.stats.dependencies} dependencies`);
  }
  
  const remaining = selection.files.length - selection.stats.changed - selection.stats.hot - selection.stats.dependencies;
  if (remaining > 0) {
    explanation.push(`  - ${remaining} relevant files (by query/connectivity)`);
  }
  
  return explanation.join('\n');
}
