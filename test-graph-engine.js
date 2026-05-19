/**
 * Test Graph Engine
 */

import { readFile } from 'fs/promises';
import { createGraphEngine } from './src/graph/graphEngine.js';
import { calculateImpact, generateImpactReport } from './src/graph/impactAnalysis.js';
import { dfs, bfs, topologicalSort } from './src/graph/traversal.js';

async function testGraphEngine() {
  console.log('🧪 Testing Graph Engine\n');

  // Load existing graph
  const graphData = JSON.parse(await readFile('.recall/graph.json', 'utf8'));
  const graph = createGraphEngine(graphData);

  console.log('📊 Graph Stats:');
  const stats = graph.getStats();
  console.log(`   Nodes: ${stats.nodes}`);
  console.log(`   Edges: ${stats.edges}`);
  console.log(`   Avg Degree: ${stats.avgDegree.toFixed(2)}`);
  console.log(`   Max Fan-In: ${stats.maxFanIn}`);
  console.log(`   Max Fan-Out: ${stats.maxFanOut}`);

  // Test node metrics
  console.log('\n📈 Node Metrics (scan.js):');
  const scanMetrics = graph.getNodeMetrics('src\\commands\\scan.js');
  if (scanMetrics) {
    console.log(`   Direct Dependencies: ${scanMetrics.directDependencies}`);
    console.log(`   Direct Dependents: ${scanMetrics.directDependents}`);
    console.log(`   Transitive Dependencies: ${scanMetrics.transitiveDependencies}`);
    console.log(`   Transitive Dependents: ${scanMetrics.transitiveDependents}`);
    console.log(`   Fan-In: ${scanMetrics.fanIn}`);
    console.log(`   Fan-Out: ${scanMetrics.fanOut}`);
    console.log(`   Instability: ${scanMetrics.instability.toFixed(2)}`);
  }

  // Test dependency queries
  console.log('\n🔍 Direct Dependencies of scan.js:');
  const deps = graph.getDirectDependencies('src\\commands\\scan.js');
  deps.slice(0, 5).forEach(dep => {
    console.log(`   - ${dep.file}`);
  });

  // Test circular dependencies
  console.log('\n🔄 Circular Dependencies:');
  const cycles = graph.detectCircularDependencies();
  if (cycles.length === 0) {
    console.log('   ✓ No circular dependencies found');
  } else {
    cycles.forEach((cycle, i) => {
      console.log(`   Cycle ${i + 1}: ${cycle.join(' → ')}`);
    });
  }

  // Test impact analysis
  console.log('\n💥 Impact Analysis (if graphBuilder.js changed):');
  const changedFiles = ['src\\utils\\graphBuilder.js'];
  const impact = calculateImpact(graph, changedFiles);
  console.log(`   Total Impacted: ${impact.totalImpacted} files`);
  console.log(`   Blast Radius: ${impact.blastRadius} files`);
  console.log(`   Direct: ${impact.byLevel.direct.length}`);
  console.log(`   Immediate: ${impact.byLevel.immediate.length}`);
  console.log(`   Secondary: ${impact.byLevel.secondary.length}`);
  console.log(`   Tertiary: ${impact.byLevel.tertiary.length}`);

  // Test impact report
  console.log('\n📋 Impact Report:');
  const report = generateImpactReport(graph, changedFiles);
  console.log(`   Risk Score: ${report.summary.riskScore}/100`);
  console.log(`   Risk Level: ${report.summary.riskLevel}`);
  console.log('\n   Recommendations:');
  report.recommendations.forEach(rec => {
    console.log(`   ${rec}`);
  });

  // Test traversal
  console.log('\n🚶 BFS Traversal from scan.js (first 5):');
  let count = 0;
  bfs(graph, 'src\\commands\\scan.js', (node, depth) => {
    if (count < 5) {
      console.log(`   [Depth ${depth}] ${node.file}`);
      count++;
    }
  });

  // Test path finding
  console.log('\n🛤️  Path from scan.js to gemini.js:');
  const path = graph.findPath('src\\commands\\scan.js', 'src\\utils\\gemini.js');
  if (path) {
    console.log(`   ${path.join(' → ')}`);
  } else {
    console.log('   No path found');
  }

  console.log('\n✅ All graph engine tests passed!');
}

testGraphEngine().catch(console.error);
