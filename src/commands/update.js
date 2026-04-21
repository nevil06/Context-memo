import chalk from 'chalk';
import inquirer from 'inquirer';
import { ensureRecallDir, readYaml, writeYaml, getRecallPath, fileExists, appendToFile } from '../utils/fileUtils.js';

export default async function updateCommand(message) {
  const { exists } = await ensureRecallDir();
  if (!exists) {
    console.log(chalk.red('❌ .recall/ folder not found. Run: memo init'));
    return;
  }

  const memoryPath = getRecallPath('memory.yaml');
  const taskStatePath = getRecallPath('task_state.yaml');

  if (!await fileExists(memoryPath)) {
    console.log(chalk.red('❌ memory.yaml not found. Run: memo scan'));
    return;
  }

  console.log(chalk.blue('📝 Updating task state...\n'));

  const memory = await readYaml(memoryPath);
  let taskState = memory.task_state || {};
  
  if (await fileExists(taskStatePath)) {
    taskState = await readYaml(taskStatePath);
  }

  // Interactive prompts
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'accomplished',
      message: 'What did you accomplish?',
      default: message || taskState.last_task || ''
    },
    {
      type: 'number',
      name: 'progress',
      message: 'Progress % (0-100):',
      default: memory.progress?.percent_done || 0,
      validate: (val) => val >= 0 && val <= 100 || 'Must be 0-100'
    },
    {
      type: 'input',
      name: 'currentTask',
      message: 'Current task now?',
      default: taskState.last_task || ''
    },
    {
      type: 'input',
      name: 'continueFile',
      message: 'Which file should next agent open?',
      default: taskState.continue_here?.file || ''
    },
    {
      type: 'input',
      name: 'continueLocation',
      message: 'Location (function name or line)?',
      default: taskState.continue_here?.location || ''
    },
    {
      type: 'input',
      name: 'continueInstruction',
      message: 'What should next agent do there?',
      default: taskState.continue_here?.instruction || ''
    },
    {
      type: 'input',
      name: 'nextSteps',
      message: 'Next steps (separate with |):',
      default: taskState.next_steps?.join(' | ') || ''
    },
    {
      type: 'input',
      name: 'blockedOn',
      message: 'Blocked on anything?',
      default: taskState.blocked_on || 'nothing'
    },
    {
      type: 'confirm',
      name: 'logDecision',
      message: 'Log a key decision?',
      default: false
    }
  ]);

  // Update task state
  taskState.last_task = answers.currentTask;
  taskState.continue_here = {
    file: answers.continueFile,
    location: answers.continueLocation,
    instruction: answers.continueInstruction
  };
  taskState.next_steps = answers.nextSteps.split('|').map(s => s.trim()).filter(s => s);
  taskState.blocked_on = answers.blockedOn;

  // Add to completed recently
  if (answers.accomplished) {
    if (!taskState.completed_recently) {
      taskState.completed_recently = [];
    }
    taskState.completed_recently.unshift(answers.accomplished);
    taskState.completed_recently = taskState.completed_recently.slice(0, 5);
  }

  // Update progress in memory
  if (!memory.progress) {
    memory.progress = {};
  }
  memory.progress.percent_done = answers.progress;

  // Update phase based on progress
  if (answers.progress === 0) {
    memory.progress.phase = 'just_started';
  } else if (answers.progress < 30) {
    memory.progress.phase = 'early';
  } else if (answers.progress < 70) {
    memory.progress.phase = 'mid';
  } else if (answers.progress < 100) {
    memory.progress.phase = 'nearly_complete';
  } else {
    memory.progress.phase = 'complete';
  }

  // Log decision if requested
  if (answers.logDecision) {
    const decisionAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'decision',
        message: 'Decision made:'
      },
      {
        type: 'input',
        name: 'why',
        message: 'Why?'
      },
      {
        type: 'input',
        name: 'impact',
        message: 'Impact:'
      }
    ]);

    const decisionEntry = `[${new Date().toISOString().split('T')[0]}] Decision: ${decisionAnswers.decision} | Why: ${decisionAnswers.why} | Impact: ${decisionAnswers.impact}\n`;
    await appendToFile(getRecallPath('decisions.log'), decisionEntry);

    // Also add to memory
    if (!memory.decisions) {
      memory.decisions = [];
    }
    memory.decisions.push({
      decision: decisionAnswers.decision,
      why: decisionAnswers.why,
      impact: decisionAnswers.impact
    });
  }

  // Sync task state back to memory
  memory.task_state = taskState;

  // Save both files
  await writeYaml(taskStatePath, taskState);
  await writeYaml(memoryPath, memory);

  console.log(chalk.green('\n✅ Memory updated'));
  console.log(chalk.blue('Next: ') + chalk.cyan('memo load') + chalk.white(' to see updated briefing'));
}
