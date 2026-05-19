/**
 * Graph Traversal Algorithms
 * DFS, BFS, and specialized traversals
 */

/**
 * Depth-First Search
 */
export function dfs(graph, startNode, visitor) {
  const visited = new Set();
  
  function visit(nodeId, depth = 0) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = graph.getNode(nodeId);
    if (node && visitor) {
      visitor(node, depth);
    }
    
    const deps = graph.getDirectDependencies(nodeId);
    for (const dep of deps) {
      visit(dep.file, depth + 1);
    }
  }
  
  visit(startNode);
  return visited;
}

/**
 * Breadth-First Search
 */
export function bfs(graph, startNode, visitor) {
  const visited = new Set();
  const queue = [[startNode, 0]];
  visited.add(startNode);
  
  while (queue.length > 0) {
    const [nodeId, depth] = queue.shift();
    
    const node = graph.getNode(nodeId);
    if (node && visitor) {
      visitor(node, depth);
    }
    
    const deps = graph.getDirectDependencies(nodeId);
    for (const dep of deps) {
      if (!visited.has(dep.file)) {
        visited.add(dep.file);
        queue.push([dep.file, depth + 1]);
      }
    }
  }
  
  return visited;
}

/**
 * Reverse DFS (traverse dependents)
 */
export function reverseDfs(graph, startNode, visitor) {
  const visited = new Set();
  
  function visit(nodeId, depth = 0) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = graph.getNode(nodeId);
    if (node && visitor) {
      visitor(node, depth);
    }
    
    const dependents = graph.getDirectDependents(nodeId);
    for (const dependent of dependents) {
      visit(dependent.file, depth + 1);
    }
  }
  
  visit(startNode);
  return visited;
}

/**
 * Reverse BFS (traverse dependents)
 */
export function reverseBfs(graph, startNode, visitor) {
  const visited = new Set();
  const queue = [[startNode, 0]];
  visited.add(startNode);
  
  while (queue.length > 0) {
    const [nodeId, depth] = queue.shift();
    
    const node = graph.getNode(nodeId);
    if (node && visitor) {
      visitor(node, depth);
    }
    
    const dependents = graph.getDirectDependents(nodeId);
    for (const dependent of dependents) {
      if (!visited.has(dependent.file)) {
        visited.add(dependent.file);
        queue.push([dependent.file, depth + 1]);
      }
    }
  }
  
  return visited;
}

/**
 * Topological sort
 */
export function topologicalSort(graph) {
  const visited = new Set();
  const stack = [];
  
  function visit(nodeId) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const deps = graph.getDirectDependencies(nodeId);
    for (const dep of deps) {
      visit(dep.file);
    }
    
    stack.push(nodeId);
  }
  
  for (const nodeId of graph.nodes.keys()) {
    visit(nodeId);
  }
  
  return stack.reverse();
}

/**
 * Find all paths between two nodes
 */
export function findAllPaths(graph, fromId, toId, maxDepth = 10) {
  const paths = [];
  
  function dfs(current, target, path, depth) {
    if (depth > maxDepth) return;
    
    if (current === target) {
      paths.push([...path]);
      return;
    }
    
    const deps = graph.getDirectDependencies(current);
    for (const dep of deps) {
      if (!path.includes(dep.file)) {
        path.push(dep.file);
        dfs(dep.file, target, path, depth + 1);
        path.pop();
      }
    }
  }
  
  dfs(fromId, toId, [fromId], 0);
  return paths;
}

/**
 * Get dependency layers (levels)
 */
export function getDependencyLayers(graph) {
  const layers = [];
  const visited = new Set();
  const inDegree = new Map();
  
  // Calculate in-degree for each node
  for (const nodeId of graph.nodes.keys()) {
    inDegree.set(nodeId, graph.getIncomingEdges(nodeId).length);
  }
  
  // Find nodes with no dependencies (layer 0)
  let currentLayer = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      currentLayer.push(nodeId);
      visited.add(nodeId);
    }
  }
  
  while (currentLayer.length > 0) {
    layers.push([...currentLayer]);
    const nextLayer = [];
    
    for (const nodeId of currentLayer) {
      const dependents = graph.getDirectDependents(nodeId);
      for (const dependent of dependents) {
        if (!visited.has(dependent.file)) {
          const newDegree = inDegree.get(dependent.file) - 1;
          inDegree.set(dependent.file, newDegree);
          
          if (newDegree === 0) {
            nextLayer.push(dependent.file);
            visited.add(dependent.file);
          }
        }
      }
    }
    
    currentLayer = nextLayer;
  }
  
  return layers;
}

/**
 * Get subgraph (nodes reachable from start)
 */
export function getSubgraph(graph, startNodes) {
  const subgraphNodes = new Set();
  
  for (const startNode of startNodes) {
    dfs(graph, startNode, (node) => {
      subgraphNodes.add(node.id);
    });
  }
  
  return Array.from(subgraphNodes);
}
