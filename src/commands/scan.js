import chalk from 'chalk';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import { scanProject, getGitInfo } from '../utils/scanner.js';
import { buildGeminiPrompt } from '../utils/prompt.js';
import { callGemini, estimateTokens } from '../utils/gemini.js';
import { getApiKey } from './config.js';
import { ensureRecallDir, writeYaml, writeFile, getRecallPath, readYaml, fileExists } from '../utils/fileUtils.js';
import { buildKnowledgeGraph, detectChangedFiles, buildGraphSummary } from '../utils/graphBuilder.js';
import { loadPreviousHashes, saveCurrentHashes, isFirstScan } from '../utils/hashStore.js';

export default async function scanCommand(options) {
  console.log(chalk.blue('🔍 Scanning project...\n'));

  // Check if .recall exists
  const { exists } = await ensureRecallDir();
  if (!exists) {
    console.log(chalk.red('❌ .recall/ folder not found. Run: memo init'));
    return;
  }

  const quick = options.quick || false;
  const localOnly = options.local || false;
  const firstScan = await isFirstScan();

  // Step 1: Scan files
  console.log(chalk.gray('Step 1/8: Scanning files...'));
  const files = await scanProject(quick);
  
  const totalFiles = files.code.length + files.config.length + files.docs.length;
  console.log(chalk.green(`✅ Found ${files.code.length} code files, ${files.config.length} configs, ${files.docs.length} docs (${totalFiles} total)`));

  // Step 2: Build knowledge graph
  console.log(chalk.gray('Step 2/8: Building knowledge graph...'));
  const graph = await buildKnowledgeGraph(process.cwd(), files.code);
  console.log(chalk.green(`✅ Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} connections`));
  console.log(chalk.cyan(`   God nodes: ${graph.godNodes.map(n => n.name).join(', ')}`));

  // Save graph
  await writeFile(getRecallPath('graph.json'), JSON.stringify(graph, null, 2));

  // Step 3: Detect changes (if not first scan)
  let changeInfo = null;
  if (!firstScan) {
    console.log(chalk.gray('Step 3/8: Detecting changes...'));
    const previousHashes = await loadPreviousHashes();
    changeInfo = await detectChangedFiles(previousHashes, files.code);
    
    if (changeInfo.hasChanges) {
      console.log(chalk.yellow(`   📝 ${changeInfo.changed.length} changed, ${changeInfo.added.length} added, ${changeInfo.removed.length} removed`));
    } else {
      console.log(chalk.green('   ✅ No changes detected'));
    }
  } else {
    console.log(chalk.gray('Step 3/8: First scan detected'));
    console.log(chalk.cyan('   ✓ Full scan mode'));
  }

  // Step 4: Get git info
  console.log(chalk.gray('Step 4/8: Gathering git info...'));
  const gitInfo = await getGitInfo();
  if (gitInfo.available) {
    console.log(chalk.green(`   ✅ Git: branch ${gitInfo.branch}, ${gitInfo.log.split('\n').filter(l => l).length} recent commits`));
  } else {
    console.log(chalk.yellow('   ⚠️  Not a git repository'));
  }

  // Step 5: Decide scan strategy
  let memory;
  let tokensUsed = 0;
  let tokensSaved = 0;

  if (localOnly) {
    // LOCAL-ONLY MODE
    console.log(chalk.gray('Step 5/8: Local-only mode (no API)...'));
    memory = await buildLocalMemory(files, graph, gitInfo);
    console.log(chalk.green('   ✅ Memory generated locally'));
    console.log(chalk.yellow('   ⚠️  Confidence: LOW (no AI reasoning)'));
    console.log(chalk.gray('Step 6/8: Skipped (local mode)'));
    console.log(chalk.gray('Step 7/8: Skipped (local mode)'));
  } else {
    // HYBRID MODE (with API)
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.log(chalk.red('❌ Gemini API key not configured.'));
      console.log(chalk.white('Run: ') + chalk.cyan('memo config --key YOUR_KEY'));
      console.log(chalk.yellow('Or use: ') + chalk.cyan('memo scan --local') + chalk.white(' for local-only mode'));
      return;
    }

    if (firstScan || !changeInfo || changeInfo.hasChanges) {
      // Build prompt based on scan type
      console.log(chalk.gray('Step 5/8: Building AI prompt...'));
      
      let prompt;
      if (firstScan) {
        console.log(chalk.cyan('   ✓ Using FULL scan (first time)'));
        prompt = buildFullPrompt(files, gitInfo, graph);
      } else {
        console.log(chalk.cyan('   ✓ Using INCREMENTAL scan'));
        const previousMemory = await readYaml(getRecallPath('memory.yaml'));
        prompt = buildIncrementalPrompt(changeInfo, graph, gitInfo, previousMemory, files);
        
        // Calculate tokens saved
        const fullPrompt = buildFullPrompt(files, gitInfo, graph);
        const fullTokens = estimateTokens(fullPrompt);
        tokensUsed = estimateTokens(prompt);
        tokensSaved = fullTokens - tokensUsed;
      }

      const tokens = estimateTokens(prompt);
      console.log(chalk.green(`   ✅ Prompt ready (~${tokens.toLocaleString()} tokens)`));
      if (tokensSaved > 0) {
        const percentSaved = Math.round((tokensSaved / (tokensUsed + tokensSaved)) * 100);
        console.log(chalk.green(`   💰 Tokens saved: ~${tokensSaved.toLocaleString()} (${percentSaved}%)`));
      }

      // Step 6: Call Gemini
      console.log(chalk.gray('Step 6/8: Calling Gemini API...'));
      console.log(chalk.yellow('   ⏳ Analyzing with AI... (10-40 seconds)'));
      
      let response;
      try {
        response = await callGemini(prompt, apiKey);
      } catch (error) {
        console.log(chalk.red(`   ❌ Gemini API error: ${error.message}`));
        if (error.message.includes('API_KEY_INVALID')) {
          console.log(chalk.white('   Run: ') + chalk.cyan('memo config --key YOUR_KEY'));
        }
        return;
      }

      // Step 7: Parse YAML
      console.log(chalk.gray('Step 7/8: Parsing AI response...'));
      memory = await parseGeminiResponse(response);
      
      if (!memory) {
        console.log(chalk.red('   ❌ Failed to parse response'));
        return;
      }

      console.log(chalk.green('   ✅ Valid response parsed'));
    } else {
      // No changes, reuse existing memory
      console.log(chalk.gray('Step 5/8: No changes detected'));
      console.log(chalk.green('   ✅ Reusing existing memory'));
      memory = await readYaml(getRecallPath('memory.yaml'));
      
      // Skip API steps
      console.log(chalk.gray('Step 6/8: Skipped (no API call needed)'));
      console.log(chalk.gray('Step 7/8: Skipped (no parsing needed)'));
    }
  }

  // Enrich memory with graph data
  memory = enrichMemoryWithGraph(memory, graph);

  // Step 8: Save and display
  console.log(chalk.gray('Step 8/8: Generating summary...\n'));
  
  printSummary(memory, {
    localOnly,
    firstScan,
    hasChanges: changeInfo?.hasChanges,
    tokensUsed,
    tokensSaved
  });

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Save this memory to .recall/?',
    default: true
  }]);

  if (!confirm) {
    console.log(chalk.yellow('Scan cancelled. Memory not saved.'));
    return;
  }

  // Add metadata
  const existingMemory = await fileExists(getRecallPath('memory.yaml')) 
    ? await readYaml(getRecallPath('memory.yaml'))
    : {};
  
  const scanCount = (existingMemory._meta?.scan_count || 0) + 1;

  memory._meta = {
    generated_at: new Date().toISOString(),
    files_scanned: totalFiles,
    model: localOnly ? 'local-only' : 'gemini-2.5-flash-lite',
    scan_count: scanCount,
    scan_type: firstScan ? 'full' : (changeInfo?.hasChanges ? 'incremental' : 'cached'),
    confidence: localOnly ? 'low' : 'high',
    tokens_used: tokensUsed || 0,
    tokens_saved: tokensSaved || 0
  };

  // Save files
  await writeYaml(getRecallPath('memory.yaml'), memory);
  
  if (memory.task_state) {
    await writeYaml(getRecallPath('task_state.yaml'), memory.task_state);
  }

  if (memory.decisions && memory.decisions.length > 0) {
    const decisionsText = memory.decisions.map(d => 
      `[${new Date().toISOString().split('T')[0]}] Decision: ${d.decision} | Why: ${d.why} | Impact: ${d.impact}`
    ).join('\n') + '\n';
    await writeFile(getRecallPath('decisions.log'), decisionsText);
  }

  // Save file hashes
  await saveCurrentHashes(graph.fileHashes);

  console.log(chalk.green('\n✅ Memory saved to .recall/'));
  console.log(chalk.blue('\nNext: ') + chalk.cyan('memo load') + chalk.white(' to generate agent briefing'));
}

