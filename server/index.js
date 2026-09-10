import { createServer as createHttpServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createRequestHandler } from './app.js';
import { migrate } from './migrate.js';

export function createServer(options) {
  return createHttpServer(createRequestHandler(options));
}

export async function startServer(options = {}) {
  let ownedPool = false;
  let pool = options.pool;
  if (!pool) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const { Pool } = await import('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'disable' ? false : undefined,
      max: Number(process.env.PGPOOL_MAX || 10),
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
    ownedPool = true;
  }
  await migrate(pool, options.migrationsDirectory);
  const server = createServer({ pool, gameEngine: options.gameEngine, config: options.config });
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const host = options.host ?? process.env.HOST ?? '0.0.0.0';
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const close = async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (ownedPool) await pool.end();
  };
  return { server, pool, close };
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  startServer().then(({ server, pool }) => {
    const shutdown = () => server.close(() => pool.end().finally(() => process.exit(0)));
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  }).catch(() => {
    // Startup errors are intentionally terse so connection strings cannot leak.
    process.stderr.write('A szerver indítása sikertelen.\n');
    process.exitCode = 1;
  });
}
