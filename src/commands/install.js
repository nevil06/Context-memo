import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const AGENT_CONFIGS = {
  claude: {
    dir: '.claude',
    file: 'CLAUDE.md',
    format: 'markdown'
  },
  cursor: {
    dir: '.cursor/rules',
    file: 'context-memo.md',
    format: 'markdown'
  },
  windsurf: {
    dir: '.windsurf/rules',
    file: 'context-memo.md',
    format: 'markdown'
  },
  copilot: {
    dir: '.github',
    file: 'copilot-instructions.md',
    format: 'markdown'
  },
  codex: {
    dir: '.codex',
    file: 'instructions.md',
    format: 'markdown'
  },
  aider: {
    dir: '.',
    file: '.aider.conf.yml',
    format: 'yaml'
  },
  antigravity: {
    dir: '.antigravity/rules',
    file: 'context-memo.md',
    format: 'markdown'
  }
};

const SKILL_CONTENT = `# Context Memo Memory Integration

## Session Start Protocol
1. Check if .recall/memory.yaml exists
2. If it exists, run: memo load --mode=full
3. Read the briefing to understand project context
4. Confirm understanding before proceeding

## Before Token Limit
When approaching token/credit limit:
1. Run: memo update
2. Update continue_here with exact file and instruction
3. Ensure next agent knows where to resume

## Commands Available
- memo init — Initialize memory folder
- memo scan — Scan project and generate memory
- memo load — Load agent briefing
- memo status — View project dashboard
- memo update — Update task state
- memo config — Configure API key

## Key Files
- .recall/memory.yaml — Complete project memory
- .recall/task_state.yaml — Current task state
- .recall/decisions.log — Decision history

## Important
- Always read memory.yaml at session start
- Update continue_here before ending session
- Log important decisions
- Keep handoff_message current
`;

const AIDER_APPEND = `
# Context Memo Integration
read:
  - .recall/memory.yaml
  - .recall/task_state.yaml

# Run 'memo load' at session start to get full context
`;

export default async function installCommand(agent) {
  const agentLower = agent.toLowerCase();
  
  if (!AGENT_CONFIGS[agentLower]) {
    console.log(chalk.red(`❌ Unknown agent: ${agent}`));
    console.log(chalk.white('Supported agents: ') + chalk.cyan(Object.keys(AGENT_CONFIGS).join(', ')));
    return;
  }

  const config = AGENT_CONFIGS[agentLower];
  const dirPath = path.join(process.cwd(), config.dir);
  const filePath = path.join(dirPath, config.file);

  console.log(chalk.blue(`📦 Installing context-memo integration for ${agent}...\n`));

  try {
    // Create directory if needed
    await fs.mkdir(dirPath, { recursive: true });

    if (config.format === 'yaml') {
      // For aider, append to existing file
      try {
        await fs.access(filePath);
        await fs.appendFile(filePath, AIDER_APPEND, 'utf8');
        console.log(chalk.green(`✅ Appended context-memo config to ${config.file}`));
      } catch {
        await fs.writeFile(filePath, AIDER_APPEND.trim(), 'utf8');
        console.log(chalk.green(`✅ Created ${config.file}`));
      }
    } else {
      // For markdown-based agents
      await fs.writeFile(filePath, SKILL_CONTENT, 'utf8');
      console.log(chalk.green(`✅ Created ${config.dir}/${config.file}`));
    }

    console.log('');
    console.log(chalk.blue('Next steps:'));
    console.log(chalk.white('1. Commit the integration file to your repo'));
    console.log(chalk.white('2. Start a new ') + chalk.cyan(agent) + chalk.white(' session'));
    console.log(chalk.white('3. The agent will automatically read .recall/memory.yaml'));
  } catch (error) {
    console.log(chalk.red(`❌ Failed to install: ${error.message}`));
  }
}
