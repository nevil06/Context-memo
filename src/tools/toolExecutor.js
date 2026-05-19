/**
 * Tool Executor
 * Executes repository tools with validation
 */

import fs from 'fs/promises';
import { validateToolParameters } from './repositoryTools.js';
import { parseFile } from '../parsers/astParser.js';
import { validateCode as validateCodeFn } from '../validation/validator.js';
import { calculateImpact } from '../graph/impactAnalysis.js';

export class ToolExecutor {
  constructor(context) {
    this.context = context;
    this.graph = context.graph;
    this.registry = context.registry;
    this.executionLog = [];
  }

  /**
   * Execute tool
   */
  async execute(toolName, params) {
    // Validate parameters
    const validation = validateToolParameters(toolName, params);
    
    if (!validation.valid) {
      return {
        success: false,
        error: 'Invalid parameters',
        details: validation.errors
      };
    }

    // Log execution
    this.log(toolName, params);

    try {
      // Execute tool
      const result = await this._executeTool(toolName, params);
      
      return {
        success: true,
        result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute tool implementation
   */
  async _executeTool(toolName, params) {
    switch (toolName) {
      case 'read_file':
        return await this._readFile(params.path);

      case 'get_exports':
        return this._getExports(params.file);

      case 'get_imports':
        return this._getImports(params.file);

      case 'trace_dependencies':
        return this._traceDependencies(params.symbol, params.file);

      case 'verify_symbol':
        return this._verifySymbol(params.name, params.file);

      case 'parse_ast':
        return await this._parseAST(params.file);

      case 'get_file_metrics':
        return this._getFileMetrics(params.file);

      case 'find_symbol':
        return this._findSymbol(params.symbol, params.type);

      case 'get_dependents':
        return this._getDependents(params.file);

      case 'calculate_impact':
        return this._calculateImpact(params.files);

      case 'validate_code':
        return await this._validateCode(params.code, params.file);

      case 'validate_import':
        return this._validateImport(params.source, params.symbol);

      default:
        throw new Error(`Tool not implemented: ${toolName}`);
    }
  }

  /**
   * Read file
   */
  async _readFile(path) {
    const content = await fs.readFile(path, 'utf8');
    return {
      path,
      content,
      size: content.length,
      lines: content.split('\n').length
    };
  }

  /**
   * Get exports
   */
  _getExports(file) {
    const symbols = this.registry.getFile(file);
    
    if (!symbols) {
      throw new Error(`File not in registry: ${file}`);
    }

    return {
      file,
      exports: symbols.exports || [],
      count: symbols.exports?.length || 0
    };
  }

  /**
   * Get imports
   */
  _getImports(file) {
    const symbols = this.registry.getFile(file);
    
    if (!symbols) {
      throw new Error(`File not in registry: ${file}`);
    }

    return {
      file,
      imports: symbols.imports || [],
      count: symbols.imports?.length || 0
    };
  }

  /**
   * Trace dependencies
   */
  _traceDependencies(symbol, file) {
    let locations = [];

    if (file) {
      // Check specific file
      const symbols = this.registry.getFile(file);
      if (symbols) {
        const found = symbols.functions?.some(f => f.name === symbol) ||
                     symbols.classes?.some(c => c.name === symbol);
        if (found) locations.push(file);
      }
    } else {
      // Search all files
      locations = this.registry.findFunction(symbol);
      if (locations.length === 0) {
        locations = this.registry.findClass(symbol);
      }
    }

    // Get dependencies for each location
    const dependencies = [];
    for (const loc of locations) {
      const deps = this.graph.getDirectDependencies(loc);
      dependencies.push({
        file: loc,
        dependencies: deps
      });
    }

    return {
      symbol,
      locations,
      dependencies
    };
  }

  /**
   * Verify symbol
   */
  _verifySymbol(name, file) {
    if (file) {
      const symbols = this.registry.getFile(file);
      if (!symbols) return { exists: false, file };

      const exists = 
        symbols.functions?.some(f => f.name === name) ||
        symbols.classes?.some(c => c.name === name) ||
        symbols.exports?.some(e => e.name === name);

      return { exists, file };
    }

    // Search globally
    const exists = this.registry.verifySymbol(name);
    const locations = this.registry.findFunction(name);
    
    if (locations.length === 0) {
      locations.push(...this.registry.findClass(name));
    }

    return {
      exists,
      locations
    };
  }

  /**
   * Parse AST
   */
  async _parseAST(file) {
    const content = await fs.readFile(file, 'utf8');
    const symbols = await parseFile(content, file);
    
    return {
      file,
      symbols
    };
  }

  /**
   * Get file metrics
   */
  _getFileMetrics(file) {
    const metrics = this.graph.getNodeMetrics(file);
    
    if (!metrics) {
      throw new Error(`File not in graph: ${file}`);
    }

    return metrics;
  }

  /**
   * Find symbol
   */
  _findSymbol(symbol, type) {
    let locations = [];

    if (type === 'function') {
      locations = this.registry.findFunction(symbol);
    } else if (type === 'class') {
      locations = this.registry.findClass(symbol);
    } else {
      // Search both
      locations = this.registry.findFunction(symbol);
      if (locations.length === 0) {
        locations = this.registry.findClass(symbol);
      }
    }

    return {
      symbol,
      type: type || 'any',
      locations,
      found: locations.length > 0
    };
  }

  /**
   * Get dependents
   */
  _getDependents(file) {
    const dependents = this.graph.getDirectDependents(file);
    
    return {
      file,
      dependents,
      count: dependents.length
    };
  }

  /**
   * Calculate impact
   */
  _calculateImpact(files) {
    return calculateImpact(this.graph, files);
  }

  /**
   * Validate code
   */
  async _validateCode(code, file) {
    return await validateCodeFn(code, file, this.registry);
  }

  /**
   * Validate import
   */
  _validateImport(source, symbol) {
    const valid = this.registry.verifyImport(source, symbol);
    
    return {
      source,
      symbol,
      valid
    };
  }

  /**
   * Log execution
   */
  log(toolName, params) {
    this.executionLog.push({
      timestamp: Date.now(),
      tool: toolName,
      params
    });
  }

  /**
   * Get execution log
   */
  getLog() {
    return this.executionLog;
  }

  /**
   * Clear log
   */
  clearLog() {
    this.executionLog = [];
  }
}

/**
 * Create tool executor
 */
export function createToolExecutor(context) {
  return new ToolExecutor(context);
}
