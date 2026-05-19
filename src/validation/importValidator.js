/**
 * Import Validator
 * Validates import statements against registry
 */

import { parseFile } from '../parsers/astParser.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * Validate all imports in code
 */
export async function validateImports(code, filePath, registry) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checkedImports: 0,
    validImports: 0
  };

  try {
    const symbols = await parseFile(code, filePath);
    
    for (const importStmt of symbols.imports) {
      result.checkedImports++;
      
      const validation = await validateImport(importStmt, filePath, registry);
      
      if (!validation.valid) {
        result.valid = false;
        result.errors.push(...validation.errors);
      }
      
      result.warnings.push(...validation.warnings);
      
      if (validation.valid) {
        result.validImports++;
      }
    }
  } catch (error) {
    result.valid = false;
    result.errors.push({
      type: 'parse_error',
      message: `Failed to parse imports: ${error.message}`,
      file: filePath
    });
  }

  return result;
}

/**
 * Validate single import statement
 */
async function validateImport(importStmt, currentFile, registry) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  const { source, items } = importStmt;

  // Skip external packages (node_modules)
  if (!source.startsWith('.') && !source.startsWith('/')) {
    return result; // External packages assumed valid
  }

  // Resolve import path
  const resolvedPath = resolveImportPath(source, currentFile);

  // Check if source file exists
  const sourceExists = await fileExists(resolvedPath);
  
  if (!sourceExists) {
    // Check in registry
    const registryFile = registry.getFile(resolvedPath);
    
    if (!registryFile) {
      result.valid = false;
      result.errors.push({
        type: 'import_file_not_found',
        message: `Import source not found: ${source}`,
        source,
        resolvedPath,
        line: importStmt.line
      });
      return result;
    }
  }

  // Validate imported symbols
  const sourceSymbols = registry.getFile(resolvedPath);
  
  if (sourceSymbols) {
    for (const item of items) {
      const symbolName = item.imported || item.name;
      
      // Skip namespace and default imports (harder to validate)
      if (item.type === 'namespace' || item.type === 'default') {
        continue;
      }

      // Check if symbol is exported
      const isExported = sourceSymbols.exports?.some(exp => exp.name === symbolName);
      
      if (!isExported) {
        result.valid = false;
        result.errors.push({
          type: 'symbol_not_exported',
          message: `Symbol '${symbolName}' is not exported from ${source}`,
          symbol: symbolName,
          source,
          line: importStmt.line
        });
      }
    }
  } else {
    // File exists but not in registry - warning
    result.warnings.push({
      type: 'import_not_in_registry',
      message: `Import source not in registry: ${source}`,
      source,
      resolvedPath
    });
  }

  return result;
}

/**
 * Resolve import path
 */
function resolveImportPath(importPath, currentFile) {
  if (!importPath.startsWith('.')) {
    return importPath; // External package
  }

  const currentDir = path.dirname(currentFile);
  let resolved = path.join(currentDir, importPath);
  resolved = resolved.replace(/\\/g, '/');

  // Add extension if missing
  if (!path.extname(resolved)) {
    // Try common extensions
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
    for (const ext of extensions) {
      return resolved + ext;
    }
  }

  return resolved;
}

/**
 * Check if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate import statement string
 */
export function validateImportStatement(importStatement) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Check for common import syntax errors
  if (!importStatement.includes('from')) {
    result.valid = false;
    result.errors.push({
      type: 'invalid_import_syntax',
      message: 'Import statement missing "from" keyword'
    });
  }

  // Check for quotes
  if (!importStatement.match(/['"`]/)) {
    result.valid = false;
    result.errors.push({
      type: 'invalid_import_syntax',
      message: 'Import source must be quoted'
    });
  }

  return result;
}
