# API Changes Templates

This folder contains CodeRabbit configuration templates and example code for API-related pull requests.

## Contents

- `coderabbit.yaml` - CodeRabbit configuration for API change reviews
- `api-v2-endpoints.js` - Example API v2 endpoint implementations

## Usage

Use these templates when creating pull requests that modify APIs to ensure comprehensive review coverage of:

- Endpoint design and RESTful principles
- Request/response schema validation
- Backward compatibility considerations
- API versioning strategies
- Authentication and authorization

## Best Practices

- Follow semantic versioning for breaking changes
- Maintain comprehensive API documentation
- Include request/response examples
- Consider rate limiting and throttling
- Implement proper error handling

## API Design Checklist

### Endpoint Design
- [ ] RESTful URI conventions followed
- [ ] HTTP methods used appropriately
- [ ] Consistent naming conventions
- [ ] Proper status codes returned

### Documentation
- [ ] OpenAPI/Swagger specifications updated
- [ ] Request/response examples provided
- [ ] Error response formats documented
- [ ] Authentication requirements specified

### Compatibility
- [ ] Backward compatibility maintained
- [ ] Deprecation notices for removed endpoints
- [ ] Migration guide for breaking changes
- [ ] Client SDK updates considered

### Security
- [ ] Input validation implemented
- [ ] Authentication mechanisms verified
- [ ] Authorization rules enforced
- [ ] Rate limiting configured

## Common API Patterns

- **RESTful Resources**: CRUD operations on entities
- **Pagination**: Limit, offset, cursor-based pagination
- **Filtering**: Query parameters for data filtering
- **Sorting**: Configurable result ordering
- **Versioning**: Header, URL, or parameter-based versioning