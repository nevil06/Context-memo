import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CONFIG_DIR = path.join(os.homedir(), '.recall');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function ensureConfigDir() {
  try {
    await fs.access(CONFIG_DIR);
  } catch {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  }
}

async function readConfig() {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeConfig(config) {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

export default async function configCommand(options) {
  if (options.show) {
    const config = await readConfig();
    console.log(chalk.blue('Current configuration:'));
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (options.key) {
    const config = await readConfig();
    config.geminiApiKey = options.key;
    await writeConfig(config);
    console.log(chalk.green('✅ Gemini API key saved to ~/.recall/config.json'));
    return;
  }

  // Show instructions
  console.log(chalk.blue('🔑 Gemini API Key Setup\n'));
  console.log('To use context-memo, you need a FREE Gemini API key:\n');
  console.log(chalk.white('1. Visit: ') + chalk.cyan('https://aistudio.google.com/app/apikey'));
  console.log(chalk.white('2. Click "Create API Key" (no credit card required)'));
  console.log(chalk.white('3. Copy your key'));
  console.log(chalk.white('4. Run: ') + chalk.cyan('memo config --key YOUR_API_KEY'));
  console.log('');
  console.log(chalk.gray('Your key is stored locally at: ~/.recall/config.json'));
}

export async function getApiKey() {
  const config = await readConfig();
  return config.geminiApiKey;
}
