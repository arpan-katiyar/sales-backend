import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import { env } from '../config/env.js';
import * as schema from './schema/index.js';

type Database = MySql2Database<typeof schema>;

let pool: mysql.Pool | undefined;
let database: Database | undefined;

export function getPool(): mysql.Pool {
  pool ??= mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });
  return pool;
}

export function getDb(): Database {
  database ??= drizzle(getPool(), { schema, mode: 'default' });
  return database;
}

export async function closePool(): Promise<void> {
  if (!pool) {
    return;
  }
  const current = pool;
  pool = undefined;
  database = undefined;
  await current.end();
}
