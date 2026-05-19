/**
 * Path Validator
 * Validates file paths and imports resolve correctly
 */

import path from 'path';
import fs from 'fs/promises';

/**
 * Validate paths in code
 */
export async function validatePaths(code, filePath) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    checkedPaths: 0,
    validPaths: 0
  };

  // Extract import paths
  const importPaths = extractImportPaths(code);
  
  for (const importPath of importPaths) {
    result.checkedPaths++;
    
    // Skip external packages
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      result.validPaths++;
      continue;
    }

    // Resolve path
    const resolved = resolvePathFromFile(importPath, filePath);
    
    // Check if path exists
    const exists = await pathExists(resolved);
    
    if (!exists) {
      // Try with common extensions
      const withExtensions = await tryExtensions(resolved);
      
      if (!withExtensions) {
        result.valid = false;
        result.errors.push({
          type: 'path_not_found',
          message: `Path does not exist: ${importPath}`,
          path: importPath,
          resolved
        });
      } else {
        result.validPaths++;
      }
    } else {
      result.validPaths++;
    }
  }

  // Extract require paths
  const requirePaths = extractRequirePaths(code);
  
  for (const requirePath of requirePaths) {
    result.checkedPaths++;
    
    if (!requirePath.startsWith('.') && !requirePath.startsWith('/')) {
      result.validPaths++;
      continue;
    }

    const resolved = resolvePathFromFile(requirePath, filePath);
    const exists = await pathExists(resolved);
    
    if (!exists) {
      const withExtensions = await tryExtensions(resolved);
      
      if (!withExtensions) {
        result.valid = false;
        result.errors.push({
          type: 'path_not_found',
          message: `Path does not exist: ${requirePath}`,
          path: requirePath,
          resolved
        });
      } else {
        result.validPaths++;
      }
    } else {
      result.validPaths++;
    }
  }

  return result;
}

/**
 * Extract import paths from code
 */
function extractImportPaths(code) {
  const paths = [];
  const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    paths.push(match[1]);
  }
  
  return paths;
}

/**
 * Extract require paths from code
 */
function extractRequirePaths(code) {
  const paths = [];
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  
  let match;
  while ((match = requireRegex.exec(code)) !== null) {
    paths.push(match[1]);
  }
  
  return paths;
}

/**
 * Resolve path from current file
 */
function resolvePathFromFile(importPath, currentFile) {
  const currentDir = path.dirname(currentFile);
  let resolved = path.join(currentDir, importPath);
  return path.normalize(resolved);
}

/**
 * Check if path exists
 */
async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Try path with common extensions
 */
async function tryExtensions(basePath) {
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.json'];
  
  for (const ext of extensions) {
    const withExt = basePath + ext;
    if (await pathExists(withExt)) {
      return withExt;
    }
  }
  
  // Try as directory with index file
  const indexPaths = extensions.map(ext => path.join(basePath, `index${ext}`));
  for (const indexPath of indexPaths) {
    if (await pathExists(indexPath)) {
      return indexPath;
    }
  }
  
  return null;
}

/**
 * Validate single path
 */
export async function validatePath(pathToValidate, basePath = process.cwd()) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Resolve path
  const resolved = path.isAbsolute(pathToValidate)
    ? pathToValidate
    : path.join(basePath, pathToValidate);

  // Check if exists
  const exists = await pathExists(resolved);
  
  if (!exists) {
    result.valid = false;
    result.errors.push({
      type: 'path_not_found',
      message: `Path does not exist: ${pathToValidate}`,
      path: pathToValidate,
      resolved
    });
  }

  return result;
}

/**
 * Validate path is within project
 */
export function validatePathInProject(filePath, projectRoot) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  const normalized = path.normalize(filePath);
  const normalizedRoot = path.normalize(projectRoot);

  if (!normalized.startsWith(normalizedRoot)) {
    result.valid = false;
    result.errors.push({
      type: 'path_outside_project',
      message: `Path is outside project root: ${filePath}`,
      path: filePath,
      projectRoot
    });
  }

  return result;
}
