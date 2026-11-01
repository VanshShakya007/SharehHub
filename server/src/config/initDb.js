const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function initializeDatabase() {
  console.log('🔄 Initializing ShareHub PostgreSQL Database...');
  const client = await pool.connect();
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
    console.log('📄 Executing schema definitions...');
    await client.query(schemaSql);
    console.log('✅ Schema tables, enums, and indexes successfully applied.');

    const seedSql = fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf-8');
    console.log('🌱 Seeding initial demo data...');
    await client.query(seedSql);
    console.log('✅ Database seeded with default accounts, assets, prerequisites, and genesis audit block.');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
