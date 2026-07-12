import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execFileAsync = promisify(execFile);
const HISTORY_BIN = 'ctx'; // Local history search CLI executable

/**
 * HistoryRetriever
 * Integrates with the local history CLI to retrieve past session history
 */
export class HistoryRetriever {
  constructor(options = {}) {
    this.log = options.log || (() => {});
    this.limit = options.limit !== undefined ? options.limit : 5;
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.available = null;
  }

  /**
   * Check if history CLI is installed and available
   */
  async isAvailable() {
    if (!this.enabled) return false;
    if (this.available !== null) return this.available;

    try {
      // Runs sources check to see if CLI is installed
      await execFileAsync(HISTORY_BIN, ['sources', '--json']);
      this.available = true;
    } catch (error) {
      this.available = false;
    }
    return this.available;
  }

  /**
   * Retrieve history for a single file
   */
  async retrieveForFile(filePath, options = {}) {
    const limit = options.limit !== undefined ? options.limit : this.limit;

    if (!(await this.isAvailable())) {
      return [];
    }

    try {
      // Normalize path separator to forward slashes for matching consistency
      const normalizedPath = filePath.replace(/\\/g, '/');
      const { stdout } = await execFileAsync(HISTORY_BIN, [
        'search',
        '--file',
        normalizedPath,
        '--json',
        '--limit',
        String(limit),
      ]);

      const parsed = JSON.parse(stdout);
      if (Array.isArray(parsed)) {
        return parsed.map((event) => ({
          sessionId: event.sessionId || event.session_id || '',
          eventId: event.eventId || event.event_id || '',
          provider: event.provider || '',
          snippet: event.snippet || event.text || '',
        }));
      }
      return [];
    } catch (error) {
      this.log(`Error retrieving history for ${filePath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Retrieve history for multiple changed files using caching to avoid redundant calls
   */
  async retrieveForChangedFiles(filePaths, options = {}) {
    const staleFiles = new Set(options.staleFiles || []);
    const currentHashes = options.currentHashes || {};
    const limit = options.limit !== undefined ? options.limit : this.limit;

    if (!(await this.isAvailable())) {
      return {};
    }

    const historyCache = await this.loadHistoryCache();
    const queryCache = await this.loadQueryCache();
    const results = {};

    for (const filePath of filePaths) {
      const isStale =
        staleFiles.has(filePath) ||
        !historyCache[filePath] ||
        queryCache[filePath] !== currentHashes[filePath];

      if (isStale) {
        this.log(`Querying history for stale file: ${filePath}`);
        const history = await this.retrieveForFile(filePath, { limit });
        historyCache[filePath] = history;
        if (currentHashes[filePath]) {
          queryCache[filePath] = currentHashes[filePath];
        }
        results[filePath] = history;
      } else {
        this.log(`Reusing cached history for unchanged file: ${filePath}`);
        results[filePath] = historyCache[filePath] || [];
      }
    }

    await this.saveHistoryCache(historyCache);
    await this.saveQueryCache(queryCache);

    return results;
  }

  /**
   * Search global history for a query/claim (used in verification)
   */
  async searchHistory(query, options = {}) {
    const limit = options.limit !== undefined ? options.limit : 1;

    if (!(await this.isAvailable())) {
      return false;
    }

    try {
      const { stdout } = await execFileAsync(HISTORY_BIN, [
        'search',
        query,
        '--json',
        '--limit',
        String(limit),
      ]);
      const parsed = JSON.parse(stdout);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Format history results into a prompt-friendly string context
   */
  formatForPrompt(historyByFile, options = {}) {
    const maxChars = options.maxChars || 4000;
    const lines = [];

    for (const [file, events] of Object.entries(historyByFile)) {
      if (!events || events.length === 0) continue;

      lines.push(`File: ${file}`);
      for (const event of events) {
        lines.push(`  Session: ${event.sessionId}, Event: ${event.eventId} (via ${event.provider})`);
        lines.push(`  Code Snippet:`);
        lines.push(`    ${event.snippet.split('\n').join('\n    ')}`);
        lines.push('');
      }
    }

    const formatted = lines.join('\n');
    if (formatted.length > maxChars) {
      return formatted.substring(0, maxChars) + '\n... [truncated prior history]';
    }
    return formatted;
  }

  // Cache loading and saving helpers
  async loadHistoryCache() {
    const cachePath = path.join(process.cwd(), '.recall', 'history_cache.json');
    try {
      const content = await fs.readFile(cachePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  async saveHistoryCache(cache) {
    const cachePath = path.join(process.cwd(), '.recall', 'history_cache.json');
    try {
      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
    } catch (error) {
      this.log(`Failed to save history cache: ${error.message}`);
    }
  }

  async loadQueryCache() {
    const cachePath = path.join(process.cwd(), '.recall', 'history_query_cache.json');
    try {
      const content = await fs.readFile(cachePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  async saveQueryCache(cache) {
    const cachePath = path.join(process.cwd(), '.recall', 'history_query_cache.json');
    try {
      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8');
    } catch (error) {
      this.log(`Failed to save query cache: ${error.message}`);
    }
  }
}
