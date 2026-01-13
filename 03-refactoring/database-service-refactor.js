// Refactored Database Service with improved architecture
const { Pool } = require('pg');
const { promisify } = require('util');

// Base Database Connection Manager
class DatabaseConnection {
  constructor(config) {
    this.pool = new Pool(config);
    this.pool.on('error', this.handlePoolError.bind(this));
  }

  async query(text, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  handlePoolError(error) {
    console.error('Database pool error:', error);
  }

  async close() {
    await this.pool.end();
  }
}

// Abstract Base Repository
class BaseRepository {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
  }

  buildWhereClause(conditions) {
    if (!conditions || Object.keys(conditions).length === 0) {
      return { clause: '', params: [] };
    }

    const clauses = [];
    const params = [];
    let paramIndex = 1;

    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        clauses.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    return {
      clause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
      params
    };
  }

  buildUpdateClause(data, startIndex = 1) {
    const setClauses = [];
    const params = [];
    let paramIndex = startIndex;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        setClauses.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    return {
      clause: `SET ${setClauses.join(', ')}`,
      params,
      nextIndex: paramIndex
    };
  }

  async findById(id) {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(conditions = {}, orderBy = 'id', limit = null, offset = 0) {
    const { clause, params } = this.buildWhereClause(conditions);
    let query = `SELECT * FROM ${this.tableName} ${clause} ORDER BY ${orderBy}`;

    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    if (offset > 0) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async update(id, data) {
    const { clause, params, nextIndex } = this.buildUpdateClause(data);
    const query = `
      UPDATE ${this.tableName}
      ${clause}
      WHERE id = $${nextIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, [...params, id]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async count(conditions = {}) {
    const { clause, params } = this.buildWhereClause(conditions);
    const query = `SELECT COUNT(*) FROM ${this.tableName} ${clause}`;
    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  async exists(conditions) {
    const count = await this.count(conditions);
    return count > 0;
  }
}

// User Repository with domain-specific methods
class UserRepository extends BaseRepository {
  constructor(db) {
    super(db, 'users');
  }

  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.db.query(query, [email]);
    return result.rows[0] || null;
  }

  async findActiveUsers() {
    return this.findAll({ is_active: true }, 'last_login_at DESC');
  }

  async updateLastLogin(userId) {
    const query = `
      UPDATE users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [userId]);
    return result.rows[0];
  }

  async searchUsers(searchTerm, limit = 10) {
    const query = `
      SELECT id, email, first_name, last_name, avatar_url
      FROM users
      WHERE (
        first_name ILIKE $1 OR
        last_name ILIKE $1 OR
        email ILIKE $1
      )
      AND is_active = true
      ORDER BY last_login_at DESC
      LIMIT $2
    `;

    const result = await this.db.query(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }
}

// Product Repository with complex queries
class ProductRepository extends BaseRepository {
  constructor(db) {
    super(db, 'products');
  }

  async findFeaturedProducts(limit = 10) {
    const query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_featured = true AND p.is_active = true
      ORDER BY p.featured_order ASC, p.created_at DESC
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows;
  }

  async findByCategory(categoryId, options = {}) {
    const { minPrice, maxPrice, sortBy = 'created_at', sortOrder = 'DESC' } = options;

    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = $1 AND p.is_active = true
    `;

    const params = [categoryId];
    let paramIndex = 2;

    if (minPrice !== undefined) {
      query += ` AND p.price >= $${paramIndex}`;
      params.push(minPrice);
      paramIndex++;
    }

    if (maxPrice !== undefined) {
      query += ` AND p.price <= $${paramIndex}`;
      params.push(maxPrice);
      paramIndex++;
    }

    query += ` ORDER BY p.${sortBy} ${sortOrder}`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async updateStock(productId, quantityChange) {
    return this.db.transaction(async (client) => {
      // Check current stock
      const stockCheck = await client.query(
        'SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );

      if (stockCheck.rows.length === 0) {
        throw new Error('Product not found');
      }

      const currentStock = stockCheck.rows[0].stock_quantity;
      const newStock = currentStock + quantityChange;

      if (newStock < 0) {
        throw new Error('Insufficient stock');
      }

      // Update stock
      const updateResult = await client.query(`
        UPDATE products
        SET stock_quantity = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [newStock, productId]);

      return updateResult.rows[0];
    });
  }
}

// Database Service Factory
class DatabaseService {
  constructor(config) {
    this.db = new DatabaseConnection(config);
    this._repositories = new Map();
  }

  getRepository(repositoryClass) {
    const className = repositoryClass.name;

    if (!this._repositories.has(className)) {
      this._repositories.set(className, new repositoryClass(this.db));
    }

    return this._repositories.get(className);
  }

  get users() {
    return this.getRepository(UserRepository);
  }

  get products() {
    return this.getRepository(ProductRepository);
  }

  async transaction(callback) {
    return this.db.transaction(callback);
  }

  async query(text, params) {
    return this.db.query(text, params);
  }

  async close() {
    await this.db.close();
  }
}

module.exports = {
  DatabaseService,
  BaseRepository,
  UserRepository,
  ProductRepository
};