/**
 * Syntax Validator
 * Validates code syntax using parser
 */

import { parse } from '@babel/parser';

/**
 * Validate JavaScript/TypeScript syntax
 */
export async function validateSyntax(code, filePath) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    // Try parsing with full plugin support
    parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'asyncGenerators',
        'bigInt',
        'classPrivateProperties',
        'classPrivateMethods',
        'doExpressions',
        'functionBind',
        'functionSent',
        'importMeta',
        'logicalAssignment',
        'nullishCoalescingOperator',
        'numericSeparator',
        'objectRestSpread',
        'optionalCatchBinding',
        'optionalChaining',
        'throwExpressions'
      ],
      errorRecovery: false
    });
  } catch (error) {
    // Try fallback without TypeScript
    try {
      parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'dynamicImport'],
        errorRecovery: false
      });
    } catch (fallbackError) {
      result.valid = false;
      result.errors.push({
        type: 'syntax_error',
        message: error.message,
        file: filePath,
        line: error.loc?.line,
        column: error.loc?.column,
        code: error.code
      });
    }
  }

  return result;
}

/**
 * Validate JSON syntax
 */
export function validateJSON(jsonString) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  try {
    JSON.parse(jsonString);
  } catch (error) {
    result.valid = false;
    result.errors.push({
      type: 'json_syntax_error',
      message: error.message
    });
  }

  return result;
}

/**
 * Check for common syntax issues
 */
export function checkCommonIssues(code) {
  const issues = [];

  // Check for unmatched brackets
  const brackets = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    
    if (char in brackets) {
      stack.push(char);
    } else if (Object.values(brackets).includes(char)) {
      const last = stack.pop();
      if (brackets[last] !== char) {
        issues.push({
          type: 'unmatched_bracket',
          message: `Unmatched bracket at position ${i}`,
          position: i
        });
      }
    }
  }

  if (stack.length > 0) {
    issues.push({
      type: 'unclosed_bracket',
      message: `Unclosed brackets: ${stack.join(', ')}`,
      count: stack.length
    });
  }

  // Check for unterminated strings
  const stringRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
  const strings = code.match(stringRegex) || [];
  const quotes = (code.match(/['"`]/g) || []).length;
  
  if (quotes % 2 !== 0) {
    issues.push({
      type: 'unterminated_string',
      message: 'Possible unterminated string literal'
    });
  }

  return issues;
}

/**
 * Validate code structure
 */
export function validateStructure(code) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Check for empty file
  if (code.trim().length === 0) {
    result.warnings.push({
      type: 'empty_file',
      message: 'File is empty'
    });
  }

  // Check for very long lines
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 500) {
      result.warnings.push({
        type: 'long_line',
        message: `Line ${i + 1} is very long (${lines[i].length} characters)`,
        line: i + 1,
        length: lines[i].length
      });
    }
  }

  // Check for common issues
  const issues = checkCommonIssues(code);
  for (const issue of issues) {
    result.warnings.push(issue);
  }

  return result;
}
