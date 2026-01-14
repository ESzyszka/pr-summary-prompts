// Comprehensive Test Suite with Enhanced Coverage
const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const app = require('../app');
const { User, Project, Task } = require('../models');
const { EmailService, NotificationService } = require('../services');
const { createTestDatabase, cleanupTestDatabase } = require('./helpers/database');
const { createMockUser, createMockProject, createMockTask } = require('./fixtures/entities');

describe('User Authentication & Authorization', () => {
  let testDb, authToken, testUser;

  before(async () => {
    testDb = await createTestDatabase();
    testUser = await createMockUser({
      email: 'test@example.com',
      role: 'user',
      isVerified: true
    });
  });

  after(async () => {
    await cleanupTestDatabase(testDb);
  });

  beforeEach(() => {
    // Reset all mocks before each test
    sinon.restore();
    nock.cleanAll();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const emailSpy = sinon.spy(EmailService, 'sendWelcomeEmail');

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.email).to.equal(userData.email);
      expect(response.body.data.user.password).to.be.undefined;

      // Verify email was sent
      expect(emailSpy.calledOnce).to.be.true;
      expect(emailSpy.firstCall.args[0]).to.equal(userData.email);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'weak@example.com',
        password: '123',
        firstName: 'Weak',
        lastName: 'Password'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.errors).to.be.an('array');
      expect(response.body.errors.some(err => err.field === 'password')).to.be.true;
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        email: testUser.email, // Use existing user's email
        password: 'SecurePassword123!',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('already exists');
    });

    it('should handle database errors gracefully', async () => {
      const userData = {
        email: 'dbtest@example.com',
        password: 'SecurePassword123!',
        firstName: 'DB',
        lastName: 'Test'
      };

      // Mock database error
      const userSaveStub = sinon.stub(User.prototype, 'save')
        .rejects(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(500);

      expect(response.body.success).to.be.false;
      expect(userSaveStub.calledOnce).to.be.true;
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'password123' // Assuming this is the test user's password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.accessToken).to.be.a('string');
      expect(response.body.data.user.id).to.equal(testUser.id);

      // Store token for subsequent tests
      authToken = response.body.data.accessToken;

      // Check that refresh token is set as httpOnly cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).to.be.an('array');
      expect(cookies.some(cookie => cookie.includes('refreshToken'))).to.be.true;
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.message).to.include('Invalid credentials');
    });

    it('should enforce rate limiting on login attempts', async () => {
      const loginData = {
        email: 'ratetest@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // The 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(response.body.error).to.include('Too many');
    });
  });
});

describe('Project Management', () => {
  let testDb, authToken, testUser, testProject;

  before(async () => {
    testDb = await createTestDatabase();
    testUser = await createMockUser();
    testProject = await createMockProject({ ownerId: testUser.id });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'password123' });
    authToken = loginResponse.body.data.accessToken;
  });

  after(async () => {
    await cleanupTestDatabase(testDb);
  });

  describe('POST /api/projects', () => {
    it('should create a new project with valid data', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project for unit testing',
        status: 'active',
        visibility: 'private'
      };

      const notificationSpy = sinon.spy(NotificationService, 'sendProjectCreated');

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.name).to.equal(projectData.name);
      expect(response.body.data.ownerId).to.equal(testUser.id);

      // Verify notification was sent
      expect(notificationSpy.calledOnce).to.be.true;
    });

    it('should validate required fields', async () => {
      const invalidProjectData = {
        description: 'Missing name field'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidProjectData)
        .expect(400);

      expect(response.body.success).to.be.false;
      expect(response.body.errors).to.be.an('array');
    });

    it('should require authentication', async () => {
      const projectData = {
        name: 'Unauthorized Project',
        description: 'Should not be created'
      };

      const response = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(401);

      expect(response.body.success).to.be.false;
    });
  });

  describe('GET /api/projects/search', () => {
    beforeEach(async () => {
      // Create additional test projects for search testing
      await createMockProject({
        name: 'React Dashboard',
        description: 'Modern dashboard built with React',
        ownerId: testUser.id,
        tags: ['react', 'dashboard', 'frontend']
      });

      await createMockProject({
        name: 'Node.js API',
        description: 'RESTful API built with Node.js and Express',
        ownerId: testUser.id,
        tags: ['nodejs', 'api', 'backend']
      });
    });

    it('should search projects by name', async () => {
      const response = await request(app)
        .get('/api/projects/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'React' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.greaterThan(0);
      expect(response.body.data[0].name).to.include('React');
    });

    it('should filter projects by tags', async () => {
      const response = await request(app)
        .get('/api/projects/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          q: 'dashboard',
          tags: 'frontend,dashboard'
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.meta.filters.tags).to.deep.equal(['frontend', 'dashboard']);
    });

    it('should paginate search results', async () => {
      const response = await request(app)
        .get('/api/projects/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          q: 'project',
          page: 1,
          limit: 1
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.meta.pagination.page).to.equal(1);
      expect(response.body.meta.pagination.limit).to.equal(1);
      expect(response.body.data.length).to.equal(1);
    });

    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/projects/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'nonexistentproject' })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.equal(0);
    });
  });
});

