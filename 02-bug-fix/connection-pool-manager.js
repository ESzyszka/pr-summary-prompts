const { Pool } = require('pg');
const EventEmitter = require('events');

/**
 * Database Connection Pool Manager
 * FIXED: Memory leak in connection pool causing application crashes
 */
class ConnectionPoolManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME,
      user: config.user || process.env.DB_USER,
      password: config.password || process.env.DB_PASSWORD,
      // FIXED: Proper connection pool configuration to prevent memory leaks
      min: config.min || 2,
      max: config.max || 10,
      acquireTimeoutMillis: config.acquireTimeout || 30000,
      idleTimeoutMillis: config.idleTimeout || 30000,
      createTimeoutMillis: config.createTimeout || 30000,
      // FIXED: Connection validation to detect and remove broken connections
      validateFunction: this.validateConnection.bind(this)
    };

    this.pool = null;
    this.connectionCount = 0;
    this.activeConnections = new Set();
    this.isShuttingDown = false;

    // FIXED: Connection monitoring and cleanup
    this.monitoringInterval = null;
    this.metricsHistory = [];

    this.initializePool();
  }

  /**
   * Initialize the connection pool with proper error handling
   * FIXED: Added comprehensive error handling and connection validation
   */
  initializePool() {
    try {
      this.pool = new Pool(this.config);

      // FIXED: Proper event handlers to prevent memory leaks
      this.pool.on('connect', (client) => {
        this.connectionCount++;
        this.activeConnections.add(client);

        // FIXED: Set connection timeout to prevent hanging connections
        client.query('SET statement_timeout = 30000');

        this.emit('connectionCreated', {
          connectionCount: this.connectionCount,
          activeConnections: this.activeConnections.size
        });
      });

      this.pool.on('remove', (client) => {
        this.connectionCount--;
        this.activeConnections.delete(client);

        this.emit('connectionRemoved', {
          connectionCount: this.connectionCount,
          activeConnections: this.activeConnections.size
        });
      });

      this.pool.on('error', (err, client) => {
        console.error('Database pool error:', err);

        // FIXED: Remove broken connections from tracking
        if (client) {
          this.activeConnections.delete(client);
        }

        this.emit('poolError', err);
      });

      // FIXED: Start connection monitoring to detect and fix leaks
      this.startConnectionMonitoring();

      console.log('Database connection pool initialized successfully');

    } catch (error) {
      console.error('Failed to initialize connection pool:', error);
      throw error;
    }
  }

  /**
   * Execute query with proper connection management
   * FIXED: Ensure connections are always released, even on errors
   */
  async query(text, params = []) {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    let client;
    const startTime = Date.now();

    try {
      // FIXED: Use pool.connect() instead of pool.query() for better connection tracking
      client = await this.pool.connect();

      const result = await client.query(text, params);

      // FIXED: Track query performance for monitoring
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(duration, 'success');

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordQueryMetrics(duration, 'error');

      console.error('Database query error:', {
        error: error.message,
        query: text,
        duration,
        activeConnections: this.activeConnections.size
      });

      // FIXED: Handle connection errors properly
      if (client && error.code === 'ECONNRESET') {
        client.release(true); // Remove broken connection
      }

      throw error;

    } finally {
      // FIXED: Always release connection back to pool
      if (client) {
        try {
          client.release();
        } catch (releaseError) {
          console.error('Error releasing connection:', releaseError);
        }
      }
    }
  }

  /**
   * Validate connection health
   * FIXED: Proper connection validation to detect broken connections
   */
  async validateConnection(client) {
    try {
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      console.warn('Connection validation failed:', error.message);
      return false;
    }
  }

  /**
   * Start connection monitoring
   * FIXED: Monitor pool health and detect memory leaks
   */
  startConnectionMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.checkPoolHealth();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check pool health and detect potential issues
   * FIXED: Proactive monitoring to prevent memory leaks
   */
  checkPoolHealth() {
    const poolStats = {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      activeConnections: this.activeConnections.size,
      timestamp: new Date()
    };

    // FIXED: Detect potential memory leaks
    if (poolStats.totalCount > this.config.max * 1.5) {
      console.warn('Potential connection leak detected:', poolStats);
      this.emit('connectionLeak', poolStats);
    }

    // FIXED: Detect hanging connections
    if (poolStats.waitingCount > 5) {
      console.warn('High number of waiting connections:', poolStats);
      this.emit('highWaitingConnections', poolStats);
    }

    // FIXED: Store metrics history for analysis
    this.metricsHistory.push(poolStats);

    // Keep only last 100 metrics entries to prevent memory growth
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }

    this.emit('healthCheck', poolStats);
  }

  /**
   * Record query performance metrics
   * FIXED: Track query performance without memory leaks
   */
  recordQueryMetrics(duration, status) {
    // Simple metrics tracking without growing memory
    if (duration > 5000) {
      console.warn('Slow query detected:', { duration, status });
      this.emit('slowQuery', { duration, status, timestamp: new Date() });
    }
  }

  /**
   * Get current pool statistics
   */
  getPoolStats() {
    if (!this.pool) {
      return { error: 'Pool not initialized' };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      activeConnections: this.activeConnections.size,
      config: {
        min: this.config.min,
        max: this.config.max
      },
      recentMetrics: this.metricsHistory.slice(-10) // Last 10 metrics
    };
  }

  /**
   * Gracefully shutdown the connection pool
   * FIXED: Proper cleanup to prevent resource leaks on shutdown
   */
  async shutdown() {
    console.log('Shutting down connection pool...');
    this.isShuttingDown = true;

    // FIXED: Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    try {
      // FIXED: Wait for active connections to complete
      const timeout = 10000; // 10 seconds timeout
      const startTime = Date.now();

      while (this.activeConnections.size > 0 && Date.now() - startTime < timeout) {
        console.log(`Waiting for ${this.activeConnections.size} active connections to complete...`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // FIXED: Force close remaining connections
      if (this.activeConnections.size > 0) {
        console.warn(`Forcefully closing ${this.activeConnections.size} remaining connections`);
      }

      await this.pool.end();

      // FIXED: Clear connection tracking
      this.activeConnections.clear();
      this.connectionCount = 0;
      this.metricsHistory.length = 0;

      console.log('Connection pool shut down successfully');

    } catch (error) {
      console.error('Error during pool shutdown:', error);
      throw error;
    }
  }
}

module.exports = ConnectionPoolManager;