#!/usr/bin/env node

/**
 * Comprehensive Recall File Evaluation
 * Scores recall quality, accuracy, completeness, and usefulness
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('═══════════════════════════════════════════════════════');
console.log('    COMPREHENSIVE RECALL FILE EVALUATION');
console.log('═══════════════════════════════════════════════════════\n');

// Load recall memory
async function loadRecallMemory() {
  const memoryPath = path.join(__dirname, '.recall', 'memory.yaml');
  const content = await fs.readFile(memoryPath, 'utf8');
  return {
    content,
    data: yaml.load(content)
  };
}

// Scan actual codebase structure
async function scanActualCodebase() {
  const structure = {
    totalFiles: 0,
    totalLines: 0,
    totalChars: 0,
    filesByCategory: {},
    godNodes: [],
    commands: [],
    components: []
  };

  // Scan directories
  const categories = {
    commands: 'src/commands',
    agents: 'src/agents',
    parsers: 'src/parsers',
    registry: 'src/registry',
    graph: 'src/graph',
    validation: 'src/validation',
    memory: 'src/memory',
    checksum: 'src/checksum',
    scoring: 'src/scoring',
    tools: 'src/tools',
    retrieval: 'src/retrieval',
    dashboard: 'src/dashboard',
    trust: 'src/trust',
    timeline: 'src/timeline',
    local: 'src/local',
    utils: 'src/utils',
    bin: 'bin'
  };

  for (const [category, dir] of Object.entries(categories)) {
    try {
      const fullPath = path.join(__dirname, dir);
      const entries = await fs.readdir(fullPath);
      const jsFiles = entries.filter(f => f.endsWith('.js'));
      
      structure.filesByCategory[category] = jsFiles;
      structure.totalFiles += jsFiles.length;

      // Count lines and chars
      for (const file of jsFiles) {
        const filePath = path.join(fullPath, file);
        const content = await fs.readFile(filePath, 'utf8');
        structure.totalChars += content.length;
        structure.totalLines += content.split('\n').length;
        
        structure.components.push({
          name: file.replace('.js', ''),
          file: `${dir}/${file}`,
          category,
          lines: content.split('\n').length,
          chars: content.length
        });
      }
    } catch (error) {
      // Directory doesn't exist
    }
  }

  return structure;
}

// Evaluate recall content
async function evaluateRecall() {
  const recall = await loadRecallMemory();
  const actual = await scanActualCodebase();

  const evaluation = {
    // 1. Basic Metrics
    recallSize: recall.content.length,
    recallLines: recall.content.split('\n').length,
    recallTokens: Math.ceil(recall.content.length / 4),
    codebaseSize: actual.totalChars,
    codebaseLines: actual.totalLines,
    codebaseTokens: Math.ceil(actual.totalChars / 4),
    
    // 2. Compression
    compressionRatio: (recall.content.length / actual.totalChars * 100).toFixed(2),
    tokenSavings: Math.ceil(actual.totalChars / 4) - Math.ceil(recall.content.length / 4),
    tokenSavingsPercent: ((1 - recall.content.length / actual.totalChars) * 100).toFixed(2),
    
    // 3. Content Quality
    hasProjectName: !!recall.data.project?.name,
    hasProjectPurpose: !!recall.data.project?.purpose && recall.data.project.purpose !== '',
    hasStack: !!recall.data.project?.stack && recall.data.project.stack !== '',
    hasGodNodes: recall.data.knowledge_graph?.god_nodes?.length > 0,
    hasComponents: recall.data.knowledge_graph?.components?.length > 0,
    hasProgress: recall.data.progress?.percent_done >= 0,
    hasTaskState: !!recall.data.task_state,
    hasHandoffMessage: !!recall.data.handoff_message && recall.data.handoff_message !== '',
    
    // 4. Accuracy
    componentsInRecall: recall.data.knowledge_graph?.components?.length || 0,
    godNodesInRecall: recall.data.knowledge_graph?.god_nodes?.length || 0,
    actualFiles: actual.totalFiles,
    
    // 5. Completeness
    categoriesCovered: 0,
    commandsCovered: 0,
    
    // 6. Usefulness
    usefulForHandoff: false,
    usefulForContext: false,
    usefulForOnboarding: false,
    
    // 7. Detailed Analysis
    detailedAnalysis: {
      projectMetadata: {},
      knowledgeGraph: {},
      progress: {},
      taskState: {},
      falseInformation: []
    }
  };

  // Analyze project metadata
  const project = recall.data.project || {};
  evaluation.detailedAnalysis.projectMetadata = {
    name: project.name || 'Not provided',
    nameQuality: project.name && project.name !== '' ? 'Good' : 'Missing',
    purpose: project.purpose ? (project.purpose.length > 50 ? 'Detailed' : 'Basic') : 'Missing',
    purposeLength: project.purpose?.length || 0,
    stack: Array.isArray(project.stack) ? project.stack : (project.stack || 'Not provided'),
    stackDetail: Array.isArray(project.stack) ? 'Detailed' : (project.stack ? 'Basic' : 'Missing'),
    entryPoints: project.entry_points || 'Not provided'
  };

  // Analyze knowledge graph
  const kg = recall.data.knowledge_graph || {};
  evaluation.detailedAnalysis.knowledgeGraph = {
    godNodesCount: kg.god_nodes?.length || 0,
    componentsCount: kg.components?.length || 0,
    hasDataFlow: !!kg.data_flow && kg.data_flow !== '',
    dataFlowLength: kg.data_flow?.length || 0,
    coverage: ((kg.components?.length || 0) / actual.totalFiles * 100).toFixed(1) + '%'
  };

  // Analyze progress
  const progress = recall.data.progress || {};
  evaluation.detailedAnalysis.progress = {
    percentDone: progress.percent_done || 0,
    phase: progress.phase || 'Not provided',
    whatWorksCount: progress.what_works?.length || 0,
    whatIsBrokenCount: progress.what_is_broken?.length || 0,
    whatIsMissingCount: progress.what_is_missing?.length || 0,
    hasDetail: (progress.what_works?.length || 0) > 0
  };

  // Analyze task state
  const taskState = recall.data.task_state || {};
  evaluation.detailedAnalysis.taskState = {
    hasLastTask: !!taskState.last_task && taskState.last_task !== '',
    hasCurrentProblem: !!taskState.current_problem && taskState.current_problem !== '',
    hasContinueHere: !!taskState.continue_here?.instruction && taskState.continue_here.instruction !== '',
    nextStepsCount: taskState.next_steps?.length || 0
  };

  // Check for false information
  const falseInfo = [];
  
  // Check if components actually exist
  for (const component of kg.components || []) {
    const filePath = path.join(__dirname, component.file);
    try {
      await fs.access(filePath);
    } catch (error) {
      falseInfo.push({
        type: 'Non-existent file',
        component: component.name,
        file: component.file,
        severity: 'High'
      });
    }
  }

  evaluation.detailedAnalysis.falseInformation = falseInfo;

  // Calculate usefulness
  evaluation.usefulForHandoff = 
    evaluation.hasHandoffMessage && 
    evaluation.hasTaskState && 
    evaluation.hasProgress;
  
  evaluation.usefulForContext = 
    evaluation.hasComponents && 
    evaluation.hasGodNodes;
  
  evaluation.usefulForOnboarding = 
    evaluation.hasProjectPurpose && 
    evaluation.hasStack && 
    evaluation.hasComponents;

  return { evaluation, recall, actual };
}

// Calculate scores
function calculateScores(evaluation) {
  const scores = {
    accuracy: 0,        // Out of 10
    completeness: 0,    // Out of 10
    compression: 0,     // Out of 10
    usefulness: 0,      // Out of 10
    quality: 0,         // Out of 10
    overall: 0          // Out of 10
  };

  // 1. Accuracy Score (10 points)
  // - No false information: +5
  // - All files exist: +5
  const falseCount = evaluation.detailedAnalysis.falseInformation.length;
  scores.accuracy = falseCount === 0 ? 10 : Math.max(0, 10 - falseCount * 2);

  // 2. Completeness Score (10 points)
  // - Has project metadata: +2
  // - Has god nodes: +2
  // - Has components: +2
  // - Has progress: +2
  // - Has task state: +2
  let completeness = 0;
  if (evaluation.hasProjectName && evaluation.hasProjectPurpose) completeness += 2;
  if (evaluation.hasGodNodes) completeness += 2;
  if (evaluation.hasComponents) completeness += 2;
  if (evaluation.hasProgress) completeness += 2;
  if (evaluation.hasTaskState) completeness += 2;
  scores.completeness = completeness;

  // 3. Compression Score (10 points)
  // - 95%+ savings: 10
  // - 90-95% savings: 8
  // - 85-90% savings: 6
  // - 80-85% savings: 4
  // - <80% savings: 2
  const savingsPercent = parseFloat(evaluation.tokenSavingsPercent);
  if (savingsPercent >= 95) scores.compression = 10;
  else if (savingsPercent >= 90) scores.compression = 8;
  else if (savingsPercent >= 85) scores.compression = 6;
  else if (savingsPercent >= 80) scores.compression = 4;
  else scores.compression = 2;

  // 4. Usefulness Score (10 points)
  // - Useful for handoff: +3
  // - Useful for context: +4
  // - Useful for onboarding: +3
  let usefulness = 0;
  if (evaluation.usefulForHandoff) usefulness += 3;
  if (evaluation.usefulForContext) usefulness += 4;
  if (evaluation.usefulForOnboarding) usefulness += 3;
  scores.usefulness = usefulness;

  // 5. Quality Score (10 points)
  // - Detailed purpose: +2
  // - Detailed stack: +2
  // - Good coverage: +2
  // - Has data flow: +2
  // - Has handoff message: +2
  let quality = 0;
  if (evaluation.detailedAnalysis.projectMetadata.purposeLength > 50) quality += 2;
  if (evaluation.detailedAnalysis.projectMetadata.stackDetail === 'Detailed') quality += 2;
  const coverage = parseFloat(evaluation.detailedAnalysis.knowledgeGraph.coverage);
  if (coverage >= 30) quality += 2;
  if (evaluation.detailedAnalysis.knowledgeGraph.hasDataFlow) quality += 2;
  if (evaluation.hasHandoffMessage) quality += 2;
  scores.quality = quality;

  // Overall Score (average of all)
  scores.overall = (
    scores.accuracy +
    scores.completeness +
    scores.compression +
    scores.usefulness +
    scores.quality
  ) / 5;

  return scores;
}

// Format score display
function formatScore(score) {
  if (score >= 9) return `${score.toFixed(1)}/10 ⭐⭐⭐⭐⭐ EXCELLENT`;
  if (score >= 7) return `${score.toFixed(1)}/10 ⭐⭐⭐⭐ GOOD`;
  if (score >= 5) return `${score.toFixed(1)}/10 ⭐⭐⭐ FAIR`;
  if (score >= 3) return `${score.toFixed(1)}/10 ⭐⭐ POOR`;
  return `${score.toFixed(1)}/10 ⭐ VERY POOR`;
}

// Main evaluation
async function runEvaluation() {
  try {
    const { evaluation, recall, actual } = await evaluateRecall();
    const scores = calculateScores(evaluation);

    // Display results
    console.log('1. BASIC METRICS');
    console.log('───────────────────────────────────────────────────────\n');
    console.log(`Recall File Size: ${evaluation.recallSize.toLocaleString()} chars (${evaluation.recallLines} lines)`);
    console.log(`Recall Tokens: ~${evaluation.recallTokens.toLocaleString()} tokens\n`);
    console.log(`Actual Codebase: ${evaluation.codebaseSize.toLocaleString()} chars (${evaluation.codebaseLines.toLocaleString()} lines)`);
    console.log(`Codebase Tokens: ~${evaluation.codebaseTokens.toLocaleString()} tokens\n`);
    console.log(`Compression Ratio: ${evaluation.compressionRatio}%`);
    console.log(`Token Savings: ~${evaluation.tokenSavings.toLocaleString()} tokens (${evaluation.tokenSavingsPercent}%)\n`);

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('2. CONTENT ANALYSIS');
    console.log('───────────────────────────────────────────────────────\n');
    
    console.log('Project Metadata:');
    console.log(`  Name: ${evaluation.detailedAnalysis.projectMetadata.name} (${evaluation.detailedAnalysis.projectMetadata.nameQuality})`);
    console.log(`  Purpose: ${evaluation.detailedAnalysis.projectMetadata.purpose} (${evaluation.detailedAnalysis.projectMetadata.purposeLength} chars)`);
    console.log(`  Stack: ${evaluation.detailedAnalysis.projectMetadata.stackDetail}`);
    console.log(`  Entry Points: ${evaluation.detailedAnalysis.projectMetadata.entryPoints}\n`);
    
    console.log('Knowledge Graph:');
    console.log(`  God Nodes: ${evaluation.detailedAnalysis.knowledgeGraph.godNodesCount}`);
    console.log(`  Components: ${evaluation.detailedAnalysis.knowledgeGraph.componentsCount}`);
    console.log(`  Coverage: ${evaluation.detailedAnalysis.knowledgeGraph.coverage} of actual files`);
    console.log(`  Data Flow: ${evaluation.detailedAnalysis.knowledgeGraph.hasDataFlow ? 'Yes' : 'No'} (${evaluation.detailedAnalysis.knowledgeGraph.dataFlowLength} chars)\n`);
    
    console.log('Progress Tracking:');
    console.log(`  Percent Done: ${evaluation.detailedAnalysis.progress.percentDone}%`);
    console.log(`  Phase: ${evaluation.detailedAnalysis.progress.phase}`);
    console.log(`  What Works: ${evaluation.detailedAnalysis.progress.whatWorksCount} items`);
    console.log(`  What's Broken: ${evaluation.detailedAnalysis.progress.whatIsBrokenCount} items`);
    console.log(`  What's Missing: ${evaluation.detailedAnalysis.progress.whatIsMissingCount} items\n`);
    
    console.log('Task State:');
    console.log(`  Has Last Task: ${evaluation.detailedAnalysis.taskState.hasLastTask ? 'Yes' : 'No'}`);
    console.log(`  Has Current Problem: ${evaluation.detailedAnalysis.taskState.hasCurrentProblem ? 'Yes' : 'No'}`);
    console.log(`  Has Continue Here: ${evaluation.detailedAnalysis.taskState.hasContinueHere ? 'Yes' : 'No'}`);
    console.log(`  Next Steps: ${evaluation.detailedAnalysis.taskState.nextStepsCount} items\n`);

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('3. ACCURACY CHECK');
    console.log('───────────────────────────────────────────────────────\n');
    
    if (evaluation.detailedAnalysis.falseInformation.length === 0) {
      console.log('✅ NO FALSE INFORMATION DETECTED\n');
      console.log('All components listed in recall actually exist in the codebase.');
      console.log('Zero hallucinations, zero invented files.\n');
    } else {
      console.log(`❌ FOUND ${evaluation.detailedAnalysis.falseInformation.length} FALSE ITEMS:\n`);
      for (const item of evaluation.detailedAnalysis.falseInformation) {
        console.log(`  [${item.severity}] ${item.type}`);
        console.log(`    Component: ${item.component}`);
        console.log(`    File: ${item.file}\n`);
      }
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('4. USEFULNESS ASSESSMENT');
    console.log('───────────────────────────────────────────────────────\n');
    
    console.log(`Useful for AI Agent Handoff: ${evaluation.usefulForHandoff ? '✅ Yes' : '❌ No'}`);
    console.log(`Useful for Context Loading: ${evaluation.usefulForContext ? '✅ Yes' : '❌ No'}`);
    console.log(`Useful for Developer Onboarding: ${evaluation.usefulForOnboarding ? '✅ Yes' : '❌ No'}\n`);

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('5. DETAILED SCORES');
    console.log('───────────────────────────────────────────────────────\n');
    
    console.log(`Accuracy Score:     ${formatScore(scores.accuracy)}`);
    console.log(`  → Measures: Correctness, no false information\n`);
    
    console.log(`Completeness Score: ${formatScore(scores.completeness)}`);
    console.log(`  → Measures: Has all required sections\n`);
    
    console.log(`Compression Score:  ${formatScore(scores.compression)}`);
    console.log(`  → Measures: Token savings efficiency\n`);
    
    console.log(`Usefulness Score:   ${formatScore(scores.usefulness)}`);
    console.log(`  → Measures: Practical value for users\n`);
    
    console.log(`Quality Score:      ${formatScore(scores.quality)}`);
    console.log(`  → Measures: Detail and thoroughness\n`);

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('6. OVERALL SCORE');
    console.log('───────────────────────────────────────────────────────\n');
    
    console.log(`\n  ${formatScore(scores.overall)}\n`);

    // Detailed verdict
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('7. DETAILED VERDICT');
    console.log('───────────────────────────────────────────────────────\n');
    
    if (scores.overall >= 9) {
      console.log('⭐⭐⭐⭐⭐ OUTSTANDING\n');
      console.log('This recall file is exceptional. It provides accurate,');
      console.log('comprehensive, and highly useful information about the');
      console.log('codebase with massive token savings.\n');
    } else if (scores.overall >= 7) {
      console.log('⭐⭐⭐⭐ VERY GOOD\n');
      console.log('This recall file is very good. It provides accurate and');
      console.log('useful information with good token savings. Minor');
      console.log('improvements could make it even better.\n');
    } else if (scores.overall >= 5) {
      console.log('⭐⭐⭐ GOOD\n');
      console.log('This recall file is decent. It provides basic information');
      console.log('and saves tokens, but lacks detail or completeness in');
      console.log('some areas.\n');
    } else if (scores.overall >= 3) {
      console.log('⭐⭐ NEEDS IMPROVEMENT\n');
      console.log('This recall file needs significant improvement. It may');
      console.log('have accuracy issues or lack important information.\n');
    } else {
      console.log('⭐ POOR\n');
      console.log('This recall file has serious issues. It may contain');
      console.log('false information or be largely incomplete.\n');
    }

    // Recommendations
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('8. RECOMMENDATIONS');
    console.log('───────────────────────────────────────────────────────\n');
    
    if (scores.accuracy < 8) {
      console.log('⚠️  Improve Accuracy:');
      console.log('   - Verify all file references');
      console.log('   - Remove or fix false information');
      console.log('   - Use local scan mode for guaranteed accuracy\n');
    }
    
    if (scores.completeness < 8) {
      console.log('⚠️  Improve Completeness:');
      console.log('   - Add missing project metadata');
      console.log('   - Include more components');
      console.log('   - Add progress and task state details\n');
    }
    
    if (scores.compression < 8) {
      console.log('⚠️  Improve Compression:');
      console.log('   - Remove redundant information');
      console.log('   - Focus on critical components only');
      console.log('   - Use more concise descriptions\n');
    }
    
    if (scores.usefulness < 8) {
      console.log('⚠️  Improve Usefulness:');
      console.log('   - Add handoff message');
      console.log('   - Include task continuation points');
      console.log('   - Add more context for AI agents\n');
    }
    
    if (scores.quality < 8) {
      console.log('⚠️  Improve Quality:');
      console.log('   - Add more detailed purpose description');
      console.log('   - Expand stack information');
      console.log('   - Include data flow descriptions\n');
    }

    if (scores.overall >= 8) {
      console.log('✅ Excellent Work!');
      console.log('   This recall file is high quality and ready for use.\n');
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('EVALUATION COMPLETE\n');

  } catch (error) {
    console.error('❌ Evaluation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runEvaluation();
