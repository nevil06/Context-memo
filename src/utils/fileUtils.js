import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';

export async function ensureRecallDir() {
  const recallDir = path.join(process.cwd(), '.recall');
  try {
    await fs.access(recallDir);
    return { exists: true, path: recallDir };
  } catch {
    return { exists: false, path: recallDir };
  }
}

export async function createRecallDir() {
  const recallDir = path.join(process.cwd(), '.recall');
  await fs.mkdir(recallDir, { recursive: true });
  return recallDir;
}

export async function writeYaml(filePath, data) {
  const yamlContent = yaml.dump(data, { lineWidth: -1, noRefs: true });
  await fs.writeFile(filePath, yamlContent, 'utf8');
}

export async function readYaml(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return yaml.load(content);
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeFile(filePath, content) {
  await fs.writeFile(filePath, content, 'utf8');
}

export async function readFile(filePath) {
  return await fs.readFile(filePath, 'utf8');
}

export function getRecallPath(filename) {
  return path.join(process.cwd(), '.recall', filename);
}

export async function appendToFile(filePath, content) {
  await fs.appendFile(filePath, content, 'utf8');
}
