import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

let scanTimeout = null;
const DEBOUNCE_MS = 10000; // Wait 10 seconds after last change

export default async function watchCommand(options) {
  console.log(chalk.blue('👀 Watching project for changes...\n'));
  console.log(chalk.gray('Auto-scan will trigger 10 seconds after file changes'));
  console.log(chalk.gray('Incremental scans will be used to save tokens'));
  console.log(chalk.gray('Press Ctrl+C to stop\n'));

  const projectDir = process.cwd();
  const skipDirs = ['node_modules', '.git', '.recall', 'dist', 'build', '__pycache__', '.next', 'venv', '.cache', 'coverage'];

  // Initial scan
  console.log(chalk.yellow('🔍 Running initial scan...'));
  try {
    execSync('node bin/memo.js scan --quick', { stdio: 'inherit', cwd: projectDir });
  } catch (error) {
    console.log(chalk.red('Initial scan failed'));
  }

  const changedFiles = new Set();

  // Watch for changes
  const watcher = fs.watch(projectDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    // Skip ignored directories
    const shouldSkip = skipDirs.some(dir => filename.includes(dir));
    if (shouldSkip) return;

    // Only watch code files
    const ext = path.extname(filename);
    const codeExts = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.cs', '.rb', '.php'];
    if (!codeExts.includes(ext)) return;

    changedFiles.add(filename);
    console.log(chalk.gray(`📝 Changed: ${filename}`));

    // Debounce: wait for changes to settle
    if (scanTimeout) {
      clearTimeout(scanTimeout);
    }

    scanTimeout = setTimeout(() => {
      console.log(chalk.yellow(`\n🔍 Auto-scanning ${changedFiles.size} changed file(s)...`));
      console.log(chalk.cyan('   ✓ Using incremental scan (saves tokens)'));
      
      changedFiles.clear();
      
      try {
        execSync('node bin/memo.js scan --quick', { stdio: 'inherit', cwd: projectDir });
        console.log(chalk.green('✅ Memory updated\n'));
      } catch (error) {
        console.log(chalk.red('❌ Scan failed\n'));
      }
    }, DEBOUNCE_MS);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Stopping watch mode...'));
    watcher.close();
    process.exit(0);
  });
}