describe('Task Management Integration Tests', () => {
  let testDb, authToken, testUser, testProject, testTask;

  before(async () => {
    testDb = await createTestDatabase();
    testUser = await createMockUser();
    testProject = await createMockProject({ ownerId: testUser.id });
    testTask = await createMockTask({
      projectId: testProject.id,
      assignedTo: testUser.id
    });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'password123' });
    authToken = loginResponse.body.data.accessToken;
  });

  after(async () => {
    await cleanupTestDatabase(testDb);
  });

  describe('Task Lifecycle', () => {
    it('should complete the full task lifecycle', async () => {
      // Create task
      const taskData = {
        title: 'Integration Test Task',
        description: 'Task for integration testing',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      const createResponse = await request(app)
        .post(`/api/projects/${testProject.id}/tasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      const taskId = createResponse.body.data.id;

      // Update task
      const updateResponse = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(updateResponse.body.data.status).to.equal('in_progress');

      // Complete task
      const completeResponse = await request(app)
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(completeResponse.body.data.status).to.equal('completed');
      expect(completeResponse.body.data.completedAt).to.be.a('string');
    });

    it('should enforce task permissions', async () => {
      // Create another user
      const otherUser = await createMockUser({
        email: 'other@example.com'
      });

      const otherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: otherUser.email, password: 'password123' });

      const otherAuthToken = otherLoginResponse.body.data.accessToken;

      // Try to update task with other user's token
      const response = await request(app)
        .patch(`/api/tasks/${testTask.id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({ status: 'completed' })
        .expect(403);

      expect(response.body.success).to.be.false;
    });
  });
});

describe('External API Integration', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should handle external email service integration', async () => {
    const emailData = {
      to: 'test@example.com',
      subject: 'Test Email',
      template: 'welcome'
    };

    // Mock external email service
    nock('https://api.emailservice.com')
      .post('/send')
      .reply(200, {
        success: true,
        messageId: 'test-message-id'
      });

    const result = await EmailService.sendEmail(emailData);

    expect(result.success).to.be.true;
    expect(result.messageId).to.equal('test-message-id');
  });

  it('should handle external service failures gracefully', async () => {
    const emailData = {
      to: 'test@example.com',
      subject: 'Test Email',
      template: 'welcome'
    };

    // Mock service failure
    nock('https://api.emailservice.com')
      .post('/send')
      .reply(500, {
        error: 'Service unavailable'
      });

    try {
      await EmailService.sendEmail(emailData);
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).to.include('Email service unavailable');
    }
  });

  it('should handle network timeouts', async () => {
    const emailData = {
      to: 'test@example.com',
      subject: 'Test Email',
      template: 'welcome'
    };

    // Mock timeout
    nock('https://api.emailservice.com')
      .post('/send')
      .delay(6000) // Delay longer than timeout
      .reply(200, { success: true });

    try {
      await EmailService.sendEmail(emailData);
      expect.fail('Should have timed out');
    } catch (error) {
      expect(error.message).to.include('timeout');
    }
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('should handle concurrent user registrations', async () => {
    const concurrentRequests = 50;
    const startTime = Date.now();

    const promises = Array(concurrentRequests).fill().map((_, index) => {
      return request(app)
        .post('/api/auth/register')
        .send({
          email: `concurrent${index}@example.com`,
          password: 'SecurePassword123!',
          firstName: 'Concurrent',
          lastName: `User${index}`
        });
    });

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Check that most requests succeeded
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 201);
    expect(successful.length).to.be.greaterThan(concurrentRequests * 0.8); // 80% success rate

    // Check performance
    expect(duration).to.be.lessThan(10000); // Should complete within 10 seconds
  });

  it('should handle database query performance', async () => {
    const startTime = Date.now();

    const response = await request(app)
      .get('/api/projects/search')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ q: 'test', limit: 100 })
      .expect(200);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).to.be.lessThan(1000); // Should complete within 1 second
    expect(response.body.meta.searchMeta.executionTime).to.be.lessThan(500); // Query time under 500ms
  });
});

// Cleanup helpers
after(() => {
  sinon.restore();
  nock.cleanAll();
});describe("User Integration Tests", () => {
  test("should create user account with email verification", async () => {
    const userData = { email: "test@example.com", password: "SecurePass123!" };
    const response = await request(app).post("/api/auth/register").send(userData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(userData.email);
    
    // Verify email was sent
    const emailSent = await EmailService.wasEmailSent(userData.email);
    expect(emailSent).toBe(true);
  });

  test("should handle concurrent user registrations safely", async () => {
    const promises = Array(50).fill().map((_, i) => 
      request(app).post("/api/auth/register").send({
        email: `concurrent${i}@example.com`,
        password: "SecurePass123!"
      })
    );
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === "fulfilled").length;
    expect(successful).toBeGreaterThan(45); // 90% success rate
  });
});
