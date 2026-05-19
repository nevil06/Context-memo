/**
 * Hybrid Retrieval Engine
 * Combines AST, graph, and semantic retrieval
 */

import { ASTRetriever } from './astRetriever.js';
import { GraphRetriever } from './graphRetriever.js';

export class HybridRetriever {
  constructor(context) {
    this.context = context;
    this.astRetriever = new ASTRetriever(context);
    this.graphRetriever = new GraphRetriever(context);
    this.retrievalLog = [];
  }

  /**
   * Retrieve using hybrid strategy
   */
  async retrieve(query, options = {}) {
    const {
      maxFiles = 20,
      strategy = 'balanced', // 'ast', 'graph', 'semantic', 'balanced'
      includeContext = true,
      rankByRelevance = true
    } = options;

    this.log('hybrid', 'Starting retrieval', { query, strategy });

    const results = {
      files: [],
      symbols: [],
      metadata: {
        strategy,
        sources: []
      }
    };

    try {
      // Execute retrieval strategies
      if (strategy === 'ast' || strategy === 'balanced') {
        const astResults = await this.astRetriever.retrieve(query, { maxFiles: maxFiles / 2 });
        results.files.push(...astResults.files);
        results.symbols.push(...astResults.symbols);
        results.metadata.sources.push('ast');
        this.log('ast', 'Retrieved', { files: astResults.files.length });
      }

      if (strategy === 'graph' || strategy === 'balanced') {
        const graphResults = await this.graphRetriever.retrieve(query, { maxFiles: maxFiles / 2 });
        results.files.push(...graphResults.files);
        results.metadata.sources.push('graph');
        this.log('graph', 'Retrieved', { files: graphResults.files.length });
      }

      // Deduplicate files
      results.files = this.deduplicateFiles(results.files);

      // Rank by relevance
      if (rankByRelevance) {
        results.files = await this.rankResults(results.files, query);
        this.log('hybrid', 'Ranked results');
      }

      // Limit to maxFiles
      results.files = results.files.slice(0, maxFiles);

      // Add context if requested
      if (includeContext) {
        results.context = await this.enrichContext(results.files);
        this.log('hybrid', 'Enriched context');
      }

      results.metadata.totalFiles = results.files.length;
      results.metadata.totalSymbols = results.symbols.length;

    } catch (error) {
      this.log('hybrid', 'Retrieval failed', { error: error.message });
      results.error = error.message;
    }

    return results;
  }

  /**
   * Retrieve by file pattern
   */
  async retrieveByPattern(pattern, options = {}) {
    const { maxFiles = 20 } = options;

    const results = {
      files: [],
      metadata: { pattern }
    };

    // Use graph retriever for pattern matching
    const graphResults = await this.graphRetriever.retrieveByPattern(pattern, { maxFiles });
    results.files = graphResults.files;
    results.metadata.totalFiles = results.files.length;

    return results;
  }

  /**
   * Retrieve by symbol
   */
  async retrieveBySymbol(symbolName, options = {}) {
    const { includeUsages = true, maxFiles = 20 } = options;

    const results = {
      files: [],
      symbols: [],
      usages: [],
      metadata: { symbol: symbolName }
    };

    // Use AST retriever for symbol lookup
    const astResults = await this.astRetriever.retrieveBySymbol(symbolName);
    results.files = astResults.files;
    results.symbols = astResults.symbols;

    // Get usages if requested
    if (includeUsages) {
      const usages = await this.graphRetriever.findSymbolUsages(symbolName);
      results.usages = usages;
      
      // Add usage files
      for (const usage of usages) {
        if (!results.files.some(f => f.path === usage.file)) {
          results.files.push({ path: usage.file });
        }
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
      maxDepth = 2,
      maxFiles = 20
    } = options;

    const results = {
      files: [],
      dependencies: [],
      dependents: [],
      metadata: { file: filePath }
    };

    // Use graph retriever
    const graphResults = await this.graphRetriever.retrieveByDependency(filePath, {
      includeDependencies,
      includeDependents,
      maxDepth
    });

    results.files = graphResults.files.slice(0, maxFiles);
    results.dependencies = graphResults.dependencies;
    results.dependents = graphResults.dependents;
    results.metadata.totalFiles = results.files.length;

    return results;
  }

  /**
   * Deduplicate files
   */
  deduplicateFiles(files) {
    const seen = new Set();
    const unique = [];

    for (const file of files) {
      const key = file.path || file;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(file);
      }
    }

    return unique;
  }

