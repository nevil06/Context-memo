export function buildBriefing(memory, taskState, mode = 'full') {
  if (mode === 'quick') {
    return buildQuickBriefing(memory, taskState);
  } else if (mode === 'onboard') {
    return buildFullBriefing(memory, taskState) + '\n\n' + buildOnboardPrompt();
  } else {
    return buildFullBriefing(memory, taskState);
  }
}

function buildQuickBriefing(memory, taskState) {
  const lines = [];
  const progress = memory.progress || {};
  const task = taskState || memory.task_state || {};

  lines.push(`# ${memory.project?.name || 'Project'} — Quick Brief`);
  lines.push(`> ${progress.percent_done || 0}% complete`);
  lines.push('');
  lines.push(`Last task: ${task.last_task || 'Unknown'}`);
  lines.push(`Current problem: ${task.current_problem || 'None'}`);
  lines.push('');
  
  if (task.continue_here) {
    lines.push('▶ Continue at:');
    lines.push(`File: \`${task.continue_here.file}\``);
    lines.push(`Location: ${task.continue_here.location}`);
    lines.push(`Do: ${task.continue_here.instruction}`);
    lines.push('');
  }

  if (task.next_steps && task.next_steps.length > 0) {
    lines.push('Next 3 steps:');
    task.next_steps.slice(0, 3).forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
  }

  return lines.join('\n');
}

function buildFullBriefing(memory, taskState) {
  const lines = [];
  const proj = memory.project || {};
  const kg = memory.knowledge_graph || {};
  const progress = memory.progress || {};
  const task = taskState || memory.task_state || {};
  const decisions = memory.decisions || [];

  // Header
  lines.push(`# Agent Briefing — ${proj.name || 'Project'}`);
  lines.push(`> ${progress.percent_done || 0}% complete | ${progress.phase || 'unknown'}`);
  lines.push('');

  // Handoff message (MOST IMPORTANT)
  lines.push('## 🤖 Read This First');
  lines.push(memory.handoff_message || 'No handoff message available.');
  lines.push('');

  // Project overview
  lines.push('## Project');
  lines.push(`**Purpose:** ${proj.purpose || 'Not specified'}`);
  lines.push(`**Type:** ${proj.type || 'Unknown'}`);
  lines.push(`**Stack:** ${proj.stack || 'Not specified'}`);
  if (proj.entry_points) {
    lines.push(`**Entry points:** ${proj.entry_points}`);
  }
  if (proj.constraints) {
    lines.push(`**Constraints:** ${proj.constraints}`);
  }
  lines.push('');

  // God nodes
  if (kg.god_nodes && kg.god_nodes.length > 0) {
    lines.push('## 🧠 Critical Components (God Nodes)');
    kg.god_nodes.forEach(node => {
      lines.push(`**${node.name}** \`${node.file}\``);
      lines.push(`${node.why_critical}`);
      lines.push('');
    });
  }

  // Architecture
  if (kg.components && kg.components.length > 0) {
    lines.push('## Architecture');
    if (kg.data_flow) {
      lines.push(`**Flow:** ${kg.data_flow}`);
      lines.push('');
    }
    kg.components.forEach(comp => {
      const icon = getStatusIcon(comp.status);
      lines.push(`${icon} **${comp.name}** \`${comp.file}\``);
      lines.push(`${comp.role}`);
      if (comp.depends_on && comp.depends_on.length > 0) {
        lines.push(`Depends on: ${comp.depends_on.join(', ')}`);
      }
      lines.push('');
    });
  }

  // API endpoints
  if (kg.api_endpoints && kg.api_endpoints.length > 0) {
    lines.push('## API Endpoints');
    kg.api_endpoints.forEach(endpoint => {
      lines.push(`- ${endpoint}`);
    });
    lines.push('');
  }

  // Progress
  lines.push(`## Progress — ${progress.percent_done || 0}% complete`);
  
  if (progress.what_works && progress.what_works.length > 0) {
    lines.push('**✅ Working:**');
    progress.what_works.forEach(item => lines.push(`- ${item}`));
    lines.push('');
  }

  if (progress.what_is_broken && progress.what_is_broken.length > 0) {
    lines.push('**❌ Broken:**');
    progress.what_is_broken.forEach(item => lines.push(`- ${item}`));
    lines.push('');
  }

  if (progress.what_is_missing && progress.what_is_missing.length > 0) {
    lines.push('**⬜ Missing:**');
    progress.what_is_missing.forEach(item => lines.push(`- ${item}`));
    lines.push('');
  }

  if (progress.technical_debt && progress.technical_debt.length > 0) {
    lines.push('**⚠️ Tech debt:**');
    progress.technical_debt.forEach(item => lines.push(`- ${item}`));
    lines.push('');
  }

  // Continue here
  if (task.continue_here) {
    lines.push('## ▶ Continue Exactly Here');
    lines.push(`**File:** \`${task.continue_here.file}\``);
    lines.push(`**Location:** ${task.continue_here.location}`);
    lines.push(`**What to do:** ${task.continue_here.instruction}`);
    lines.push('');
  }

  // Current problem
  if (task.current_problem) {
    lines.push('## Current Problem');
    lines.push(task.current_problem);
    lines.push('');
  }

  // Next steps
  if (task.next_steps && task.next_steps.length > 0) {
    lines.push('## Next Steps');
    task.next_steps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
    lines.push('');
  }

  // Key decisions
  if (decisions.length > 0) {
    lines.push('## Key Decisions');
    decisions.forEach(dec => {
      lines.push(`- **${dec.decision}**: ${dec.why} | Impact: ${dec.impact}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('Confirm you understand this project, then wait for my instruction.');

  return lines.join('\n');
}

function buildOnboardPrompt() {
  return `Before proceeding, please summarize back to me:
1. What this project is
2. Current progress and state
3. Where you will continue working

This confirms you've read and understood the briefing.`;
}

function getStatusIcon(status) {
  const icons = {
    complete: '✅',
    in_progress: '🔄',
    broken: '❌',
    stub: '⬜',
    not_started: '⬜'
  };
  return icons[status] || '⬜';
}

export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
