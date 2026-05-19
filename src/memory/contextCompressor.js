/**
 * Context Compressor
 * Creates hierarchical summaries for efficient context usage
 */

import path from 'path';

/**
 * Compress repository into hierarchical summaries
 */
export function compressRepository(graph, registry) {
  return {
    repository: generateRepositorySummary(graph, registry),
    modules: generateModuleSummaries(graph, registry),
    files: generateFileSummaries(graph, registry)
  };
}

/**
 * Generate repository-level summary
 */
function generateRepositorySummary(graph, registry) {
  const stats = graph.getStats();
  const registryStats = registry.getStats();
  
  return {
    files: stats.nodes,
    connections: stats.edges,
    functions: registryStats.functions,
    classes: registryStats.classes,
    exports: registryStats.exports,
    avgConnections: stats.avgDegree.toFixed(2),
    architecture: describeArchitecture(graph)
  };
}

/**
 * Generate module-level summaries (by directory)
 */
function generateModuleSummaries(graph, registry) {
  const modules = {};
  
  for (const node of graph.getAllNodes()) {
    const dir = path.dirname(node.file);
    
    if (!modules[dir]) {
      modules[dir] = {
        path: dir,
        files: [],
        totalFunctions: 0,
        totalClasses: 0,
        totalExports: 0,
        totalLOC: 0,
        connections: 0
      };
    }
    
    modules[dir].files.push(path.basename(node.file));
    modules[dir].totalFunctions += node.functions?.length || 0;
    modules[dir].totalClasses += node.classes?.length || 0;
    modules[dir].totalExports += node.exports?.length || 0;
    modules[dir].totalLOC += node.loc || 0;
    
    const metrics = graph.getNodeMetrics(node.id);
    if (metrics) {
      modules[dir].connections += metrics.totalConnections;
    }
  }
  
  return modules;
}

/**
 * Generate file-level summaries
 */
function generateFileSummaries(graph, registry) {
  const summaries = {};
  
  for (const node of graph.getAllNodes()) {
    const symbols = registry.getFile(node.id);
    const metrics = graph.getNodeMetrics(node.id);
    
    summaries[node.id] = {
      file: node.id,
      loc: node.loc,
      functions: node.functions?.length || 0,
      classes: node.classes?.length || 0,
      exports: node.exports?.length || 0,
      imports: symbols?.imports?.length || 0,
      connections: metrics?.totalConnections || 0,
      fanIn: metrics?.fanIn || 0,
      fanOut: metrics?.fanOut || 0,
      role: inferFileRole(node, metrics)
    };
  }
  
  return summaries;
}

/**
 * Describe architecture patterns
 */
function describeArchitecture(graph) {
  const patterns = [];
  const dirs = new Set();
  
  for (const node of graph.getAllNodes()) {
    const dir = path.dirname(node.file);
    dirs.add(dir);
    
    const lower = node.file.toLowerCase();
    if (lower.includes('command')) patterns.push('commands');
    if (lower.includes('util')) patterns.push('utils');
    if (lower.includes('service')) patterns.push('services');
    if (lower.includes('controller')) patterns.push('controllers');
    if (lower.includes('model')) patterns.push('models');
    if (lower.includes('component')) patterns.push('components');
  }
  
  return {
    directories: dirs.size,
    patterns: [...new Set(patterns)]
  };
}

/**
 * Infer file role from metrics
 */
function inferFileRole(node, metrics) {
  if (!metrics) return 'unknown';
  
  if (metrics.fanIn > 5) return 'library';
  if (metrics.fanOut > 5) return 'orchestrator';
  if (metrics.fanIn === 0 && metrics.fanOut > 0) return 'entry-point';
  if (metrics.fanOut === 0 && metrics.fanIn > 0) return 'leaf';
  if (node.exports?.length > 5) return 'api';
  
  return 'module';
}

/**
 * Generate compact context for AI
 */
export function generateCompactContext(workingMemory, graph, registry, options = {}) {
  const {
    includeHot = true,
    includeWarm = true,
    includeCold = false,
    maxFiles = 20
  } = options;
  
  const context = {
    active: [],
    summaries: {},
    stats: {}
  };
  
  // Get active files
  let activeFiles = [];
  if (includeHot) activeFiles.push(...workingMemory.getHot());
  if (includeWarm) activeFiles.push(...workingMemory.getWarm());
  if (includeCold) activeFiles.push(...workingMemory.getCold());
  
  // Limit to maxFiles
  activeFiles = activeFiles.slice(0, maxFiles);
  
  // Generate detailed context for active files
  for (const file of activeFiles) {
    const node = graph.getNode(file);
    const symbols = registry.getFile(file);
    const metrics = graph.getNodeMetrics(file);
    const temp = workingMemory.getTemperature(file);
    
    if (node && symbols) {
      context.active.push({
        file,
        temperature: temp,
        functions: symbols.functions?.map(f => f.name) || [],
        classes: symbols.classes?.map(c => c.name) || [],
        exports: symbols.exports?.map(e => e.name) || [],
        imports: symbols.imports?.length || 0,
        connections: metrics?.totalConnections || 0,
        role: inferFileRole(node, metrics)
      });
    }
  }
  
  // Generate summaries for inactive files
  const inactiveFiles = graph.getAllNodes()
    .filter(n => !activeFiles.includes(n.id))
    .slice(0, 50); // Limit summaries
  
  for (const node of inactiveFiles) {
    context.summaries[node.id] = {
      functions: node.functions?.length || 0,
      classes: node.classes?.length || 0,
      exports: node.exports?.length || 0,
      loc: node.loc
    };
  }
  
  // Add stats
  context.stats = {
    activeFiles: activeFiles.length,
    summarizedFiles: Object.keys(context.summaries).length,
    totalFiles: graph.getAllNodes().length,
    compressionRatio: (activeFiles.length / graph.getAllNodes().length * 100).toFixed(1) + '%'
  };
  
  return context;
}

/**
 * Estimate token count for context
 */
export function estimateContextTokens(context) {
  // Rough estimation: 1 token ≈ 4 characters
  const json = JSON.stringify(context);
  return Math.ceil(json.length / 4);
}

/**
 * Generate layered context (progressive detail)
 */
export function generateLayeredContext(workingMemory, graph, registry) {
  return {
    layer1_hot: generateCompactContext(workingMemory, graph, registry, {
      includeHot: true,
      includeWarm: false,
      includeCold: false,
      maxFiles: 5
    }),
    layer2_warm: generateCompactContext(workingMemory, graph, registry, {
      includeHot: false,
      includeWarm: true,
      includeCold: false,
      maxFiles: 10
    }),
    layer3_cold: generateCompactContext(workingMemory, graph, registry, {
      includeHot: false,
      includeWarm: false,
      includeCold: true,
      maxFiles: 20
    })
  };
}
