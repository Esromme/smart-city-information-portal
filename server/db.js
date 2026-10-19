import pg from 'pg';
import './config.js';

const { Pool, types } = pg;

// BIGINT columns (identity ids, counts) come back as JS numbers instead of strings.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[db] DATABASE_URL is missing. Add it to the .env file in the project root.');
  process.exit(1);
}

const isLocal = /(^|@)(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX) || 5,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (error) => {
  console.error('[db] idle client error:', error.message);
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function healthCheck() {
  const { rows } = await pool.query('select now() as now, current_database() as database');
  return rows[0];
}
