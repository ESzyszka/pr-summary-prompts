// Database Query Performance Optimization
const NodeCache = require('node-cache');
const { Pool } = require('pg');

class OptimizedQueryService {
  constructor(dbConfig) {
    this.db = new Pool(dbConfig);

    // Cache with 5 minute TTL for frequently accessed data
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every minute
      useClones: false // Better performance for read-only data
    });

    // Query performance tracking
    this.queryMetrics = new Map();
  }

  // Optimized user dashboard query with caching and joins
  async getUserDashboard(userId) {
    const cacheKey = `dashboard:${userId}`;

    // Try cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.trackQueryPerformance('getUserDashboard', 0, true);
      return cached;
    }

    const startTime = Date.now();

    try {
      // Single optimized query instead of multiple round trips
      const query = `
        WITH user_stats AS (
          SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.avatar_url,
            u.last_login_at,
            COUNT(DISTINCT p.id) as project_count,
            COUNT(DISTINCT t.id) as task_count,
            COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
            COUNT(DISTINCT n.id) FILTER (WHERE n.is_read = false) as unread_notifications
          FROM users u
          LEFT JOIN projects p ON u.id = p.owner_id AND p.is_active = true
          LEFT JOIN tasks t ON p.id = t.project_id AND t.assigned_to = u.id
          LEFT JOIN notifications n ON n.user_id = u.id AND n.created_at > NOW() - INTERVAL '30 days'
          WHERE u.id = $1
          GROUP BY u.id, u.first_name, u.last_name, u.email, u.avatar_url, u.last_login_at
        ),
        recent_activity AS (
          SELECT
            a.id,
            a.action,
            a.entity_type,
            a.entity_id,
            a.created_at,
            COALESCE(p.name, t.title) as entity_name
          FROM activities a
          LEFT JOIN projects p ON a.entity_type = 'project' AND a.entity_id = p.id
          LEFT JOIN tasks t ON a.entity_type = 'task' AND a.entity_id = t.id
          WHERE a.user_id = $1
          ORDER BY a.created_at DESC
          LIMIT 10
        ),
        upcoming_tasks AS (
          SELECT
            t.id,
            t.title,
            t.priority,
            t.due_date,
            p.name as project_name,
            p.color as project_color
          FROM tasks t
          JOIN projects p ON t.project_id = p.id
          WHERE t.assigned_to = $1
            AND t.status != 'completed'
            AND t.due_date >= CURRENT_DATE
            AND t.due_date <= CURRENT_DATE + INTERVAL '7 days'
          ORDER BY t.due_date ASC, t.priority DESC
          LIMIT 5
        )
        SELECT
          json_build_object(
            'user', to_json(user_stats.*),
            'recent_activity', COALESCE(
              (SELECT json_agg(to_json(recent_activity.*)) FROM recent_activity),
              '[]'::json
            ),
            'upcoming_tasks', COALESCE(
              (SELECT json_agg(to_json(upcoming_tasks.*)) FROM upcoming_tasks),
              '[]'::json
            )
          ) as dashboard_data
        FROM user_stats;
      `;

      const result = await this.db.query(query, [userId]);
      const dashboardData = result.rows[0]?.dashboard_data || {};

      // Cache the result
      this.cache.set(cacheKey, dashboardData);

      const queryTime = Date.now() - startTime;
      this.trackQueryPerformance('getUserDashboard', queryTime, false);

      return dashboardData;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.trackQueryPerformance('getUserDashboard', queryTime, false, error);
      throw error;
    }
  }

  // Optimized search with full-text search and pagination
  async searchProjects(userId, searchTerm, options = {}) {
    const { limit = 20, offset = 0, sortBy = 'relevance' } = options;
    const cacheKey = `search:${userId}:${searchTerm}:${JSON.stringify(options)}`;

    // Cache search results for 2 minutes
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      let orderClause = 'ORDER BY p.updated_at DESC';

      if (sortBy === 'relevance' && searchTerm) {
        orderClause = `ORDER BY
          ts_rank_cd(
            to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')),
            plainto_tsquery('english', $3)
          ) DESC,
          p.updated_at DESC`;
      }

      const query = `
        WITH filtered_projects AS (
          SELECT
            p.id,
            p.name,
            p.description,
            p.status,
            p.color,
            p.created_at,
            p.updated_at,
            u.first_name || ' ' || u.last_name as owner_name,
            COUNT(DISTINCT pm.user_id) as member_count,
            COUNT(DISTINCT t.id) as task_count,
            COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks
          FROM projects p
          JOIN users u ON p.owner_id = u.id
          LEFT JOIN project_members pm ON p.id = pm.project_id
          LEFT JOIN tasks t ON p.id = t.project_id
          WHERE (
            p.owner_id = $1
            OR EXISTS (
              SELECT 1 FROM project_members pm2
              WHERE pm2.project_id = p.id AND pm2.user_id = $1
            )
          )
          AND p.is_active = true
          ${searchTerm ? `
            AND (
              to_tsvector('english', p.name || ' ' || COALESCE(p.description, ''))
              @@ plainto_tsquery('english', $3)
            )
          ` : ''}
          GROUP BY p.id, p.name, p.description, p.status, p.color, p.created_at, p.updated_at, u.first_name, u.last_name
        ),
        total_count AS (
          SELECT COUNT(*) as total FROM filtered_projects
        )
        SELECT
          fp.*,
          tc.total
        FROM filtered_projects fp
        CROSS JOIN total_count tc
        ${orderClause}
        LIMIT $${searchTerm ? 4 : 3} OFFSET $${searchTerm ? 5 : 4}
      `;

      const params = searchTerm
        ? [userId, limit, searchTerm, limit, offset]
        : [userId, limit, offset];

      const result = await this.db.query(query, params);

      const response = {
        projects: result.rows,
        total: result.rows[0]?.total || 0,
        limit,
        offset
      };

      // Cache for 2 minutes
      this.cache.set(cacheKey, response, 120);

      const queryTime = Date.now() - startTime;
      this.trackQueryPerformance('searchProjects', queryTime, false);

      return response;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.trackQueryPerformance('searchProjects', queryTime, false, error);
      throw error;
    }
  }

  // Batch operation for updating multiple records efficiently
  async batchUpdateTaskStatus(taskIds, status, userId) {
    const startTime = Date.now();

    try {
      // Use unnest for efficient batch updates
      const query = `
        UPDATE tasks
        SET
          status = $1,
          updated_at = NOW(),
          updated_by = $2
        FROM (
          SELECT unnest($3::int[]) as task_id
        ) as updates
        WHERE tasks.id = updates.task_id
          AND EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = tasks.project_id
              AND (
                p.owner_id = $2
                OR EXISTS (
                  SELECT 1 FROM project_members pm
                  WHERE pm.project_id = p.id AND pm.user_id = $2
                )
              )
          )
        RETURNING tasks.id, tasks.title, tasks.status
      `;

      const result = await this.db.query(query, [status, userId, taskIds]);

      // Invalidate related caches
      this.invalidateCachePattern(`dashboard:${userId}`);
      this.invalidateCachePattern(`search:${userId}:`);

      const queryTime = Date.now() - startTime;
      this.trackQueryPerformance('batchUpdateTaskStatus', queryTime, false);

      return result.rows;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.trackQueryPerformance('batchUpdateTaskStatus', queryTime, false, error);
      throw error;
    }
  }

  // Optimized analytics query with materialized view simulation
  async getProjectAnalytics(projectId, timeRange = '30 days') {
    const cacheKey = `analytics:${projectId}:${timeRange}`;

    // Cache analytics for 10 minutes
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const query = `
        WITH date_series AS (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '${timeRange}',
            CURRENT_DATE,
            '1 day'::interval
          )::date as date
        ),
        daily_stats AS (
          SELECT
            ds.date,
            COUNT(DISTINCT t.id) FILTER (WHERE t.created_at::date = ds.date) as tasks_created,
            COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed' AND t.completed_at::date = ds.date) as tasks_completed,
            COUNT(DISTINCT a.id) FILTER (WHERE a.created_at::date = ds.date) as activities_count
          FROM date_series ds
          LEFT JOIN tasks t ON t.project_id = $1
            AND t.created_at >= CURRENT_DATE - INTERVAL '${timeRange}'
          LEFT JOIN activities a ON a.entity_type = 'project'
            AND a.entity_id = $1
            AND a.created_at >= CURRENT_DATE - INTERVAL '${timeRange}'
          GROUP BY ds.date
          ORDER BY ds.date
        ),
        summary_stats AS (
          SELECT
            COUNT(DISTINCT t.id) as total_tasks,
            COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
            COUNT(DISTINCT CASE WHEN t.status = 'in_progress' THEN t.id END) as in_progress_tasks,
            COUNT(DISTINCT CASE WHEN t.status = 'todo' THEN t.id END) as todo_tasks,
            AVG(CASE
              WHEN t.status = 'completed' AND t.completed_at IS NOT NULL
              THEN EXTRACT(epoch FROM (t.completed_at - t.created_at)) / 86400.0
            END) as avg_completion_days,
            COUNT(DISTINCT pm.user_id) as active_members
          FROM tasks t
          LEFT JOIN project_members pm ON pm.project_id = t.project_id
          WHERE t.project_id = $1
        )
        SELECT
          json_build_object(
            'daily_stats', (SELECT json_agg(to_json(daily_stats.*)) FROM daily_stats),
            'summary', (SELECT to_json(summary_stats.*) FROM summary_stats)
          ) as analytics_data
      `;

      const result = await this.db.query(query, [projectId]);
      const analyticsData = result.rows[0]?.analytics_data || {};

      // Cache for 10 minutes
      this.cache.set(cacheKey, analyticsData, 600);

      const queryTime = Date.now() - startTime;
      this.trackQueryPerformance('getProjectAnalytics', queryTime, false);

      return analyticsData;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      this.trackQueryPerformance('getProjectAnalytics', queryTime, false, error);
      throw error;
    }
  }

  invalidateCachePattern(pattern) {
    const keys = this.cache.keys();
    keys.forEach(key => {
      if (key.startsWith(pattern)) {
        this.cache.del(key);
      }
    });
  }

  trackQueryPerformance(queryName, duration, fromCache, error = null) {
    if (!this.queryMetrics.has(queryName)) {
      this.queryMetrics.set(queryName, {
        totalCalls: 0,
        totalDuration: 0,
        cacheHits: 0,
        errors: 0,
        avgDuration: 0
      });
    }

    const metrics = this.queryMetrics.get(queryName);
    metrics.totalCalls++;

    if (fromCache) {
      metrics.cacheHits++;
    } else {
      metrics.totalDuration += duration;
    }

    if (error) {
      metrics.errors++;
    }

    metrics.avgDuration = metrics.totalDuration / (metrics.totalCalls - metrics.cacheHits);
  }

  getQueryMetrics() {
    const result = {};
    for (const [queryName, metrics] of this.queryMetrics.entries()) {
      result[queryName] = {
        ...metrics,
        cacheHitRate: metrics.totalCalls > 0 ? (metrics.cacheHits / metrics.totalCalls) * 100 : 0
      };
    }
    return result;
  }

  async close() {
    this.cache.close();
    await this.db.end();
  }
}

module.exports = OptimizedQueryService;