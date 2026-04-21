import chalk from 'chalk';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import { scanProject, getGitInfo } from '../utils/scanner.js';
import { buildGeminiPrompt } from '../utils/prompt.js';
import { callGemini, estimateTokens } from '../utils/gemini.js';
import { getApiKey } from './config.js';
import { ensureRecallDir, writeYaml, writeFile, getRecallPath, readYaml, fileExists } from '../utils/fileUtils.js';

export default async function scanCommand(options) {
  console.log(chalk.blue('🔍 Scanning project...\n'));

  // Check if .recall exists
  const { exists } = await ensureRecallDir();
  if (!exists) {
    console.log(chalk.red('❌ .recall/ folder not found. Run: memo init'));
    return;
  }

  // Check API key
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ Gemini API key not configured.'));
    console.log(chalk.white('Run: ') + chalk.cyan('memo config --key YOUR_KEY'));
    return;
  }

  const quick = options.quick || false;

  // Step 1: Scan files
  console.log(chalk.gray('Step 1/7: Scanning files...'));
  const files = await scanProject(quick);
  
  const totalFiles = files.code.length + files.config.length + files.docs.length;
  console.log(chalk.green(`✅ Found ${files.code.length} code files, ${files.config.length} configs, ${files.docs.length} docs (${totalFiles} total)`));

  // Step 2: Build context
  console.log(chalk.gray('Step 2/7: Building context payload...'));
  const gitInfo = await getGitInfo();
  if (gitInfo.available) {
    console.log(chalk.green(`✅ Git info: branch ${gitInfo.branch}, ${gitInfo.log.split('\n').length} recent commits`));
  } else {
    console.log(chalk.yellow('⚠️  Not a git repository'));
  }

  // Step 3: Build prompt
  console.log(chalk.gray('Step 3/7: Building Gemini prompt...'));
  const prompt = buildGeminiPrompt(files, gitInfo);
  const tokens = estimateTokens(prompt);
  console.log(chalk.green(`✅ Prompt ready (~${tokens.toLocaleString()} tokens)`));

  // Step 4: Call Gemini
  console.log(chalk.gray('Step 4/7: Calling Gemini 1.5 Flash (free tier)...'));
  console.log(chalk.yellow('⏳ Building knowledge graph + task state... (10-40 seconds)'));
  
  let response;
  try {
    response = await callGemini(prompt, apiKey);
  } catch (error) {
    console.log(chalk.red(`❌ Gemini API error: ${error.message}`));
    if (error.message.includes('API_KEY_INVALID')) {
      console.log(chalk.white('Run: ') + chalk.cyan('memo config --key YOUR_KEY'));
    }
    return;
  }

  // Step 5: Parse YAML
  console.log(chalk.gray('Step 5/7: Parsing response...'));
  
  // Strip markdown fences if present
  let yamlText = response.trim();
  if (yamlText.startsWith('```yaml')) {
    yamlText = yamlText.replace(/^```yaml\n/, '').replace(/\n```$/, '');
  } else if (yamlText.startsWith('```')) {
    yamlText = yamlText.replace(/^```\n/, '').replace(/\n```$/, '');
  }

  // Remove TypeScript-style type annotations that Gemini might add
  yamlText = yamlText.replace(/: '[^']+' \| '[^']+'/g, (match) => {
    // Extract just the first type option for simplicity
    const firstType = match.match(/'([^']+)'/)?.[1] || 'complete';
    return `: ${firstType}`;
  });

  let memory;
  try {
    memory = yaml.load(yamlText);
  } catch (error) {
    console.log(chalk.red(`❌ Failed to parse YAML: ${error.message}`));
    await writeFile(getRecallPath('scan_debug.txt'), response);
    console.log(chalk.yellow('Raw response saved to .recall/scan_debug.txt'));
    
    // Try to manually fix common issues and retry
    try {
      // Remove type annotations more aggressively
      yamlText = yamlText.replace(/status: '[^']+' \| '[^']+' \| '[^']+' \| '[^']+' \| '[^']+'/g, "status: complete");
      yamlText = yamlText.replace(/status: '[^']+' \| '[^']+'/g, "status: complete");
      memory = yaml.load(yamlText);
      console.log(chalk.green('✅ Fixed YAML and parsed successfully'));
    } catch (retryError) {
      return;
    }
  }

  // Validate structure
  if (!memory.project || !memory.project.name) {
    console.log(chalk.red('❌ Invalid response structure (missing project.name)'));
    await writeFile(getRecallPath('scan_debug.txt'), response);
    console.log(chalk.yellow('Raw response saved to .recall/scan_debug.txt'));
    return;
  }

  console.log(chalk.green('✅ Valid YAML structure'));

  // Step 6: Print summary
  console.log(chalk.gray('Step 6/7: Generating summary...\n'));
  printSummary(memory);

  // Step 7: Confirm and save
  console.log(chalk.gray('\nStep 7/7: Saving memory...'));
  
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
    model: 'gemini-1.5-flash',
    scan_count: scanCount
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

  console.log(chalk.green('\n✅ Memory saved to .recall/'));
  console.log(chalk.blue('\nNext: ') + chalk.cyan('memo load') + chalk.white(' to generate agent briefing'));
}

function printSummary(memory) {
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

  if (progress.what_is_missing && progress.what_is_missing.length > 0) {
    console.log(chalk.gray('⬜ What\'s missing:'));
    progress.what_is_missing.slice(0, 3).forEach(item => console.log(`  - ${item}`));
    console.log('');
  }

  if (task.continue_here) {
    console.log(chalk.bold.cyan('▶ Continue at:'));
    console.log(chalk.white(`  File: ${task.continue_here.file}`));
    console.log(chalk.white(`  Location: ${task.continue_here.location}`));
    console.log(chalk.white(`  Do: ${task.continue_here.instruction}`));
    console.log('');
  }

  if (memory.handoff_message) {
    console.log(chalk.bold('📝 Handoff Message (preview):'));
    const preview = memory.handoff_message.split('\n')[0].slice(0, 100);
    console.log(chalk.gray(`  ${preview}...`));
  }
}
