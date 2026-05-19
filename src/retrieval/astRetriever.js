/**
 * AST Retriever
 * Structure-based retrieval using AST and symbol registry
 */

export class ASTRetriever {
  constructor(context) {
    this.context = context;
    this.registry = context.registry;
  }

  /**
   * Retrieve using AST/symbol matching
   */
  async retrieve(query, options = {}) {
    const { maxFiles = 20 } = options;

    const results = {
      files: [],
      symbols: [],
      metadata: {}
    };

    // Parse query for symbol names
    const symbolNames = this.extractSymbolNames(query);

    // Search for symbols
    for (const symbolName of symbolNames) {
      // Find functions
      const functionLocations = this.registry.findFunction(symbolName);
      for (const loc of functionLocations) {
        if (!results.files.some(f => f.path === loc)) {
          results.files.push({ path: loc, reason: `function: ${symbolName}` });
        }
        results.symbols.push({ type: 'function', name: symbolName, file: loc });
      }

      // Find classes
      const classLocations = this.registry.findClass(symbolName);
      for (const loc of classLocations) {
        if (!results.files.some(f => f.path === loc)) {
          results.files.push({ path: loc, reason: `class: ${symbolName}` });
        }
        results.symbols.push({ type: 'class', name: symbolName, file: loc });
      }

      // Find exports
      const exportLocations = this.registry.findExport(symbolName);
      for (const loc of exportLocations) {
        if (!results.files.some(f => f.path === loc)) {
          results.files.push({ path: loc, reason: `export: ${symbolName}` });
        }
      }
    }

    // Limit results
    results.files = results.files.slice(0, maxFiles);
    results.metadata.symbolsSearched = symbolNames.length;
    results.metadata.symbolsFound = results.symbols.length;

    return results;
  }

  /**
   * Retrieve by symbol
   */
  async retrieveBySymbol(symbolName) {
    const results = {
      files: [],
      symbols: [],
      metadata: { symbol: symbolName }
    };

    // Find in functions
    const functionLocs = this.registry.findFunction(symbolName);
    for (const loc of functionLocs) {
      results.files.push({ path: loc });
      results.symbols.push({ type: 'function', name: symbolName, file: loc });
    }

    // Find in classes
    const classLocs = this.registry.findClass(symbolName);
    for (const loc of classLocs) {
      results.files.push({ path: loc });
      results.symbols.push({ type: 'class', name: symbolName, file: loc });
    }

    results.metadata.found = results.files.length > 0;

    return results;
  }

  /**
   * Retrieve by export
   */
  async retrieveByExport(exportName) {
    const results = {
      files: [],
      metadata: { export: exportName }
    };

    const locations = this.registry.findExport(exportName);
    results.files = locations.map(loc => ({ path: loc }));
    results.metadata.found = results.files.length > 0;

    return results;
  }

  /**
   * Retrieve files with specific patterns
   */
  async retrieveByCodePattern(pattern) {
    const results = {
      files: [],
      matches: [],
      metadata: { pattern }
    };

    // Search through all files in registry
    const allSymbols = this.registry.getAllSymbols();

    for (const [filePath, symbols] of Object.entries(allSymbols)) {
      let matches = 0;

      // Check functions
      for (const func of symbols.functions || []) {
        if (this.matchesPattern(func.name, pattern)) {
          matches++;
          results.matches.push({
            file: filePath,
            type: 'function',
            name: func.name
          });
        }
      }

      // Check classes
      for (const cls of symbols.classes || []) {
        if (this.matchesPattern(cls.name, pattern)) {
          matches++;
          results.matches.push({
            file: filePath,
            type: 'class',
            name: cls.name
          });
        }
      }

      if (matches > 0) {
        results.files.push({ path: filePath, matches });
      }
    }

    results.metadata.totalMatches = results.matches.length;

    return results;
  }

  /**
   * Extract symbol names from query
   */
  extractSymbolNames(query) {
    const symbols = [];
    
    // Extract camelCase/PascalCase identifiers
    const identifierRegex = /\b[a-z][a-zA-Z0-9]*\b|\b[A-Z][a-zA-Z0-9]*\b/g;
    const matches = query.match(identifierRegex) || [];
    
    for (const match of matches) {
      // Filter out common words
      if (match.length > 2 && !this.isCommonWord(match)) {
        symbols.push(match);
      }
    }

    return [...new Set(symbols)]; // Deduplicate
  }

  /**
   * Check if word is common (not a symbol)
   */
  isCommonWord(word) {
    const commonWords = new Set([
      'the', 'and', 'for', 'with', 'from', 'this', 'that',
      'add', 'get', 'set', 'new', 'old', 'use', 'make'
    ]);
    return commonWords.has(word.toLowerCase());
  }

  /**
   * Check if name matches pattern
   */
  matchesPattern(name, pattern) {
    const patternLower = pattern.toLowerCase();
    const nameLower = name.toLowerCase();
    
    // Exact match
    if (nameLower === patternLower) return true;
    
    // Contains
    if (nameLower.includes(patternLower)) return true;
    
    // Starts with
    if (nameLower.startsWith(patternLower)) return true;
    
    return false;
  }

  /**
   * Get symbol statistics
   */
  getSymbolStats() {
    return this.registry.getStats();
  }
}
