/**
 * Graph Builder V2 - AST-Powered
 * Enhanced version using AST parsing instead of regex
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { parseFile, isSupported } from '../parsers/astParser.js';
import { createRegistry } from '../registry/symbolRegistry.js';

/**
 * Build knowledge graph using AST parsing
 */
export async function buildKnowledgeGraphV2(projectRoot, files) {
  const nodes = [];
  const edges = [];
  const fileHashes = {};
  const registry = createRegistry();

  for (const file of files) {
    if (!isSupported(file.path)) continue;

    try {
      const content = await fs.readFile(file.fullPath, 'utf8');
      const hash = crypto.createHash('md5').update(content).digest('hex');
      
      fileHashes[file.path] = hash;

      // Parse with AST
      const symbols = await parseFile(content, file.path);
      
      // Add to registry
      registry.addFile(file.path, symbols);

      // Create node
      const node = {
        id: file.path,
        file: file.path,
        type: 'module',
        hash,
        exports: symbols.exports.map(e => e.name),
        functions: symbols.functions.map(f => ({
          name: f.name,
          params: f.params,
          line: f.line,
          async: f.async
        })),
        classes: symbols.classes.map(c => ({
          name: c.name,
          methods: c.methods,
          line: c.line
        })),
        imports: symbols.imports,
        interfaces: symbols.interfaces?.map(i => i.name) || [],
        types: symbols.types?.map(t => t.name) || [],
        loc: content.split('\n').length
      };

      nodes.push(node);

      // Create edges for imports
      for (const imp of symbols.imports) {
        edges.push({
          from: file.path,
          to: imp.source,
          type: 'imports',
          items: imp.items.map(item => item.name || item.imported),
          line: imp.line
        });
      }
    } catch (error) {
      console.warn(`Failed to parse ${file.path}: ${error.message}`);
      // Skip files we can't parse
    }
  }

  // Calculate connection counts
  const connectionCounts = calculateConnections(nodes, edges);

  // Identify god nodes
  const godNodes = identifyGodNodes(nodes, connectionCounts);

  // Save registry
  await registry.save();

  return {
    nodes,
    edges,
    godNodes,
    fileHashes,
    registry,
    stats: {
      totalFiles: nodes.length,
      totalConnections: edges.length,
      avgConnections: edges.length / nodes.length || 0,
      ...registry.getStats()
    }
  };
}

/**
 * Calculate connection counts
 */
function calculateConnections(nodes, edges) {
  const counts = {};

  for (const node of nodes) {
    counts[node.id] = {
      incoming: 0,
      outgoing: 0,
      total: 0
    };
  }

  for (const edge of edges) {
    if (counts[edge.from]) {
      counts[edge.from].outgoing++;
      counts[edge.from].total++;
    }
    if (counts[edge.to]) {
      counts[edge.to].incoming++;
      counts[edge.to].total++;
    }
  }

  return counts;
}

/**
 * Identify god nodes
 */
function identifyGodNodes(nodes, connectionCounts) {
  const nodesWithCounts = nodes.map(node => ({
    ...node,
    connections: connectionCounts[node.id]?.total || 0,
    incoming: connectionCounts[node.id]?.incoming || 0,
    outgoing: connectionCounts[node.id]?.outgoing || 0
  }));

  nodesWithCounts.sort((a, b) => b.connections - a.connections);

  return nodesWithCounts.slice(0, 5).map(node => ({
    name: path.basename(node.file, path.extname(node.file)),
    file: node.file,
    connections: node.connections,
    incoming: node.incoming,
    outgoing: node.outgoing,
    exports: node.exports,
    functions: node.functions.length,
    classes: node.classes.length,
    why_critical: generateCriticalityReason(node)
  }));
}

/**
 * Generate criticality reason
 */
function generateCriticalityReason(node) {
  const reasons = [];

  if (node.incoming > 5) {
    reasons.push(`imported by ${node.incoming} files`);
  }
  if (node.outgoing > 5) {
    reasons.push(`imports ${node.outgoing} dependencies`);
  }
  if (node.exports.length > 3) {
    reasons.push(`exports ${node.exports.length} items`);
  }
  if (node.functions.length > 5) {
    reasons.push(`${node.functions.length} functions`);
  }
  if (node.classes.length > 0) {
    reasons.push(`${node.classes.length} classes`);
  }

  if (reasons.length === 0) {
    return `Central hub with ${node.connections} connections`;
  }

  return reasons.join(', ');
}

/**
 * Detect changed files (same as V1)
 */
export async function detectChangedFilesV2(previousHashes, currentFiles) {
  const changed = [];
  const added = [];
  const removed = [];
  const currentHashes = {};

  for (const file of currentFiles) {
    if (!isSupported(file.path)) continue;

    try {
      const content = await fs.readFile(file.fullPath, 'utf8');
      const hash = crypto.createHash('md5').update(content).digest('hex');
      currentHashes[file.path] = hash;

      if (!previousHashes[file.path]) {
        added.push(file.path);
      } else if (previousHashes[file.path] !== hash) {
        changed.push(file.path);
      }
    } catch (error) {
      // Skip
    }
  }

  for (const filePath in previousHashes) {
    if (!currentHashes[filePath]) {
      removed.push(filePath);
    }
  }

  return {
    changed,
    added,
    removed,
    currentHashes,
    hasChanges: changed.length > 0 || added.length > 0 || removed.length > 0
  };
}

/**
 * Build graph summary
 */
export function buildGraphSummaryV2(graph) {
  return {
    stats: graph.stats,
    godNodes: graph.godNodes.map(node => ({
      name: node.name,
      file: node.file,
      connections: node.connections,
      functions: node.functions,
      classes: node.classes,
      why_critical: node.why_critical
    })),
    topExports: getTopExports(graph.nodes),
    architecture: describeArchitecture(graph)
  };
}

/**
 * Get top exports
 */
function getTopExports(nodes) {
  const exportCounts = {};

  for (const node of nodes) {
    for (const exp of node.exports) {
      exportCounts[exp] = (exportCounts[exp] || 0) + 1;
    }
  }

  return Object.entries(exportCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, usedBy: count }));
}

/**
 * Describe architecture
 */
function describeArchitecture(graph) {
  const dirs = new Set();
  const patterns = {
    hasComponents: false,
    hasUtils: false,
    hasServices: false,
    hasControllers: false,
    hasModels: false
  };

  for (const node of graph.nodes) {
    const dir = path.dirname(node.file);
    dirs.add(dir);

    const lower = node.file.toLowerCase();
    if (lower.includes('component')) patterns.hasComponents = true;
    if (lower.includes('util')) patterns.hasUtils = true;
    if (lower.includes('service')) patterns.hasServices = true;
    if (lower.includes('controller')) patterns.hasControllers = true;
    if (lower.includes('model')) patterns.hasModels = true;
  }

  return {
    directories: Array.from(dirs).length,
    patterns: Object.entries(patterns)
      .filter(([_, value]) => value)
      .map(([key]) => key.replace('has', '').toLowerCase())
  };
}
