/**
 * Graph Retriever
 * Dependency-based retrieval using knowledge graph
 */

export class GraphRetriever {
  constructor(context) {
    this.context = context;
    this.graph = context.graph;
    this.registry = context.registry;
  }

  /**
   * Retrieve using graph traversal
   */
  async retrieve(query, options = {}) {
    const { maxFiles = 20 } = options;

    const results = {
      files: [],
      metadata: {}
    };

    // Extract file patterns from query
    const patterns = this.extractFilePatterns(query);

    // Find matching files
    for (const node of this.graph.getAllNodes()) {
      for (const pattern of patterns) {
        if (node.file.toLowerCase().includes(pattern.toLowerCase())) {
          results.files.push({ 
            path: node.file, 
            reason: `matches: ${pattern}` 
          });
          break;
        }
      }
    }

    // If no matches, return god nodes
    if (results.files.length === 0) {
      const godNodes = this.getGodNodes();
      results.files = godNodes.map(node => ({ 
        path: node.file, 
        reason: 'god node' 
      }));
    }

    results.files = results.files.slice(0, maxFiles);
    results.metadata.patternsSearched = patterns.length;

    return results;
  }

  /**
   * Retrieve by pattern
   */
  async retrieveByPattern(pattern, options = {}) {
    const { maxFiles = 20 } = options;

    const results = {
      files: [],
      metadata: { pattern }
    };

    for (const node of this.graph.getAllNodes()) {
      if (this.matchesPattern(node.file, pattern)) {
        results.files.push({ path: node.file });
      }
    }

    results.files = results.files.slice(0, maxFiles);
    results.metadata.totalFiles = results.files.length;

    return results;
  }

  /**
   * Retrieve by dependency
   */
  async retrieveByDependency(filePath, options = {}) {
    const {
      includeDependencies = true,
      includeDependents = true,
      maxDepth = 2
    } = options;

    const results = {
      files: [{ path: filePath, reason: 'root' }],
      dependencies: [],
      dependents: [],
      metadata: {}
    };

    // Get dependencies
    if (includeDependencies) {
      const deps = this.graph.getTransitiveDependencies(filePath, maxDepth);
      for (const dep of deps) {
        results.files.push({ 
          path: dep.file, 
          reason: `dependency (depth ${dep.depth})` 
        });
        results.dependencies.push(dep);
      }
    }

    // Get dependents
    if (includeDependents) {
      const dependents = this.graph.getTransitiveDependents(filePath, maxDepth);
      for (const dependent of dependents) {
        results.files.push({ 
          path: dependent.file, 
          reason: `dependent (depth ${dependent.depth})` 
        });
        results.dependents.push(dependent);
      }
    }

    results.metadata.totalDependencies = results.dependencies.length;
    results.metadata.totalDependents = results.dependents.length;

    return results;
  }

  /**
   * Find symbol usages
   */
  async findSymbolUsages(symbolName) {
    const usages = [];

    // Find where symbol is defined
    const definitions = this.registry.findFunction(symbolName);
    if (definitions.length === 0) {
      definitions.push(...this.registry.findClass(symbolName));
    }

    // For each definition, find importers
    for (const defFile of definitions) {
      const importers = this.graph.getDirectDependents(defFile);
      
      for (const importer of importers) {
        // Check if this file actually imports the symbol
        const symbols = this.registry.getFile(importer.file);
        if (symbols) {
          for (const imp of symbols.imports || []) {
            if (imp.items.some(item => 
              item.name === symbolName || item.imported === symbolName
            )) {
              usages.push({
                file: importer.file,
                symbol: symbolName,
                definedIn: defFile
              });
            }
          }
        }
      }
    }

    return usages;
  }

  /**
   * Get god nodes
   */
  getGodNodes() {
    const nodes = this.graph.getAllNodes();
    const withMetrics = nodes.map(node => ({
      ...node,
      metrics: this.graph.getNodeMetrics(node.id)
    }));

    // Sort by connections
    withMetrics.sort((a, b) => 
      (b.metrics?.totalConnections || 0) - (a.metrics?.totalConnections || 0)
    );

    return withMetrics.slice(0, 5);
  }