/**
 * Build memory locally without API
 */
async function buildLocalMemory(files, graph, gitInfo) {
  return {
    project: {
      name: path.basename(process.cwd()),
      purpose: 'Project scanned locally without AI analysis',
      type: 'Unknown',
      stack: detectStack(files),
      entry_points: detectEntryPoints(files),
      environment_vars: [],
      constraints: 'Local scan only - no AI reasoning',
      non_goals: ''
    },
    knowledge_graph: {
      god_nodes: graph.godNodes,
      components: graph.nodes.slice(0, 20).map(node => ({
        name: path.basename(node.file, path.extname(node.file)),
        file: node.file,
        role: 'Detected locally',
        exports: node.exports,
        depends_on: [],
        status: 'unknown'
      })),
      data_flow: 'Not analyzed (local scan)',
      api_endpoints: [],
      data_models: [],
      external_services: []
    },
    progress: {
      percent_done: 0,
      phase: 'unknown',
      what_works: [],
      what_is_broken: [],
      what_is_missing: [],
      technical_debt: []
    },
    task_state: {
      last_task: '',
      current_problem: 'Local scan - AI analysis needed for detailed insights',
      continue_here: {
        file: '',
        location: '',
        instruction: 'Run memo scan without --local flag for AI-powered analysis'
      },
      next_steps: ['Run full scan with AI for detailed analysis'],
      blocked_on: 'nothing',
      completed_recently: []
    },
    decisions: [],
    handoff_message: 'This memory was generated locally without AI analysis. For detailed insights, run: memo scan'
  };
}

