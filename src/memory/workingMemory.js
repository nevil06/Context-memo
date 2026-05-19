/**
 * Working Memory Manager
 * Manages hot/warm/cold context for optimal context window usage
 */

import fs from 'fs/promises';
import { getRecallPath, fileExists } from '../utils/fileUtils.js';

const WORKING_MEMORY_FILE = 'working_memory.json';

/**
 * Working Memory Class
 */
export class WorkingMemory {
  constructor() {
    this.hot = new Set();      // Recently edited files
    this.warm = new Set();     // Dependencies of hot files
    this.cold = new Set();     // Everything else
    this.metadata = {
      lastAccess: {},          // File -> timestamp
      editCount: {},           // File -> edit count
      priority: {}             // File -> priority score
    };
  }

  /**
   * Mark file as hot (recently edited)
   */
  markHot(filePath) {
    this.hot.add(filePath);
    this.warm.delete(filePath);
    this.cold.delete(filePath);
    
    this.metadata.lastAccess[filePath] = Date.now();
    this.metadata.editCount[filePath] = (this.metadata.editCount[filePath] || 0) + 1;
    this._updatePriority(filePath);
  }

  /**
   * Mark file as warm (dependency of hot file)
   */
  markWarm(filePath) {
    if (this.hot.has(filePath)) return; // Already hot
    
    this.warm.add(filePath);
    this.cold.delete(filePath);
    
    this.metadata.lastAccess[filePath] = Date.now();
    this._updatePriority(filePath);
  }

  /**
   * Mark file as cold (inactive)
   */
  markCold(filePath) {
    if (this.hot.has(filePath) || this.warm.has(filePath)) return;
    
    this.cold.add(filePath);
  }

  /**
   * Get hot files
   */
  getHot() {
    return Array.from(this.hot);
  }

  /**
   * Get warm files
   */
  getWarm() {
    return Array.from(this.warm);
  }

  /**
   * Get cold files
   */
  getCold() {
    return Array.from(this.cold);
  }

  /**
   * Get all active files (hot + warm)
   */
  getActive() {
    return [...this.hot, ...this.warm];
  }

  /**
   * Get file temperature
   */
  getTemperature(filePath) {
    if (this.hot.has(filePath)) return 'hot';
    if (this.warm.has(filePath)) return 'warm';
    if (this.cold.has(filePath)) return 'cold';
    return 'unknown';
  }

  /**
   * Get priority score for file
   */
  getPriority(filePath) {
    return this.metadata.priority[filePath] || 0;
  }

  /**
   * Cool down hot files (move to warm after time)
   */
  coolDown(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    const toCool = [];
    
    for (const filePath of this.hot) {
      const lastAccess = this.metadata.lastAccess[filePath] || 0;
      if (now - lastAccess > maxAge) {
        toCool.push(filePath);
      }
    }
    
    for (const filePath of toCool) {
      this.hot.delete(filePath);
      this.warm.add(filePath);
    }
    
    return toCool.length;
  }

  /**
   * Freeze warm files (move to cold after time)
   */
  freeze(maxAge = 7200000) { // 2 hours default
    const now = Date.now();
    const toFreeze = [];
    
    for (const filePath of this.warm) {
      const lastAccess = this.metadata.lastAccess[filePath] || 0;
      if (now - lastAccess > maxAge) {
        toFreeze.push(filePath);
      }
    }
    
    for (const filePath of toFreeze) {
      this.warm.delete(filePath);
      this.cold.add(filePath);
    }
    
    return toFreeze.length;
  }

  /**
   * Update priority score
   */
  _updatePriority(filePath) {
    const editCount = this.metadata.editCount[filePath] || 0;
    const lastAccess = this.metadata.lastAccess[filePath] || 0;
    const recency = Date.now() - lastAccess;
    
    // Priority = edit frequency + recency bonus
    const priority = editCount * 10 + Math.max(0, 100 - recency / 60000);
    this.metadata.priority[filePath] = priority;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      hot: this.hot.size,
      warm: this.warm.size,
      cold: this.cold.size,
      total: this.hot.size + this.warm.size + this.cold.size,
      mostEdited: this._getMostEdited(5),
      recentlyAccessed: this._getRecentlyAccessed(5)
    };
  }

  /**
   * Get most edited files
   */
  _getMostEdited(limit = 5) {
    return Object.entries(this.metadata.editCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([file, count]) => ({ file, count }));
  }

  /**
   * Get recently accessed files
   */
  _getRecentlyAccessed(limit = 5) {
    return Object.entries(this.metadata.lastAccess)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([file, timestamp]) => ({ 
        file, 
        timestamp,
        age: Date.now() - timestamp
      }));
  }

  /**
   * Save to disk
   */
  async save() {
    const data = {
      hot: Array.from(this.hot),
      warm: Array.from(this.warm),
      cold: Array.from(this.cold),
      metadata: this.metadata,
      timestamp: Date.now()
    };
    
    const path = getRecallPath(WORKING_MEMORY_FILE);
    await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Load from disk
   */
  async load() {
    const path = getRecallPath(WORKING_MEMORY_FILE);
    
    if (!await fileExists(path)) {
      return false;
    }

    try {
      const content = await fs.readFile(path, 'utf8');
      const data = JSON.parse(content);
      
      this.hot = new Set(data.hot || []);
      this.warm = new Set(data.warm || []);
      this.cold = new Set(data.cold || []);
      this.metadata = data.metadata || { lastAccess: {}, editCount: {}, priority: {} };
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all memory
   */
  clear() {
    this.hot.clear();
    this.warm.clear();
    this.cold.clear();
    this.metadata = { lastAccess: {}, editCount: {}, priority: {} };
  }
}

/**
 * Create working memory instance
 */
export function createWorkingMemory() {
  return new WorkingMemory();
}

/**
 * Update working memory based on graph
 */
export function updateWorkingMemoryFromGraph(workingMemory, graph, changedFiles) {
  // Mark changed files as hot
  for (const file of changedFiles) {
    workingMemory.markHot(file);
  }

  // Mark dependencies as warm
  for (const file of changedFiles) {
    const deps = graph.getDirectDependencies(file);
    for (const dep of deps) {
      workingMemory.markWarm(dep.file);
    }
    
    const dependents = graph.getDirectDependents(file);
    for (const dependent of dependents) {
      workingMemory.markWarm(dependent.file);
    }
  }

  // Mark all other files as cold
  for (const node of graph.getAllNodes()) {
    if (!workingMemory.hot.has(node.id) && !workingMemory.warm.has(node.id)) {
      workingMemory.markCold(node.id);
    }
  }
}
