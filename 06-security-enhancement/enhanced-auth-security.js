// Enhanced Authentication Security Implementation
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const { auditLogger } = require('../utils/auditLogger');

// Enhanced password policy enforcement
class PasswordPolicy {
  static validate(password) {
    const errors = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain repeated characters (more than 2 consecutive)');
    }

    if (this.isCommonPassword(password)) {
      errors.push('Password is too common, please choose a more unique password');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isCommonPassword(password) {
    const commonPasswords = [
      'password123', '123456789', 'qwerty123', 'admin123',
      'welcome123', 'password1', 'letmein123'
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  static generateSalt() {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Secure session management with enhanced security
class SecureSessionManager {
  constructor(redisClient) {
    this.redis = redisClient;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxConcurrentSessions = 3;
  }

  async createSession(userId, userAgent, ipAddress, deviceFingerprint) {
    try {
      // Generate secure session token
      const sessionToken = crypto.randomBytes(48).toString('hex');
      const sessionId = crypto.createHash('sha256').update(sessionToken).digest('hex');

      const sessionData = {
        userId,
        sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        userAgent: this.sanitizeUserAgent(userAgent),
        ipAddress: this.hashIpAddress(ipAddress),
        deviceFingerprint,
        isActive: true,
        securityFlags: {
          requiresMFA: false,
          suspiciousActivity: false
        }
      };

      // Check for concurrent session limit
      await this.enforceConcurrentSessionLimit(userId);

      // Store session with expiration
      await this.redis.setex(
        `session:${sessionId}`,
        this.sessionTimeout / 1000,
        JSON.stringify(sessionData)
      );

      // Track active sessions for user
      await this.redis.sadd(`user_sessions:${userId}`, sessionId);
      await this.redis.expire(`user_sessions:${userId}`, this.sessionTimeout / 1000);

      // Audit log
      auditLogger.logSecurityEvent('SESSION_CREATED', userId, {
        sessionId,
        ipAddress,
        userAgent: this.sanitizeUserAgent(userAgent)
      });

      return {
        sessionToken,
        sessionId,
        expiresAt: new Date(Date.now() + this.sessionTimeout).toISOString()
      };
    } catch (error) {
      auditLogger.logSecurityEvent('SESSION_CREATION_FAILED', userId, { error: error.message });
      throw new Error('Failed to create secure session');
    }
  }

  async validateSession(sessionToken) {
    try {
      const sessionId = crypto.createHash('sha256').update(sessionToken).digest('hex');
      const sessionData = await this.redis.get(`session:${sessionId}`);

      if (!sessionData) {
        return { isValid: false, reason: 'Session not found' };
      }

      const session = JSON.parse(sessionData);

      // Check if session is still active
      if (!session.isActive) {
        return { isValid: false, reason: 'Session inactive' };
      }

      // Check for suspicious activity
      if (session.securityFlags.suspiciousActivity) {
        await this.invalidateSession(sessionId);
        return { isValid: false, reason: 'Security violation detected' };
      }

      // Update last activity
      session.lastActivity = new Date().toISOString();
      await this.redis.setex(
        `session:${sessionId}`,
        this.sessionTimeout / 1000,
        JSON.stringify(session)
      );

      return {
        isValid: true,
        session
      };
    } catch (error) {
      auditLogger.logSecurityEvent('SESSION_VALIDATION_ERROR', null, { error: error.message });
      return { isValid: false, reason: 'Validation error' };
    }
  }

  async invalidateSession(sessionId) {
    try {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        await this.redis.srem(`user_sessions:${session.userId}`, sessionId);

        auditLogger.logSecurityEvent('SESSION_INVALIDATED', session.userId, { sessionId });
      }

      await this.redis.del(`session:${sessionId}`);
      return true;
    } catch (error) {
      auditLogger.logSecurityEvent('SESSION_INVALIDATION_ERROR', null, { sessionId, error: error.message });
      return false;
    }
  }

  async enforceConcurrentSessionLimit(userId) {
    const activeSessions = await this.redis.smembers(`user_sessions:${userId}`);

    if (activeSessions.length >= this.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSessionId = activeSessions[0];
      await this.invalidateSession(oldestSessionId);

      auditLogger.logSecurityEvent('CONCURRENT_SESSION_LIMIT_ENFORCED', userId, {
        removedSession: oldestSessionId
      });
    }
  }

  sanitizeUserAgent(userAgent) {
    // Remove potentially sensitive information
    return userAgent?.substring(0, 200) || 'unknown';
  }

  hashIpAddress(ipAddress) {
    // Hash IP for privacy while maintaining uniqueness for security analysis
    return crypto.createHash('sha256').update(ipAddress + process.env.IP_HASH_SALT).digest('hex');
  }
}

// Enhanced Multi-Factor Authentication
class MFAManager {
  static generateSecretKey(userEmail) {
    return speakeasy.generateSecret({
      name: `SecureApp (${userEmail})`,
      issuer: 'SecureApp',
      length: 32
    });
  }

  static verifyTOTP(token, secret) {
    return speakeasy.totp.verify({
      secret,
      token,
      window: 2, // Allow 2 time steps of variance
      time: Date.now() / 1000
    });
  }

  static async generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  static async hashBackupCode(code) {
    return bcrypt.hash(code, 12);
  }

  static async verifyBackupCode(code, hashedCode) {
    return bcrypt.compare(code, hashedCode);
  }
}

// Security middleware with enhanced protection
const securityMiddleware = {
  // Enhanced rate limiting with progressive delays
  createRateLimit: (options = {}) => {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      keyGenerator = (req) => req.ip
    } = options;

    return rateLimit({
      windowMs,
      max,
      skipSuccessfulRequests,
      skipFailedRequests,
      keyGenerator,
      handler: (req, res) => {
        auditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', null, {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path
        });

        res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.round(windowMs / 1000)
        });
      }
    });
  },

  // Input sanitization and validation
  sanitizeInput: [
    body('*').trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 12 }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        auditLogger.logSecurityEvent('INPUT_VALIDATION_FAILED', null, {
          errors: errors.array(),
          ip: req.ip
        });

        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
          details: errors.array()
        });
      }
      next();
    }
  ],

  // Enhanced security headers
  securityHeaders: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true
  }),

  // Request fingerprinting for anomaly detection
  fingerprintRequest: (req, res, next) => {
    const fingerprint = crypto.createHash('sha256')
      .update([
        req.ip,
        req.get('User-Agent') || '',
        req.get('Accept-Language') || '',
        req.get('Accept-Encoding') || ''
      ].join('|'))
      .digest('hex');

    req.fingerprint = fingerprint;
    next();
  },

  // Suspicious activity detection
  detectSuspiciousActivity: async (req, res, next) => {
    try {
      const suspicious = await analyzeRequestPattern(req);

      if (suspicious.score > 0.8) {
        auditLogger.logSecurityEvent('SUSPICIOUS_ACTIVITY_DETECTED', req.userId, {
          suspiciousScore: suspicious.score,
          reasons: suspicious.reasons,
          ip: req.ip,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          error: 'Access denied due to suspicious activity'
        });
      }

      next();
    } catch (error) {
      next(); // Don't block request on detection error
    }
  }
};

