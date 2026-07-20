# Open-Ended Audit Prompt

> Reusable audit prompt for mission driver DEEP_AUDIT step. Discovers non-obvious problems without predetermined categories.

## Audit Method

Read through the project's:
1. **Design docs** (`docs/design/`) — What is the intended architecture?
2. **Recent logs** (`docs/logs/`) — What has been worked on recently?
3. **Active plans** (`docs/plans/`) — What is currently in progress?
4. **Source code** — What does the code actually do?

Then ask:
- What is the most likely thing to break in the next release?
- What assumption, if wrong, would cause the most damage?
- What technical debt is accumulating silently?
- What is the single highest-ROI change right now?

## Output Format

- **Top 3 risks**: Highest-severity issues found, with file paths and evidence
- **Hidden assumptions**: Documented or undocumented assumptions that may not hold
- **Recommendation**: What to do next (file a bug, draft a plan, update docs)

## When to Use

- DEEP_AUDIT step when no plans are active (idle time)
- Before milestone releases
- When encountering inexplicable bugs
