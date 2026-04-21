import chalk from 'chalk';
import { ensureRecallDir, readYaml, getRecallPath, fileExists } from '../utils/fileUtils.js';

export default async function statusCommand() {
  const { exists } = await ensureRecallDir();
  if (!exists) {
    console.log(chalk.red('❌ .recall/ folder not found. Run: memo init'));
    return;
  }

  const memoryPath = getRecallPath('memory.yaml');
  if (!await fileExists(memoryPath)) {
    console.log(chalk.red('❌ memory.yaml not found. Run: memo scan'));
    return;
  }

  const memory = await readYaml(memoryPath);
  
  let taskState = memory.task_state;
  const taskStatePath = getRecallPath('task_state.yaml');
  if (await fileExists(taskStatePath)) {
    taskState = await readYaml(taskStatePath);
  }

  const proj = memory.project || {};
  const progress = memory.progress || {};
  const kg = memory.knowledge_graph || {};
  const task = taskState || {};
  const meta = memory._meta || {};

  console.log('');
  console.log(chalk.bold.blue('═'.repeat(60)));
  console.log(chalk.bold.blue(`  ${proj.name || 'Project'}`));
  console.log(chalk.bold.blue('═'.repeat(60)));
  console.log('');

  // Project info
  console.log(chalk.bold('📦 Project'));
  console.log(chalk.white(`Type: ${proj.type || 'Unknown'}`));
  console.log(chalk.white(`Stack: ${proj.stack || 'Unknown'}`));
  console.log('');

  // Progress bar
  const percent = progress.percent_done || 0;
  const barLength = 40;
  const filled = Math.round((percent / 100) * barLength);
  const empty = barLength - filled;
  
  let barColor = chalk.red;
  if (percent >= 70) barColor = chalk.green;
  else if (percent >= 40) barColor = chalk.yellow;

  const bar = barColor('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  console.log(chalk.bold('📊 Progress'));
  console.log(`${bar} ${percent}%`);
  console.log(chalk.gray(`Phase: ${progress.phase || 'unknown'}`));
  console.log('');

  // Components
  if (kg.components && kg.components.length > 0) {
    console.log(chalk.bold('🧩 Components'));
    kg.components.slice(0, 8).forEach(comp => {
      const icon = getStatusIcon(comp.status);
      console.log(`${icon} ${comp.name} ${chalk.gray(`(${comp.file})`)}`);
    });
    if (kg.components.length > 8) {
      console.log(chalk.gray(`  ... and ${kg.components.length - 8} more`));
    }
    console.log('');
  }

  // What works
  if (progress.what_works && progress.what_works.length > 0) {
    console.log(chalk.green.bold('✅ What works'));
    progress.what_works.slice(0, 3).forEach(item => {
      console.log(chalk.green(`  • ${item}`));
    });
    console.log('');
  }

  // What's broken
  if (progress.what_is_broken && progress.what_is_broken.length > 0) {
    console.log(chalk.red.bold('❌ What\'s broken'));
    progress.what_is_broken.slice(0, 3).forEach(item => {
      console.log(chalk.red(`  • ${item}`));
    });
    console.log('');
  }

  // What's missing
  if (progress.what_is_missing && progress.what_is_missing.length > 0) {
    console.log(chalk.gray.bold('⬜ What\'s missing'));
    progress.what_is_missing.slice(0, 3).forEach(item => {
      console.log(chalk.gray(`  • ${item}`));
    });
    console.log('');
  }

  // Continue at
  if (task.continue_here && task.continue_here.file) {
    console.log(chalk.cyan.bold('▶ Continue at'));
    console.log(chalk.cyan(`  File: ${task.continue_here.file}`));
    console.log(chalk.cyan(`  Location: ${task.continue_here.location}`));
    console.log(chalk.cyan(`  Do: ${task.continue_here.instruction}`));
    console.log('');
  }

  // Recently completed
  if (task.completed_recently && task.completed_recently.length > 0) {
    console.log(chalk.bold('✨ Recently completed'));
    task.completed_recently.slice(0, 3).forEach(item => {
      console.log(chalk.white(`  • ${item}`));
    });
    console.log('');
  }

  // Meta
  if (meta.generated_at) {
    const date = new Date(meta.generated_at);
    console.log(chalk.gray('─'.repeat(60)));
    console.log(chalk.gray(`Last scan: ${date.toLocaleString()}`));
    console.log(chalk.gray(`Files scanned: ${meta.files_scanned || 0} | Scan count: ${meta.scan_count || 0}`));
  }

  console.log('');
}

function getStatusIcon(status) {
  const icons = {
    complete: chalk.green('✅'),
    in_progress: chalk.yellow('🔄'),
    broken: chalk.red('❌'),
    stub: chalk.gray('⬜'),
    not_started: chalk.gray('⬜')
  };
  return icons[status] || chalk.gray('⬜');
}
