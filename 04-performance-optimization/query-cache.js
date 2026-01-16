const Redis = require('redis');

class QueryCache {
  constructor() {
    this.client = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
    this.defaultTTL = 300; // 5 minutes
  }

  generateKey(query, params = []) {
    const hash = require('crypto')
      .createHash('md5')
      .update(query + JSON.stringify(params))
      .digest('hex');
    return `query:${hash}`;
  }

  async get(query, params) {
    const key = this.generateKey(query, params);
    const start = Date.now();

    try {
      const cached = await this.client.get(key);
      const duration = Date.now() - start;

      if (cached) {
        console.log(`Cache HIT for query in ${duration}ms`);
        return JSON.parse(cached);
      }

      console.log(`Cache MISS for query in ${duration}ms`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(query, params, result, ttl = this.defaultTTL) {
    const key = this.generateKey(query, params);

    try {
      await this.client.setEx(key, ttl, JSON.stringify(result));
      console.log(`Cached query result with TTL ${ttl}s`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`Invalidated ${keys.length} cached queries`);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}

module.exports = QueryCache;