/**
 * Build full prompt for first scan
 */
function buildFullPrompt(files, gitInfo, graph) {
  const graphSummary = buildGraphSummary(graph);
  return buildGeminiPrompt(files, gitInfo, graphSummary);
}

/**
 * Build incremental prompt for changed files
 */
function buildIncrementalPrompt(changeInfo, graph, gitInfo, previousMemory, files) {
  const sections = [];

  sections.push(`You are updating an existing project memory based on recent changes.

IMPORTANT: Return ONLY valid YAML with NO markdown fences.

Previous memory context:`);

  sections.push(yaml.dump(previousMemory, { lineWidth: -1 }));

  sections.push(`\n--- CHANGES DETECTED ---\n`);
  sections.push(`Changed files: ${changeInfo.changed.length}`);
  sections.push(`Added files: ${changeInfo.added.length}`);
  sections.push(`Removed files: ${changeInfo.removed.length}\n`);

  if (changeInfo.changed.length > 0) {
    sections.push('Changed files:');
    for (const filePath of changeInfo.changed.slice(0, 10)) {
      const file = files.code.find(f => f.path === filePath);
      if (file && file.content) {
        sections.push(`\n=== ${filePath} ===`);
        sections.push(file.content);
      }
    }
  }

  if (changeInfo.added.length > 0) {
    sections.push('\nAdded files:');
    for (const filePath of changeInfo.added.slice(0, 5)) {
      const file = files.code.find(f => f.path === filePath);
      if (file && file.content) {
        sections.push(`\n=== ${filePath} ===`);
        sections.push(file.content);
      }
    }
  }

  const graphSummary = buildGraphSummary(graph);
  sections.push('\n--- UPDATED KNOWLEDGE GRAPH ---');
  sections.push(JSON.stringify(graphSummary, null, 2));

  if (gitInfo.available) {
    sections.push('\n--- GIT STATUS ---');
    sections.push(`Branch: ${gitInfo.branch}`);
    sections.push('Recent commits:');
    sections.push(gitInfo.log);
  }

  sections.push(`\nUpdate the memory YAML to reflect these changes. Keep existing information that's still valid.`);

  return sections.join('\n');
}

/**
 * Parse Gemini response
 */
async function parseGeminiResponse(response) {
  let yamlText = response.trim();
  
  // Strip markdown fences
  if (yamlText.startsWith('```yaml')) {
    yamlText = yamlText.replace(/^```yaml\n/, '').replace(/\n```$/, '');
  } else if (yamlText.startsWith('```')) {
    yamlText = yamlText.replace(/^```\n/, '').replace(/\n```$/, '');
  }

  // Remove TypeScript-style type annotations
  yamlText = yamlText.replace(/status: '[^']+' \| '[^']+' \| '[^']+' \| '[^']+' \| '[^']+'/g, "status: complete");
  yamlText = yamlText.replace(/status: '[^']+' \| '[^']+'/g, "status: complete");

  try {
    return yaml.load(yamlText);
  } catch (error) {
    await writeFile(getRecallPath('scan_debug.txt'), response);
    console.log(chalk.yellow('   Raw response saved to .recall/scan_debug.txt'));
    return null;
  }
}

