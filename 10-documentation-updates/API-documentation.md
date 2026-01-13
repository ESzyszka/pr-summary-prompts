# API Documentation

## Overview

The Project Management App provides a comprehensive REST API for managing projects, tasks, users, and collaboration features. All endpoints require authentication unless otherwise specified.

## Base URL

```
https://api.project-app.com/v2
```

## Authentication

### Bearer Token

Include your access token in the Authorization header:

```http
Authorization: Bearer <your-access-token>
```

### Getting Access Tokens

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

## Rate Limiting

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 5 requests/15 min |
| General API | 1000 requests/15 min |
| File Upload | 10 requests/min |
| Webhooks | 100 requests/15 min |

Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

## Users API

### Get Current User

```http
GET /users/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://example.com/avatar.jpg",
    "role": "user",
    "isVerified": true,
    "preferences": {
      "theme": "dark",
      "notifications": {
        "email": true,
        "push": false
      }
    },
    "createdAt": "2023-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-15T10:30:00Z"
  }
}
```

### Update User Profile

```http
PATCH /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "preferences": {
    "theme": "light",
    "notifications": {
      "email": false,
      "push": true
    }
  }
}
```

### Search Users

```http
GET /users?search=john&role=user&limit=10&page=1
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `search` | string | Search term for name/email | - |
| `role` | string | Filter by role (admin, user, moderator) | - |
| `status` | string | Filter by status (active, inactive, pending) | - |
| `limit` | number | Results per page (1-100) | 20 |
| `page` | number | Page number | 1 |
| `sortBy` | string | Sort field (createdAt, name, lastLogin) | createdAt |
| `sortOrder` | string | Sort direction (asc, desc) | desc |

## Projects API

### Create Project

```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Website Redesign",
  "description": "Complete redesign of the company website",
  "status": "active",
  "visibility": "team",
  "dueDate": "2024-06-01T23:59:59Z",
  "tags": ["design", "frontend", "urgent"],
  "settings": {
    "allowTaskCreation": true,
    "requireTaskApproval": false,
    "defaultTaskPriority": "medium"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "project_456",
    "name": "Website Redesign",
    "description": "Complete redesign of the company website",
    "status": "active",
    "visibility": "team",
    "ownerId": "user_123",
    "dueDate": "2024-06-01T23:59:59Z",
    "tags": ["design", "frontend", "urgent"],
    "settings": {
      "allowTaskCreation": true,
      "requireTaskApproval": false,
      "defaultTaskPriority": "medium"
    },
    "stats": {
      "totalTasks": 0,
      "completedTasks": 0,
      "memberCount": 1
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "2.0"
  }
}
```

### Get Project Details

```http
GET /projects/{projectId}?include=members,tasks,stats
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `include` | string | Comma-separated list: members, tasks, stats, activity |

### Update Project

```http
PATCH /projects/{projectId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Website Redesign v2",
  "status": "in_progress",
  "dueDate": "2024-07-01T23:59:59Z"
}
```

### Delete Project

```http
DELETE /projects/{projectId}
Authorization: Bearer <token>
```

### Search Projects

```http
GET /projects/search?q=website&tags=design,frontend&status=active
Authorization: Bearer <token>
```

**Advanced Search Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (name, description) |
| `tags` | string | Comma-separated tags |
| `status` | string | Project status filter |
| `owner` | string | Owner user ID |
| `dateFrom` | string | ISO 8601 date |
| `dateTo` | string | ISO 8601 date |
| `visibility` | string | public, private, team |
| `minMembers` | number | Minimum member count |
| `maxMembers` | number | Maximum member count |
| `sortBy` | string | relevance, createdAt, updatedAt, name, memberCount |
| `sortOrder` | string | asc, desc |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "project_456",
      "name": "Website Redesign",
      "description": "Complete redesign of the company website",
      "status": "active",
      "ownerId": "user_123",
      "memberCount": 5,
      "taskCount": 12,
      "completedTasks": 3,
      "highlights": {
        "name": "<em>Website</em> Redesign",
        "description": "Complete redesign of the company <em>website</em>"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-20T15:45:00Z"
    }
  ],
  "meta": {
    "searchQuery": "website",
    "filters": {
      "tags": ["design", "frontend"],
      "status": "active"
    },
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "searchMeta": {
      "executionTime": 45,
      "indexUsed": true,
      "suggestions": []
    }
  }
}
```

## Tasks API

### Create Task

```http
POST /projects/{projectId}/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Design homepage mockup",
  "description": "Create high-fidelity mockup for the new homepage",
  "priority": "high",
  "status": "todo",
  "assignedTo": "user_789",
  "dueDate": "2024-02-01T17:00:00Z",
  "tags": ["design", "homepage"],
  "estimatedHours": 8,
  "dependencies": ["task_123"]
}
```

### Get Tasks

```http
GET /projects/{projectId}/tasks?status=todo&assignedTo=user_789&limit=50
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | todo, in_progress, review, completed |
| `assignedTo` | string | User ID |
| `priority` | string | low, medium, high, urgent |
| `tags` | string | Comma-separated tags |
| `dueBefore` | string | ISO 8601 date |
| `dueAfter` | string | ISO 8601 date |

### Update Task

```http
PATCH /tasks/{taskId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress",
  "actualHours": 2,
  "notes": "Started working on the wireframe"
}
```

### Bulk Update Tasks

```http
PATCH /tasks/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "operations": [
    {
      "taskId": "task_123",
      "action": "updateStatus",
      "data": { "status": "completed" }
    },
    {
      "taskId": "task_456",
      "action": "updateAssignee",
      "data": { "assignedTo": "user_789" }
    }
  ]
}
```

