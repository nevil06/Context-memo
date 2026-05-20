#!/usr/bin/env node

import { Command } from 'commander';
import initCommand from '../src/commands/init.js';
import scanCommand from '../src/commands/scan.js';
import updateCommand from '../src/commands/update.js';
import loadCommand from '../src/commands/load.js';
import statusCommand from '../src/commands/status.js';
import installCommand from '../src/commands/install.js';
import configCommand from '../src/commands/config.js';
import watchCommand from '../src/commands/watch.js';
import validateCommand from '../src/commands/validate.js';
import { executeHealthCommand } from '../src/commands/health.js';
import { executeTrustCommand } from '../src/commands/trust.js';
import { executeTimelineCommand } from '../src/commands/timeline.js';
import { executeLocalCommand } from '../src/commands/local.js';

const program = new Command();

program
  .name('memo')
  .description('Persistent AI memory layer — switch agents without losing context')
  .version('2.1.0');

program
  .command('init')
  .description('Initialize .recall/ folder in current project')
  .action(initCommand);

program
  .command('scan')
  .description('Scan project and generate memory with Gemini')
  .option('--quick', 'Quick scan with fewer files')
  .option('--local', 'Local-only scan without API (privacy mode)')
  .action(scanCommand);

program
  .command('update [message]')
  .description('Update task state and progress')
  .action(updateCommand);

program
  .command('load')
  .description('Load and display agent briefing')
  .option('--mode <mode>', 'Briefing mode: quick|full|onboard', 'full')
  .action(loadCommand);

program
  .command('status')
  .description('Show project status dashboard')
  .action(statusCommand);

program
  .command('install <agent>')
  .description('Install recall integration for AI agent')
  .action(installCommand);

program
  .command('config')
  .description('Configure recall settings')
  .option('--key <key>', 'Set Gemini API key')
  .option('--show', 'Show current configuration')
  .action(configCommand);

program
  .command('watch')
  .description('Watch project and auto-scan on file changes')
  .action(watchCommand);

program
  .command('validate')
  .description('Validate repository code for errors')
  .option('-v, --verbose', 'Show detailed validation output')
  .option('-s, --save', 'Save validation report to file')
  .action(validateCommand);

program
  .command('health')
  .description('Display repository health dashboard')
  .option('--format <format>', 'Output format: full|summary', 'full')
  .option('-s, --save', 'Save health report to file')
  .action((options) => executeHealthCommand(options));

program
  .command('trust')
  .description('Display AI trust meter and confidence metrics')
  .option('--format <format>', 'Output format: full|summary', 'full')
  .option('-s, --save', 'Save trust report to file')
  .action((options) => executeTrustCommand(options));

program
  .command('timeline')
  .description('Display edit replay timeline')
  .option('--file <file>', 'Show timeline for specific file')
  .option('--compare <ids>', 'Compare two changes (comma-separated IDs)')
  .option('--limit <number>', 'Limit number of events', '10')
  .option('-s, --save', 'Save timeline report to file')
  .action((options) => executeTimelineCommand(options));

program
  .command('local <action>')
  .description('Manage local-first runtime (actions: init, status, test, search, analyze, embeddings)')
  .option('--provider <provider>', 'Model provider (ollama)', 'ollama')
  .option('--model <model>', 'Model name', 'llama2')
  .option('--embedding-model <model>', 'Embedding model', 'nomic-embed-text')
  .option('--api-url <url>', 'API URL', 'http://localhost:11434')
  .option('--type <type>', 'Test type (model, embedding, both)', 'both')
  .option('--query <query>', 'Search query')
  .option('--documents <docs>', 'Documents to search (JSON array)')
  .option('--code <code>', 'Code to analyze')
  .option('--task <task>', 'Analysis task (explain, review, optimize, document)', 'explain')
  .option('--action <action>', 'Embeddings action (stats, clear, export)', 'stats')
  .action((action, options) => executeLocalCommand(action, options));

program.parse();
