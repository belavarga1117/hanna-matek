// Minimal node-postgres Pool compatibility for isolated PGlite tests.
export function createPglitePool(db) {
  let tail = Promise.resolve();
  const acquire = async () => {
    const previous = tail;
    let release;
    tail = new Promise((resolve) => { release = resolve; });
    await previous;
    return release;
  };
  const rawQuery = async (sql, params) => {
    if (params === undefined && sql.split(';').filter((part) => part.trim()).length > 1) {
      await db.exec(sql);
      return { rows: [], rowCount: 0 };
    }
    const result = await db.query(sql, params);
    return { ...result, rowCount: result.rows.length || result.affectedRows || 0 };
  };
  return {
    async query(sql, params) {
      const release = await acquire();
      try { return await rawQuery(sql, params); } finally { release(); }
    },
    async connect() {
      const release = await acquire();
      return { query: rawQuery, release };
    },
  };
}
