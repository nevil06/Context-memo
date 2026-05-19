/**
 * Coder Agent
 * Generates code based on plan and context
 */

export class CoderAgent {
  constructor(context) {
    this.context = context;
  }

  /**
   * Generate code from plan and context
   */
  async generateCode(plan, context) {
    const code = {
      edits: [],
      newFiles: [],
      deletedFiles: [],
      metadata: {}
    };

    try {
      // Process each step
      for (const step of plan.steps) {
        if (step.type === 'create_file') {
          const newFile = await this.createFile(step, context);
          code.newFiles.push(newFile);
        } else if (step.type === 'modify_file') {
          const edit = await this.modifyFile(step, context);
          code.edits.push(edit);
        } else if (step.type === 'delete_file') {
          code.deletedFiles.push(...step.files);
        } else if (step.type === 'create_test') {
          const testFile = await this.createTest(step, context);
          code.newFiles.push(testFile);
        }
      }

      // Add metadata
      code.metadata = {
        generatedAt: new Date().toISOString(),
        planConfidence: plan.confidence,
        filesAffected: code.edits.length + code.newFiles.length + code.deletedFiles.length
      };

    } catch (error) {
      code.error = error.message;
    }

    return code;
  }

  /**
   * Create new file
   */
  async createFile(step, context) {
    // This is a placeholder - in real implementation,
    // this would call an LLM or use templates
    
    return {
      path: step.files[0] || 'new-file.js',
      content: this.generateFileTemplate(step, context),
      type: 'create'
    };
  }

  /**
   * Modify existing file
   */
  async modifyFile(step, context) {
    const file = step.files[0];
    const fileContext = context.files.find(f => f.path === file);

    if (!fileContext) {
      throw new Error(`File context not found: ${file}`);
    }

    // This is a placeholder - in real implementation,
    // this would analyze the file and generate specific edits
    
    return {
      path: file,
      changes: [
        {
          type: 'modify',
          description: step.description,
          location: 'end-of-file',
          content: '// Generated modification'
        }
      ],
      type: 'modify'
    };
  }

  /**
   * Create test file
   */
  async createTest(step, context) {
    const targetFile = step.files[0];
    const testPath = targetFile.replace(/\.js$/, '.test.js');

    return {
      path: testPath,
      content: this.generateTestTemplate(targetFile, context),
      type: 'create'
    };
  }

  /**
   * Generate file template
   */
  generateFileTemplate(step, context) {
    return `/**
 * Generated file
 * ${step.description}
 */

export default function newFunction() {
  // TODO: Implement
  return null;
}
`;
  }

  /**
   * Generate test template
   */
  generateTestTemplate(targetFile, context) {
    const fileContext = context.files.find(f => f.path === targetFile);
    const functions = fileContext?.symbols.functions || [];

    let tests = '';
    for (const func of functions.slice(0, 3)) {
      tests += `
  test('${func.name} should work', () => {
    // TODO: Implement test
    expect(${func.name}).toBeDefined();
  });
`;
    }

    return `/**
 * Tests for ${targetFile}
 */

import { ${functions.map(f => f.name).join(', ')} } from './${targetFile}';

describe('${targetFile}', () => {${tests}
});
`;
  }

  /**
   * Generate code with constraints
   */
  async generateWithConstraints(plan, context, constraints) {
    const {
      maxLines = 100,
      style = 'modern',
      includeComments = true,
      includeTests = false
    } = constraints;

    const code = await this.generateCode(plan, context);

    // Apply constraints
    for (const edit of code.edits) {
      if (!includeComments) {
        edit.content = this.removeComments(edit.content);
      }
    }

    return code;
  }

  /**
   * Remove comments from code
   */
  removeComments(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '')
      .trim();
  }
}
