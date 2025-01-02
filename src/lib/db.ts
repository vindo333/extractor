// src/lib/db.ts
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

export async function initDB() {
  const db = await open({
    filename: './usage.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY,
      api_key_hash TEXT,
      query TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blocked_keys (
      api_key_hash TEXT PRIMARY KEY,
      reason TEXT,
      blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_api_key_hash ON usage(api_key_hash);
    CREATE INDEX IF NOT EXISTS idx_timestamp ON usage(timestamp);
    CREATE INDEX IF NOT EXISTS idx_blocked_keys ON blocked_keys(api_key_hash);
  `);

  return db;
}

// Helper function to check if a key is blocked
export async function isKeyBlocked(db: sqlite3.Database, apiKeyHash: string): Promise<boolean> {
  const result = await db.get(
    'SELECT 1 FROM blocked_keys WHERE api_key_hash = ?',
    [apiKeyHash]
  );
  return Boolean(result);
}

// Helper function to log usage
export async function logUsage(db: sqlite3.Database, apiKeyHash: string, query: string): Promise<void> {
  await db.run(
    'INSERT INTO usage (api_key_hash, query) VALUES (?, ?)',
    [apiKeyHash, query]
  );
}