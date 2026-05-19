/**
 * Symbol Validator
 * Validates symbols against the registry
 */

/**
 * Validate import statement
 */
export function validateImport(importStatement, registry) {
  const errors = [];
  const warnings = [];

  const { source, items } = importStatement;

  // Check if source file exists in registry
  const sourceSymbols = registry.getFile(source);
  
  if (!sourceSymbols) {
    // Check if it's an external package
    if (source.startsWith('.')) {
      errors.push({
        type: 'missing_file',
        message: `Import source not found: ${source}`,
        source
      });
    }
    // External packages are assumed valid
    return { valid: errors.length === 0, errors, warnings };
  }

  // Validate each imported symbol
  for (const item of items) {
    const symbolName = item.imported || item.name;
    
    if (item.type === 'namespace' || item.type === 'default') {
      // Namespace and default imports are harder to validate
      continue;
    }

    const isExported = sourceSymbols.exports?.some(exp => exp.name === symbolName);
    
    if (!isExported) {
      errors.push({
        type: 'symbol_not_exported',
        message: `Symbol '${symbolName}' is not exported from ${source}`,
        symbol: symbolName,
        source
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate function call
 */
export function validateFunctionCall(functionName, registry) {
  const locations = registry.findFunction(functionName);
  
  if (locations.length === 0) {
    return {
      valid: false,
      errors: [{
        type: 'function_not_found',
        message: `Function '${functionName}' not found in registry`,
        symbol: functionName
      }],
      warnings: []
    };
  }

  return {
    valid: true,
    errors: [],
    warnings: [],
    locations
  };
}

/**
 * Validate class reference
 */
export function validateClass(className, registry) {
  const locations = registry.findClass(className);
  
  if (locations.length === 0) {
    return {
      valid: false,
      errors: [{
        type: 'class_not_found',
        message: `Class '${className}' not found in registry`,
        symbol: className
      }],
      warnings: []
    };
  }

  return {
    valid: true,
    errors: [],
    warnings: [],
    locations
  };
}

/**
 * Validate all imports in a file
 */
export function validateFileImports(filePath, registry) {
  const fileSymbols = registry.getFile(filePath);
  
  if (!fileSymbols) {
    return {
      valid: false,
      errors: [{
        type: 'file_not_found',
        message: `File not found in registry: ${filePath}`,
        file: filePath
      }],
      warnings: []
    };
  }

  const allErrors = [];
  const allWarnings = [];

  for (const importStatement of fileSymbols.imports || []) {
    const result = validateImport(importStatement, registry);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Validate symbol exists
 */
export function validateSymbolExists(symbolName, symbolType, registry) {
  const exists = registry.verifySymbol(symbolName, symbolType);
  
  if (!exists) {
    return {
      valid: false,
      errors: [{
        type: 'symbol_not_found',
        message: `Symbol '${symbolName}' of type '${symbolType}' not found`,
        symbol: symbolName,
        symbolType
      }],
      warnings: []
    };
  }

  return {
    valid: true,
    errors: [],
    warnings: []
  };
}

/**
 * Batch validate symbols
 */
export function validateSymbols(symbols, registry) {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    validated: 0,
    failed: 0
  };

  for (const symbol of symbols) {
    const result = validateSymbolExists(symbol.name, symbol.type, registry);
    results.validated++;
    
    if (!result.valid) {
      results.valid = false;
      results.failed++;
      results.errors.push(...result.errors);
    }
    
    results.warnings.push(...result.warnings);
  }

  return results;
}

/**
 * Generate validation report
 */
export function generateValidationReport(validationResults) {
  const report = {
    summary: {
      total: validationResults.validated || 0,
      passed: (validationResults.validated || 0) - (validationResults.failed || 0),
      failed: validationResults.failed || 0,
      warnings: validationResults.warnings?.length || 0
    },
    errors: validationResults.errors || [],
    warnings: validationResults.warnings || [],
    valid: validationResults.valid
  };

  return report;
}