/**
 * Enrich memory with graph data
 */
function enrichMemoryWithGraph(memory, graph) {
  if (!memory.knowledge_graph) {
    memory.knowledge_graph = {};
  }

  // Ensure god_nodes from graph are included
  if (!memory.knowledge_graph.god_nodes || memory.knowledge_graph.god_nodes.length === 0) {
    memory.knowledge_graph.god_nodes = graph.godNodes;
  }

  // Add graph metadata
  memory.knowledge_graph.graph_stats = graph.stats;

  return memory;
}

/**
 * Print summary
 */
function printSummary(memory, options) {
  const proj = memory.project || {};
  const progress = memory.progress || {};
  const task = memory.task_state || {};
  const kg = memory.knowledge_graph || {};

  console.log(chalk.bold.blue(`📦 ${proj.name || 'Project'}`));
  console.log(chalk.white(proj.purpose || 'No purpose specified'));
  console.log(chalk.gray(`Stack: ${proj.stack || 'Unknown'}`));
  console.log('');

  console.log(chalk.bold(`Progress: ${progress.percent_done || 0}% — ${progress.phase || 'unknown'}`));
  console.log('');

  if (kg.god_nodes && kg.god_nodes.length > 0) {
    console.log(chalk.bold('★ God Nodes (Critical Components):'));
    kg.god_nodes.forEach(node => {
      console.log(chalk.yellow(`  ${node.name}`) + chalk.gray(` — ${node.file}`));
    });
    console.log('');
  }

  if (progress.what_works && progress.what_works.length > 0) {
    console.log(chalk.green('✅ What works:'));
    progress.what_works.slice(0, 3).forEach(item => console.log(`  - ${item}`));
    console.log('');
  }

  if (progress.what_is_broken && progress.what_is_broken.length > 0) {
    console.log(chalk.red('❌ What\'s broken:'));
    progress.what_is_broken.slice(0, 3).forEach(item => console.log(`  - ${item}`));
    console.log('');
  }

  if (task.continue_here && task.continue_here.file) {
    console.log(chalk.bold.cyan('▶ Continue at:'));
    console.log(chalk.white(`  File: ${task.continue_here.file}`));
    console.log(chalk.white(`  Location: ${task.continue_here.location}`));
    console.log(chalk.white(`  Do: ${task.continue_here.instruction}`));
    console.log('');
  }

  // Print scan info
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.bold('Scan Info:'));
  console.log(chalk.white(`  Mode: ${options.localOnly ? 'LOCAL-ONLY' : 'HYBRID (AI-powered)'}`));
  console.log(chalk.white(`  Type: ${options.firstScan ? 'FULL' : (options.hasChanges ? 'INCREMENTAL' : 'CACHED')}`));
  if (options.tokensUsed > 0) {
    console.log(chalk.white(`  Tokens used: ~${options.tokensUsed.toLocaleString()}`));
  }
  if (options.tokensSaved > 0) {
    const percent = Math.round((options.tokensSaved / (options.tokensUsed + options.tokensSaved)) * 100);
    console.log(chalk.green(`  Tokens saved: ~${options.tokensSaved.toLocaleString()} (${percent}%)`));
  }
}

/**
 * Detect stack from files
 */
function detectStack(files) {
  const stack = new Set();
  
  if (files.config.some(f => f.path === 'package.json')) stack.add('Node.js');
  if (files.code.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))) stack.add('TypeScript');
  if (files.code.some(f => f.path.endsWith('.jsx') || f.path.endsWith('.tsx'))) stack.add('React');
  if (files.config.some(f => f.path === 'requirements.txt')) stack.add('Python');
  if (files.config.some(f => f.path === 'Cargo.toml')) stack.add('Rust');
  if (files.config.some(f => f.path === 'go.mod')) stack.add('Go');
  
  return Array.from(stack).join(', ') || 'Unknown';
}

/**
 * Detect entry points
 */
function detectEntryPoints(files) {
  const entryPoints = [];
  const entryNames = ['index', 'main', 'app', 'server', 'cli'];
  
  for (const file of files.code) {
    const basename = path.basename(file.path, path.extname(file.path));
    if (entryNames.includes(basename.toLowerCase())) {
      entryPoints.push(file.path);
    }
  }
  
  return entryPoints.join(', ') || 'Unknown';
}

import path from 'path';
