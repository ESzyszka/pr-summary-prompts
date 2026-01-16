# API Usage Examples and Integration Guide

## Quick Start Examples

### Authentication Flow

```javascript
// User Registration
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'developer@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Developer'
  })
});

const { data } = await response.json();
console.log('Registration successful:', data.user);
```

```bash
# cURL Example
curl -X POST https://api.example.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Developer"
  }'
```

### OAuth Integration

```javascript
// OAuth Login (Google)
window.location.href = '/api/auth/google';

// Handle OAuth callback
const handleOAuthCallback = async (code, state) => {
  const response = await fetch(`/api/auth/google/callback?code=${code}&state=${state}`);
  const { data } = await response.json();

  // Store token
  localStorage.setItem('authToken', data.token);

  // Redirect to dashboard
  window.location.href = '/dashboard';
};
```

### API Authentication

```javascript
// Set up authenticated requests
const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  }
});

// Automatic token refresh
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const newToken = await refreshToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Advanced Usage Patterns

### Pagination and Filtering

```javascript
// Get users with pagination and filters
const getUsers = async (filters = {}) => {
  const params = new URLSearchParams({
    page: filters.page || 1,
    limit: filters.limit || 20,
    search: filters.search || '',
    role: filters.role || '',
    sortBy: filters.sortBy || 'createdAt',
    sortOrder: filters.sortOrder || 'desc'
  });

  const response = await apiClient.get(`/api/users?${params}`);
  return response.data;
};

// Example usage
const users = await getUsers({
  page: 2,
  limit: 50,
  search: 'john',
  role: 'admin',
  sortBy: 'lastName',
  sortOrder: 'asc'
});

console.log(`Found ${users.pagination.total} users`);
console.log(`Page ${users.pagination.page} of ${users.pagination.pages}`);
```

### Batch Operations

```javascript
// Bulk user operations
const batchUpdateUsers = async (operations) => {
  const response = await apiClient.post('/api/users/batch', {
    operations: [
      {
        id: 'op1',
        type: 'update',
        userId: '12345',
        data: { role: 'moderator' }
      },
      {
        id: 'op2',
        type: 'create',
        data: {
          email: 'bulk.user@example.com',
          firstName: 'Bulk',
          lastName: 'User'
        }
      }
    ]
  });

  // Handle mixed results
  response.data.results.forEach(result => {
    if (result.success) {
      console.log(`Operation ${result.operation} completed:`, result.data);
    } else {
      console.error(`Operation ${result.operation} failed:`, result.error);
    }
  });
};
```

### Webhooks Integration

```javascript
// Register webhook endpoint
const registerWebhook = async () => {
  const webhook = await apiClient.post('/api/webhooks', {
    url: 'https://your-app.com/webhooks/user-events',
    events: ['user.created', 'user.updated', 'user.deleted'],
    secret: 'your-webhook-secret',
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  });

  console.log('Webhook registered:', webhook.data.id);
  return webhook.data;
};

// Webhook handler (Express.js example)
app.post('/webhooks/user-events', (req, res) => {
  const signature = req.headers['x-signature'];
  const payload = JSON.stringify(req.body);

  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', 'your-webhook-secret')
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook event
  const { event, data } = req.body;

  switch (event) {
    case 'user.created':
      console.log('New user created:', data.user);
      break;
    case 'user.updated':
      console.log('User updated:', data.user);
      break;
    case 'user.deleted':
      console.log('User deleted:', data.userId);
      break;
  }

  res.status(200).send('OK');
});
```

## SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { UserManagementAPI } from '@company/user-api-sdk';

// Initialize SDK
const api = new UserManagementAPI({
  baseUrl: 'https://api.example.com',
  apiKey: process.env.API_KEY
});

// TypeScript interfaces
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin' | 'moderator';
  createdAt: string;
  lastLogin?: string;
}

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: string;
}

// SDK usage
const createUser = async (userData: CreateUserRequest): Promise<User> => {
  try {
    const user = await api.users.create(userData);
    return user;
  } catch (error) {
    if (error.code === 'EMAIL_EXISTS') {
      throw new Error('User with this email already exists');
    }
    throw error;
  }
};
```

### Python SDK

```python
from user_api import UserManagementAPI
import asyncio

# Initialize SDK
api = UserManagementAPI(
    base_url="https://api.example.com",
    api_key=os.getenv("API_KEY")
)

# Async/await example
async def create_and_notify_user(user_data):
    try:
        # Create user
        user = await api.users.create(user_data)
        print(f"Created user: {user['email']}")

        # Send welcome email
        await api.notifications.send_email({
            'recipient': user['email'],
            'template': 'welcome',
            'data': {'firstName': user['firstName']}
        })

        return user
    except api.EmailExistsError:
        print("User already exists")
        return await api.users.get_by_email(user_data['email'])

# Usage
user_data = {
    'email': 'python.user@example.com',
    'firstName': 'Python',
    'lastName': 'Developer',
    'password': 'SecurePassword123!'
}

user = asyncio.run(create_and_notify_user(user_data))
```

### Go SDK

```go
package main

import (
    "context"
    "fmt"
    "log"
    "github.com/company/user-api-go"
)

func main() {
    // Initialize client
    client := userapi.NewClient(&userapi.Config{
        BaseURL: "https://api.example.com",
        APIKey:  os.Getenv("API_KEY"),
    })

    ctx := context.Background()

    // Create user
    user, err := client.Users.Create(ctx, &userapi.CreateUserRequest{
        Email:     "go.user@example.com",
        FirstName: "Go",
        LastName:  "Developer",
        Password:  "SecurePassword123!",
        Role:      userapi.RoleUser,
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Created user: %s (ID: %s)\n", user.Email, user.ID)

    // List users with pagination
    users, err := client.Users.List(ctx, &userapi.ListUsersRequest{
        Page:    1,
        Limit:   50,
        SortBy:  userapi.SortByCreatedAt,
        Order:   userapi.OrderDesc,
        Filters: &userapi.UserFilters{
            Role: userapi.RoleAdmin,
        },
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Found %d admin users\n", users.Pagination.Total)
}
```