// Analyze request patterns for suspicious activity
async function analyzeRequestPattern(req) {
  let suspiciousScore = 0;
  const reasons = [];

  // Check request frequency
  const recentRequests = await getRecentRequests(req.ip);
  if (recentRequests > 50) {
    suspiciousScore += 0.3;
    reasons.push('High request frequency');
  }

  // Check for SQL injection patterns
  const bodyString = JSON.stringify(req.body || {});
  const sqlPatterns = /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b)/gi;
  if (sqlPatterns.test(bodyString)) {
    suspiciousScore += 0.5;
    reasons.push('SQL injection pattern detected');
  }

  // Check for XSS patterns
  const xssPatterns = /<script|javascript:|onerror=|onload=/gi;
  if (xssPatterns.test(bodyString)) {
    suspiciousScore += 0.4;
    reasons.push('XSS pattern detected');
  }

  // Check for unusual user agent
  const userAgent = req.get('User-Agent') || '';
  if (!userAgent || userAgent.length < 10) {
    suspiciousScore += 0.2;
    reasons.push('Suspicious user agent');
  }

  return { score: suspiciousScore, reasons };
}

async function getRecentRequests(ip) {
  // Implementation would track recent requests per IP
  // This is a placeholder for the actual implementation
  return 0;
}

module.exports = {
  PasswordPolicy,
  SecureSessionManager,
  MFAManager,
  securityMiddleware
};// Enhanced password strength validation
const zxcvbn = require("zxcvbn");

class PasswordPolicy {
  static validate(password, userInputs = []) {
    const errors = [];

    // Minimum length check
    if (password.length < 14) {
      errors.push("Password must be at least 14 characters long");
    }

    // Advanced strength check using zxcvbn
    const strength = zxcvbn(password, userInputs);
    if (strength.score < 3) {
      errors.push("Password is too weak. " + strength.feedback.suggestions.join(" "));
    }

    // Check for compromised passwords (placeholder for API call)
    if (this.isCompromisedPassword(password)) {
      errors.push("Password has been found in data breaches and cannot be used");
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: strength.score,
      strengthText: ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"][strength.score]
    };
  }

  static async isCompromisedPassword(password) {
    // Implement HaveIBeenPwned API check
    const crypto = require("crypto");
    const hash = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = hash.substring(0, 5);
    
    try {
      // This would make an actual API call in production
      return false; // Placeholder
    } catch (error) {
      return false; // Fail open for availability
    }
  }
}
