# Multi-Dimensional Audit Prompt

> Reusable audit prompt for mission driver DEEP_AUDIT step. Evaluates the project from multiple orthogonal dimensions.

## Audit Dimensions

1. **Architecture**: Does the code match the design docs? Are there layering violations?
2. **Completeness**: Are there missing features, edge cases, or error paths?
3. **Consistency**: Is the code style, naming, and pattern usage consistent across the codebase?
4. **Test coverage**: Are there adequate tests? Are there untested critical paths?
5. **Documentation**: Are design docs up to date? Are there undocumented assumptions?
6. **Dependencies**: Are there unnecessary dependencies? Are there circular dependencies?
7. **Performance**: Are there obvious performance issues (N+1 queries, unnecessary re-renders)?
8. **Security**: Are there input validation issues, XSS vectors, or auth bypasses?

## Output Format

For each dimension, produce:
- **Status**: PASS / MINOR / MAJOR / CRITICAL
- **Evidence**: Specific file paths and line numbers
- **Recommendation**: Concrete fix or follow-up plan

## When to Use

- DEEP_AUDIT step in mission driver loop
- Before major refactoring
- When onboarding new team members to a codebase area
