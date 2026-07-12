import { HistoryRetriever } from '../retrieval/historyRetriever.js';

/**
 * Planner Agent
 * Creates execution plans without seeing raw code
 */

export class PlannerAgent {
  constructor(context) {
    this.context = context;
    this.graph = context.graph;
    this.registry = context.registry;
    this.historyRetriever = new HistoryRetriever({ log: () => {} });
  }

  /**
   * Create execution plan from task
   */
  async createPlan(task) {
    const plan = {
      task,
      steps: [],
      affectedFiles: [],
      dependencies: [],
      risks: [],
      confidence: 0,
      valid: true,
      errors: []
    };

    try {
      // Parse task intent
      const intent = this.parseIntent(task);
      plan.intent = intent;

      // Identify affected files
      plan.affectedFiles = await this.identifyAffectedFiles(intent);

      // Identify dependencies
      plan.dependencies = await this.identifyDependencies(plan.affectedFiles);

      // Create execution steps
      plan.steps = this.createSteps(intent, plan.affectedFiles);

      // Check history grounding for rejected approaches
      if (await this.historyRetriever.isAvailable()) {
        for (const file of plan.affectedFiles) {
          const events = await this.historyRetriever.retrieveForFile(file);
          for (const event of events) {
            const snippetLower = event.snippet.toLowerCase();
            const isFailure =
              snippetLower.includes('fail') ||
              snippetLower.includes('reject') ||
              snippetLower.includes('error') ||
              snippetLower.includes('bug') ||
              snippetLower.includes('broken') ||
              snippetLower.includes('failed test');

            if (isFailure) {
              // Find steps associated with this file and flag them
              for (const step of plan.steps) {
                if (step.files && step.files.includes(file)) {
                  step.description = `${step.description} (previously attempted, see history event ${event.eventId})`;
                  step.citesHistory = true;
                  step.citedEventId = event.eventId;
                }
              }
              // Add a risk factor
              plan.risks.push({
                level: 'medium',
                type: 'prior_failure_history',
                message: `File ${file} has history of failure: history event ${event.eventId}`,
                file
              });
            }
          }
        }
      }

      // Assess risks
      plan.risks = [
        ...plan.risks,
        ...this.assessRisks(plan)
      ];

      // Calculate confidence
      plan.confidence = this.calculatePlanConfidence(plan);

      // Validate plan
      const validation = this.validatePlan(plan);
      if (!validation.valid) {
        plan.valid = false;
        plan.errors = validation.errors;
      }

    } catch (error) {
      plan.valid = false;
      plan.errors.push({
        type: 'planning_error',
        message: error.message
      });
    }

    return plan;
  }

  /**
   * Parse task intent
   */
  parseIntent(task) {
    const intent = {
      type: 'unknown',
      action: null,
      target: null,
      description: task
    };

    const taskLower = task.toLowerCase();

    // Detect intent type
    if (taskLower.includes('add') || taskLower.includes('create')) {
      intent.type = 'create';
      intent.action = 'add';
    } else if (taskLower.includes('fix') || taskLower.includes('bug')) {
      intent.type = 'fix';
      intent.action = 'modify';
    } else if (taskLower.includes('refactor') || taskLower.includes('improve')) {
      intent.type = 'refactor';
      intent.action = 'modify';
    } else if (taskLower.includes('delete') || taskLower.includes('remove')) {
      intent.type = 'delete';
      intent.action = 'remove';
    } else if (taskLower.includes('test')) {
      intent.type = 'test';
      intent.action = 'add';
    }

    // Extract target (file/function/class names)
    const words = task.split(/\s+/);
    for (const word of words) {
      if (word.includes('.js') || word.includes('.ts')) {
        intent.target = word;
        break;
      }
    }

    return intent;
  }

  /**
   * Identify affected files
   */
  async identifyAffectedFiles(intent) {
    const affected = [];

    // If target file specified
    if (intent.target) {
      affected.push(intent.target);
      return affected;
    }

    // Search by keywords
    const keywords = intent.description.toLowerCase().split(/\s+/);
    
    for (const node of this.graph.getAllNodes()) {
      const fileLower = node.file.toLowerCase();
      
      for (const keyword of keywords) {
        if (fileLower.includes(keyword)) {
          affected.push(node.file);
          break;
        }
      }
    }

    return affected;
  }

