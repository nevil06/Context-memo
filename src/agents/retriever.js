/**
 * Retriever Agent
 * Retrieves relevant context using graph and registry
 */

export class RetrieverAgent {
  constructor(context) {
    this.context = context;
    this.graph = context.graph;
    this.registry = context.registry;
    this.workingMemory = context.workingMemory;
  }

  /**
   * Retrieve context for plan
   */
  async retrieveContext(plan) {
    const context = {
      files: [],
      symbols: [],
      dependencies: [],
      summaries: {},
      metadata: {}
    };

    // Retrieve affected files
    for (const file of plan.affectedFiles) {
      const fileContext = await this.retrieveFile(file);
      if (fileContext) {
        context.files.push(fileContext);
      }
    }

    // Retrieve dependencies
    for (const dep of plan.dependencies) {
      const depContext = await this.retrieveFile(dep);
      if (depContext) {
        context.dependencies.push(depContext);
      }
    }

    // Retrieve symbols
    context.symbols = this.retrieveSymbols(plan.affectedFiles);

    // Generate summaries for other files
    context.summaries = this.generateSummaries(plan);

    // Add metadata
    context.metadata = {
      retrievedFiles: context.files.length,
      retrievedDependencies: context.dependencies.length,
      retrievedSymbols: context.symbols.length,
      temperature: this.getTemperature(plan.affectedFiles)
    };

    return context;
  }

  /**
   * Retrieve file context
   */
  async retrieveFile(filePath) {
    const node = this.graph.getNode(filePath);
    const symbols = this.registry.getFile(filePath);
    const metrics = this.graph.getNodeMetrics(filePath);

    if (!node || !symbols) {
      return null;
    }

    return {
      path: filePath,
      symbols: {
        functions: symbols.functions || [],
        classes: symbols.classes || [],
        exports: symbols.exports || [],
        imports: symbols.imports || []
      },
      metrics: {
        connections: metrics?.totalConnections || 0,
        fanIn: metrics?.fanIn || 0,
        fanOut: metrics?.fanOut || 0
      },
      dependencies: this.graph.getDirectDependencies(filePath),
      dependents: this.graph.getDirectDependents(filePath)
    };
  }

  /**
   * Retrieve symbols
   */
  retrieveSymbols(files) {
    const symbols = [];

    for (const file of files) {
      const fileSymbols = this.registry.getFile(file);
      if (!fileSymbols) continue;

      // Add functions
      for (const func of fileSymbols.functions || []) {
        symbols.push({
          type: 'function',
          name: func.name,
          file,
          params: func.params,
          line: func.line
        });
      }

      // Add classes
      for (const cls of fileSymbols.classes || []) {
        symbols.push({
          type: 'class',
          name: cls.name,
          file,
          methods: cls.methods,
          line: cls.line
        });
      }
    }

    return symbols;
  }

  /**
   * Generate summaries
   */
  generateSummaries(plan) {
    const summaries = {};
    const allFiles = this.graph.getAllNodes();

    // Summarize files not in affected or dependencies
    const relevantFiles = new Set([
      ...plan.affectedFiles,
      ...plan.dependencies
    ]);

    for (const node of allFiles) {
      if (relevantFiles.has(node.file)) continue;

      const symbols = this.registry.getFile(node.file);
      if (!symbols) continue;

      summaries[node.file] = {
        functions: symbols.functions?.length || 0,
        classes: symbols.classes?.length || 0,
        exports: symbols.exports?.length || 0,
        loc: node.loc
      };
    }

    return summaries;
  }

  /**
   * Get temperature of files
   */
  getTemperature(files) {
    const temps = {};

    for (const file of files) {
      temps[file] = this.workingMemory.getTemperature(file);
    }

    return temps;
  }

  /**
   * Retrieve by query
   */
  async retrieveByQuery(query, maxFiles = 10) {
    const allFiles = this.graph.getAllNodes().map(n => n.id);
    const { selectSmartContext } = await import('../memory/relevanceRanker.js');

    const selection = selectSmartContext({
      allFiles,
      changedFiles: [],
      query,
      maxFiles,
      graph: this.graph,
      registry: this.registry,
      workingMemory: this.workingMemory
    });

    const context = {
      files: [],
      symbols: [],
      metadata: selection.stats
    };

    for (const file of selection.files) {
      const fileContext = await this.retrieveFile(file);
      if (fileContext) {
        context.files.push(fileContext);
      }
    }

    return context;
  }
}