## Webhooks API

### Create Webhook

```http
POST /projects/{projectId}/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/project-updates",
  "events": [
    "project.updated",
    "task.created",
    "task.completed",
    "member.added"
  ],
  "secret": "your-webhook-secret",
  "active": true,
  "description": "Notify Slack channel of project updates"
}
```

**Supported Events:**

| Event | Description |
|-------|-------------|
| `project.created` | New project created |
| `project.updated` | Project details updated |
| `project.deleted` | Project deleted |
| `task.created` | New task created |
| `task.updated` | Task details updated |
| `task.completed` | Task marked as completed |
| `member.added` | Member added to project |
| `member.removed` | Member removed from project |

### List Webhooks

```http
GET /projects/{projectId}/webhooks
Authorization: Bearer <token>
```

### Update Webhook

```http
PATCH /webhooks/{webhookId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "active": false,
  "events": ["task.completed"]
}
```

### Test Webhook

```http
POST /webhooks/{webhookId}/test
Authorization: Bearer <token>
```

## Real-time API (WebSocket)

### Connection

```javascript
const socket = io('wss://api.project-app.com', {
  auth: {
    token: 'your-access-token'
  }
});
```

### Events

#### Join Project Room

```javascript
socket.emit('join-project', { projectId: 'project_456' });
```

#### Listen for Updates

```javascript
socket.on('task-updated', (data) => {
  console.log('Task updated:', data);
});

socket.on('member-joined', (data) => {
  console.log('New member:', data);
});

socket.on('project-updated', (data) => {
  console.log('Project updated:', data);
});
```

#### Real-time Collaboration

```javascript
// Broadcast cursor position
socket.emit('cursor-move', {
  projectId: 'project_456',
  x: 100,
  y: 200,
  user: 'user_123'
});

// Listen for other users' cursors
socket.on('cursor-update', (data) => {
  updateCursor(data.user, data.x, data.y);
});
```

## File Upload API

### Upload File

```http
POST /files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary data>
projectId: project_456
description: Project requirements document
```

**Supported File Types:**
- Images: JPG, PNG, GIF, WebP (max 10MB)
- Documents: PDF, DOC, DOCX, TXT (max 25MB)
- Archives: ZIP, RAR (max 50MB)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "file_789",
    "filename": "requirements.pdf",
    "originalName": "Project Requirements.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "url": "https://cdn.project-app.com/files/file_789.pdf",
    "thumbnailUrl": "https://cdn.project-app.com/thumbnails/file_789.jpg",
    "uploadedBy": "user_123",
    "projectId": "project_456",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

## Analytics API

### Project Analytics

```http
GET /projects/{projectId}/analytics?timeRange=30days
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `timeRange` | string | 7days, 30days, 90days, 1year |
| `metrics` | string | tasks,members,activity,performance |

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTasks": 45,
      "completedTasks": 32,
      "inProgressTasks": 8,
      "overdueeTasks": 2,
      "averageCompletionTime": 2.5,
      "activeMembers": 6
    },
    "dailyStats": [
      {
        "date": "2024-01-15",
        "tasksCreated": 3,
        "tasksCompleted": 5,
        "activitiesCount": 12
      }
    ],
    "memberContributions": [
      {
        "userId": "user_123",
        "name": "John Doe",
        "tasksCompleted": 12,
        "tasksCreated": 8,
        "commentsCount": 25
      }
    ]
  }
}
```

## Health & Monitoring

### System Health

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "2.0",
    "uptime": 86400,
    "memory": {
      "used": 134217728,
      "total": 268435456
    },
    "dependencies": {
      "database": {
        "status": "healthy",
        "responseTime": 12
      },
      "redis": {
        "status": "healthy",
        "responseTime": 3
      },
      "external_api": {
        "status": "healthy",
        "responseTime": 156
      }
    }
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const ProjectApp = require('@project-app/sdk');

const client = new ProjectApp({
  apiKey: 'your-api-key',
  baseURL: 'https://api.project-app.com/v2'
});

// Create a project
const project = await client.projects.create({
  name: 'My New Project',
  description: 'Project description'
});

// Get project tasks
const tasks = await client.projects.getTasks(project.id, {
  status: 'todo',
  limit: 10
});

// Create a task
const task = await client.tasks.create({
  projectId: project.id,
  title: 'New Task',
  assignedTo: 'user_123'
});
```

### Python

```python
from project_app import ProjectApp

client = ProjectApp(
    api_key='your-api-key',
    base_url='https://api.project-app.com/v2'
)

# Create a project
project = client.projects.create({
    'name': 'My New Project',
    'description': 'Project description'
})

# Get project tasks
tasks = client.projects.get_tasks(project['id'], {
    'status': 'todo',
    'limit': 10
})

# Create a task
task = client.tasks.create({
    'project_id': project['id'],
    'title': 'New Task',
    'assigned_to': 'user_123'
})
```

## Changelog

### v2.1.0 (2024-01-15)
- Added bulk task operations
- Enhanced search capabilities with highlighting
- Improved webhook event types
- Added file upload with thumbnail generation

### v2.0.0 (2024-01-01)
- Complete API redesign
- Improved authentication flow
- Added real-time WebSocket support
- Enhanced analytics endpoints
- Better error handling and validation

### v1.5.0 (2023-12-01)
- Added webhook support
- Improved rate limiting
- Added file attachments
- Enhanced search functionality