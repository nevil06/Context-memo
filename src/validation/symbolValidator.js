/**
 * Symbol Validator
 * Validates symbols exist in registry
 */

import { parseFile } from '../parsers/astParser.js';

/**
 * Validate symbols in code
 */
export async function validateSymbols(code, filePath, registry) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checkedSymbols: 0,
    validSymbols: 0
  };

  try {
    const symbols = await parseFile(code, filePath);
    
    // Validate function references
    for (const func of symbols.functions) {
      result.checkedSymbols++;
      
      // Check for duplicate function names
      const existing = registry.findFunction(func.name);
      if (existing.length > 1) {
        result.warnings.push({
          type: 'duplicate_function',
          message: `Function '${func.name}' defined in multiple files`,
          symbol: func.name,
          locations: existing
        });
      }
      
      result.validSymbols++;
    }

    // Validate class references
    for (const cls of symbols.classes) {
      result.checkedSymbols++;
      
      // Check for duplicate class names
      const existing = registry.findClass(cls.name);
      if (existing.length > 1) {
        result.warnings.push({
          type: 'duplicate_class',
          message: `Class '${cls.name}' defined in multiple files`,
          symbol: cls.name,
          locations: existing
        });
      }
      
      result.validSymbols++;
    }

    // Validate exports
    for (const exp of symbols.exports) {
      result.checkedSymbols++;
      
      // Check if exported symbol exists
      const symbolExists = 
        symbols.functions.some(f => f.name === exp.name) ||
        symbols.classes.some(c => c.name === exp.name) ||
        symbols.variables.some(v => v.name === exp.name);
      
      if (!symbolExists && exp.name !== 'default') {
        result.warnings.push({
          type: 'export_undefined_symbol',
          message: `Exporting undefined symbol: ${exp.name}`,
          symbol: exp.name,
          line: exp.line
        });
      }
      
      result.validSymbols++;
    }

  } catch (error) {
    result.valid = false;
    result.errors.push({
      type: 'parse_error',
      message: `Failed to parse symbols: ${error.message}`,
      file: filePath
    });
  }

  return result;
}

/**
 * Validate function call exists
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
 * Validate class reference exists
 */
export function validateClassReference(className, registry) {
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
 * Validate export exists
 */
export function validateExport(exportName, filePath, registry) {
  const fileSymbols = registry.getFile(filePath);
  
  if (!fileSymbols) {
    return {
      valid: false,
      errors: [{
        type: 'file_not_in_registry',
        message: `File not in registry: ${filePath}`,
        file: filePath
      }],
      warnings: []
    };
  }

  const isExported = fileSymbols.exports?.some(exp => exp.name === exportName);
  
  if (!isExported) {
    return {
      valid: false,
      errors: [{
        type: 'export_not_found',
        message: `Export '${exportName}' not found in ${filePath}`,
        symbol: exportName,
        file: filePath
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
export function validateSymbolList(symbols, registry) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    validated: 0,
    failed: 0
  };

  for (const symbol of symbols) {
    result.validated++;
    
    let validation;
    if (symbol.type === 'function') {
      validation = validateFunctionCall(symbol.name, registry);
    } else if (symbol.type === 'class') {
      validation = validateClassReference(symbol.name, registry);
    } else {
      continue;
    }
    
    if (!validation.valid) {
      result.valid = false;
      result.failed++;
      result.errors.push(...validation.errors);
    }
    
    result.warnings.push(...validation.warnings);
  }

  return result;
}
