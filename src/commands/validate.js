/**
 * Validate Command
 * Standalone validation of repository code
 */

import chalk from 'chalk';
import { ensureRecallDir, getRecallPath } from '../utils/fileUtils.js';
import { createRegistry } from '../registry/symbolRegistry.js';
import { validateCode, generateValidationReport } from '../validation/validator.js';
import { scanProject } from '../utils/scanner.js';
import fs from 'fs/promises';

export default async function validateCommand(options) {
  console.log(chalk.blue('🔍 Validating repository...\n'));

  // Check if .recall exists
  const { exists } = await ensureRecallDir();
  if (!exists) {
    console.log(chalk.red('❌ .recall/ folder not found. Run: memo init'));
    return;
  }

  // Load symbol registry
  console.log(chalk.gray('Loading symbol registry...'));
  const registry = createRegistry();
  const loaded = await registry.load();
  
  if (!loaded) {
    console.log(chalk.yellow('⚠️  No symbol registry found. Run: memo scan'));
    console.log(chalk.gray('Continuing with limited validation...\n'));
  } else {
    const stats = registry.getStats();
    console.log(chalk.green(`✅ Registry loaded: ${stats.files} files, ${stats.functions} functions\n`));
  }

  // Scan files
  console.log(chalk.gray('Scanning files...'));
  const files = await scanProject(false);
  console.log(chalk.green(`✅ Found ${files.code.length} code files\n`));

  // Validate each file
  console.log(chalk.gray('Validating files...\n'));
  const results = new Map();
  let validCount = 0;
  let invalidCount = 0;

  for (const file of files.code) {
    try {
      const content = await fs.readFile(file.fullPath, 'utf8');
      const result = await validateCode(content, file.path, registry, {
        checkImports: loaded,
        checkSymbols: loaded,
        checkPaths: true,
        checkSyntax: true
      });

      results.set(file.path, result);

      if (result.valid) {
        validCount++;
        if (options.verbose) {
          console.log(chalk.green(`  ✓ ${file.path}`));
        }
      } else {
        invalidCount++;
        console.log(chalk.red(`  ✗ ${file.path}`));
        
        // Show errors
        for (const error of result.errors) {
          console.log(chalk.red(`    - ${error.message}`));
          if (error.line) {
            console.log(chalk.gray(`      Line ${error.line}`));
          }
        }
      }

      // Show warnings if verbose
      if (options.verbose && result.warnings.length > 0) {
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`    ⚠ ${warning.message}`));
        }
      }
    } catch (error) {
      console.log(chalk.red(`  ✗ ${file.path}: ${error.message}`));
      invalidCount++;
    }
  }

  // Generate report
  console.log('\n' + chalk.gray('─'.repeat(60)));
  console.log(chalk.bold('\n📊 Validation Report\n'));

  const report = generateValidationReport(results);

  console.log(chalk.white(`Total Files: ${report.totalFiles}`));
  console.log(chalk.green(`Valid: ${report.validFiles}`));
  console.log(chalk.red(`Invalid: ${report.invalidFiles}`));
  console.log(chalk.red(`Total Errors: ${report.totalErrors}`));
  console.log(chalk.yellow(`Total Warnings: ${report.totalWarnings}`));

  if (report.totalErrors > 0) {
    console.log(chalk.bold('\n❌ Errors by Type:'));
    for (const [type, count] of Object.entries(report.errorsByType)) {
      console.log(chalk.red(`  ${type}: ${count}`));
    }
  }

  if (report.totalWarnings > 0 && options.verbose) {
    console.log(chalk.bold('\n⚠️  Warnings by Type:'));
    for (const [type, count] of Object.entries(report.warningsByType)) {
      console.log(chalk.yellow(`  ${type}: ${count}`));
    }
  }

  // Save report
  if (options.save) {
    const reportPath = getRecallPath('validation_report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(chalk.gray(`\n📄 Report saved to ${reportPath}`));
  }

  // Exit code
  if (report.invalidFiles > 0) {
    console.log(chalk.red('\n❌ Validation failed'));
    process.exit(1);
  } else {
    console.log(chalk.green('\n✅ Validation passed'));
  }
}
