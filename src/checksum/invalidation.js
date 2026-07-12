import fsSync from 'fs';
import path from 'path';

/**
 * Cache Invalidation
 * Smart invalidation based on checksums
 */

function loadHistoryQueryCache() {
  const cachePath = path.join(process.cwd(), '.recall', 'history_query_cache.json');
  try {
    const content = fsSync.readFileSync(cachePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

/**
 * Invalidation Strategy
 */
export class InvalidationStrategy {
  constructor(checksumEngine) {
    this.checksumEngine = checksumEngine;
    this.invalidated = new Set();
  }

  /**
   * Check what needs invalidation
   */
  checkInvalidation(newGraph, newRegistry, newFileHashes) {
    const toInvalidate = {
      repository: false,
      graph: false,
      symbols: false,
      files: [],
      modules: [],
      workingMemory: false,
      summaries: false,
      historyStale: {},
      historyStaleFiles: []
    };

    // Check repository-level changes
    if (this.checksumEngine.hasRepositoryChanged(newFileHashes)) {
      toInvalidate.repository = true;
    }

    // Check graph changes
    if (this.checksumEngine.hasGraphChanged(newGraph)) {
      toInvalidate.graph = true;
      toInvalidate.workingMemory = true; // Graph changes affect working memory
    }

    // Check symbol changes
    if (this.checksumEngine.hasSymbolsChanged(newRegistry)) {
      toInvalidate.symbols = true;
    }

    // Check file-level changes
    const fileChanges = this.checksumEngine.getChangedFiles(newFileHashes);
    toInvalidate.files = [
      ...fileChanges.changed,
      ...fileChanges.added,
      ...fileChanges.removed
    ];

    // Check module-level changes
    toInvalidate.modules = this.checksumEngine.getChangedModules(newFileHashes);

    // If files changed, invalidate summaries
    if (toInvalidate.files.length > 0) {
      toInvalidate.summaries = true;
    }

    // Check history staleness
    const historyQueryCache = loadHistoryQueryCache();
    for (const filePath of Object.keys(newFileHashes)) {
      const lastHash = historyQueryCache[filePath];
      const currentHash = newFileHashes[filePath];
      const isStale = lastHash !== currentHash;
      toInvalidate.historyStale[filePath] = isStale;
      if (isStale) {
        toInvalidate.historyStaleFiles.push(filePath);
      }
    }

    return toInvalidate;
  }

  /**
   * Execute invalidation
   */
  async executeInvalidation(toInvalidate, caches) {
    const invalidated = [];

    if (toInvalidate.repository) {
      await this._invalidateRepository(caches);
      invalidated.push('repository');
    }

    if (toInvalidate.graph) {
      await this._invalidateGraph(caches);
      invalidated.push('graph');
    }

    if (toInvalidate.symbols) {
      await this._invalidateSymbols(caches);
      invalidated.push('symbols');
    }

    if (toInvalidate.files.length > 0) {
      await this._invalidateFiles(toInvalidate.files, caches);
      invalidated.push(`${toInvalidate.files.length} files`);
    }

    if (toInvalidate.modules.length > 0) {
      await this._invalidateModules(toInvalidate.modules, caches);
      invalidated.push(`${toInvalidate.modules.length} modules`);
    }

    if (toInvalidate.workingMemory) {
      await this._invalidateWorkingMemory(caches);
      invalidated.push('working memory');
    }

    if (toInvalidate.summaries) {
      await this._invalidateSummaries(caches);
      invalidated.push('summaries');
    }

    return invalidated;
  }

  /**
   * Invalidate repository cache
   */
  async _invalidateRepository(caches) {
    if (caches.repository) {
      caches.repository.clear();
    }
  }

  /**
   * Invalidate graph cache
   */
  async _invalidateGraph(caches) {
    if (caches.graph) {
      caches.graph.clear();
    }
  }

  /**
   * Invalidate symbol cache
   */
  async _invalidateSymbols(caches) {
    if (caches.symbols) {
      caches.symbols.clear();
    }
  }

  /**
   * Invalidate file caches
   */
  async _invalidateFiles(files, caches) {
    if (caches.files) {
      for (const file of files) {
        caches.files.delete(file);
      }
    }
  }

  /**
   * Invalidate module caches
   */
  async _invalidateModules(modules, caches) {
    if (caches.modules) {
      for (const module of modules) {
        caches.modules.delete(module);
      }
    }
  }

  /**
   * Invalidate working memory
   */
  async _invalidateWorkingMemory(caches) {
    if (caches.workingMemory) {
      // Don't clear completely, just mark as stale
      caches.workingMemory.stale = true;
    }
  }

  /**
   * Invalidate summaries
   */
  async _invalidateSummaries(caches) {
    if (caches.summaries) {
      caches.summaries.clear();
    }
  }

  /**
   * Get invalidation report
   */
  getReport(toInvalidate) {
    const report = {
      needsInvalidation: false,
      items: []
    };

    if (toInvalidate.repository) {
      report.needsInvalidation = true;
      report.items.push('Repository-wide changes detected');
    }

    if (toInvalidate.graph) {
      report.needsInvalidation = true;
      report.items.push('Graph structure changed');
    }

    if (toInvalidate.symbols) {
      report.needsInvalidation = true;
      report.items.push('Symbol registry changed');
    }

    if (toInvalidate.files.length > 0) {
      report.needsInvalidation = true;
      report.items.push(`${toInvalidate.files.length} files changed`);
    }

    if (toInvalidate.modules.length > 0) {
      report.needsInvalidation = true;
      report.items.push(`${toInvalidate.modules.length} modules changed`);
    }

    return report;
  }
}

/**
 * Create invalidation strategy
 */
export function createInvalidationStrategy(checksumEngine) {
  return new InvalidationStrategy(checksumEngine);
}

/**
 * Smart cache manager
 */
export class CacheManager {
  constructor() {
    this.caches = {
      repository: new Map(),
      graph: new Map(),
      symbols: new Map(),
      files: new Map(),
      modules: new Map(),
      summaries: new Map(),
      workingMemory: null
    };
  }

  /**
   * Get cache
   */
  getCache(type) {
    return this.caches[type];
  }

  /**
   * Set cache
   */
  setCache(type, cache) {
    this.caches[type] = cache;
  }

  /**
   * Clear all caches
   */
  clearAll() {
    for (const cache of Object.values(this.caches)) {
      if (cache && typeof cache.clear === 'function') {
        cache.clear();
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    const stats = {};
    
    for (const [type, cache] of Object.entries(this.caches)) {
      if (cache instanceof Map) {
        stats[type] = cache.size;
      } else if (cache) {
        stats[type] = 'active';
      } else {
        stats[type] = 'empty';
      }
    }
    
    return stats;
  }
}

/**
 * Create cache manager
 */
export function createCacheManager() {
  return new CacheManager();
}
