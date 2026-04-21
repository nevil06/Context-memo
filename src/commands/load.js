import chalk from 'chalk';
import { ensureRecallDir, readYaml, getRecallPath, fileExists } from '../utils/fileUtils.js';
import { buildBriefing, estimateTokens } from '../utils/assembler.js';
import { copyToClipboard } from '../utils/clipboard.js';

export default async function loadCommand(options) {
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

  console.log(chalk.blue('📖 Loading agent briefing...\n'));

  const memory = await readYaml(memoryPath);
  
  let taskState = memory.task_state;
  const taskStatePath = getRecallPath('task_state.yaml');
  if (await fileExists(taskStatePath)) {
    taskState = await readYaml(taskStatePath);
  }

  const mode = options.mode || 'full';
  const briefing = buildBriefing(memory, taskState, mode);

  const tokens = estimateTokens(briefing);

  // Copy to clipboard
  const copied = await copyToClipboard(briefing);

  // Print briefing
  console.log(chalk.gray('═'.repeat(60)));
  console.log(briefing);
  console.log(chalk.gray('═'.repeat(60)));
  console.log('');

  console.log(chalk.blue(`📊 Briefing: ~${tokens.toLocaleString()} tokens (${mode} mode)`));
  
  if (copied) {
    console.log(chalk.green('✅ Copied to clipboard — paste into your AI agent'));
  } else {
    console.log(chalk.yellow('⚠️  Could not copy to clipboard (copy manually)'));
  }

  console.log('');
  console.log(chalk.gray('Modes: --mode=quick | --mode=full | --mode=onboard'));
}