## Error Handling Examples

### JavaScript Error Handling

```javascript
const handleAPIError = (error) => {
  // Network errors
  if (!error.response) {
    console.error('Network error:', error.message);
    return 'Unable to connect to the server. Please try again.';
  }

  // HTTP errors
  const { status, data } = error.response;

  switch (status) {
    case 400:
      return data.errors ?
        `Validation failed: ${data.errors.map(e => e.message).join(', ')}` :
        'Invalid request data';

    case 401:
      // Redirect to login
      window.location.href = '/login';
      return 'Authentication required';

    case 403:
      return 'You do not have permission to perform this action';

    case 404:
      return 'The requested resource was not found';

    case 429:
      const retryAfter = error.response.headers['retry-after'];
      return `Rate limit exceeded. Please try again ${retryAfter ? `in ${retryAfter} seconds` : 'later'}`;

    case 500:
      return 'Internal server error. Please try again later';

    default:
      return data.message || 'An unexpected error occurred';
  }
};

// Usage with async/await
const safeAPICall = async (apiFunction) => {
  try {
    return await apiFunction();
  } catch (error) {
    const errorMessage = handleAPIError(error);
    console.error('API Error:', errorMessage);
    throw new Error(errorMessage);
  }
};
```

### Rate Limiting and Retry Logic

```javascript
const withRetry = async (apiCall, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
    }
  }

  throw lastError;
};

// Usage
const getUserData = () => withRetry(() => apiClient.get('/api/user/profile'));
```

## Testing Examples

### Unit Testing with Jest

```javascript
import { UserAPI } from '../src/user-api';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UserAPI', () => {
  let userAPI: UserAPI;

  beforeEach(() => {
    userAPI = new UserAPI('https://api.example.com');
    mockedAxios.create.mockReturnValue(mockedAxios);
  });

  it('should create user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      password: 'SecurePassword123!'
    };

    const expectedResponse = {
      data: {
        success: true,
        data: { id: '123', ...userData }
      }
    };

    mockedAxios.post.mockResolvedValueOnce(expectedResponse);

    const result = await userAPI.createUser(userData);

    expect(result.id).toBe('123');
    expect(result.email).toBe(userData.email);
    expect(mockedAxios.post).toHaveBeenCalledWith('/auth/register', userData);
  });

  it('should handle validation errors', async () => {
    const invalidData = {
      email: 'invalid-email',
      password: '123'
    };

    mockedAxios.post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          success: false,
          errors: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Password too short' }
          ]
        }
      }
    });

    await expect(userAPI.createUser(invalidData)).rejects.toThrow('Invalid email format');
  });
});
```

### Integration Testing

```javascript
describe('User Management Integration', () => {
  let server;
  let apiClient;

  beforeAll(async () => {
    server = await startTestServer();
    apiClient = axios.create({
      baseURL: `http://localhost:${server.port}`
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('should complete full user lifecycle', async () => {
    // 1. Register user
    const registrationData = {
      email: 'integration@example.com',
      firstName: 'Integration',
      lastName: 'Test',
      password: 'SecurePassword123!'
    };

    const registerResponse = await apiClient.post('/api/auth/register', registrationData);
    expect(registerResponse.status).toBe(201);

    const userId = registerResponse.data.data.user.id;

    // 2. Login user
    const loginResponse = await apiClient.post('/api/auth/login', {
      email: registrationData.email,
      password: registrationData.password
    });

    const token = loginResponse.data.data.token;
    apiClient.defaults.headers.Authorization = `Bearer ${token}`;

    // 3. Get user profile
    const profileResponse = await apiClient.get('/api/user/profile');
    expect(profileResponse.data.data.user.email).toBe(registrationData.email);

    // 4. Update user profile
    const updateData = { firstName: 'Updated' };
    const updateResponse = await apiClient.put(`/api/users/${userId}`, updateData);
    expect(updateResponse.data.data.firstName).toBe('Updated');

    // 5. Delete user
    const deleteResponse = await apiClient.delete(`/api/users/${userId}`);
    expect(deleteResponse.status).toBe(204);
  });
});
```

## Performance Monitoring

### Response Time Tracking

```javascript
const performanceMonitor = {
  async trackAPICall(apiCall, operationName) {
    const startTime = performance.now();

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      // Log performance metrics
      console.log(`${operationName} completed in ${duration.toFixed(2)}ms`);

      // Send metrics to monitoring service
      if (window.analytics) {
        window.analytics.track('API Performance', {
          operation: operationName,
          duration,
          status: 'success'
        });
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      console.error(`${operationName} failed in ${duration.toFixed(2)}ms:`, error);

      if (window.analytics) {
        window.analytics.track('API Performance', {
          operation: operationName,
          duration,
          status: 'error',
          error: error.message
        });
      }

      throw error;
    }
  }
};

// Usage
const createUserWithTracking = (userData) =>
  performanceMonitor.trackAPICall(
    () => apiClient.post('/api/auth/register', userData),
    'User Registration'
  );
```

This comprehensive guide provides practical examples for integrating with the User Management API across different programming languages, error handling patterns, testing strategies, and performance monitoring approaches.