  /**
   * Identify dependencies
   */
  async identifyDependencies(affectedFiles) {
    const dependencies = new Set();

    for (const file of affectedFiles) {
      // Get direct dependencies
      const deps = this.graph.getDirectDependencies(file);
      for (const dep of deps) {
        dependencies.add(dep.file);
      }

      // Get direct dependents
      const dependents = this.graph.getDirectDependents(file);
      for (const dependent of dependents) {
        dependencies.add(dependent.file);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Create execution steps
   */
  createSteps(intent, affectedFiles) {
    const steps = [];

    if (intent.type === 'create') {
      steps.push({
        type: 'create_file',
        description: `Create new file: ${intent.target || 'new file'}`,
        files: affectedFiles
      });
    } else if (intent.type === 'fix' || intent.type === 'refactor') {
      for (const file of affectedFiles) {
        steps.push({
          type: 'modify_file',
          description: `Modify ${file}`,
          files: [file]
        });
      }
    } else if (intent.type === 'delete') {
      steps.push({
        type: 'delete_file',
        description: `Delete ${intent.target}`,
        files: affectedFiles
      });
    } else if (intent.type === 'test') {
      steps.push({
        type: 'create_test',
        description: `Create tests for ${affectedFiles.join(', ')}`,
        files: affectedFiles
      });
    }

    return steps;
  }

  /**
   * Assess risks
   */
  assessRisks(plan) {
    const risks = [];

    // Check if modifying god nodes
    for (const file of plan.affectedFiles) {
      const metrics = this.graph.getNodeMetrics(file);
      if (metrics && metrics.totalConnections > 10) {
        risks.push({
          level: 'high',
          type: 'god_node',
          message: `Modifying critical file: ${file} (${metrics.totalConnections} connections)`,
          file
        });
      }
    }

    // Check for circular dependencies
    const cycles = this.graph.detectCircularDependencies();
    for (const cycle of cycles) {
      if (cycle.some(node => plan.affectedFiles.includes(node))) {
        risks.push({
          level: 'medium',
          type: 'circular_dependency',
          message: `File is part of circular dependency`,
          cycle
        });
      }
    }

    // Check blast radius
    if (plan.dependencies.length > 10) {
      risks.push({
        level: 'medium',
        type: 'large_blast_radius',
        message: `Large blast radius: ${plan.dependencies.length} dependent files`
      });
    }

    return risks;
  }

  /**
   * Calculate plan confidence
   */
  calculatePlanConfidence(plan) {
    let confidence = 100;

    // Reduce confidence for unknown intent
    if (plan.intent.type === 'unknown') {
      confidence -= 30;
    }

    // Reduce confidence for high risks
    for (const risk of plan.risks) {
      if (risk.level === 'high') confidence -= 20;
      if (risk.level === 'medium') confidence -= 10;
    }

    // Reduce confidence if no affected files
    if (plan.affectedFiles.length === 0) {
      confidence -= 40;
    }

    return Math.max(0, confidence);
  }

  /**
   * Validate plan
   */
  validatePlan(plan) {
    const validation = {
      valid: true,
      errors: []
    };

    // Must have at least one step
    if (plan.steps.length === 0) {
      validation.valid = false;
      validation.errors.push({
        type: 'no_steps',
        message: 'Plan has no execution steps'
      });
    }

    // Must have affected files
    if (plan.affectedFiles.length === 0) {
      validation.valid = false;
      validation.errors.push({
        type: 'no_files',
        message: 'No affected files identified'
      });
    }

    // Confidence must be above threshold
    if (plan.confidence < 40) {
      validation.valid = false;
      validation.errors.push({
        type: 'low_confidence',
        message: `Plan confidence too low: ${plan.confidence}%`
      });
    }

    return validation;
  }
}
