# Performance Optimization Templates

This folder contains CodeRabbit configuration templates and example code for performance optimization pull requests.

## Contents

- `coderabbit.yaml` - CodeRabbit configuration with breaking changes-focused PR summary templates
- `query-optimization.js` - Example database query optimization implementation

## Usage

Use these templates when creating pull requests that optimize performance to ensure comprehensive review coverage of:

- Performance metrics and benchmarks
- Load testing results
- Resource utilization improvements
- Scalability enhancements
- Optimization strategies

## Best Practices

- Include before/after performance metrics
- Document optimization techniques used
- Provide load testing evidence
- Consider memory and CPU impact
- Measure real-world performance gains

## Performance Optimization Checklist

### Planning Phase
- [ ] Identify performance bottlenecks through profiling
- [ ] Set measurable performance targets
- [ ] Establish baseline metrics
- [ ] Plan testing methodology

### Implementation Phase
- [ ] Optimize algorithms and data structures
- [ ] Reduce unnecessary computations
- [ ] Implement caching strategies
- [ ] Optimize database queries
- [ ] Consider async/parallel processing

### Validation Phase
- [ ] Run comprehensive performance tests
- [ ] Verify functionality remains intact
- [ ] Check memory usage patterns
- [ ] Test under various load conditions
- [ ] Document performance improvements

## Common Optimization Areas

- **Database**: Query optimization, indexing, connection pooling
- **Caching**: Redis, in-memory caching, CDN usage
- **Algorithms**: Time/space complexity improvements
- **Resources**: Memory management, file I/O optimization
- **Frontend**: Bundle size, lazy loading, image optimization