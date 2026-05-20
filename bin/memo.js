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

const program = new Command();

program
  .name('memo')
  .description('Persistent AI memory layer — switch agents without losing context')
  .version('2.0.0');

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

program.parse();
