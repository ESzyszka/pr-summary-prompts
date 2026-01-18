# Refactoring Templates

This folder contains CodeRabbit configuration templates and example code for refactoring pull requests.

## Contents

- `coderabbit.yaml` - CodeRabbit configuration with performance-focused PR summary templates
- `database-service-refactor.js` - Example database service refactoring implementation

## Usage

Use these templates when creating pull requests that refactor existing code to ensure comprehensive review coverage of:

- Code quality improvements
- Architecture changes
- Performance optimizations
- Maintainability enhancements
- Technical debt reduction

## Best Practices

- Clearly document the refactoring objectives
- Maintain backward compatibility where possible
- Include performance benchmarks if applicable
- Ensure comprehensive test coverage
- Break large refactors into smaller, reviewable chunks

## Refactoring Guidelines

### Before Refactoring
- [ ] Understand the existing code thoroughly
- [ ] Identify specific pain points and objectives
- [ ] Ensure adequate test coverage exists
- [ ] Plan the refactoring approach

### During Refactoring
- [ ] Make small, incremental changes
- [ ] Run tests frequently
- [ ] Maintain functionality throughout
- [ ] Document architectural decisions

### After Refactoring
- [ ] Verify all tests pass
- [ ] Check performance hasn't degraded
- [ ] Update documentation
- [ ] Review with team members