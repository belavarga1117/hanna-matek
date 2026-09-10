import assert from 'node:assert/strict';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import pgUtils from 'pg/lib/utils.js';

test('node-postgres needs explicit JSON text for top-level arrays bound to jsonb', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const details = [{ expected: [1, 2], answer: [1, 9] }];
  const implicit = pgUtils.prepareValue(details);
  const explicit = pgUtils.prepareValue(JSON.stringify(details));

  assert.match(implicit, /^\{/u, 'a JavaScript array is encoded as a PostgreSQL array literal');
  assert.doesNotThrow(() => JSON.parse(explicit));
  assert.deepEqual(JSON.parse(explicit), details);
  assert.throws(() => JSON.parse(implicit));

  await assert.rejects(db.query('SELECT $1::jsonb payload', [implicit]));
  const accepted = await db.query('SELECT $1::jsonb payload', [explicit]);
  assert.deepEqual(accepted.rows[0].payload, details);
});
