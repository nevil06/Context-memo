import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const CODE_EXTS = new Set(['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']);

/**
 * Build a knowledge graph from project files
 * Extracts imports, exports, functions, classes, and dependencies
 */
export async function buildKnowledgeGraph(projectRoot, files) {
  const nodes = [];
  const edges = [];
  const fileHashes = {};

  for (const file of files) {
    if (!CODE_EXTS.has(path.extname(file.path))) continue;

    try {
      const content = await fs.readFile(file.fullPath, 'utf8');
      const hash = crypto.createHash('md5').update(content).digest('hex');
      
      fileHashes[file.path] = hash;

      const analysis = analyzeFile(content, file.path);
      
      // Create node
      const node = {
        id: file.path,
        file: file.path,
        type: 'module',
        hash,
        exports: analysis.exports,
        functions: analysis.functions,
        classes: analysis.classes,
        imports: analysis.imports,
        loc: content.split('\n').length
      };

      nodes.push(node);

      // Create edges for imports
      for (const imp of analysis.imports) {
        edges.push({
          from: file.path,
          to: imp.source,
          type: 'imports',
          items: imp.items
        });
      }
    } catch (error) {
      // Skip files we can't read
    }
  }

  // Calculate connection counts
  const connectionCounts = calculateConnections(nodes, edges);

  // Identify god nodes (top 5 most connected)
  const godNodes = identifyGodNodes(nodes, connectionCounts);

  return {
    nodes,
    edges,
    godNodes,
    fileHashes,
    stats: {
      totalFiles: nodes.length,
      totalConnections: edges.length,
      avgConnections: edges.length / nodes.length || 0
    }
  };
}

/**
 * Analyze a single file to extract code structure
 */
function analyzeFile(content, filePath) {
  const analysis = {
    imports: [],
    exports: [],
    functions: [],
    classes: []
  };

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Extract imports
    if (trimmed.startsWith('import ')) {
      const importMatch = trimmed.match(/import\s+(?:{([^}]+)}|(\w+)|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        const items = importMatch[1] 
          ? importMatch[1].split(',').map(s => s.trim())
          : [importMatch[2] || importMatch[3]];
        
        analysis.imports.push({
          source: resolveImportPath(importMatch[4], filePath),
          items: items.filter(Boolean)
        });
      }
    }

    // Extract require (CommonJS)
    if (trimmed.includes('require(')) {
      const requireMatch = trimmed.match(/require\(['"]([^'"]+)['"]\)/);
      if (requireMatch) {
        analysis.imports.push({
          source: resolveImportPath(requireMatch[1], filePath),
          items: ['default']
        });
      }
    }

    // Extract exports
    if (trimmed.startsWith('export ')) {
      if (trimmed.includes('function ')) {
        const funcMatch = trimmed.match(/export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/);
        if (funcMatch) {
          analysis.exports.push(funcMatch[1]);
          analysis.functions.push(funcMatch[1]);
        }
      } else if (trimmed.includes('class ')) {
        const classMatch = trimmed.match(/export\s+(?:default\s+)?class\s+(\w+)/);
        if (classMatch) {
          analysis.exports.push(classMatch[1]);
          analysis.classes.push(classMatch[1]);
        }
      } else if (trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('var ')) {
        const varMatch = trimmed.match(/export\s+(?:const|let|var)\s+(\w+)/);
        if (varMatch) {
          analysis.exports.push(varMatch[1]);
        }
      }
    }

    // Extract function declarations (non-exported)
    if (!trimmed.startsWith('export') && trimmed.includes('function ')) {
      const funcMatch = trimmed.match(/(?:async\s+)?function\s+(\w+)/);
      if (funcMatch && !analysis.functions.includes(funcMatch[1])) {
        analysis.functions.push(funcMatch[1]);
      }
    }

    // Extract arrow functions
    if (trimmed.includes('=>')) {
      const arrowMatch = trimmed.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
      if (arrowMatch && !analysis.functions.includes(arrowMatch[1])) {
        analysis.functions.push(arrowMatch[1]);
      }
    }

    // Extract class declarations (non-exported)
    if (!trimmed.startsWith('export') && trimmed.includes('class ')) {
      const classMatch = trimmed.match(/class\s+(\w+)/);
      if (classMatch && !analysis.classes.includes(classMatch[1])) {
        analysis.classes.push(classMatch[1]);
      }
    }
  }

  return analysis;
}

/**
 * Resolve import path relative to project
 */
function resolveImportPath(importPath, currentFile) {
  // Skip node_modules and external packages
  if (!importPath.startsWith('.')) {
    return importPath; // External package
  }

  // Resolve relative path
  const currentDir = path.dirname(currentFile);
  let resolved = path.join(currentDir, importPath);

  // Normalize path separators
  resolved = resolved.replace(/\\/g, '/');

  // Add extension if missing
  if (!path.extname(resolved)) {
    // Try common extensions
    for (const ext of ['.js', '.ts', '.jsx', '.tsx', '.mjs']) {
      return resolved + ext;
    }
  }

  return resolved;
}

/**
 * Calculate connection counts for each node
 */
function calculateConnections(nodes, edges) {
  const counts = {};

  // Initialize counts
  for (const node of nodes) {
    counts[node.id] = {
      incoming: 0,
      outgoing: 0,
      total: 0
    };
  }

  // Count edges
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
 * Identify god nodes (most connected files)
 */
function identifyGodNodes(nodes, connectionCounts) {
  const nodesWithCounts = nodes.map(node => ({
    ...node,
    connections: connectionCounts[node.id]?.total || 0,
    incoming: connectionCounts[node.id]?.incoming || 0,
    outgoing: connectionCounts[node.id]?.outgoing || 0
  }));

  // Sort by total connections
  nodesWithCounts.sort((a, b) => b.connections - a.connections);

  // Return top 5
  return nodesWithCounts.slice(0, 5).map(node => ({
    name: path.basename(node.file, path.extname(node.file)),
    file: node.file,
    connections: node.connections,
    incoming: node.incoming,
    outgoing: node.outgoing,
    exports: node.exports,
    why_critical: generateCriticalityReason(node)
  }));
}

/**
 * Generate reason why a node is critical
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
    reasons.push(`contains ${node.functions.length} functions`);
  }

  if (reasons.length === 0) {
    return `Central hub with ${node.connections} connections`;
  }

  return reasons.join(', ');
}

/**
 * Detect changed files by comparing hashes
 */
export async function detectChangedFiles(previousHashes, currentFiles) {
  const changed = [];
  const added = [];
  const removed = [];
  const currentHashes = {};

  // Calculate current hashes
  for (const file of currentFiles) {
    if (!CODE_EXTS.has(path.extname(file.path))) continue;

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
      // Skip files we can't read
    }
  }

  // Detect removed files
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
 * Build a summary of the graph for API consumption
 */
export function buildGraphSummary(graph) {
  return {
    stats: graph.stats,
    godNodes: graph.godNodes.map(node => ({
      name: node.name,
      file: node.file,
      connections: node.connections,
      why_critical: node.why_critical
    })),
    topExports: getTopExports(graph.nodes),
    architecture: describeArchitecture(graph)
  };
}

/**
 * Get most exported items
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
 * Describe project architecture
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
