/**
 * Checksum Engine
 * Multi-level hashing for fast invalidation and staleness detection
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import { getRecallPath, fileExists } from '../utils/fileUtils.js';

const CHECKSUM_FILE = 'checksums.json';

/**
 * Checksum Engine Class
 */
export class ChecksumEngine {
  constructor() {
    this.checksums = {
      repository: null,      // Full repository hash
      graph: null,           // Graph structure hash
      symbols: null,         // Symbol registry hash
      files: {},             // Per-file hashes
      modules: {},           // Per-module hashes
      metadata: {
        version: '1.0.0',
        lastUpdate: null,
        fileCount: 0
      }
    };
  }

  /**
   * Calculate repository-wide checksum
   */
  calculateRepositoryChecksum(fileHashes) {
    const sortedHashes = Object.keys(fileHashes)
      .sort()
      .map(key => `${key}:${fileHashes[key]}`)
      .join('|');
    
    return this._hash(sortedHashes);
  }

  /**
   * Calculate graph structure checksum
   */
  calculateGraphChecksum(graph) {
    const graphData = {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      connections: graph.edges.map(e => `${e.from}->${e.to}`).sort().join('|')
    };
    
    return this._hash(JSON.stringify(graphData));
  }

  /**
   * Calculate symbol registry checksum
   */
  calculateSymbolChecksum(registry) {
    const stats = registry.getStats();
    const symbolData = {
      files: stats.files,
      functions: stats.functions,
      classes: stats.classes,
      exports: stats.exports
    };
    
    return this._hash(JSON.stringify(symbolData));
  }

  /**
   * Calculate file checksum
   */
  async calculateFileChecksum(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return this._hash(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate module checksum (directory)
   */
  calculateModuleChecksum(moduleFiles, fileHashes) {
    const moduleData = moduleFiles
      .sort()
      .map(file => `${file}:${fileHashes[file] || ''}`)
      .join('|');
    
    return this._hash(moduleData);
  }

  /**
   * Update all checksums
   */
  async updateChecksums(graph, registry, fileHashes) {
    // Repository checksum
    this.checksums.repository = this.calculateRepositoryChecksum(fileHashes);
    
    // Graph checksum
    this.checksums.graph = this.calculateGraphChecksum(graph);
    
    // Symbol registry checksum
    this.checksums.symbols = this.calculateSymbolChecksum(registry);
    
    // File checksums
    this.checksums.files = { ...fileHashes };
    
    // Module checksums (by directory)
    this.checksums.modules = this._calculateModuleChecksums(fileHashes);
    
    // Update metadata
    this.checksums.metadata.lastUpdate = new Date().toISOString();
    this.checksums.metadata.fileCount = Object.keys(fileHashes).length;
  }

  /**
   * Calculate module checksums
   */
  _calculateModuleChecksums(fileHashes) {
    const modules = {};
    const filesByModule = {};
    
    // Group files by directory
    for (const file of Object.keys(fileHashes)) {
      const parts = file.split(/[/\\]/);
      const module = parts.slice(0, -1).join('/');
      
      if (!filesByModule[module]) {
        filesByModule[module] = [];
      }
      filesByModule[module].push(file);
    }
    
    // Calculate checksum for each module
    for (const [module, files] of Object.entries(filesByModule)) {
      modules[module] = this.calculateModuleChecksum(files, fileHashes);
    }
    
    return modules;
  }

  /**
   * Check if repository has changed
   */
  hasRepositoryChanged(newFileHashes) {
    const newChecksum = this.calculateRepositoryChecksum(newFileHashes);
    return newChecksum !== this.checksums.repository;
  }

  /**
   * Check if graph has changed
   */
  hasGraphChanged(newGraph) {
    const newChecksum = this.calculateGraphChecksum(newGraph);
    return newChecksum !== this.checksums.graph;
  }

  /**
   * Check if symbols have changed
   */
  hasSymbolsChanged(newRegistry) {
    const newChecksum = this.calculateSymbolChecksum(newRegistry);
    return newChecksum !== this.checksums.symbols;
  }

  /**
   * Check if file has changed
   */
  hasFileChanged(filePath, newHash) {
    return this.checksums.files[filePath] !== newHash;
  }

  /**
   * Check if module has changed
   */
  hasModuleChanged(modulePath, fileHashes) {
    const moduleFiles = Object.keys(fileHashes).filter(f => f.startsWith(modulePath));
    const newChecksum = this.calculateModuleChecksum(moduleFiles, fileHashes);
    return this.checksums.modules[modulePath] !== newChecksum;
  }

  /**
   * Get changed files
   */
  getChangedFiles(newFileHashes) {
    const changed = [];
    const added = [];
    const removed = [];
    
    // Check for changed and added files
    for (const [file, hash] of Object.entries(newFileHashes)) {
      if (!this.checksums.files[file]) {
        added.push(file);
      } else if (this.checksums.files[file] !== hash) {
        changed.push(file);
      }
    }
    
    // Check for removed files
    for (const file of Object.keys(this.checksums.files)) {
      if (!newFileHashes[file]) {
        removed.push(file);
      }
    }
    
    return { changed, added, removed };
  }

  /**
   * Get changed modules
   */
  getChangedModules(newFileHashes) {
    const changed = [];
    const newModules = this._calculateModuleChecksums(newFileHashes);
    
    for (const [module, checksum] of Object.entries(newModules)) {
      if (this.checksums.modules[module] !== checksum) {
        changed.push(module);
      }
    }
    
    return changed;
  }

  /**
   * Check staleness
   */
  isStale(maxAge = 86400000) { // 24 hours default
    if (!this.checksums.metadata.lastUpdate) return true;
    
    const lastUpdate = new Date(this.checksums.metadata.lastUpdate);
    const age = Date.now() - lastUpdate.getTime();
    
    return age > maxAge;
  }

  /**
   * Get checksum info
   */
  getInfo() {
    return {
      repository: this.checksums.repository,
      graph: this.checksums.graph,
      symbols: this.checksums.symbols,
      fileCount: this.checksums.metadata.fileCount,
      moduleCount: Object.keys(this.checksums.modules).length,
      lastUpdate: this.checksums.metadata.lastUpdate,
      age: this.checksums.metadata.lastUpdate 
        ? Date.now() - new Date(this.checksums.metadata.lastUpdate).getTime()
        : null
    };
  }

  /**
   * Hash function
   */
  _hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Save checksums to disk
   */
  async save() {
    const path = getRecallPath(CHECKSUM_FILE);
    await fs.writeFile(path, JSON.stringify(this.checksums, null, 2), 'utf8');
  }

  /**
   * Load checksums from disk
   */
  async load() {
    const path = getRecallPath(CHECKSUM_FILE);
    
    if (!await fileExists(path)) {
      return false;
    }

    try {
      const content = await fs.readFile(path, 'utf8');
      this.checksums = JSON.parse(content);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all checksums
   */
  clear() {
    this.checksums = {
      repository: null,
      graph: null,
      symbols: null,
      files: {},
      modules: {},
      metadata: {
        version: '1.0.0',
        lastUpdate: null,
        fileCount: 0
      }
    };
  }
}

/**
 * Create checksum engine
 */
export function createChecksumEngine() {
  return new ChecksumEngine();
}
