/**
 * Test AST Parser
 * Validates the new AST-based symbol extraction
 */

import { parseFile } from './src/parsers/astParser.js';
import { createRegistry } from './src/registry/symbolRegistry.js';
import { validateFileImports } from './src/registry/symbolValidator.js';
import fs from 'fs/promises';

async function testParser() {
  console.log('🧪 Testing AST Parser\n');

  // Test file
  const testFile = 'src/commands/scan.js';
  
  try {
    const content = await fs.readFile(testFile, 'utf8');
    console.log(`📄 Parsing: ${testFile}\n`);

    const symbols = await parseFile(content, testFile);

    console.log('✅ Parse successful!\n');
    console.log('📊 Extracted Symbols:');
    console.log(`   Functions: ${symbols.functions.length}`);
    console.log(`   Classes: ${symbols.classes.length}`);
    console.log(`   Exports: ${symbols.exports.length}`);
    console.log(`   Imports: ${symbols.imports.length}`);
    console.log(`   Variables: ${symbols.variables.length}`);
    
    console.log('\n📦 Functions:');
    symbols.functions.slice(0, 5).forEach(f => {
      console.log(`   - ${f.name}(${f.params.join(', ')}) [line ${f.line}]`);
    });

    console.log('\n📤 Exports:');
    symbols.exports.forEach(e => {
      console.log(`   - ${e.name} (${e.type}) [line ${e.line}]`);
    });

    console.log('\n📥 Imports (first 5):');
    symbols.imports.slice(0, 5).forEach(i => {
      console.log(`   - from '${i.source}' [line ${i.line}]`);
      i.items.forEach(item => {
        console.log(`     • ${item.name || item.imported}`);
      });
    });

    // Test registry
    console.log('\n\n🗂️  Testing Symbol Registry\n');
    const registry = createRegistry();
    registry.addFile(testFile, symbols);

    const stats = registry.getStats();
    console.log('📊 Registry Stats:');
    console.log(`   Files: ${stats.files}`);
    console.log(`   Functions: ${stats.functions}`);
    console.log(`   Classes: ${stats.classes}`);
    console.log(`   Exports: ${stats.exports}`);
    console.log(`   Imports: ${stats.imports}`);

    // Test symbol lookup
    console.log('\n🔍 Testing Symbol Lookup:');
    const scanCommandLocations = registry.findFunction('scanCommand');
    console.log(`   scanCommand found in: ${scanCommandLocations.join(', ')}`);

    const exportLocations = registry.findExport('scanCommand');
    console.log(`   scanCommand exported from: ${exportLocations.join(', ')}`);

    // Test verification
    console.log('\n✓ Testing Symbol Verification:');
    console.log(`   scanCommand exists: ${registry.verifySymbol('scanCommand', 'function')}`);
    console.log(`   fakeFunction exists: ${registry.verifySymbol('fakeFunction', 'function')}`);

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testParser();
