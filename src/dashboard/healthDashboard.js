import { TrustMeter } from '../trust/trustMeter.js';

/**
 * Repository Health Dashboard
 * Visualizes repository health metrics and issues
 */

/**
 * Repository Health Dashboard Class
 */
export class HealthDashboard {
  constructor(context) {
    this.context = context;
    this.graph = context.graph;
    this.registry = context.registry;
    this.checksums = context.checksums;
  }

  /**
   * Generate complete health report
   */
  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: await this.getOverallHealth(),
      godFiles: await this.identifyGodFiles(),
      circularDependencies: await this.findCircularDependencies(),
      architectureDrift: await this.detectArchitectureDrift(),
      bottlenecks: await this.identifyBottlenecks(),
      unstableModules: await this.findUnstableModules(),
      orphanedFiles: await this.findOrphanedFiles(),
      complexityHotspots: await this.identifyComplexityHotspots(),
      historyGrounding: await this.getHistoryGroundingMetrics(),
      recommendations: []
    };

    // Generate recommendations based on findings
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  /**
   * Get history grounding metrics from TrustMeter
   */
  async getHistoryGroundingMetrics() {
    try {
      const trustMeter = new TrustMeter(this.context);
      return await trustMeter.getHistoryCitationMetrics();
    } catch {
      return { checkedClaims: 0, citedClaims: 0, uncitedClaims: 0, citationRate: 100, flagged: [] };
    }
  }

  /**
   * Get overall repository health score (0-100)
   */
  async getOverallHealth() {
    let score = 100;
    const issues = [];

    // Deduct for god files
    const godFiles = await this.identifyGodFiles();
    if (godFiles.length > 0) {
      const deduction = Math.min(20, godFiles.length * 5);
      score -= deduction;
      issues.push(`${godFiles.length} god files found (-${deduction})`);
    }

    // Deduct for circular dependencies
    const cycles = await this.findCircularDependencies();
    if (cycles.length > 0) {
      const deduction = Math.min(25, cycles.length * 10);
      score -= deduction;
      issues.push(`${cycles.length} circular dependencies (-${deduction})`);
    }

    // Deduct for bottlenecks
    const bottlenecks = await this.identifyBottlenecks();
    if (bottlenecks.length > 3) {
      const deduction = Math.min(15, (bottlenecks.length - 3) * 3);
      score -= deduction;
      issues.push(`${bottlenecks.length} bottlenecks (-${deduction})`);
    }

    // Deduct for unstable modules
    const unstable = await this.findUnstableModules();
    if (unstable.length > 5) {
      const deduction = Math.min(15, (unstable.length - 5) * 2);
      score -= deduction;
      issues.push(`${unstable.length} unstable modules (-${deduction})`);
    }

    // Deduct for orphaned files
    const orphaned = await this.findOrphanedFiles();
    if (orphaned.length > 0) {
      const deduction = Math.min(10, orphaned.length * 2);
      score -= deduction;
      issues.push(`${orphaned.length} orphaned files (-${deduction})`);
    }

    return {
      score: Math.max(0, score),
      grade: this.getHealthGrade(score),
      issues,
      status: this.getHealthStatus(score)
    };
  }

  /**
   * Identify god files (highly connected files)
   */
  async identifyGodFiles(threshold = 10) {
    const godFiles = [];

    for (const node of this.graph.getAllNodes()) {
      const metrics = this.graph.getNodeMetrics(node.id);
      
      if (metrics && metrics.totalConnections >= threshold) {
        const symbols = this.registry.getFile(node.id);
        
        godFiles.push({
          file: node.id,
          connections: metrics.totalConnections,
          fanIn: metrics.fanIn,
          fanOut: metrics.fanOut,
          dependents: metrics.directDependents,
          dependencies: metrics.directDependencies,
          functions: symbols?.functions?.length || 0,
          classes: symbols?.classes?.length || 0,
          severity: this.getGodFileSeverity(metrics.totalConnections)
        });
      }
    }

    // Sort by connections (most connected first)
    godFiles.sort((a, b) => b.connections - a.connections);

    return godFiles;
  }

  /**
   * Find circular dependencies
   */
  async findCircularDependencies() {
    const cycles = this.graph.detectCircularDependencies();
    
    return cycles.map((cycle, index) => ({
      id: index + 1,
      files: cycle,
      length: cycle.length,
      severity: this.getCycleSeverity(cycle.length)
    }));
  }

  /**
   * Detect architecture drift
   */
  async detectArchitectureDrift() {
    const drift = {
      layerViolations: [],
      wrongDirectoryFiles: [],
      namingInconsistencies: [],
      score: 100
    };

    // Define expected architecture layers
    const layers = {
      'src/api': { canImportFrom: ['src/services', 'src/utils', 'src/models'] },
      'src/services': { canImportFrom: ['src/models', 'src/utils', 'src/db'] },
      'src/models': { canImportFrom: ['src/utils'] },
      'src/utils': { canImportFrom: [] }
    };

    // Check for layer violations
    for (const node of this.graph.getAllNodes()) {
      const fileLayer = this.getFileLayer(node.id);
      if (!fileLayer) continue;

      const allowedLayers = layers[fileLayer]?.canImportFrom || [];
      const deps = this.graph.getDirectDependencies(node.id);

      for (const dep of deps) {
        const depLayer = this.getFileLayer(dep.file);
        if (!depLayer) continue;

        // Check if this import violates layer rules
        if (!allowedLayers.some(allowed => dep.file.startsWith(allowed))) {
          drift.layerViolations.push({
            file: node.id,
            imports: dep.file,
            violation: `${fileLayer} should not import from ${depLayer}`
          });
          drift.score -= 5;
        }
      }
    }

    // Check for files in wrong directories
    for (const node of this.graph.getAllNodes()) {
      const symbols = this.registry.getFile(node.id);
      if (!symbols) continue;

      // Controllers should be in controllers/
      if (symbols.classes?.some(c => c.name.endsWith('Controller')) && 
          !node.id.includes('controller')) {
        drift.wrongDirectoryFiles.push({
          file: node.id,
          issue: 'Controller not in controllers directory'
        });
        drift.score -= 3;
      }

      // Services should be in services/
      if (symbols.classes?.some(c => c.name.endsWith('Service')) && 
          !node.id.includes('service')) {
        drift.wrongDirectoryFiles.push({
          file: node.id,
          issue: 'Service not in services directory'
        });
        drift.score -= 3;
      }

      // Models should be in models/
      if (symbols.classes?.some(c => c.name.match(/^[A-Z][a-z]+$/)) && 
          !node.id.includes('model') && !node.id.includes('entity')) {
        // Potential model in wrong place
      }
    }

    drift.score = Math.max(0, drift.score);
    drift.severity = drift.score < 70 ? 'high' : drift.score < 85 ? 'medium' : 'low';

    return drift;
  }

  /**
   * Identify bottlenecks (high fan-in)
   */
  async identifyBottlenecks(threshold = 5) {
    const bottlenecks = [];

    for (const node of this.graph.getAllNodes()) {
      const metrics = this.graph.getNodeMetrics(node.id);
      
      if (metrics && metrics.fanIn >= threshold) {
        const dependents = this.graph.getDirectDependents(node.id);
        
        bottlenecks.push({
          file: node.id,
          fanIn: metrics.fanIn,
          dependents: dependents.map(d => d.file),
          severity: this.getBottleneckSeverity(metrics.fanIn)
        });
      }
    }

    // Sort by fan-in (highest first)
    bottlenecks.sort((a, b) => b.fanIn - a.fanIn);

    return bottlenecks;
  }

  /**
   * Find unstable modules (high instability)
   */
  async findUnstableModules(threshold = 0.7) {
    const unstable = [];

    for (const node of this.graph.getAllNodes()) {
      const metrics = this.graph.getNodeMetrics(node.id);
      
      if (metrics && metrics.instability >= threshold) {
        unstable.push({
          file: node.id,
          instability: metrics.instability,
          fanIn: metrics.fanIn,
          fanOut: metrics.fanOut,
          severity: this.getInstabilitySeverity(metrics.instability)
        });
      }
    }

    // Sort by instability (highest first)
    unstable.sort((a, b) => b.instability - a.instability);

    return unstable;
  }

  /**
   * Find orphaned files (no connections)
   */
  async findOrphanedFiles() {
    const orphaned = [];

    for (const node of this.graph.getAllNodes()) {
      const metrics = this.graph.getNodeMetrics(node.id);
      
      if (metrics && metrics.totalConnections === 0) {
        orphaned.push({
          file: node.id,
          reason: 'No imports or exports'
        });
      }
    }

    return orphaned;
  }

  /**
   * Identify complexity hotspots
   */
  async identifyComplexityHotspots() {
    const hotspots = [];

    for (const node of this.graph.getAllNodes()) {
      const symbols = this.registry.getFile(node.id);
      if (!symbols) continue;

      const metrics = this.graph.getNodeMetrics(node.id);
      
      // Calculate complexity score
      const functionCount = symbols.functions?.length || 0;
      const classCount = symbols.classes?.length || 0;
      const connections = metrics?.totalConnections || 0;
      
      const complexityScore = functionCount + (classCount * 2) + (connections * 0.5);

      if (complexityScore > 20) {
        hotspots.push({
          file: node.id,
          score: complexityScore,
          functions: functionCount,
          classes: classCount,
          connections,
          severity: this.getComplexitySeverity(complexityScore)
        });
      }
    }

    // Sort by complexity score
    hotspots.sort((a, b) => b.score - a.score);

    return hotspots;
  }

  /**
   * Generate recommendations based on findings
   */
  generateRecommendations(report) {
    const recommendations = [];

    // God files
    if (report.godFiles.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'god-files',
        message: `Split ${report.godFiles.length} god files into smaller modules`,
        files: report.godFiles.slice(0, 3).map(f => f.file)
      });
    }

    // Circular dependencies
    if (report.circularDependencies.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'circular-deps',
        message: `Break ${report.circularDependencies.length} circular dependencies`,
        cycles: report.circularDependencies.slice(0, 2)
      });
    }

    // Architecture drift
    if (report.architectureDrift.score < 80) {
      recommendations.push({
        priority: 'medium',
        category: 'architecture',
        message: 'Fix architecture layer violations',
        violations: report.architectureDrift.layerViolations.length
      });
    }

    // Bottlenecks
    if (report.bottlenecks.length > 5) {
      recommendations.push({
        priority: 'medium',
        category: 'bottlenecks',
        message: `Reduce dependencies on ${report.bottlenecks.length} bottleneck files`,
        files: report.bottlenecks.slice(0, 3).map(b => b.file)
      });
    }

    // Unstable modules
    if (report.unstableModules.length > 10) {
      recommendations.push({
        priority: 'low',
        category: 'stability',
        message: `Stabilize ${report.unstableModules.length} unstable modules`,
        files: report.unstableModules.slice(0, 3).map(u => u.file)
      });
    }

    // Orphaned files
    if (report.orphanedFiles.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'cleanup',
        message: `Remove or integrate ${report.orphanedFiles.length} orphaned files`,
        files: report.orphanedFiles.slice(0, 5).map(o => o.file)
      });
    }

    // Complexity hotspots
    if (report.complexityHotspots.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'complexity',
        message: `Refactor ${report.complexityHotspots.length} complexity hotspots`,
        files: report.complexityHotspots.slice(0, 3).map(h => h.file)
      });
    }

    return recommendations;
  }

  /**
   * Get file layer from path
   */
  getFileLayer(filePath) {
    if (filePath.startsWith('src/api')) return 'src/api';
    if (filePath.startsWith('src/services')) return 'src/services';
    if (filePath.startsWith('src/models')) return 'src/models';
    if (filePath.startsWith('src/utils')) return 'src/utils';
    if (filePath.startsWith('src/db')) return 'src/db';
    return null;
  }

  /**
   * Get health grade from score
   */
  getHealthGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get health status from score
   */
  getHealthStatus(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Get god file severity
   */
  getGodFileSeverity(connections) {
    if (connections >= 20) return 'critical';
    if (connections >= 15) return 'high';
    if (connections >= 10) return 'medium';
    return 'low';
  }

  /**
   * Get cycle severity
   */
  getCycleSeverity(length) {
    if (length >= 5) return 'critical';
    if (length >= 3) return 'high';
    return 'medium';
  }

  /**
   * Get bottleneck severity
   */
  getBottleneckSeverity(fanIn) {
    if (fanIn >= 10) return 'critical';
    if (fanIn >= 7) return 'high';
    if (fanIn >= 5) return 'medium';
    return 'low';
  }

  /**
   * Get instability severity
   */
  getInstabilitySeverity(instability) {
    if (instability >= 0.9) return 'critical';
    if (instability >= 0.8) return 'high';
    if (instability >= 0.7) return 'medium';
    return 'low';
  }

  /**
   * Get complexity severity
   */
  getComplexitySeverity(score) {
    if (score >= 50) return 'critical';
    if (score >= 35) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }
}

/**
 * Create health dashboard
 */
export function createHealthDashboard(context) {
  return new HealthDashboard(context);
}

