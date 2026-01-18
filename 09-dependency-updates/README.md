# Dependency Updates Templates

This folder contains CodeRabbit configuration templates and example files for dependency update pull requests.

## Contents

- `coderabbit.yaml` - CodeRabbit configuration for dependency update reviews
- `package.json` - Example package.json with updated dependencies
- `migration-guide.md` - Example migration guide for major version updates

## Usage

Use these templates when creating pull requests that update dependencies to ensure comprehensive review coverage of:

- Security vulnerability patches
- Breaking changes assessment
- Performance impact analysis
- Compatibility verification
- Migration requirements

## Best Practices

- Update dependencies regularly, not all at once
- Read changelog and breaking changes documentation
- Test thoroughly across all environments
- Consider security implications of updates
- Document any required migration steps

## Dependency Update Checklist

### Pre-Update Assessment
- [ ] Review dependency changelog and release notes
- [ ] Identify breaking changes and migration requirements
- [ ] Check for security vulnerabilities being addressed
- [ ] Assess compatibility with other dependencies
- [ ] Plan rollback strategy if needed

### Security Updates
- [ ] Security patches applied promptly
- [ ] Vulnerability scanner results reviewed
- [ ] No new security issues introduced
- [ ] Dependencies with known CVEs updated
- [ ] Transitive dependency vulnerabilities addressed

### Compatibility Testing
- [ ] Unit tests pass with updated dependencies
- [ ] Integration tests verify system compatibility
- [ ] End-to-end tests confirm functionality
- [ ] Cross-browser/platform testing completed
- [ ] Performance benchmarks maintained

### Documentation
- [ ] Update requirements/dependencies documentation
- [ ] Migration guide created for breaking changes
- [ ] Changelog entry added
- [ ] Team notified of important changes
- [ ] Deployment notes updated

## Update Categories

### Patch Updates (1.0.x)
- **Risk Level**: Low
- **Changes**: Bug fixes, security patches
- **Testing**: Basic smoke testing
- **Frequency**: Weekly/bi-weekly

### Minor Updates (1.x.0)
- **Risk Level**: Medium
- **Changes**: New features, enhancements
- **Testing**: Comprehensive feature testing
- **Frequency**: Monthly

### Major Updates (x.0.0)
- **Risk Level**: High
- **Changes**: Breaking changes, API changes
- **Testing**: Full regression testing
- **Frequency**: Quarterly/as needed

## Common Update Scenarios

### Security Patches
- **Priority**: Immediate
- **Process**: Apply, test, deploy quickly
- **Documentation**: Security bulletin reference

### Framework Updates
- **Priority**: Scheduled
- **Process**: Thorough testing, staged rollout
- **Documentation**: Migration guide required

### Development Dependencies
- **Priority**: Low
- **Process**: Update in development, test builds
- **Documentation**: Team notification

### Critical Dependencies
- **Priority**: High
- **Process**: Extensive testing, backup plans
- **Documentation**: Detailed impact analysis