  /**
   * Retrieve by connectivity
   */
  async retrieveByConnectivity(minConnections = 5, options = {}) {
    const { maxFiles = 20 } = options;

    const results = {
      files: [],
      metadata: { minConnections }
    };

    for (const node of this.graph.getAllNodes()) {
      const metrics = this.graph.getNodeMetrics(node.id);
      
      if (metrics && metrics.totalConnections >= minConnections) {
        results.files.push({
          path: node.file,
          connections: metrics.totalConnections,
          reason: `${metrics.totalConnections} connections`
        });
      }
    }

    // Sort by connections
    results.files.sort((a, b) => b.connections - a.connections);
    results.files = results.files.slice(0, maxFiles);
    results.metadata.totalFiles = results.files.length;

    return results;
  }

  /**
   * Retrieve by path distance
   */
  async retrieveByPathDistance(fromFile, toFile, options = {}) {
    const { includeIntermediates = true } = options;

    const results = {
      files: [],
      path: [],
      metadata: { from: fromFile, to: toFile }
    };

    // Find path
    const path = this.graph.findPath(fromFile, toFile);

    if (path) {
      results.path = path;
      
      if (includeIntermediates) {
        results.files = path.map(file => ({ path: file }));
      } else {
        results.files = [
          { path: fromFile },
          { path: toFile }
        ];
      }

      results.metadata.distance = path.length - 1;
      results.metadata.found = true;
    } else {
      results.metadata.found = false;
    }

    return results;
  }

  /**
   * Retrieve subgraph
   */
  async retrieveSubgraph(startFiles, options = {}) {
    const { maxDepth = 2, maxFiles = 20 } = options;

    const results = {
      files: [],
      edges: [],
      metadata: { startFiles }
    };

    const visited = new Set();

    // BFS from start files
    const queue = startFiles.map(f => ({ file: f, depth: 0 }));

    while (queue.length > 0 && results.files.length < maxFiles) {
      const { file, depth } = queue.shift();

      if (visited.has(file) || depth > maxDepth) continue;
      visited.add(file);

      results.files.push({ path: file, depth });

      // Get neighbors
      const deps = this.graph.getDirectDependencies(file);
      const dependents = this.graph.getDirectDependents(file);

      for (const dep of deps) {
        results.edges.push({ from: file, to: dep.file, type: 'dependency' });
        if (!visited.has(dep.file)) {
          queue.push({ file: dep.file, depth: depth + 1 });
        }
      }

      for (const dependent of dependents) {
        results.edges.push({ from: dependent.file, to: file, type: 'dependent' });
        if (!visited.has(dependent.file)) {
          queue.push({ file: dependent.file, depth: depth + 1 });
        }
      }
    }

    results.metadata.totalFiles = results.files.length;
    results.metadata.totalEdges = results.edges.length;

    return results;
  }

  /**
   * Extract file patterns from query
   */
  extractFilePatterns(query) {
    const patterns = [];

    // Extract file extensions
    const extMatches = query.match(/\.\w+/g) || [];
    patterns.push(...extMatches);

    // Extract path-like patterns
    const pathMatches = query.match(/[\w-]+\/[\w-]+/g) || [];
    patterns.push(...pathMatches);

    // Extract words that might be file/folder names
    const words = query.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && !this.isCommonWord(word)) {
        patterns.push(word);
      }
    }

    return [...new Set(patterns)];
  }

  /**
   * Check if word is common
   */
  isCommonWord(word) {
    const commonWords = new Set([
      'the', 'and', 'for', 'with', 'from', 'this', 'that',
      'file', 'code', 'function', 'class', 'import', 'export'
    ]);
    return commonWords.has(word);
  }

  /**
   * Check if file matches pattern
   */
  matchesPattern(filePath, pattern) {
    const pathLower = filePath.toLowerCase();
    const patternLower = pattern.toLowerCase();

    return pathLower.includes(patternLower);
  }

  /**
   * Get graph statistics
   */
  getGraphStats() {
    return this.graph.getStats();
  }
}
