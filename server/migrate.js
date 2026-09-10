import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATION_LOCK_ID = 2_047_173_891;

export async function migrate(pool, directory = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations')) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const files = (await readdir(directory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
    const appliedRows = await client.query('SELECT name FROM schema_migrations');
    const applied = new Set(appliedRows.rows.map((row) => row.name));
    for (const name of files) {
      if (applied.has(name)) continue;
      const sql = await readFile(join(directory, name), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
