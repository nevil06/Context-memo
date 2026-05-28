#!/usr/bin/env node

/**
 * Test Recall Accuracy
 * Compares what recall generated vs actual codebase
 * Measures hallucination prevention and token savings
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Recall Accuracy Test ===\n');

// Load recall memory
async function loadRecallMemory() {
  const memoryPath = path.join(__dirname, '.recall', 'memory.yaml');
  const content = await fs.readFile(memoryPath, 'utf8');
  return yaml.load(content);
}

// Scan actual codebase
async function scanActualCodebase() {
  const srcDir = path.join(__dirname, 'src');
  const binDir = path.join(__dirname, 'bin');
  
  const files = {
    commands: [],
    agents: [],
    parsers: [],
    registry: [],
    graph: [],
    validation: [],
    memory: [],
    checksum: [],
    scoring: [],
    tools: [],
    retrieval: [],
    dashboard: [],
    trust: [],
    timeline: [],
    local: [],
    utils: []
  };

  // Scan directories
  for (const [category, dir] of Object.entries({
    commands: path.join(srcDir, 'commands'),
    agents: path.join(srcDir, 'agents'),
    parsers: path.join(srcDir, 'parsers'),
    registry: path.join(srcDir, 'registry'),
    graph: path.join(srcDir, 'graph'),
    validation: path.join(srcDir, 'validation'),
    memory: path.join(srcDir, 'memory'),
    checksum: path.join(srcDir, 'checksum'),
    scoring: path.join(srcDir, 'scoring'),
    tools: path.join(srcDir, 'tools'),
    retrieval: path.join(srcDir, 'retrieval'),
    dashboard: path.join(srcDir, 'dashboard'),
    trust: path.join(srcDir, 'trust'),
    timeline: path.join(srcDir, 'timeline'),
    local: path.join(srcDir, 'local'),
    utils: path.join(srcDir, 'utils')
  })) {
    try {
      const entries = await fs.readdir(dir);
      files[category] = entries.filter(f => f.endsWith('.js'));
    } catch (error) {
      // Directory doesn't exist
    }
  }

  // Add bin files
  try {
    const binEntries = await fs.readdir(binDir);
    files.bin = binEntries.filter(f => f.endsWith('.js'));
  } catch (error) {
    files.bin = [];
  }

  return files;
}

// Compare recall vs actual
async function compareRecallVsActual() {
  console.log('1. Loading recall memory...');
  const memory = await loadRecallMemory();
  
  console.log('2. Scanning actual codebase...');
  const actual = await scanActualCodebase();
  
  console.log('3. Comparing...\n');
  
  const results = {
    totalComponents: memory.knowledge_graph.components.length,
    actualFiles: 0,
    matched: 0,
    hallucinated: [],
    missing: [],
    accuracy: 0
  };

  // Count actual files
  for (const category in actual) {
    results.actualFiles += actual[category].length;
  }

  // Check each component in recall
  const recallFiles = new Set();
  for (const component of memory.knowledge_graph.components) {
    const filePath = component.file.replace(/\\/g, '/');
    recallFiles.add(filePath);
    
    // Check if file exists
    const fullPath = path.join(__dirname, filePath);
    try {
      await fs.access(fullPath);
      results.matched++;
    } catch (error) {
      results.hallucinated.push({
        component: component.name,
        file: filePath,
        reason: 'File does not exist'
      });
    }
  }

  // Check for missing files
  const allActualFiles = [];
  for (const category in actual) {
    for (const file of actual[category]) {
      const filePath = category === 'bin' 
        ? `bin/${file}`
        : `src/${category}/${file}`;
      allActualFiles.push(filePath);
      
      if (!recallFiles.has(filePath)) {
        results.missing.push({
          file: filePath,
          category
        });
      }
    }
  }

  results.accuracy = (results.matched / results.totalComponents) * 100;

  return results;
}

// Check for hallucinated dependencies
async function checkDependencyHallucinations(memory) {
  console.log('4. Checking dependency hallucinations...\n');
  
  const results = {
    totalDependencies: 0,
    verified: 0,
    hallucinated: []
  };

  for (const component of memory.knowledge_graph.components) {
    if (!component.depends_on) continue;
    
    for (const dep of component.depends_on) {
      results.totalDependencies++;
      
      // Check if dependency exists in components or is a valid package/Node built-in
      const builtinModules = new Set([
        'fs', 'path', 'crypto', 'os', 'child_process', 'url', 'module', 'fs/promises',
        'readline', 'events', 'util', 'assert', 'stream', 'http', 'https', 'zlib', 'dns',
        'net', 'tls', 'querystring', 'punycode', 'vm', 'cluster', 'constants'
      ]);
      const allowedNpmDeps = new Set([
        'chalk', 'inquirer', 'commander', 'Command', 'js-yaml', 'clipboardy',
        '@babel/parser', '@babel/traverse'
      ]);

      const exists = memory.knowledge_graph.components.some(c => 
        c.name === dep || 
        c.exports?.includes(dep)
      ) || 
      builtinModules.has(dep) ||
      allowedNpmDeps.has(dep) ||
      dep.includes('/') ||
      dep.startsWith('fs/') ||
      dep.startsWith('@babel/');
      
      
      if (exists) {
        results.verified++;
      } else {
        results.hallucinated.push({
          component: component.name,
          dependency: dep,
          file: component.file
        });
      }
    }
  }

  results.accuracy = results.totalDependencies > 0 
    ? (results.verified / results.totalDependencies) * 100 
    : 100;

  return results;
}

// Calculate token savings
async function calculateTokenSavings() {
  console.log('5. Calculating token savings...\n');
  
  // Count actual codebase tokens (rough estimate: 1 token ≈ 4 chars)
  let totalChars = 0;
  let totalFiles = 0;

  async function countChars(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await countChars(fullPath);
          }
        } else if (entry.name.endsWith('.js')) {
          const content = await fs.readFile(fullPath, 'utf8');
          totalChars += content.length;
          totalFiles++;
        }
      }
    } catch (error) {
      // Ignore errors
    }
  }

  await countChars(path.join(__dirname, 'src'));
  await countChars(path.join(__dirname, 'bin'));

  const codebaseTokens = Math.ceil(totalChars / 4);

  // Count recall memory tokens
  const memoryPath = path.join(__dirname, '.recall', 'memory.yaml');
  const memoryContent = await fs.readFile(memoryPath, 'utf8');
  const memoryTokens = Math.ceil(memoryContent.length / 4);

  const savings = codebaseTokens - memoryTokens;
  const savingsPercent = ((savings / codebaseTokens) * 100).toFixed(1);

  return {
    totalFiles,
    codebaseChars: totalChars,
    codebaseTokens,
    memoryChars: memoryContent.length,
    memoryTokens,
    savings,
    savingsPercent
  };
}

// Main test
async function runTest() {
  try {
    // Test 1: File accuracy
    const fileComparison = await compareRecallVsActual();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('           FILE ACCURACY TEST');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log(`Total Components in Recall: ${fileComparison.totalComponents}`);
    console.log(`Actual Files in Codebase: ${fileComparison.actualFiles}`);
    console.log(`Matched Files: ${fileComparison.matched}`);
    console.log(`Accuracy: ${fileComparison.accuracy.toFixed(1)}%\n`);
    
    if (fileComparison.hallucinated.length > 0) {
      console.log(`❌ Hallucinated Files: ${fileComparison.hallucinated.length}`);
      for (const item of fileComparison.hallucinated.slice(0, 5)) {
        console.log(`   - ${item.component} (${item.file})`);
      }
      console.log();
    } else {
      console.log('✅ No hallucinated files!\n');
    }
    
    if (fileComparison.missing.length > 0) {
      console.log(`⚠️  Missing Files: ${fileComparison.missing.length}`);
      for (const item of fileComparison.missing.slice(0, 5)) {
        console.log(`   - ${item.file}`);
      }
      console.log();
    } else {
      console.log('✅ No missing files!\n');
    }

    // Test 2: Dependency accuracy
    const memory = await loadRecallMemory();
    const depComparison = await checkDependencyHallucinations(memory);
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('           DEPENDENCY ACCURACY TEST');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log(`Total Dependencies: ${depComparison.totalDependencies}`);
    console.log(`Verified Dependencies: ${depComparison.verified}`);
    console.log(`Accuracy: ${depComparison.accuracy.toFixed(1)}%\n`);
    
    if (depComparison.hallucinated.length > 0) {
      console.log(`❌ Hallucinated Dependencies: ${depComparison.hallucinated.length}`);
      for (const item of depComparison.hallucinated.slice(0, 10)) {
        console.log(`   - ${item.component} → ${item.dependency}`);
      }
      console.log();
    } else {
      console.log('✅ No hallucinated dependencies!\n');
    }

    // Test 3: Token savings
    const tokenStats = await calculateTokenSavings();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('           TOKEN SAVINGS ANALYSIS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log(`Total Code Files: ${tokenStats.totalFiles}`);
    console.log(`Codebase Size: ${tokenStats.codebaseChars.toLocaleString()} chars`);
    console.log(`Codebase Tokens: ~${tokenStats.codebaseTokens.toLocaleString()} tokens\n`);
    
    console.log(`Memory Size: ${tokenStats.memoryChars.toLocaleString()} chars`);
    console.log(`Memory Tokens: ~${tokenStats.memoryTokens.toLocaleString()} tokens\n`);
    
    console.log(`Token Savings: ~${tokenStats.savings.toLocaleString()} tokens`);
    console.log(`Savings Percentage: ${tokenStats.savingsPercent}%\n`);
    
    const compressionRatio = (tokenStats.memoryTokens / tokenStats.codebaseTokens * 100).toFixed(1);
    console.log(`Compression Ratio: ${compressionRatio}%`);
    console.log(`(Memory is ${compressionRatio}% the size of full codebase)\n`);

    // Final summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('           FINAL SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const overallAccuracy = (fileComparison.accuracy + depComparison.accuracy) / 2;
    
    console.log(`Overall Accuracy: ${overallAccuracy.toFixed(1)}%`);
    console.log(`File Accuracy: ${fileComparison.accuracy.toFixed(1)}%`);
    console.log(`Dependency Accuracy: ${depComparison.accuracy.toFixed(1)}%`);
    console.log(`Token Savings: ${tokenStats.savingsPercent}%`);
    console.log(`Compression Ratio: ${compressionRatio}%\n`);
    
    if (overallAccuracy >= 95) {
      console.log('✅ EXCELLENT: Recall is highly accurate!');
    } else if (overallAccuracy >= 85) {
      console.log('✓ GOOD: Recall is reasonably accurate');
    } else if (overallAccuracy >= 75) {
      console.log('⚠️  FAIR: Some inaccuracies detected');
    } else {
      console.log('❌ POOR: Significant inaccuracies detected');
    }
    
    console.log();
    
    // Hallucination prevention score
    const hallucinationScore = 100 - ((fileComparison.hallucinated.length + depComparison.hallucinated.length) / 
      (fileComparison.totalComponents + depComparison.totalDependencies) * 100);
    
    console.log(`Hallucination Prevention Score: ${hallucinationScore.toFixed(1)}%`);
    
    if (hallucinationScore >= 95) {
      console.log('✅ EXCELLENT: Minimal to no hallucinations!');
    } else if (hallucinationScore >= 85) {
      console.log('✓ GOOD: Few hallucinations detected');
    } else {
      console.log('⚠️  WARNING: Multiple hallucinations detected');
    }
    
    console.log('\n=== Test Complete ===\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
