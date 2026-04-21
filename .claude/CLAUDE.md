# Context Memo Memory Integration

## Session Start Protocol
1. Check if .recall/memory.yaml exists
2. If it exists, run: memo load --mode=full
3. Read the briefing to understand project context
4. Confirm understanding before proceeding

## Before Token Limit
When approaching token/credit limit:
1. Run: memo update
2. Update continue_here with exact file and instruction
3. Ensure next agent knows where to resume

## Commands Available
- memo init — Initialize memory folder
- memo scan — Scan project and generate memory
- memo load — Load agent briefing
- memo status — View project dashboard
- memo update — Update task state
- memo config — Configure API key

## Key Files
- .recall/memory.yaml — Complete project memory
- .recall/task_state.yaml — Current task state
- .recall/decisions.log — Decision history

## Important
- Always read memory.yaml at session start
- Update continue_here before ending session
- Log important decisions
- Keep handoff_message current
