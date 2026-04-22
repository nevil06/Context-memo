import fs from 'fs/promises';
import { getRecallPath, fileExists } from './fileUtils.js';

const HASH_FILE = 'file_hashes.json';

/**
 * Load previous file hashes
 */
export async function loadPreviousHashes() {
  const hashPath = getRecallPath(HASH_FILE);
  
  if (!await fileExists(hashPath)) {
    return {};
  }

  try {
    const content = await fs.readFile(hashPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

/**
 * Save current file hashes
 */
export async function saveCurrentHashes(hashes) {
  const hashPath = getRecallPath(HASH_FILE);
  await fs.writeFile(hashPath, JSON.stringify(hashes, null, 2), 'utf8');
}

/**
 * Check if this is the first scan
 */
export async function isFirstScan() {
  const hashPath = getRecallPath(HASH_FILE);
  return !await fileExists(hashPath);
}
