import chalk from 'chalk';
import inquirer from 'inquirer';
import { ensureRecallDir, createRecallDir, writeYaml, writeFile, getRecallPath } from '../utils/fileUtils.js';

export default async function initCommand() {
  console.log(chalk.blue('🧠 Initializing context-memo memory layer...\n'));

  const { exists } = await ensureRecallDir();

  if (exists) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: '.recall/ folder already exists. Overwrite?',
      default: false
    }]);

    if (!overwrite) {
      console.log(chalk.yellow('Initialization cancelled.'));
      return;
    }
  }

  await createRecallDir();

  // Create memory.yaml template
  const memoryTemplate = {
    project: {
      name: '',
      purpose: '',
      type: '',
      stack: '',
      entry_points: '',
      environment_vars: [],
      constraints: '',
      non_goals: ''
    },
    knowledge_graph: {
      god_nodes: [],
      components: [],
      data_flow: '',
      api_endpoints: [],
      data_models: [],
      external_services: []
    },
    progress: {
      percent_done: 0,
      phase: 'just_started',
      what_works: [],
      what_is_broken: [],
      what_is_missing: [],
      technical_debt: []
    },
    task_state: {
      last_task: '',
      current_problem: '',
      continue_here: {
        file: '',
        location: '',
        instruction: ''
      },
      next_steps: [],
      blocked_on: 'nothing',
      completed_recently: []
    },
    decisions: [],
    handoff_message: ''
  };

  await writeYaml(getRecallPath('memory.yaml'), memoryTemplate);

  // Create task_state.yaml template
  const taskStateTemplate = {
    last_task: '',
    current_problem: '',
    continue_here: {
      file: '',
      location: '',
      instruction: ''
    },
    next_steps: [],
    blocked_on: 'nothing',
    completed_recently: []
  };

  await writeYaml(getRecallPath('task_state.yaml'), taskStateTemplate);

  // Create decisions.log
  const decisionsLog = `# Decision Log
# Format: [DATE] Decision: <what> | Why: <reason> | Impact: <effect>

`;
  await writeFile(getRecallPath('decisions.log'), decisionsLog);

  // Create .gitkeep with note
  const gitkeepNote = `# Commit this .recall/ folder to your repository
# This allows AI agents to maintain context across sessions and team members
`;
  await writeFile(getRecallPath('.gitkeep'), gitkeepNote);

  console.log(chalk.green('✅ Created .recall/ folder with:'));
  console.log(chalk.gray('   - memory.yaml (blank template)'));
  console.log(chalk.gray('   - task_state.yaml (blank template)'));
  console.log(chalk.gray('   - decisions.log (blank template)'));
  console.log(chalk.gray('   - .gitkeep (commit this folder!)'));
  console.log('');
  console.log(chalk.blue('Next steps:'));
  console.log(chalk.white('1. Set your Gemini API key: ') + chalk.cyan('memo config --key YOUR_KEY'));
  console.log(chalk.white('2. Scan your project: ') + chalk.cyan('memo scan'));
  console.log(chalk.white('3. Load the briefing: ') + chalk.cyan('memo load'));
}
