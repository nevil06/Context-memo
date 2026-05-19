/**
 * Repository Tools
 * Tool definitions for enforced repository access
 */

/**
 * Tool registry
 */
export const TOOLS = {
  read_file: {
    name: 'read_file',
    description: 'Read a file from the repository',
    parameters: {
      path: { type: 'string', required: true, description: 'File path' }
    },
    category: 'read'
  },

  get_exports: {
    name: 'get_exports',
    description: 'Get exports from a file',
    parameters: {
      file: { type: 'string', required: true, description: 'File path' }
    },
    category: 'read'
  },

  get_imports: {
    name: 'get_imports',
    description: 'Get imports from a file',
    parameters: {
      file: { type: 'string', required: true, description: 'File path' }
    },
    category: 'read'
  },

  trace_dependencies: {
    name: 'trace_dependencies',
    description: 'Trace dependencies of a symbol',
    parameters: {
      symbol: { type: 'string', required: true, description: 'Symbol name' },
      file: { type: 'string', required: false, description: 'File path (optional)' }
    },
    category: 'read'
  },

  verify_symbol: {
    name: 'verify_symbol',
    description: 'Verify if a symbol exists',
    parameters: {
      name: { type: 'string', required: true, description: 'Symbol name' },
      file: { type: 'string', required: false, description: 'File path (optional)' }
    },
    category: 'read'
  },

  parse_ast: {
    name: 'parse_ast',
    description: 'Parse file and extract AST symbols',
    parameters: {
      file: { type: 'string', required: true, description: 'File path' }
    },
    category: 'read'
  },

  get_file_metrics: {
    name: 'get_file_metrics',
    description: 'Get metrics for a file',
    parameters: {
      file: { type: 'string', required: true, description: 'File path' }
    },
    category: 'read'
  },

  find_symbol: {
    name: 'find_symbol',
    description: 'Find where a symbol is defined',
    parameters: {
      symbol: { type: 'string', required: true, description: 'Symbol name' },
      type: { type: 'string', required: false, description: 'Symbol type (function/class)' }
    },
    category: 'read'
  },

  get_dependents: {
    name: 'get_dependents',
    description: 'Get files that depend on this file',
    parameters: {
      file: { type: 'string', required: true, description: 'File path' }
    },
    category: 'read'
  },

  calculate_impact: {
    name: 'calculate_impact',
    description: 'Calculate impact of changing files',
    parameters: {
      files: { type: 'array', required: true, description: 'Array of file paths' }
    },
    category: 'read'
  },

  validate_code: {
    name: 'validate_code',
    description: 'Validate code for errors',
    parameters: {
      code: { type: 'string', required: true, description: 'Code to validate' },
      file: { type: 'string', required: true, description: 'File path' }
    },
    category: 'validation'
  },

  validate_import: {
    name: 'validate_import',
    description: 'Validate an import statement',
    parameters: {
      source: { type: 'string', required: true, description: 'Import source' },
      symbol: { type: 'string', required: true, description: 'Imported symbol' }
    },
    category: 'validation'
  }
};

/**
 * Get tool by name
 */
export function getTool(name) {
  return TOOLS[name];
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category) {
  return Object.values(TOOLS).filter(tool => tool.category === category);
}

/**
 * Get all tool names
 */
export function getToolNames() {
  return Object.keys(TOOLS);
}

/**
 * Validate tool parameters
 */
export function validateToolParameters(toolName, params) {
  const tool = TOOLS[toolName];
  
  if (!tool) {
    return {
      valid: false,
      errors: [`Unknown tool: ${toolName}`]
    };
  }

  const errors = [];

  // Check required parameters
  for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
    if (paramDef.required && !(paramName in params)) {
      errors.push(`Missing required parameter: ${paramName}`);
    }

    // Type checking
    if (paramName in params) {
      const value = params[paramName];
      const expectedType = paramDef.type;

      if (expectedType === 'string' && typeof value !== 'string') {
        errors.push(`Parameter ${paramName} must be a string`);
      } else if (expectedType === 'array' && !Array.isArray(value)) {
        errors.push(`Parameter ${paramName} must be an array`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate tool documentation
 */
export function generateToolDocs() {
  const docs = [];

  for (const [name, tool] of Object.entries(TOOLS)) {
    const params = Object.entries(tool.parameters)
      .map(([pName, pDef]) => {
        const required = pDef.required ? '(required)' : '(optional)';
        return `  - ${pName}: ${pDef.type} ${required} - ${pDef.description}`;
      })
      .join('\n');

    docs.push(`
${name}
  ${tool.description}
  Category: ${tool.category}
  Parameters:
${params}
`);
  }

  return docs.join('\n');
}
