/**
 * AST Parser Interface
 * Provides language-agnostic interface for parsing source files
 */

import { parseJavaScript } from './jsParser.js';

const PARSERS = {
  '.js': parseJavaScript,
  '.mjs': parseJavaScript,
  '.cjs': parseJavaScript,
  '.jsx': parseJavaScript,
  '.ts': parseJavaScript,
  '.tsx': parseJavaScript
};

/**
 * Parse a source file and extract symbols
 * @param {string} content - File content
 * @param {string} filePath - File path for context
 * @returns {Object} Parsed symbols
 */
export async function parseFile(content, filePath) {
  const ext = getExtension(filePath);
  const parser = PARSERS[ext];

  if (!parser) {
    throw new Error(`No parser available for ${ext}`);
  }

  try {
    return await parser(content, filePath);
  } catch (error) {
    throw new Error(`Parse error in ${filePath}: ${error.message}`);
  }
}

/**
 * Check if file type is supported
 */
export function isSupported(filePath) {
  const ext = getExtension(filePath);
  return ext in PARSERS;
}

/**
 * Get file extension
 */
function getExtension(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

/**
 * Get list of supported extensions
 */
export function getSupportedExtensions() {
  return Object.keys(PARSERS);
}
