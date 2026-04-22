import { buildFileTree } from './scanner.js';

export function buildGeminiPrompt(files, gitInfo, graphSummary) {
  const sections = [];

  sections.push(`You are analyzing a software project to build a comprehensive memory file for AI agent handoffs.

Return ONLY valid YAML with NO markdown fences, NO explanations, NO additional text.

The YAML must follow this EXACT structure:`);

  sections.push(`
project:
  name: [exact project name]
  purpose: [2-3 sentences: problem it solves, for whom, why it matters]
  type: [REST API | CLI | SaaS | library | mobile | etc]
  stack: [every tech, framework, key library]
  entry_points: [main files to run the project]
  environment_vars: [all env vars found in code or .env.example]
  constraints: [free tier, offline, no paid APIs, etc]
  non_goals: [explicitly out of scope]

knowledge_graph:
  god_nodes:
    - name: [most connected/critical module]
      why_critical: [why everything depends on this]
      file: [file path]
      connections: [number]
  components:
    - name: [component name]
      file: [exact file path]
      role: [1 sentence what it does]
      exports: [key functions/classes it exposes]
      depends_on: [other components it uses]
      status: [complete|in_progress|broken|stub|not_started]
  data_flow: [input to output end-to-end in 1-2 sentences]
  api_endpoints: [METHOD /path — what it does]
  data_models: [main tables/schemas/data structures]
  external_services: [APIs, DBs, queues, storage]

progress:
  percent_done: [0-100 integer]
  phase: [just_started|early|mid|nearly_complete|complete]
  what_works:
    - [working feature with evidence]
  what_is_broken:
    - [bug with file + symptom]
  what_is_missing:
    - [feature referenced but not built]
  technical_debt:
    - [TODOs, shortcuts, hardcoded values]

task_state:
  last_task: [what was being worked on — infer from git + code]
  current_problem: [most important unresolved issue]
  continue_here:
    file: [exact file to open]
    location: [function name or line number]
    instruction: [precise 1-2 sentence instruction for next agent]
  next_steps:
    - [concrete actionable task]
    - [concrete actionable task]
    - [concrete actionable task]
  blocked_on: [blocker or "nothing"]
  completed_recently:
    - [recently finished — infer from git]

decisions:
  - decision: [what was decided]
    why: [reason — infer from code patterns and comments]
    impact: [what this affects]

handoff_message: |
  [4-6 sentence paragraph in plain English for a NEW AI agent.
  Cover: what the project is, current state, what's broken,
  exactly where to continue, what NOT to touch.
  This is the MOST IMPORTANT field — it replaces thousands of
  tokens of re-explanation. Be direct and specific.]
`);

  sections.push('\n--- PROJECT CONTEXT ---\n');

  // Knowledge graph summary (if provided)
  if (graphSummary) {
    sections.push('KNOWLEDGE GRAPH ANALYSIS:');
    sections.push(JSON.stringify(graphSummary, null, 2));
    sections.push('');
  }

  // File tree
  sections.push('FILE TREE (top 3 levels):');
  sections.push(buildFileTree(files.tree));
  sections.push('');

  // Git info
  if (gitInfo.available) {
    sections.push(`GIT BRANCH: ${gitInfo.branch}`);
    sections.push('\nRECENT COMMITS:');
    sections.push(gitInfo.log);
    sections.push('\nGIT STATUS:');
    sections.push(gitInfo.status || '(clean)');
    sections.push('');
  }

  // Config files
  if (files.config.length > 0) {
    sections.push('--- CONFIGURATION FILES ---');
    for (const file of files.config) {
      sections.push(`\n=== ${file.path} ===`);
      sections.push(file.content);
    }
    sections.push('');
  }

  // Documentation
  if (files.docs.length > 0) {
    sections.push('--- DOCUMENTATION ---');
    for (const file of files.docs) {
      sections.push(`\n=== ${file.path} ===`);
      sections.push(file.content);
    }
    sections.push('');
  }

  // Code files
  if (files.code.length > 0) {
    sections.push('--- CODE FILES ---');
    for (const file of files.code) {
      sections.push(`\n=== ${file.path} ===`);
      sections.push(file.content);
    }
    sections.push('');
  }

  sections.push('\nRemember: Return ONLY valid YAML. No markdown fences. No explanations.');

  return sections.join('\n');
}
