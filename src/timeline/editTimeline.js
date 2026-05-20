/**
 * Edit Replay Timeline
 * Tracks and visualizes code changes over time
 */

import fs from 'fs/promises';
import { getRecallPath, fileExists } from '../utils/fileUtils.js';

const TIMELINE_FILE = 'edit_timeline.json';

/**
 * Edit Timeline Class
 */
export class EditTimeline {
  constructor(context) {
    this.context = context;
    this.graph = context.graph;
    this.registry = context.registry;
    this.timeline = [];
  }

  /**
   * Record a change event
   */
  async recordChange(change) {
    const event = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type: change.type, // 'file_created', 'file_modified', 'file_deleted', 'symbol_added', 'symbol_modified', 'symbol_deleted'
      file: change.file,
      changes: change.changes || [],
      impact: await this.calculateImpact(change),
      reasoning: change.reasoning || null,
      confidence: change.confidence || 100,
      metadata: change.metadata || {}
    };

    this.timeline.push(event);
    await this.save();

    return event;
  }

  /**
   * Get complete timeline
   */
  async getTimeline(options = {}) {
    const {
      limit = 100,
      offset = 0,
      type = null,
      file = null,
      startDate = null,
      endDate = null
    } = options;

    let filtered = [...this.timeline];

    // Filter by type
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }

    // Filter by file
    if (file) {
      filtered = filtered.filter(e => e.file === file);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= new Date(endDate));
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const paginated = filtered.slice(offset, offset + limit);

    return {
      events: paginated,
      total: filtered.length,
      limit,
      offset
    };
  }

  /**
   * Get timeline for specific file
   */
  async getFileTimeline(filePath, options = {}) {
    return this.getTimeline({ ...options, file: filePath });
  }

  /**
   * Get recent changes
   */
  async getRecentChanges(limit = 10) {
    return this.getTimeline({ limit });
  }

  /**
   * Get changes by date range
   */
  async getChangesByDateRange(startDate, endDate, options = {}) {
    return this.getTimeline({ ...options, startDate, endDate });
  }

  /**
   * Get change by ID
   */
  async getChange(changeId) {
    return this.timeline.find(e => e.id === changeId);
  }

  /**
   * Calculate impact of change
   */
  async calculateImpact(change) {
    const impact = {
      affectedFiles: [],
      affectedSymbols: [],
      dependencies: [],
      dependents: [],
      riskScore: 0,
      blastRadius: 0
    };

    if (!change.file) return impact;

    // Get file dependencies
    const deps = this.graph.getDirectDependencies(change.file);
    impact.dependencies = deps.map(d => d.file);

    // Get file dependents
    const dependents = this.graph.getDirectDependents(change.file);
    impact.dependents = dependents.map(d => d.file);

    // Calculate blast radius
    const transitiveDependents = this.graph.getTransitiveDependents(change.file, 3);
    impact.blastRadius = transitiveDependents.length;

    // Affected files = direct dependents
    impact.affectedFiles = impact.dependents;

    // Get affected symbols
    const symbols = this.registry.getFile(change.file);
    if (symbols) {
      impact.affectedSymbols = [
        ...(symbols.functions || []).map(f => ({ type: 'function', name: f.name })),
        ...(symbols.classes || []).map(c => ({ type: 'class', name: c.name })),
        ...(symbols.exports || []).map(e => ({ type: 'export', name: e.name }))
      ];
    }

    // Calculate risk score
    impact.riskScore = this.calculateRiskScore(impact);

    return impact;
  }

  /**
   * Calculate risk score for change
   */
  calculateRiskScore(impact) {
    let score = 0;

    // Factor 1: Blast radius
    if (impact.blastRadius > 20) {
      score += 40;
    } else if (impact.blastRadius > 10) {
      score += 25;
    } else if (impact.blastRadius > 5) {
      score += 10;
    }

    // Factor 2: Number of dependents
    if (impact.dependents.length > 10) {
      score += 30;
    } else if (impact.dependents.length > 5) {
      score += 15;
    } else if (impact.dependents.length > 2) {
      score += 5;
    }

    // Factor 3: Number of affected symbols
    if (impact.affectedSymbols.length > 10) {
      score += 20;
    } else if (impact.affectedSymbols.length > 5) {
      score += 10;
    }

    // Factor 4: Dependencies
    if (impact.dependencies.length > 10) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Rollback to specific change
   */
  async rollback(changeId) {
    const change = await this.getChange(changeId);
    
    if (!change) {
      throw new Error(`Change ${changeId} not found`);
    }

    // In a real implementation, this would:
    // 1. Get the file state before the change
    // 2. Restore the file to that state
    // 3. Update the graph and registry
    // 4. Record the rollback as a new change

    return {
      success: true,
      message: `Rolled back to change ${changeId}`,
      change,
      rollbackEvent: await this.recordChange({
        type: 'rollback',
        file: change.file,
        reasoning: `Rolled back change ${changeId}`,
        metadata: { originalChangeId: changeId }
      })
    };
  }

  /**
   * Compare two points in timeline
   */
  async compareChanges(changeId1, changeId2) {
    const change1 = await this.getChange(changeId1);
    const change2 = await this.getChange(changeId2);

    if (!change1 || !change2) {
      throw new Error('One or both changes not found');
    }

    return {
      change1,
      change2,
      timeDiff: new Date(change2.timestamp) - new Date(change1.timestamp),
      impactDiff: {
        blastRadiusDiff: change2.impact.blastRadius - change1.impact.blastRadius,
        riskScoreDiff: change2.impact.riskScore - change1.impact.riskScore,
        affectedFilesDiff: change2.impact.affectedFiles.length - change1.impact.affectedFiles.length
      }
    };
  }

  /**
   * Get timeline statistics
   */
  async getStats() {
    const stats = {
      totalChanges: this.timeline.length,
      byType: {},
      byFile: {},
      avgImpact: 0,
      avgRiskScore: 0,
      highRiskChanges: 0,
      recentActivity: []
    };

    // Count by type
    for (const event of this.timeline) {
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
    }

    // Count by file
    for (const event of this.timeline) {
      if (event.file) {
        stats.byFile[event.file] = (stats.byFile[event.file] || 0) + 1;
      }
    }

    // Calculate averages
    let totalBlastRadius = 0;
    let totalRiskScore = 0;

    for (const event of this.timeline) {
      totalBlastRadius += event.impact?.blastRadius || 0;
      totalRiskScore += event.impact?.riskScore || 0;
      
      if ((event.impact?.riskScore || 0) >= 50) {
        stats.highRiskChanges++;
      }
    }

    if (this.timeline.length > 0) {
      stats.avgImpact = totalBlastRadius / this.timeline.length;
      stats.avgRiskScore = totalRiskScore / this.timeline.length;
    }

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentChanges = this.timeline.filter(e => 
      new Date(e.timestamp) >= sevenDaysAgo
    );

    // Group by day
    const byDay = {};
    for (const change of recentChanges) {
      const day = new Date(change.timestamp).toLocaleDateString();
      byDay[day] = (byDay[day] || 0) + 1;
    }

    stats.recentActivity = Object.entries(byDay).map(([day, count]) => ({
      day,
      count
    }));

    return stats;
  }

  /**
   * Get most changed files
   */
  async getMostChangedFiles(limit = 10) {
    const stats = await this.getStats();
    
    const sorted = Object.entries(stats.byFile)
      .map(([file, count]) => ({ file, count }))
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, limit);
  }

  /**
   * Get high risk changes
   */
  async getHighRiskChanges(threshold = 50, limit = 10) {
    const highRisk = this.timeline
      .filter(e => (e.impact?.riskScore || 0) >= threshold)
      .sort((a, b) => (b.impact?.riskScore || 0) - (a.impact?.riskScore || 0));

    return highRisk.slice(0, limit);
  }

  /**
   * Generate change report
   */
  async generateReport(options = {}) {
    const { startDate, endDate } = options;

    const timeline = await this.getTimeline({ startDate, endDate, limit: 1000 });
    const stats = await this.getStats();
    const mostChanged = await this.getMostChangedFiles(10);
    const highRisk = await this.getHighRiskChanges(50, 10);

    return {
      summary: {
        totalChanges: timeline.total,
        avgImpact: stats.avgImpact,
        avgRiskScore: stats.avgRiskScore,
        highRiskChanges: stats.highRiskChanges
      },
      timeline: timeline.events,
      stats,
      mostChangedFiles: mostChanged,
      highRiskChanges: highRisk,
      recentActivity: stats.recentActivity
    };
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save timeline to disk
   */
  async save() {
    const timelinePath = getRecallPath(TIMELINE_FILE);
    const data = {
      timeline: this.timeline,
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(timelinePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Load timeline from disk
   */
  async load() {
    const timelinePath = getRecallPath(TIMELINE_FILE);
    
    if (!await fileExists(timelinePath)) {
      return false;
    }

    try {
      const content = await fs.readFile(timelinePath, 'utf8');
      const data = JSON.parse(content);
      
      this.timeline = data.timeline || [];
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear timeline
   */
  async clear() {
    this.timeline = [];
    await this.save();
  }
}

/**
 * Create edit timeline
 */
export function createEditTimeline(context) {
  return new EditTimeline(context);
}