  /**
   * Rank results by relevance
   */
  async rankResults(files, query) {
    const { rankByRelevance } = await import('../memory/relevanceRanker.js');
    
    const filePaths = files.map(f => f.path || f);
    const ranked = rankByRelevance(
      filePaths,
      query,
      this.context.graph,
      this.context.registry,
      this.context.workingMemory
    );

    return ranked.map(r => ({ path: r.file, score: r.score }));
  }

  /**
   * Enrich context with additional data
   */
  async enrichContext(files) {
    const context = {
      files: [],
      summaries: {},
      relationships: []
    };

    for (const file of files) {
      const filePath = file.path || file;
      
      // Get file symbols
      const symbols = this.context.registry.getFile(filePath);
      if (symbols) {
        context.files.push({
          path: filePath,
          functions: symbols.functions?.length || 0,
          classes: symbols.classes?.length || 0,
          exports: symbols.exports?.length || 0
        });
      }

      // Get relationships
      const deps = this.context.graph.getDirectDependencies(filePath);
      const dependents = this.context.graph.getDirectDependents(filePath);
      
      if (deps.length > 0 || dependents.length > 0) {
        context.relationships.push({
          file: filePath,
          dependencies: deps.length,
          dependents: dependents.length
        });
      }
    }

    return context;
  }

  /**
   * Multi-strategy retrieval
   */
  async retrieveMultiStrategy(query, strategies = ['ast', 'graph']) {
    const results = {
      byStrategy: {},
      combined: [],
      metadata: {}
    };

    for (const strategy of strategies) {
      const strategyResults = await this.retrieve(query, { 
        strategy, 
        maxFiles: 10,
        rankByRelevance: false 
      });
      
      results.byStrategy[strategy] = strategyResults.files;
    }

    // Combine and deduplicate
    const allFiles = Object.values(results.byStrategy).flat();
    results.combined = this.deduplicateFiles(allFiles);

    // Rank combined results
    results.combined = await this.rankResults(results.combined, query);

    results.metadata = {
      strategies,
      totalByStrategy: Object.entries(results.byStrategy).map(([s, files]) => ({
        strategy: s,
        count: files.length
      })),
      combinedCount: results.combined.length
    };

    return results;
  }

  /**
   * Log retrieval event
   */
  log(source, message, data = {}) {
    this.retrievalLog.push({
      timestamp: Date.now(),
      source,
      message,
      data
    });
  }

  /**
   * Get retrieval log
   */
  getLog() {
    return this.retrievalLog;
  }

  /**
   * Clear log
   */
  clearLog() {
    this.retrievalLog = [];
  }

  /**
   * Get retrieval statistics
   */
  getStats() {
    const stats = {
      totalRetrievals: this.retrievalLog.length,
      bySources: {},
      avgFilesRetrieved: 0
    };

    let totalFiles = 0;

    for (const entry of this.retrievalLog) {
      if (!stats.bySources[entry.source]) {
        stats.bySources[entry.source] = 0;
      }
      stats.bySources[entry.source]++;

      if (entry.data.files) {
        totalFiles += entry.data.files;
      }
    }

    if (this.retrievalLog.length > 0) {
      stats.avgFilesRetrieved = totalFiles / this.retrievalLog.length;
    }

    return stats;
  }
}

/**
 * Create hybrid retriever
 */
export function createHybridRetriever(context) {
  return new HybridRetriever(context);
}
