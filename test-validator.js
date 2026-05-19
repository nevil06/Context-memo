/**
 * Test Validation Engine
 */

import { validateCode } from './src/validation/validator.js';
import { createRegistry } from './src/registry/symbolRegistry.js';
import { parseFile } from './src/parsers/astParser.js';
import fs from 'fs/promises';

async function testValidator() {
  console.log('🧪 Testing Validation Engine\n');

  // Load registry
  const registry = createRegistry();
  await registry.load();
  console.log('✅ Registry loaded\n');

  // Test 1: Valid code
  console.log('Test 1: Valid Code');
  const validCode = `
import chalk from 'chalk';
import { scanProject } from './scanner.js';

export function testFunction(param1, param2) {
  return param1 + param2;
}

export class TestClass {
  constructor() {
    this.value = 0;
  }
}
`;

  const result1 = await validateCode(validCode, 'test.js', registry);
  console.log(`  Valid: ${result1.valid}`);
  console.log(`  Errors: ${result1.errors.length}`);
  console.log(`  Warnings: ${result1.warnings.length}\n`);

  // Test 2: Syntax error
  console.log('Test 2: Syntax Error');
  const syntaxError = `
export function broken(param {
  return param;
}
`;

  const result2 = await validateCode(syntaxError, 'test.js', registry);
  console.log(`  Valid: ${result2.valid}`);
  console.log(`  Errors: ${result2.errors.length}`);
  if (result2.errors.length > 0) {
    console.log(`  Error: ${result2.errors[0].message}\n`);
  }

  // Test 3: Invalid import
  console.log('Test 3: Invalid Import');
  const invalidImport = `
import { nonExistentFunction } from './fake-file.js';

export function test() {
  return nonExistentFunction();
}
`;

  const result3 = await validateCode(invalidImport, 'test.js', registry);
  console.log(`  Valid: ${result3.valid}`);
  console.log(`  Errors: ${result3.errors.length}`);
  if (result3.errors.length > 0) {
    result3.errors.forEach(err => {
      console.log(`  Error: ${err.message}`);
    });
  }
  console.log('');

  // Test 4: Real file validation
  console.log('Test 4: Real File (scan.js)');
  const scanCode = await fs.readFile('src/commands/scan.js', 'utf8');
  const result4 = await validateCode(scanCode, 'src/commands/scan.js', registry);
  console.log(`  Valid: ${result4.valid}`);
  console.log(`  Errors: ${result4.errors.length}`);
  console.log(`  Warnings: ${result4.warnings.length}`);
  
  if (result4.errors.length > 0) {
    console.log('  Errors:');
    result4.errors.slice(0, 3).forEach(err => {
      console.log(`    - ${err.message}`);
    });
  }
  
  if (result4.warnings.length > 0) {
    console.log('  Warnings:');
    result4.warnings.slice(0, 3).forEach(warn => {
      console.log(`    - ${warn.message}`);
    });
  }

  console.log('\n✅ Validation engine tests complete!');
}

testValidator().catch(console.error);
