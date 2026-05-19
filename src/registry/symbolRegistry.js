/**
 * Symbol Registry
 * Central storage for all repository symbols with fast lookup
 */

import fs from 'fs/promises';
import { getRecallPath, fileExists } from '../utils/fileUtils.js';

const REGISTRY_FILE = 'symbol_registry.json';

/**
 * Symbol Registry Class
 */
export class SymbolRegistry {
  constructor() {
    this.symbols = {}; // { filePath: { functions: [], classes: [], ... } }
    this.index = {
      functions: {}, // { functionName: [filePaths] }
      classes: {},
      exports: {},
      imports: {}
    };
  }

  /**
   * Add symbols from a file
   */
  addFile(filePath, symbols) {
    this.symbols[filePath] = symbols;
    this._updateIndex(filePath, symbols);
  }

  /**
   * Remove file from registry
   */
  removeFile(filePath) {
    if (this.symbols[filePath]) {
      this._removeFromIndex(filePath, this.symbols[filePath]);
      delete this.symbols[filePath];
    }
  }

  /**
   * Get symbols for a file
   */
  getFile(filePath) {
    return this.symbols[filePath] || null;
  }

  /**
   * Find all files that export a symbol
   */
  findExport(symbolName) {
    return this.index.exports[symbolName] || [];
  }

  /**
   * Find all files that define a function
   */
  findFunction(functionName) {
    return this.index.functions[functionName] || [];
  }

  /**
   * Find all files that define a class
   */
  findClass(className) {
    return this.index.classes[className] || [];
  }

  /**
   * Find all files that import from a source
   */
  findImporters(sourcePath) {
    const importers = [];
    for (const [filePath, symbols] of Object.entries(this.symbols)) {
      for (const imp of symbols.imports || []) {
        if (imp.source === sourcePath || imp.source.includes(sourcePath)) {
          importers.push(filePath);
          break;
        }
      }
    }
    return importers;
  }

  /**
   * Verify if a symbol exists
   */
  verifySymbol(symbolName, symbolType = null) {
    if (symbolType === 'function') {
      return this.index.functions[symbolName]?.length > 0;
    } else if (symbolType === 'class') {
      return this.index.classes[symbolName]?.length > 0;
    } else if (symbolType === 'export') {
      return this.index.exports[symbolName]?.length > 0;
    } else {
      // Check all types
      return (
        this.index.functions[symbolName]?.length > 0 ||
        this.index.classes[symbolName]?.length > 0 ||
        this.index.exports[symbolName]?.length > 0
      );
    }
  }

  /**
   * Verify if an import is valid
   */
  verifyImport(importPath, symbolName) {
    const fileSymbols = this.symbols[importPath];
    if (!fileSymbols) return false;

    // Check if symbol is exported
    const exports = fileSymbols.exports || [];
    return exports.some(exp => exp.name === symbolName);
  }

  /**
   * Get all symbols (for serialization)
   */
  getAllSymbols() {
    return this.symbols;
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalExports = 0;
    let totalImports = 0;

    for (const symbols of Object.values(this.symbols)) {
      totalFunctions += symbols.functions?.length || 0;
      totalClasses += symbols.classes?.length || 0;
      totalExports += symbols.exports?.length || 0;
      totalImports += symbols.imports?.length || 0;
    }

    return {
      files: Object.keys(this.symbols).length,
      functions: totalFunctions,
      classes: totalClasses,
      exports: totalExports,
      imports: totalImports,
      uniqueFunctions: Object.keys(this.index.functions).length,
      uniqueClasses: Object.keys(this.index.classes).length,
      uniqueExports: Object.keys(this.index.exports).length
    };
  }

  /**
   * Update index when adding file
   */
  _updateIndex(filePath, symbols) {
    // Index functions
    for (const func of symbols.functions || []) {
      if (!this.index.functions[func.name]) {
        this.index.functions[func.name] = [];
      }
      if (!this.index.functions[func.name].includes(filePath)) {
        this.index.functions[func.name].push(filePath);
      }
    }

    // Index classes
    for (const cls of symbols.classes || []) {
      if (!this.index.classes[cls.name]) {
        this.index.classes[cls.name] = [];
      }
      if (!this.index.classes[cls.name].includes(filePath)) {
        this.index.classes[cls.name].push(filePath);
      }
    }

    // Index exports
    for (const exp of symbols.exports || []) {
      if (!this.index.exports[exp.name]) {
        this.index.exports[exp.name] = [];
      }
      if (!this.index.exports[exp.name].includes(filePath)) {
        this.index.exports[exp.name].push(filePath);
      }
    }
  }

  /**
   * Remove from index when removing file
   */
  _removeFromIndex(filePath, symbols) {
    // Remove functions
    for (const func of symbols.functions || []) {
      if (this.index.functions[func.name]) {
        this.index.functions[func.name] = this.index.functions[func.name]
          .filter(f => f !== filePath);
        if (this.index.functions[func.name].length === 0) {
          delete this.index.functions[func.name];
        }
      }
    }

    // Remove classes
    for (const cls of symbols.classes || []) {
      if (this.index.classes[cls.name]) {
        this.index.classes[cls.name] = this.index.classes[cls.name]
          .filter(f => f !== filePath);
        if (this.index.classes[cls.name].length === 0) {
          delete this.index.classes[cls.name];
        }
      }
    }

    // Remove exports
    for (const exp of symbols.exports || []) {
      if (this.index.exports[exp.name]) {
        this.index.exports[exp.name] = this.index.exports[exp.name]
          .filter(f => f !== filePath);
        if (this.index.exports[exp.name].length === 0) {
          delete this.index.exports[exp.name];
        }
      }
    }
  }

  /**
   * Save registry to disk
   */
  async save() {
    const registryPath = getRecallPath(REGISTRY_FILE);
    const data = {
      symbols: this.symbols,
      index: this.index,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
    await fs.writeFile(registryPath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Load registry from disk
   */
  async load() {
    const registryPath = getRecallPath(REGISTRY_FILE);
    
    if (!await fileExists(registryPath)) {
      return false;
    }

    try {
      const content = await fs.readFile(registryPath, 'utf8');
      const data = JSON.parse(content);
      
      this.symbols = data.symbols || {};
      this.index = data.index || { functions: {}, classes: {}, exports: {}, imports: {} };
      
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Create a new symbol registry
 */
export function createRegistry() {
  return new SymbolRegistry();
}
