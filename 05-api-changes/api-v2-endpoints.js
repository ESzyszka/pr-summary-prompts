// API v2 Endpoints with Enhanced Features
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { paginationMiddleware } = require('../middleware/pagination');
const { UserService, ProjectService } = require('../services');

const router = express.Router();

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes'
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests for this endpoint',
    retryAfter: '15 minutes'
  }
});

// Apply rate limiting to all routes
router.use(apiLimiter);

// Enhanced error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Enhanced response wrapper
const apiResponse = (data, meta = {}) => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    version: '2.0',
    ...meta
  }
});

// Users API v2
router.get('/users',
  authMiddleware,
  adminMiddleware,
  paginationMiddleware,
  [
    query('search').optional().isLength({ min: 2, max: 100 }),
    query('role').optional().isIn(['admin', 'user', 'moderator']),
    query('status').optional().isIn(['active', 'inactive', 'pending']),
    query('sortBy').optional().isIn(['createdAt', 'lastLogin', 'name']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
      const { page, limit, offset } = req.pagination;

      const filters = { role, status };
      const options = { sortBy, sortOrder, search };

      const result = await UserService.getUsers(filters, options, { page, limit, offset });

      const response = apiResponse(result.users, {
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1
        },
        filters: { search, role, status },
        sorting: { sortBy, sortOrder }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

// Enhanced user profile endpoint with selective field inclusion
router.get('/users/:userId',
  authMiddleware,
  [
    param('userId').isMongoId().withMessage('Invalid user ID format'),
    query('include').optional().custom((value) => {
      const validFields = ['profile', 'preferences', 'statistics', 'activity'];
      const fields = value.split(',');
      const invalidFields = fields.filter(field => !validFields.includes(field.trim()));
      if (invalidFields.length > 0) {
        throw new Error(`Invalid include fields: ${invalidFields.join(', ')}`);
      }
      return true;
    })
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const includeFields = req.query.include ? req.query.include.split(',').map(f => f.trim()) : ['profile'];

      // Authorization check
      if (userId !== req.userId && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'FORBIDDEN'
        });
      }

      const user = await UserService.getUserWithIncludes(userId, includeFields);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const response = apiResponse(user, {
        included: includeFields,
        requestedBy: req.userId
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
);

// Bulk user operations endpoint
router.patch('/users/bulk',
  authMiddleware,
  adminMiddleware,
  strictLimiter,
  [
    body('operations').isArray({ min: 1, max: 100 }),
    body('operations.*.userId').isMongoId(),
    body('operations.*.action').isIn(['activate', 'deactivate', 'delete', 'updateRole']),
    body('operations.*.data').optional().isObject()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { operations } = req.body;

      // Validate each operation
      const validationErrors = [];
      operations.forEach((op, index) => {
        if (op.action === 'updateRole' && !op.data?.role) {
          validationErrors.push(`Operation ${index}: Role required for updateRole action`);
        }
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Operation validation failed',
          details: validationErrors
        });
      }

      const results = await UserService.bulkUpdateUsers(operations, req.userId);

      const response = apiResponse(results, {
        operationsCount: operations.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        performedBy: req.userId
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'BULK_OPERATION_FAILED'
      });
    }
  }
);

// Enhanced project search with advanced filtering
router.get('/projects/search',
  authMiddleware,
  paginationMiddleware,
  [
    query('q').isLength({ min: 1, max: 200 }),
    query('tags').optional().isString(),
    query('status').optional().isIn(['active', 'archived', 'draft']),
    query('owner').optional().isMongoId(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('visibility').optional().isIn(['public', 'private', 'team']),
    query('minMembers').optional().isInt({ min: 1 }),
    query('maxMembers').optional().isInt({ min: 1 }),
    query('sortBy').optional().isIn(['relevance', 'createdAt', 'updatedAt', 'name', 'memberCount']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        q: query,
        tags,
        status,
        owner,
        dateFrom,
        dateTo,
        visibility,
        minMembers,
        maxMembers,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.query;

      const { page, limit, offset } = req.pagination;

      const searchFilters = {
        tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
        status,
        owner,
        dateRange: dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined,
        visibility,
        memberRange: minMembers || maxMembers ? { min: minMembers, max: maxMembers } : undefined
      };

      const searchOptions = {
        sortBy,
        sortOrder,
        includeHighlight: true
      };

      const result = await ProjectService.searchProjects(
        query,
        searchFilters,
        searchOptions,
        { page, limit, offset },
        req.userId
      );

      const response = apiResponse(result.projects, {
        searchQuery: query,
        filters: searchFilters,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1
        },
        searchMeta: {
          executionTime: result.executionTime,
          indexUsed: result.indexUsed,
          suggestions: result.suggestions
        }
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'SEARCH_FAILED'
      });
    }
  }
);

// Webhook management endpoints
router.post('/projects/:projectId/webhooks',
  authMiddleware,
  [
    param('projectId').isMongoId(),
    body('url').isURL({ protocols: ['http', 'https'] }),
    body('events').isArray({ min: 1 }).custom((events) => {
      const validEvents = [
        'project.created', 'project.updated', 'project.deleted',
        'task.created', 'task.updated', 'task.completed',
        'member.added', 'member.removed'
      ];
      const invalidEvents = events.filter(event => !validEvents.includes(event));
      if (invalidEvents.length > 0) {
        throw new Error(`Invalid webhook events: ${invalidEvents.join(', ')}`);
      }
      return true;
    }),
    body('secret').optional().isLength({ min: 16, max: 64 }),
    body('active').optional().isBoolean()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const webhookData = req.body;

      // Check project ownership/admin access
      const hasAccess = await ProjectService.checkUserAccess(projectId, req.userId, 'admin');
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to manage webhooks',
          code: 'FORBIDDEN'
        });
      }

      const webhook = await ProjectService.createWebhook(projectId, webhookData, req.userId);

      const response = apiResponse(webhook, {
        createdBy: req.userId,
        projectId
      });

      res.status(201).json(response);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'WEBHOOK_CREATION_FAILED'
      });
    }
  }
);

// API health check with detailed status
router.get('/health',
  async (req, res) => {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        dependencies: {
          database: await UserService.checkDatabaseHealth(),
          redis: await UserService.checkCacheHealth(),
          external_api: await UserService.checkExternalApiHealth()
        }
      };

      const allHealthy = Object.values(healthStatus.dependencies).every(dep => dep.status === 'healthy');

      res.status(allHealthy ? 200 : 503).json(apiResponse(healthStatus));
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        details: error.message
      });
    }
  }
);

// API documentation endpoint
router.get('/docs',
  (req, res) => {
    const documentation = {
      version: '2.0',
      endpoints: {
        users: {
          'GET /api/v2/users': 'List users with filtering and pagination',
          'GET /api/v2/users/:id': 'Get user profile with selective field inclusion',
          'PATCH /api/v2/users/bulk': 'Bulk user operations'
        },
        projects: {
          'GET /api/v2/projects/search': 'Advanced project search',
          'POST /api/v2/projects/:id/webhooks': 'Create project webhook'
        },
        system: {
          'GET /api/v2/health': 'API health status',
          'GET /api/v2/docs': 'API documentation'
        }
      },
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer <token>'
      },
      rateLimit: {
        general: '1000 requests per 15 minutes',
        strict: '100 requests per 15 minutes for sensitive endpoints'
      }
    };

    res.json(apiResponse(documentation));
  }
);

module.exports = router;