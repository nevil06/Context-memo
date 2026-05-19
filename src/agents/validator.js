/**
 * Validator Agent
 * Validates generated code independently
 */

import { validateCode } from '../validation/validator.js';

export class ValidatorAgent {
  constructor(context) {
    this.context = context;
    this.registry = context.registry;
    this.graph = context.graph;
  }

  /**
   * Validate generated code
   */
  async validate(code, context) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      checks: {
        syntax: [],
        imports: [],
        symbols: [],
        paths: []
      },
      summary: {}
    };

    try {
      // Validate new files
      for (const file of code.newFiles) {
        const result = await this.validateFile(file.path, file.content);
        
        if (!result.valid) {
          validation.valid = false;
          validation.errors.push(...result.errors);
        }
        
        validation.warnings.push(...result.warnings);
        validation.checks.syntax.push(result);
      }

      // Validate edits
      for (const edit of code.edits) {
        const result = await this.validateEdit(edit, context);
        
        if (!result.valid) {
          validation.valid = false;
          validation.errors.push(...result.errors);
        }
        
        validation.warnings.push(...result.warnings);
      }

      // Validate deletions
      for (const deletedFile of code.deletedFiles) {
        const result = this.validateDeletion(deletedFile);
        
        if (!result.valid) {
          validation.valid = false;
          validation.errors.push(...result.errors);
        }
        
        validation.warnings.push(...result.warnings);
      }

      // Generate summary
      validation.summary = {
        totalChecks: validation.checks.syntax.length,
        passed: validation.valid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length
      };

    } catch (error) {
      validation.valid = false;
      validation.errors.push({
        type: 'validation_error',
        message: error.message
      });
    }

    return validation;
  }

  /**
   * Validate file
   */
  async validateFile(filePath, content) {
    return await validateCode(content, filePath, this.registry, {
      checkImports: true,
      checkSymbols: true,
      checkPaths: true,
      checkSyntax: true
    });
  }

  /**
   * Validate edit
   */
  async validateEdit(edit, context) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check if file exists in context
    const fileContext = context.files.find(f => f.path === edit.path);
    
    if (!fileContext) {
      validation.errors.push({
        type: 'file_not_found',
        message: `File not found in context: ${edit.path}`
      });
      validation.valid = false;
      return validation;
    }

    // Validate each change
    for (const change of edit.changes) {
      if (change.content) {
        // Validate syntax of change
        const result = await validateCode(
          change.content,
          edit.path,
          this.registry,
          { checkSyntax: true }
        );
        
        if (!result.valid) {
          validation.valid = false;
          validation.errors.push(...result.errors);
        }
      }
    }

    return validation;
  }

  /**
   * Validate deletion
   */
  validateDeletion(filePath) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check if file has dependents
    const dependents = this.graph.getDirectDependents(filePath);
    
    if (dependents.length > 0) {
      validation.warnings.push({
        type: 'has_dependents',
        message: `File has ${dependents.length} dependents`,
        dependents: dependents.map(d => d.file)
      });
    }

    return validation;
  }

  /**
   * Validate against constraints
   */
  async validateWithConstraints(code, context, constraints) {
    const validation = await this.validate(code, context);

    // Apply additional constraints
    if (constraints.maxFiles && code.newFiles.length > constraints.maxFiles) {
      validation.valid = false;
      validation.errors.push({
        type: 'too_many_files',
        message: `Too many files: ${code.newFiles.length} > ${constraints.maxFiles}`
      });
    }

    if (constraints.noBreakingChanges) {
      const breakingChanges = this.detectBreakingChanges(code, context);
      if (breakingChanges.length > 0) {
        validation.valid = false;
        validation.errors.push({
          type: 'breaking_changes',
          message: 'Breaking changes detected',
          changes: breakingChanges
        });
      }
    }

    return validation;
  }

  /**
   * Detect breaking changes
   */
  detectBreakingChanges(code, context) {
    const breaking = [];

    // Check for removed exports
    for (const edit of code.edits) {
      const fileContext = context.files.find(f => f.path === edit.path);
      if (!fileContext) continue;

      const currentExports = fileContext.symbols.exports.map(e => e.name);
      
      // If edit removes exports, it's breaking
      // (This is simplified - real implementation would parse the edited code)
      for (const exp of currentExports) {
        breaking.push({
          file: edit.path,
          type: 'removed_export',
          symbol: exp
        });
      }
    }

    return breaking;
  }

  /**
   * Generate validation report
   */
  generateReport(validation) {
    return {
      passed: validation.valid,
      summary: validation.summary,
      errors: validation.errors,
      warnings: validation.warnings,
      recommendations: this.generateRecommendations(validation)
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(validation) {
    const recommendations = [];

    if (validation.errors.length > 0) {
      recommendations.push('Fix validation errors before proceeding');
    }

    if (validation.warnings.length > 5) {
      recommendations.push('Review warnings - many issues detected');
    }

    if (validation.summary.errorCount === 0 && validation.summary.warningCount === 0) {
      recommendations.push('Code validation passed - safe to proceed');
    }

    return recommendations;
  }
}
