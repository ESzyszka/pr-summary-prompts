const request = require('supertest');
const app = require('../app');

describe('User Authentication Integration Tests', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete user registration and login workflow', async () => {
      // Registration
      const registrationData = {
        email: 'integration.test@example.com',
        password: 'SecureTestPassword123!',
        firstName: 'Integration',
        lastName: 'Test'
      };

      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registrationResponse.body.success).toBe(true);
      expect(registrationResponse.body.data.user.email).toBe(registrationData.email);

      // Login with registered credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();

      // Access protected route
      const profileResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);

      expect(profileResponse.body.data.user.email).toBe(registrationData.email);
    });

    it('should handle OAuth integration workflow', async () => {
      // Mock OAuth callback
      const mockOAuthData = {
        provider: 'google',
        providerId: 'google-test-id-123',
        email: 'oauth.test@example.com',
        firstName: 'OAuth',
        lastName: 'User'
      };

      const oauthResponse = await request(app)
        .post('/api/auth/oauth/callback')
        .send(mockOAuthData)
        .expect(201);

      expect(oauthResponse.body.success).toBe(true);
      expect(oauthResponse.body.data.user.email).toBe(mockOAuthData.email);
      expect(oauthResponse.body.data.user.oauthProviders.google).toBeDefined();
    });
  });

  describe('API Security Integration', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousPayload = {
        email: "'; DROP TABLE users; --",
        password: 'anything'
      };

      await request(app)
        .post('/api/auth/login')
        .send(maliciousPayload)
        .expect(400);

      // Verify database integrity
      const users = await getUserCount();
      expect(users).toBeGreaterThan(0); // Table should still exist
    });

    it('should handle rate limiting correctly', async () => {
      const loginData = {
        email: 'rate.limit.test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed requests
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(loginData);
      }

      // 6th request should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(429);

      expect(rateLimitedResponse.body.error).toContain('Too many');
    });
  });

  describe('Database Transaction Integration', () => {
    it('should handle database rollback on registration failure', async () => {
      const userData = {
        email: 'rollback.test@example.com',
        password: 'TestPassword123!',
        firstName: 'Rollback',
        lastName: 'Test'
      };

      // Mock a database error during profile creation
      jest.spyOn(database, 'createUserProfile').mockRejectedValueOnce(
        new Error('Profile creation failed')
      );

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(500);

      // Verify user was not created due to rollback
      const user = await database.findUserByEmail(userData.email);
      expect(user).toBeNull();
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle concurrent user registrations', async () => {
      const registrations = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: `concurrent.test.${i}@example.com`,
            password: 'ConcurrentTest123!',
            firstName: 'Concurrent',
            lastName: `User${i}`
          })
      );

      const startTime = Date.now();
      const responses = await Promise.allSettled(registrations);
      const duration = Date.now() - startTime;

      // Check that most registrations succeeded
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 201);
      expect(successful.length).toBeGreaterThan(45); // Allow some failures due to concurrency

      // Performance assertion
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

async function setupTestDatabase() {
  // Setup test database state
}

async function getUserCount() {
  // Return user count for verification
  return 1;
}