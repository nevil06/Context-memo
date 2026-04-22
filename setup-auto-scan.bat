@echo off
REM Setup auto-scan for context-memo (Windows)

echo Setting up auto-scan for context-memo...

REM Create pre-commit hook
(
echo #!/bin/bash
echo # Auto-scan project before commit
echo.
echo echo "Auto-scanning project with context-memo..."
echo memo scan --quick
echo.
echo # Add updated memory to commit
echo git add .recall/memory.yaml .recall/task_state.yaml
echo.
echo echo "Memory updated and added to commit"
) > .git\hooks\pre-commit

echo Auto-scan enabled! Memory will update on every git commit.
pause
