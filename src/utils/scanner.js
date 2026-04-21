import fs from 'fs/promises';
import path from 'path';

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.recall', 'dist', 'build', '__pycache__',
  '.next', 'venv', '.cache', 'coverage', '.venv', 'target', 'out'
]);

const CODE_EXTS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp',
  '.c', '.cs', '.rb', '.php', '.swift', '.kt', '.vue', '.svelte',
  '.dart', '.scala', '.sh'
]);

const CONFIG_FILES = new Set([
  'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'Makefile',
  'docker-compose.yml', 'Dockerfile', 'tsconfig.json', '.env.example',
  'pyproject.toml', 'next.config.js', 'vite.config.js', 'webpack.config.js',
  'jest.config.js', 'tailwind.config.js', 'pom.xml', 'build.gradle'
]);

const DOC_EXTS = new Set(['.md', '.txt', '.rst']);

const PRIORITY_NAMES = new Set([
  'index', 'main', 'app', 'server', 'router', 'routes', 'api',
  'handler', 'controller', 'service', 'core', 'init'
]);

export async function scanProject(quick = false) {
  const rootDir = process.cwd();
  const files = {
    code: [],
    config: [],
    docs: [],
    tree: []
  };

  await walkDirectory(rootDir, rootDir, files, 0, 5);

  // Sort code files by priority
  files.code.sort((a, b) => {
    const aName = path.basename(a.path, path.extname(a.path)).toLowerCase();
    const bName = path.basename(b.path, path.extname(b.path)).toLowerCase();
    const aPriority = PRIORITY_NAMES.has(aName) ? 0 : 1;
    const bPriority = PRIORITY_NAMES.has(bName) ? 0 : 1;
    return aPriority - bPriority;
  });

  // Limit files based on mode
  const maxCodeFiles = quick ? 20 : 50;
  const maxCharsPerFile = quick ? 1500 : 2500;

  files.code = files.code.slice(0, maxCodeFiles);

  // Read file contents
  await readFileContents(files.code, maxCharsPerFile);
  await readFileContents(files.config, 2000);
  await readFileContents(files.docs, 3000);

  return files;
}

async function walkDirectory(rootDir, currentDir, files, depth, maxDepth) {
  if (depth > maxDepth) return;

  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        
        if (depth <= 3) {
          files.tree.push({ type: 'dir', path: relativePath, depth });
        }
        
        await walkDirectory(rootDir, fullPath, files, depth + 1, maxDepth);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const basename = path.basename(entry.name);

        if (depth <= 3) {
          files.tree.push({ type: 'file', path: relativePath, depth });
        }

        if (CODE_EXTS.has(ext)) {
          files.code.push({ path: relativePath, fullPath });
        } else if (CONFIG_FILES.has(basename)) {
          files.config.push({ path: relativePath, fullPath });
        } else if (DOC_EXTS.has(ext)) {
          files.docs.push({ path: relativePath, fullPath });
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
}

async function readFileContents(fileList, maxChars) {
  for (const file of fileList) {
    try {
      const content = await fs.readFile(file.fullPath, 'utf8');
      file.content = content.slice(0, maxChars);
      if (content.length > maxChars) {
        file.content += '\n... [truncated]';
      }
    } catch (error) {
      file.content = `[Error reading file: ${error.message}]`;
    }
  }
}

export function buildFileTree(treeItems) {
  const lines = [];
  for (const item of treeItems) {
    const indent = '  '.repeat(item.depth);
    const icon = item.type === 'dir' ? '📁' : '📄';
    lines.push(`${indent}${icon} ${path.basename(item.path)}`);
  }
  return lines.join('\n');
}

export async function getGitInfo() {
  const { execSync } = await import('child_process');
  
  try {
    const log = execSync('git log --oneline -15', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const status = execSync('git status --short', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const branch = execSync('git branch --show-current', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    
    return { log, status, branch, available: true };
  } catch {
    return { log: '', status: '', branch: '', available: false };
  }
}
