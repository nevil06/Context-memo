/**
 * JavaScript/TypeScript AST Parser
 * Uses Babel parser for accurate symbol extraction
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import path from 'path';

/**
 * Parse JavaScript/TypeScript file
 * @param {string} content - Source code
 * @param {string} filePath - File path
 * @returns {Object} Extracted symbols
 */
export async function parseJavaScript(content, filePath) {
  const symbols = {
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    variables: [],
    interfaces: [],
    types: []
  };

  let ast;
  try {
    ast = parse(content, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom'
      ],
      errorRecovery: true
    });
  } catch (error) {
    // Fallback: try without TypeScript
    try {
      ast = parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'dynamicImport'],
        errorRecovery: true
      });
    } catch (fallbackError) {
      throw new Error(`Failed to parse: ${error.message}`);
    }
  }

  // Traverse AST and extract symbols
  traverse.default(ast, {
    // Import declarations
    ImportDeclaration(path) {
      const importNode = path.node;
      const source = importNode.source.value;
      const items = [];

      for (const specifier of importNode.specifiers) {
        if (specifier.type === 'ImportDefaultSpecifier') {
          items.push({ name: specifier.local.name, type: 'default' });
        } else if (specifier.type === 'ImportNamespaceSpecifier') {
          items.push({ name: specifier.local.name, type: 'namespace' });
        } else if (specifier.type === 'ImportSpecifier') {
          items.push({
            name: specifier.local.name,
            imported: specifier.imported.name,
            type: 'named'
          });
        }
      }

      symbols.imports.push({
        source: resolveImportPath(source, filePath),
        items,
        line: importNode.loc?.start.line || 0
      });
    },

    // Export declarations
    ExportNamedDeclaration(path) {
      const exportNode = path.node;

      if (exportNode.declaration) {
        extractExportedDeclaration(exportNode.declaration, symbols);
      }

      if (exportNode.specifiers) {
        for (const specifier of exportNode.specifiers) {
          symbols.exports.push({
            name: specifier.exported.name,
            type: 'named',
            line: exportNode.loc?.start.line || 0
          });
        }
      }
    },

    ExportDefaultDeclaration(path) {
      const exportNode = path.node;
      const declaration = exportNode.declaration;

      if (declaration.type === 'Identifier') {
        symbols.exports.push({
          name: declaration.name,
          type: 'default',
          line: exportNode.loc?.start.line || 0
        });
      } else if (declaration.type === 'FunctionDeclaration' && declaration.id) {
        symbols.exports.push({
          name: declaration.id.name,
          type: 'default',
          line: exportNode.loc?.start.line || 0
        });
      } else if (declaration.type === 'ClassDeclaration' && declaration.id) {
        symbols.exports.push({
          name: declaration.id.name,
          type: 'default',
          line: exportNode.loc?.start.line || 0
        });
      } else {
        symbols.exports.push({
          name: 'default',
          type: 'default',
          line: exportNode.loc?.start.line || 0
        });
      }
    },

    // Function declarations
    FunctionDeclaration(path) {
      const funcNode = path.node;
      if (funcNode.id) {
        symbols.functions.push({
          name: funcNode.id.name,
          params: funcNode.params.map(p => getParamName(p)),
          async: funcNode.async,
          generator: funcNode.generator,
          line: funcNode.loc?.start.line || 0
        });
      }
    },

    // Arrow functions and function expressions
    VariableDeclarator(path) {
      const node = path.node;
      if (node.id.type === 'Identifier' && node.init) {
        if (node.init.type === 'ArrowFunctionExpression' || 
            node.init.type === 'FunctionExpression') {
          symbols.functions.push({
            name: node.id.name,
            params: node.init.params.map(p => getParamName(p)),
            async: node.init.async,
            arrow: node.init.type === 'ArrowFunctionExpression',
            line: node.loc?.start.line || 0
          });
        } else {
          // Regular variable
          symbols.variables.push({
            name: node.id.name,
            line: node.loc?.start.line || 0
          });
        }
      }
    },

    // Class declarations
    ClassDeclaration(path) {
      const classNode = path.node;
      if (classNode.id) {
        const methods = [];
        
        for (const item of classNode.body.body) {
          if (item.type === 'ClassMethod' || item.type === 'ClassProperty') {
            methods.push({
              name: item.key.name || item.key.value,
              kind: item.kind || 'method',
              static: item.static,
              line: item.loc?.start.line || 0
            });
          }
        }

        symbols.classes.push({
          name: classNode.id.name,
          methods,
          superClass: classNode.superClass?.name || null,
          line: classNode.loc?.start.line || 0
        });
      }
    },

    // TypeScript interfaces
    TSInterfaceDeclaration(path) {
      const interfaceNode = path.node;
      symbols.interfaces.push({
        name: interfaceNode.id.name,
        line: interfaceNode.loc?.start.line || 0
      });
    },

    // TypeScript type aliases
    TSTypeAliasDeclaration(path) {
      const typeNode = path.node;
      symbols.types.push({
        name: typeNode.id.name,
        line: typeNode.loc?.start.line || 0
      });
    }
  });

  return symbols;
}

/**
 * Extract exported declaration
 */
function extractExportedDeclaration(declaration, symbols) {
  if (declaration.type === 'FunctionDeclaration' && declaration.id) {
    symbols.exports.push({
      name: declaration.id.name,
      type: 'function',
      line: declaration.loc?.start.line || 0
    });
  } else if (declaration.type === 'ClassDeclaration' && declaration.id) {
    symbols.exports.push({
      name: declaration.id.name,
      type: 'class',
      line: declaration.loc?.start.line || 0
    });
  } else if (declaration.type === 'VariableDeclaration') {
    for (const declarator of declaration.declarations) {
      if (declarator.id.type === 'Identifier') {
        symbols.exports.push({
          name: declarator.id.name,
          type: 'variable',
          line: declaration.loc?.start.line || 0
        });
      }
    }
  }
}

/**
 * Get parameter name from AST node
 */
function getParamName(param) {
  if (param.type === 'Identifier') {
    return param.name;
  } else if (param.type === 'RestElement' && param.argument.type === 'Identifier') {
    return `...${param.argument.name}`;
  } else if (param.type === 'AssignmentPattern' && param.left.type === 'Identifier') {
    return param.left.name;
  }
  return 'unknown';
}

/**
 * Resolve import path
 */
function resolveImportPath(importPath, currentFile) {
  // External package
  if (!importPath.startsWith('.')) {
    return importPath;
  }

  // Resolve relative path
  const currentDir = path.dirname(currentFile);
  let resolved = path.join(currentDir, importPath);
  resolved = resolved.replace(/\\/g, '/');

  // Add extension if missing
  if (!path.extname(resolved)) {
    return resolved + '.js';
  }

  return resolved;
}
