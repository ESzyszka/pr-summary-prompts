/**
 * Generic Repository Pattern Implementation
 * Refactored from multiple scattered database access patterns
 */
class BaseRepository {
  constructor(model, db) {
    this.model = model;
    this.db = db;
    this.tableName = model.tableName;
  }

  async findAll(filters = {}, options = {}) {
    const { page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = options;
    const offset = (page - 1) * limit;

    try {
      const query = this.db(this.tableName)
        .where(filters)
        .orderBy(sort, order)
        .limit(limit)
        .offset(offset);

      const [items, totalCount] = await Promise.all([
        query,
        this.db(this.tableName).where(filters).count('* as count').first()
      ]);

      return {
        data: items,
        pagination: {
          page,
          limit,
          total: parseInt(totalCount.count),
          pages: Math.ceil(totalCount.count / limit)
        }
      };
    } catch (error) {
      console.error(`Error in ${this.tableName} findAll:`, error);
      throw error;
    }
  }

  async findById(id) {
    try {
      return await this.db(this.tableName).where({ id }).first();
    } catch (error) {
      console.error(`Error in ${this.tableName} findById:`, error);
      throw error;
    }
  }

  async create(data) {
    try {
      const [newRecord] = await this.db(this.tableName)
        .insert({ ...data, created_at: new Date(), updated_at: new Date() })
        .returning('*');
      return newRecord;
    } catch (error) {
      console.error(`Error in ${this.tableName} create:`, error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const [updatedRecord] = await this.db(this.tableName)
        .where({ id })
        .update({ ...data, updated_at: new Date() })
        .returning('*');
      return updatedRecord;
    } catch (error) {
      console.error(`Error in ${this.tableName} update:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const deleted = await this.db(this.tableName).where({ id }).del();
      return deleted > 0;
    } catch (error) {
      console.error(`Error in ${this.tableName} delete:`, error);
      throw error;
    }
  }
}

module.exports = BaseRepository;