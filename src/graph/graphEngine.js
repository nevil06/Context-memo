/**
 * Graph Engine
 * Core graph operations and queries
 */

export class GraphEngine {
  constructor(nodes, edges) {
    this.nodes = new Map(nodes.map(n => [n.id, n]));
    this.edges = edges;
    this.adjacencyList = this._buildAdjacencyList();
    this.reverseAdjacencyList = this._buildReverseAdjacencyList();
  }

  /**
   * Build adjacency list (outgoing edges)
   */
  _buildAdjacencyList() {
    const adj = new Map();
    
    for (const node of this.nodes.values()) {
      adj.set(node.id, []);
    }
    
    for (const edge of this.edges) {
      if (adj.has(edge.from)) {
        adj.get(edge.from).push(edge);
      }
    }
    
    return adj;
  }

  /**
   * Build reverse adjacency list (incoming edges)
   */
  _buildReverseAdjacencyList() {
    const adj = new Map();
    
    for (const node of this.nodes.values()) {
      adj.set(node.id, []);
    }
    
    for (const edge of this.edges) {
      if (adj.has(edge.to)) {
        adj.get(edge.to).push(edge);
      }
    }
    
    return adj;
  }

  /**
   * Get node by ID
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  /**
   * Get outgoing edges from node
   */
  getOutgoingEdges(nodeId) {
    return this.adjacencyList.get(nodeId) || [];
  }

  /**
   * Get incoming edges to node
   */
  getIncomingEdges(nodeId) {
    return this.reverseAdjacencyList.get(nodeId) || [];
  }

  /**
   * Get direct dependencies (what this node imports)
   */
  getDirectDependencies(nodeId) {
    const edges = this.getOutgoingEdges(nodeId);
    return edges.map(e => ({
      file: e.to,
      items: e.items,
      line: e.line
    }));
  }

  /**
   * Get direct dependents (who imports this node)
   */
  getDirectDependents(nodeId) {
    const edges = this.getIncomingEdges(nodeId);
    return edges.map(e => ({
      file: e.from,
      items: e.items,
      line: e.line
    }));
  }

  /**
   * Get all transitive dependencies (recursive)
   */
  getTransitiveDependencies(nodeId, maxDepth = 10) {
    const visited = new Set();
    const result = [];
    
    const dfs = (id, depth) => {
      if (depth > maxDepth || visited.has(id)) return;
      visited.add(id);
      
      const deps = this.getDirectDependencies(id);
      for (const dep of deps) {
        if (!visited.has(dep.file)) {
          result.push({ ...dep, depth });
          dfs(dep.file, depth + 1);
        }
      }
    };
    
    dfs(nodeId, 1);
    return result;
  }

  /**
   * Get all transitive dependents (who depends on this, recursively)
   */
  getTransitiveDependents(nodeId, maxDepth = 10) {
    const visited = new Set();
    const result = [];
    
    const dfs = (id, depth) => {
      if (depth > maxDepth || visited.has(id)) return;
      visited.add(id);
      
      const dependents = this.getDirectDependents(id);
      for (const dependent of dependents) {
        if (!visited.has(dependent.file)) {
          result.push({ ...dependent, depth });
          dfs(dependent.file, depth + 1);
        }
      }
    };
    
    dfs(nodeId, 1);
    return result;
  }

  /**
   * Find shortest path between two nodes
   */
  findPath(fromId, toId) {
    if (fromId === toId) return [fromId];
    
    const queue = [[fromId]];
    const visited = new Set([fromId]);
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      const deps = this.getDirectDependencies(current);
      for (const dep of deps) {
        if (dep.file === toId) {
          return [...path, toId];
        }
        
        if (!visited.has(dep.file)) {
          visited.add(dep.file);
          queue.push([...path, dep.file]);
        }
      }
    }
    
    return null; // No path found
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies() {
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();
    
    const dfs = (nodeId, path) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);
      
      const deps = this.getDirectDependencies(nodeId);
      for (const dep of deps) {
        if (!visited.has(dep.file)) {
          dfs(dep.file, [...path]);
        } else if (recStack.has(dep.file)) {
          // Found cycle
          const cycleStart = path.indexOf(dep.file);
          const cycle = path.slice(cycleStart);
          cycle.push(dep.file);
          cycles.push(cycle);
        }
      }
      
      recStack.delete(nodeId);
    };
    
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }
    
    return cycles;
  }

  /**
   * Get strongly connected components
   */
  getStronglyConnectedComponents() {
    const visited = new Set();
    const stack = [];
    
    // First DFS to fill stack
    const dfs1 = (nodeId) => {
      visited.add(nodeId);
      const deps = this.getDirectDependencies(nodeId);
      for (const dep of deps) {
        if (!visited.has(dep.file)) {
          dfs1(dep.file);
        }
      }
      stack.push(nodeId);
    };
    
    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs1(nodeId);
      }
    }
    
    // Second DFS on reversed graph
    visited.clear();
    const components = [];
    
    const dfs2 = (nodeId, component) => {
      visited.add(nodeId);
      component.push(nodeId);
      const dependents = this.getDirectDependents(nodeId);
      for (const dependent of dependents) {
        if (!visited.has(dependent.file)) {
          dfs2(dependent.file, component);
        }
      }
    };
    
    while (stack.length > 0) {
      const nodeId = stack.pop();
      if (!visited.has(nodeId)) {
        const component = [];
        dfs2(nodeId, component);
        if (component.length > 1) {
          components.push(component);
        }
      }
    }
    
    return components;
  }

  /**
   * Calculate node metrics
   */
  getNodeMetrics(nodeId) {
    const node = this.getNode(nodeId);
    if (!node) return null;
    
    const directDeps = this.getDirectDependencies(nodeId);
    const directDependents = this.getDirectDependents(nodeId);
    const transitiveDeps = this.getTransitiveDependencies(nodeId);
    const transitiveDependents = this.getTransitiveDependents(nodeId);
    
    return {
      file: nodeId,
      directDependencies: directDeps.length,
      directDependents: directDependents.length,
      transitiveDependencies: transitiveDeps.length,
      transitiveDependents: transitiveDependents.length,
      totalConnections: directDeps.length + directDependents.length,
      fanIn: directDependents.length,
      fanOut: directDeps.length,
      instability: directDeps.length / (directDeps.length + directDependents.length) || 0
    };
  }

  /**
   * Get graph statistics
   */
  getStats() {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.length;
    const avgDegree = edgeCount / nodeCount;
    
    let maxFanIn = 0;
    let maxFanOut = 0;
    let totalFanIn = 0;
    let totalFanOut = 0;
    
    for (const nodeId of this.nodes.keys()) {
      const fanIn = this.getIncomingEdges(nodeId).length;
      const fanOut = this.getOutgoingEdges(nodeId).length;
      
      maxFanIn = Math.max(maxFanIn, fanIn);
      maxFanOut = Math.max(maxFanOut, fanOut);
      totalFanIn += fanIn;
      totalFanOut += fanOut;
    }
    
    return {
      nodes: nodeCount,
      edges: edgeCount,
      avgDegree,
      maxFanIn,
      maxFanOut,
      avgFanIn: totalFanIn / nodeCount,
      avgFanOut: totalFanOut / nodeCount
    };
  }
}

/**
 * Create graph engine from graph data
 */
export function createGraphEngine(graph) {
  return new GraphEngine(graph.nodes, graph.edges);
}
