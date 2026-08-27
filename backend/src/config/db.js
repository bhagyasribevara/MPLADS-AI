/**
 * PostgreSQL Database Connection Pool
 * Manages connections to Supabase PostgreSQL with SSL and automatic failover.
 */

const { Pool } = require('pg');
const config = require('./index');

function sanitizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  // Remove pgbouncer query parameter
  let clean = rawUrl.replace(/[?&]pgbouncer=true/, '');
  // Default to session direct port 5432 for maximum compatibility
  clean = clean.replace(':6543', ':5432');
  return clean;
}

const connectionString = sanitizeDatabaseUrl(config.databaseUrl);

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase hosted PostgreSQL
  },
  max: 20, // Connection pool size
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[DB Pool Error] Unexpected error on idle client:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
