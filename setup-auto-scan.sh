#!/bin/bash
# Setup auto-scan for context-memo

echo "Setting up auto-scan for context-memo..."

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Auto-scan project before commit

echo "🔍 Auto-scanning project with context-memo..."
memo scan --quick

# Add updated memory to commit
git add .recall/memory.yaml .recall/task_state.yaml

echo "✅ Memory updated and added to commit"
EOF

# Make it executable
chmod +x .git/hooks/pre-commit

echo "✅ Auto-scan enabled! Memory will update on every git commit."
