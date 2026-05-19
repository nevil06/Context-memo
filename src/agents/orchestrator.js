/**
 * Agent Orchestrator
 * Coordinates multi-agent pipeline execution
 */

import { PlannerAgent } from './planner.js';
import { RetrieverAgent } from './retriever.js';
import { CoderAgent } from './coder.js';
import { ValidatorAgent } from './validator.js';

/**
 * Orchestrator Class
 */
export class Orchestrator {
  constructor(context) {
    this.context = context;
    this.planner = new PlannerAgent(context);
    this.retriever = new RetrieverAgent(context);
    this.coder = new CoderAgent(context);
    this.validator = new ValidatorAgent(context);
    this.executionLog = [];
  }

  /**
   * Execute task with multi-agent pipeline
   */
  async executeTask(task) {
    this.log('orchestrator', 'Starting task execution', { task });

    try {
      // Phase 1: Planning
      this.log('orchestrator', 'Phase 1: Planning');
      const plan = await this.planner.createPlan(task);
      
      if (!plan.valid) {
        return {
          success: false,
          error: 'Planning failed',
          details: plan.errors
        };
      }

      this.log('planner', 'Plan created', { 
        steps: plan.steps.length,
        files: plan.affectedFiles.length
      });

      // Phase 2: Retrieval
      this.log('orchestrator', 'Phase 2: Retrieval');
      const context = await this.retriever.retrieveContext(plan);
      
      this.log('retriever', 'Context retrieved', {
        files: context.files.length,
        symbols: context.symbols.length
      });

      // Phase 3: Code Generation
      this.log('orchestrator', 'Phase 3: Code Generation');
      const code = await this.coder.generateCode(plan, context);
      
      this.log('coder', 'Code generated', {
        edits: code.edits.length
      });

      // Phase 4: Validation
      this.log('orchestrator', 'Phase 4: Validation');
      const validation = await this.validator.validate(code, context);
      
      if (!validation.valid) {
        this.log('validator', 'Validation failed', {
          errors: validation.errors.length
        });
        
        return {
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          code
        };
      }

      this.log('validator', 'Validation passed');

      // Success
      return {
        success: true,
        plan,
        context,
        code,
        validation,
        executionLog: this.executionLog
      };

    } catch (error) {
      this.log('orchestrator', 'Execution failed', { error: error.message });
      
      return {
        success: false,
        error: error.message,
        executionLog: this.executionLog
      };
    }
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry(task, maxRetries = 2) {
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        this.log('orchestrator', `Retry attempt ${attempt}/${maxRetries}`);
      }

      const result = await this.executeTask(task);
      
      if (result.success) {
        return result;
      }

      lastError = result.error;
      
      // If validation failed, try to fix
      if (result.error === 'Validation failed' && attempt < maxRetries) {
        this.log('orchestrator', 'Attempting to fix validation errors');
        // Could implement auto-fix logic here
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} retries: ${lastError}`,
      executionLog: this.executionLog
    };
  }

  /**
   * Execute pipeline step by step (for debugging)
   */
  async executeStepByStep(task, onStep) {
    const steps = [
      { name: 'Planning', agent: this.planner, method: 'createPlan' },
      { name: 'Retrieval', agent: this.retriever, method: 'retrieveContext' },
      { name: 'Code Generation', agent: this.coder, method: 'generateCode' },
      { name: 'Validation', agent: this.validator, method: 'validate' }
    ];

    const results = {};
    let previousResult = task;

    for (const step of steps) {
      this.log('orchestrator', `Executing: ${step.name}`);
      
      try {
        const result = await step.agent[step.method](previousResult);
        results[step.name] = result;
        
        if (onStep) {
          await onStep(step.name, result);
        }

        previousResult = result;
      } catch (error) {
        this.log('orchestrator', `Step failed: ${step.name}`, { error: error.message });
        
        return {
          success: false,
          error: `${step.name} failed: ${error.message}`,
          results,
          executionLog: this.executionLog
        };
      }
    }

    return {
      success: true,
      results,
      executionLog: this.executionLog
    };
  }

  /**
   * Log execution event
   */
  log(agent, message, data = {}) {
    const entry = {
      timestamp: Date.now(),
      agent,
      message,
      data
    };
    
    this.executionLog.push(entry);
  }

  /**
   * Get execution summary
   */
  getSummary() {
    const summary = {
      totalSteps: this.executionLog.length,
      byAgent: {},
      duration: 0
    };

    if (this.executionLog.length > 0) {
      const start = this.executionLog[0].timestamp;
      const end = this.executionLog[this.executionLog.length - 1].timestamp;
      summary.duration = end - start;
    }

    for (const entry of this.executionLog) {
      if (!summary.byAgent[entry.agent]) {
        summary.byAgent[entry.agent] = 0;
      }
      summary.byAgent[entry.agent]++;
    }

    return summary;
  }

  /**
   * Clear execution log
   */
  clearLog() {
    this.executionLog = [];
  }
}

/**
 * Create orchestrator
 */
export function createOrchestrator(context) {
  return new Orchestrator(context);
}
