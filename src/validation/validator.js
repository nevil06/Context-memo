/**
 * Validation Engine
 * Post-generation validation pipeline
 */

import { validateImports } from './importValidator.js';
import { validateSymbols } from './symbolValidator.js';
import { validatePaths } from './pathValidator.js';
import { validateSyntax } from './syntaxValidator.js';

/**
 * Validation result structure
 */
export class ValidationResult {
  constructor() {
    this.valid = true;
    this.errors = [];
    this.warnings = [];
    this.checks = {
      imports: null,
      symbols: null,
      paths: null,
      syntax: null
    };
  }

  addError(type, message, details = {}) {
    this.valid = false;
    this.errors.push({ type, message, ...details });
  }

  addWarning(type, message, details = {}) {
    this.warnings.push({ type, message, ...details });
  }

  merge(other) {
    if (!other.valid) this.valid = false;
    this.errors.push(...other.errors);
    this.warnings.push(...other.warnings);
  }

  getReport() {
    return {
      valid: this.valid,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors,
      warnings: this.warnings,
      checks: this.checks
    };
  }
}

/**
 * Main validation pipeline
 */
export async function validateCode(code, filePath, registry, options = {}) {
  const result = new ValidationResult();
  
  const {
    checkImports = true,
    checkSymbols = true,
    checkPaths = true,
    checkSyntax = true
  } = options;

  // Step 1: Syntax validation (must pass first)
  if (checkSyntax) {
    const syntaxResult = await validateSyntax(code, filePath);
    result.checks.syntax = syntaxResult;
    
    if (!syntaxResult.valid) {
      result.merge(syntaxResult);
      // If syntax is invalid, skip other checks
      return result;
    }
  }

  // Step 2: Import validation
  if (checkImports && registry) {
    const importResult = await validateImports(code, filePath, registry);
    result.checks.imports = importResult;
    result.merge(importResult);
  }

  // Step 3: Symbol validation
  if (checkSymbols && registry) {
    const symbolResult = await validateSymbols(code, filePath, registry);
    result.checks.symbols = symbolResult;
    result.merge(symbolResult);
  }

  // Step 4: Path validation
  if (checkPaths) {
    const pathResult = await validatePaths(code, filePath);
    result.checks.paths = pathResult;
    result.merge(pathResult);
  }

  return result;
}

/**
 * Validate multiple files
 */
export async function validateFiles(files, registry, options = {}) {
  const results = new Map();
  
  for (const [filePath, code] of Object.entries(files)) {
    const result = await validateCode(code, filePath, registry, options);
    results.set(filePath, result);
  }
  
  return results;
}

/**
 * Validate generated edit
 */
export async function validateEdit(edit, registry) {
  const { file, newContent, oldContent } = edit;
  
  const result = await validateCode(newContent, file, registry);
  
  // Additional checks for edits
  if (oldContent) {
    // Check if edit breaks existing exports
    const oldExports = await extractExports(oldContent, file);
    const newExports = await extractExports(newContent, file);
    
    const removedExports = oldExports.filter(e => !newExports.includes(e));
    if (removedExports.length > 0) {
      result.addWarning(
        'exports_removed',
        `Exports removed: ${removedExports.join(', ')}`,
        { removedExports }
      );
    }
  }
  
  return result;
}

/**
 * Extract exports from code
 */
async function extractExports(code, filePath) {
  try {
    const { parseFile } = await import('../parsers/astParser.js');
    const symbols = await parseFile(code, filePath);
    return symbols.exports.map(e => e.name);
  } catch (error) {
    return [];
  }
}

/**
 * Generate validation report
 */
export function generateValidationReport(results) {
  const report = {
    totalFiles: results.size,
    validFiles: 0,
    invalidFiles: 0,
    totalErrors: 0,
    totalWarnings: 0,
    errorsByType: {},
    warningsByType: {},
    files: {}
  };

  for (const [filePath, result] of results.entries()) {
    if (result.valid) {
      report.validFiles++;
    } else {
      report.invalidFiles++;
    }

    report.totalErrors += result.errors.length;
    report.totalWarnings += result.warnings.length;

    // Count by type
    for (const error of result.errors) {
      report.errorsByType[error.type] = (report.errorsByType[error.type] || 0) + 1;
    }
    for (const warning of result.warnings) {
      report.warningsByType[warning.type] = (report.warningsByType[warning.type] || 0) + 1;
    }

    report.files[filePath] = result.getReport();
  }

  return report;
}

/**
 * Check if validation passed
 */
export function isValidationPassed(results) {
  for (const result of results.values()) {
    if (!result.valid) return false;
  }
  return true;
}
