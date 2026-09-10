import { randomInt, randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { badRequest, conflict, forbidden, HttpError, notFound, unauthorized } from './errors.js';
import { transaction, isUniqueViolation } from './db.js';
import { parseCookies, readJson, routeMatch, sendJson, sessionCookie } from './http.js';
import {
  constantTimeEqual,
  hashPassword,
  normalizeUsername,
  opaqueToken,
  sha256,
  stableStringify,
  validateDisplayName,
  verifyPassword,
} from './security.js';
import { createRateLimiter } from './rate-limit.js';

const SESSION_SECONDS = 7 * 24 * 60 * 60;
const ACTIVATION_HOURS = 72;
const ATTEMPT_HOURS = 24;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DUMMY_PASSWORD_HASH = `scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$${'A'.repeat(86)}`;

function publicUser(row) {
  return row ? {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
  } : null;
}

function cleanText(value, field, { required = false, max = 1000 } = {}) {
  if (value == null && !required) return null;
  if (typeof value !== 'string') throw badRequest(`A(z) ${field} mező szöveg legyen.`, 'INVALID_INPUT');
  const text = value.trim();
  if ((required && !text) || text.length > max) throw badRequest(`A(z) ${field} mező érvénytelen.`, 'INVALID_INPUT');
  return text || null;
}

function cleanId(value, field = 'id') {
  if (typeof value !== 'string' || !UUID_RE.test(value)) throw badRequest(`Érvénytelen ${field}.`, 'INVALID_ID');
  return value;
}

function cleanIdList(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 500) throw badRequest(`Érvénytelen ${field}.`, 'INVALID_INPUT');
  return [...new Set(value.map((id) => cleanId(id, field)))];
}

function parseDueAt(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw badRequest('Érvénytelen határidő.', 'INVALID_DUE_AT');
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) throw badRequest('Érvénytelen határidő.', 'INVALID_DUE_AT');
  return date.toISOString();
}

function jsonb(value) {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw badRequest('Érvénytelen JSON érték.', 'INVALID_INPUT');
  return encoded;
}

function assignmentRow(row, steps = []) {
  return {
    id: row.id,
    title: row.title,
    instructions: row.instructions,
    dueAt: row.due_at,
    createdAt: row.created_at,
    steps,
  };
}

function resultRow(row, includeAnswer = false, includeStudent = false) {
  const result = {
    id: row.id,
    gameId: row.game_id,
    settings: row.settings,
    at: row.created_at,
    correct: row.correct,
    total: row.total,
    percent: row.percent,
    rulesVersion: row.rules_version,
    stars: row.stars,
    starBasis: row.star_basis,
    summary: row.summary,
    details: row.details,
    duration: row.duration,
    assignmentId: row.assignment_id,
    assignmentStepId: row.assignment_step_id,
  };
  if (includeAnswer) result.answer = row.answer;
  if (includeStudent) {
    result.studentId = row.student_id;
    if(row.student_display_name!==undefined)result.studentDisplayName=row.student_display_name;
    if(row.assignment_title!==undefined)result.assignmentTitle=row.assignment_title;
  }
  return result;
}

async function createSession(db, userId, config) {
  const token = opaqueToken();
  const csrfToken = opaqueToken();
  await db.query(
    `INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at)
     VALUES($1,$2,$3,now() + ($4 * interval '1 second'))`,
    [sha256(token), userId, csrfToken, config.sessionSeconds],
  );
  return { token, csrfToken };
}

async function loadSession(pool, req) {
  const token = parseCookies(req.headers.cookie).hanna_session;
  if (!token) return null;
  const found = await pool.query(
    `SELECT s.token_hash,s.csrf_token,u.* FROM sessions s
     JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active`,
    [sha256(token)],
  );
  if (!found.rowCount) return null;
  return { tokenHash: found.rows[0].token_hash, csrfToken: found.rows[0].csrf_token, user: found.rows[0] };
}

function requireUser(context, role) {
  if (!context.session) throw unauthorized();
  if (role && context.session.user.role !== role) throw forbidden();
  return context.session.user;
}

function verifyOrigin(req, config) {
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || !config.allowedOrigins.has(origin)) {
    throw forbidden('A kérés eredete nem engedélyezett.');
  }
}

function verifyCsrf(req, context) {
  if (!context.session) throw unauthorized();
  const supplied = req.headers['x-csrf-token'];
  if (!constantTimeEqual(String(supplied || ''), context.session.csrfToken)) {
    throw forbidden('Érvénytelen CSRF token.');
  }
}

function requestIp(req) {
  return req.socket?.remoteAddress || 'unknown';
}

async function ensureTeacherStudents(db, teacherId, ids) {
  if (!ids.length) return;
  const rows = await db.query(
    `SELECT id FROM users WHERE id=ANY($1::uuid[]) AND role='student' AND created_by=$2`,
    [ids, teacherId],
  );
  if (rows.rowCount !== ids.length) throw notFound('Egy vagy több tanuló nem található.');
}

async function ensureTeacherGroups(db, teacherId, ids) {
  if (!ids.length) return;
  const rows = await db.query('SELECT id FROM student_groups WHERE id=ANY($1::uuid[]) AND teacher_id=$2', [ids, teacherId]);
  if (rows.rowCount !== ids.length) throw notFound('Egy vagy több csoport nem található.');
}

async function replaceStudentGroups(db, teacherId, studentId, groupIds) {
  await ensureTeacherGroups(db, teacherId, groupIds);
  await db.query(
    `DELETE FROM group_students gs USING student_groups g
     WHERE gs.group_id=g.id AND gs.student_id=$1 AND g.teacher_id=$2`,
    [studentId, teacherId],
  );
  for (const groupId of groupIds) {
    await db.query('INSERT INTO group_students(group_id,student_id) VALUES($1,$2)', [groupId, studentId]);
  }
}

async function replaceGroupStudents(db, teacherId, groupId, studentIds) {
  await ensureTeacherStudents(db, teacherId, studentIds);
  await db.query('DELETE FROM group_students WHERE group_id=$1', [groupId]);
  for (const studentId of studentIds) {
    await db.query('INSERT INTO group_students(group_id,student_id) VALUES($1,$2)', [groupId, studentId]);
  }
}

async function activationFor(db, userId, createdBy, config) {
  const token = opaqueToken();
  const expiresAt = new Date(Date.now() + config.activationHours * 3_600_000);
  await db.query('DELETE FROM activation_tokens WHERE user_id=$1 AND used_at IS NULL', [userId]);
  await db.query(
    'INSERT INTO activation_tokens(token_hash,user_id,expires_at,created_by) VALUES($1,$2,$3,$4)',
    [sha256(token), userId, expiresAt, createdBy],
  );
  return { activationToken: token, expiresAt: expiresAt.toISOString() };
}

function requestedRulesVersion(engine, body) {
  const version = body.clientRulesVersion ?? 1;
  if(![1,2].includes(version) || version > (engine.CURRENT_RULES_VERSION || 1))throw badRequest('Frissítsd az oldalt a gyakorlat indításához.', 'CLIENT_UPDATE_REQUIRED');
  return version;
}
function settingsForVersion(engine, gameId, settings, version) {
  return engine.normalizeSettingsForVersion ? engine.normalizeSettingsForVersion(gameId,settings,version) : engine.normalizeGameSettings(gameId,settings);
}

async function listAssignmentSteps(db, assignmentIds) {
  const map = new Map(assignmentIds.map((id) => [id, []]));
  if (!assignmentIds.length) return map;
  const rows = await db.query(
    'SELECT * FROM assignment_steps WHERE assignment_id=ANY($1::uuid[]) ORDER BY assignment_id,position',
    [assignmentIds],
  );
  for (const row of rows.rows) map.get(row.assignment_id).push({
    id: row.id,
    gameId: row.game_id,
    settings: row.settings,
    repetitions: row.repetitions,
    rulesVersion: row.rules_version,
  });
  return map;
}

async function serveStatic(req, res, distDir, pathname) {
  if (!['GET', 'HEAD'].includes(req.method)) return false;
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const path = resolve(distDir, requested);
  const root = resolve(distDir) + sep;
  if (!path.startsWith(root)) return false;
  let info;
  try { info = await stat(path); } catch { return false; }
  if (!info.isFile()) return false;
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
  const body = req.method === 'HEAD' ? null : await readFile(path);
  res.writeHead(200, {
    'content-type': types[extname(path)] || 'application/octet-stream',
    'content-length': info.size,
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
  });
  res.end(body);
  return true;
}

export function createRequestHandler({ pool, gameEngine, config: suppliedConfig = {} }) {
  if (!pool?.query || !pool?.connect) throw new TypeError('A PostgreSQL pool kötelező.');
  const config = {
    bootstrapToken: suppliedConfig.bootstrapToken ?? process.env.BOOTSTRAP_TOKEN,
    allowedOrigins: new Set((suppliedConfig.allowedOrigins ?? String(process.env.APP_ORIGIN || 'http://localhost:3000').split(','))
      .map((value) => {
        try { return new URL(String(value).trim()).origin; } catch { return ''; }
      }).filter(Boolean)),
    secureCookies: suppliedConfig.secureCookies ?? process.env.NODE_ENV === 'production',
    sessionSeconds: suppliedConfig.sessionSeconds ?? SESSION_SECONDS,
    activationHours: suppliedConfig.activationHours ?? ACTIVATION_HOURS,
    attemptHours: suppliedConfig.attemptHours ?? ATTEMPT_HOURS,
    distDir: suppliedConfig.distDir ?? resolve(process.cwd(), 'dist'),
  };
  const authLimit = createRateLimiter({ limit: 12, windowMs: 60_000 });
  const writeLimit = createRateLimiter({ limit: 180, windowMs: 60_000 });
  let enginePromise;
  const getEngine = async () => {
    if (gameEngine) return gameEngine;
    enginePromise ||= import('../dist/game-engine.js');
    return enginePromise;
  };

  return async function handle(req, res) {
    try {
      const url = new URL(req.url, 'http://local.invalid');
      const pathname = url.pathname.replace(/\/+$/, '') || '/';
      const isWrite = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
      if (isWrite) {
        verifyOrigin(req, config);
        const rate = writeLimit(`${requestIp(req)}:${pathname}`);
        if (!rate.allowed) {
          res.setHeader('retry-after', String(rate.retryAfter));
          throw new HttpError(429, 'RATE_LIMITED', 'Túl sok kérés. Próbáld újra később.');
        }
      }
      const context = { session: await loadSession(pool, req) };
      const csrfExempt = ['/api/auth/login', '/api/auth/setup', '/api/auth/activate'];
      if (isWrite && !csrfExempt.includes(pathname)) verifyCsrf(req, context);

      if (req.method === 'GET' && pathname === '/api/health') {
        await pool.query('SELECT 1');
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'GET' && pathname === '/api/session') {
        const owner = await pool.query('SELECT EXISTS(SELECT 1 FROM users WHERE owner AND active) AS present');
        return sendJson(res, 200, {
          user: publicUser(context.session?.user),
          csrfToken: context.session?.csrfToken || null,
          setupRequired: !owner.rows[0].present,
        });
      }

      if (req.method === 'POST' && pathname === '/api/auth/setup') {
        const rate = authLimit(`${requestIp(req)}:setup`);
        if (!rate.allowed) throw new HttpError(429, 'RATE_LIMITED', 'Túl sok próbálkozás.');
        const body = await readJson(req);
        if (!config.bootstrapToken || !constantTimeEqual(body.token, config.bootstrapToken)) throw unauthorized('Érvénytelen aktiváló token.');
        const name = normalizeUsername(body.username);
        const displayName = validateDisplayName(body.displayName);
        const passwordHash = await hashPassword(body.password);
        const output = await transaction(pool, async (db) => {
          await db.query('SELECT pg_advisory_xact_lock($1)', [1_707_001]);
          const exists = await db.query('SELECT 1 FROM users WHERE owner LIMIT 1');
          if (exists.rowCount) throw conflict('A tulajdonosi fiók már létrejött.', 'SETUP_COMPLETE');
          const id = randomUUID();
          let created;
          try {
            created = await db.query(
              `INSERT INTO users(id,username,username_key,display_name,role,active,owner,password_hash)
               VALUES($1,$2,$3,$4,'teacher',true,true,$5) RETURNING *`,
              [id, name.username, name.key, displayName, passwordHash],
            );
          } catch (error) {
            if (isUniqueViolation(error)) throw conflict('Ez a felhasználónév már foglalt.', 'USERNAME_TAKEN');
            throw error;
          }
          const session = await createSession(db, id, config);
          return { user: publicUser(created.rows[0]), ...session };
        });
        return sendJson(res, 201, { user: output.user, csrfToken: output.csrfToken }, {
          'set-cookie': sessionCookie(output.token, { secure: config.secureCookies, maxAgeSeconds: config.sessionSeconds }),
        });
      }

      if (req.method === 'POST' && pathname === '/api/auth/login') {
        const rate = authLimit(`${requestIp(req)}:login`);
        if (!rate.allowed) throw new HttpError(429, 'RATE_LIMITED', 'Túl sok próbálkozás.');
        const body = await readJson(req);
        const name = normalizeUsername(body.username);
        const found = await pool.query('SELECT * FROM users WHERE username_key=$1', [name.key]);
        const row = found.rows[0];
        const candidateHash = row?.password_hash || DUMMY_PASSWORD_HASH;
        const passwordValid = await verifyPassword(body.password, candidateHash);
        const valid = Boolean(row?.active && row.password_hash && passwordValid);
        if (!valid) throw unauthorized('Hibás felhasználónév vagy jelszó.');
        const session = await createSession(pool, row.id, config);
        return sendJson(res, 200, { user: publicUser(row), csrfToken: session.csrfToken }, {
          'set-cookie': sessionCookie(session.token, { secure: config.secureCookies, maxAgeSeconds: config.sessionSeconds }),
        });
      }

      if (req.method === 'POST' && pathname === '/api/auth/logout') {
        requireUser(context);
        await pool.query('DELETE FROM sessions WHERE token_hash=$1', [context.session.tokenHash]);
        return sendJson(res, 200, { ok: true }, {
          'set-cookie': sessionCookie('', { secure: config.secureCookies, maxAgeSeconds: 0 }),
        });
      }

      if (req.method === 'GET' && pathname === '/api/auth/activation') {
        const token = url.searchParams.get('token');
        if (!token) throw badRequest('Az aktiváló token hiányzik.', 'INVALID_TOKEN');
        const found = await pool.query(
          `SELECT u.display_name,u.username,a.expires_at FROM activation_tokens a
           JOIN users u ON u.id=a.user_id
           WHERE a.token_hash=$1 AND a.used_at IS NULL AND a.expires_at>now() AND u.active`,
          [sha256(token)],
        );
        if (!found.rowCount) throw notFound('Az aktiváló link érvénytelen vagy lejárt.');
        const row = found.rows[0];
        return sendJson(res, 200, { displayName: row.display_name, username: row.username, expiresAt: row.expires_at });
      }

      if (req.method === 'POST' && pathname === '/api/auth/activate') {
        const rate = authLimit(`${requestIp(req)}:activate`);
        if (!rate.allowed) throw new HttpError(429, 'RATE_LIMITED', 'Túl sok próbálkozás.');
        const body = await readJson(req);
        if (typeof body.token !== 'string') throw badRequest('Az aktiváló token hiányzik.', 'INVALID_TOKEN');
        const passwordHash = await hashPassword(body.password);
        const output = await transaction(pool, async (db) => {
          const found = await db.query(
            `SELECT a.token_hash,u.* FROM activation_tokens a JOIN users u ON u.id=a.user_id
             WHERE a.token_hash=$1 AND a.used_at IS NULL AND a.expires_at>now() AND u.active FOR UPDATE OF a,u`,
            [sha256(body.token)],
          );
          if (!found.rowCount) throw notFound('Az aktiváló link érvénytelen vagy lejárt.');
          const row = found.rows[0];
          await db.query('UPDATE activation_tokens SET used_at=now() WHERE token_hash=$1', [row.token_hash]);
          await db.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2', [passwordHash, row.id]);
          await db.query('DELETE FROM sessions WHERE user_id=$1', [row.id]);
          const session = await createSession(db, row.id, config);
          return { user: publicUser(row), ...session };
        });
        return sendJson(res, 200, { user: output.user, csrfToken: output.csrfToken }, {
          'set-cookie': sessionCookie(output.token, { secure: config.secureCookies, maxAgeSeconds: config.sessionSeconds }),
        });
      }

      if (req.method === 'GET' && pathname === '/api/teacher/students') {
        const user = requireUser(context, 'teacher');
        const rows = await pool.query(
          `SELECT u.*,COALESCE(array_agg(gs.group_id) FILTER (WHERE gs.group_id IS NOT NULL),'{}') AS group_ids
           FROM users u LEFT JOIN group_students gs ON gs.student_id=u.id
           WHERE u.role='student' AND u.created_by=$1 GROUP BY u.id ORDER BY u.display_name,u.id`,
          [user.id],
        );
        return sendJson(res, 200, { students: rows.rows.map((row) => ({ ...publicUser(row), groupIds: row.group_ids })) });
      }

      if (req.method === 'POST' && pathname === '/api/teacher/students') {
        const user = requireUser(context, 'teacher');
        const body = await readJson(req);
        const name = normalizeUsername(body.username);
        const displayName = validateDisplayName(body.displayName);
        const groupIds = cleanIdList(body.groupIds, 'groupIds');
        const output = await transaction(pool, async (db) => {
          await ensureTeacherGroups(db, user.id, groupIds);
          const id = randomUUID();
          let created;
          try {
            created = await db.query(
              `INSERT INTO users(id,username,username_key,display_name,role,active,created_by)
               VALUES($1,$2,$3,$4,'student',true,$5) RETURNING *`,
              [id, name.username, name.key, displayName, user.id],
            );
          } catch (error) {
            if (isUniqueViolation(error)) throw conflict('Ez a felhasználónév már foglalt.', 'USERNAME_TAKEN');
            throw error;
          }
          await replaceStudentGroups(db, user.id, id, groupIds);
          const activation = await activationFor(db, id, user.id, config);
          return { student: { ...publicUser(created.rows[0]), groupIds }, ...activation };
        });
        return sendJson(res, 201, output);
      }

      let params = routeMatch(pathname, /^\/api\/teacher\/students\/([^/]+)$/);
      if (req.method === 'PATCH' && params) {
        const user = requireUser(context, 'teacher');
        const studentId = cleanId(params[0]);
        const body = await readJson(req);
        const allowed = new Set(['displayName', 'active', 'groupIds']);
        if (!Object.keys(body).length || Object.keys(body).some((key) => !allowed.has(key))) throw badRequest('Nincs módosítható mező.', 'INVALID_INPUT');
        const output = await transaction(pool, async (db) => {
          const found = await db.query("SELECT * FROM users WHERE id=$1 AND role='student' AND created_by=$2 FOR UPDATE", [studentId, user.id]);
          if (!found.rowCount) throw notFound();
          const displayName = body.displayName === undefined ? found.rows[0].display_name : validateDisplayName(body.displayName);
          const active = body.active === undefined ? found.rows[0].active : body.active;
          if (typeof active !== 'boolean') throw badRequest('Az active mező logikai érték legyen.', 'INVALID_INPUT');
          await db.query('UPDATE users SET display_name=$1,active=$2,updated_at=now() WHERE id=$3', [displayName, active, studentId]);
          if (body.groupIds !== undefined) await replaceStudentGroups(db, user.id, studentId, cleanIdList(body.groupIds, 'groupIds'));
          if (!active) await db.query('DELETE FROM sessions WHERE user_id=$1', [studentId]);
          const groups = await db.query('SELECT group_id FROM group_students WHERE student_id=$1 ORDER BY group_id', [studentId]);
          return { student: { ...publicUser({ ...found.rows[0], display_name: displayName, active }), groupIds: groups.rows.map((row) => row.group_id) } };
        });
        return sendJson(res, 200, output);
      }

      params = routeMatch(pathname, /^\/api\/teacher\/students\/([^/]+)\/reset$/);
      if (req.method === 'POST' && params) {
        const user = requireUser(context, 'teacher');
        const studentId = cleanId(params[0]);
        const output = await transaction(pool, async (db) => {
          const found = await db.query("SELECT id FROM users WHERE id=$1 AND role='student' AND created_by=$2 FOR UPDATE", [studentId, user.id]);
          if (!found.rowCount) throw notFound();
          await db.query('UPDATE users SET password_hash=NULL,updated_at=now() WHERE id=$1', [studentId]);
          await db.query('DELETE FROM sessions WHERE user_id=$1', [studentId]);
          return activationFor(db, studentId, user.id, config);
        });
        return sendJson(res, 200, output);
      }

      if (req.method === 'GET' && pathname === '/api/teacher/groups') {
        const user = requireUser(context, 'teacher');
        const rows = await pool.query(
          `SELECT g.*,COALESCE(array_agg(gs.student_id) FILTER (WHERE gs.student_id IS NOT NULL),'{}') AS student_ids
           FROM student_groups g LEFT JOIN group_students gs ON gs.group_id=g.id
           WHERE g.teacher_id=$1 GROUP BY g.id ORDER BY g.name,g.id`, [user.id],
        );
        return sendJson(res, 200, { groups: rows.rows.map((row) => ({ id: row.id, name: row.name, studentIds: row.student_ids })) });
      }

      if (req.method === 'POST' && pathname === '/api/teacher/groups') {
        const user = requireUser(context, 'teacher');
        const body = await readJson(req);
        const name = cleanText(body.name, 'name', { required: true, max: 120 });
        const studentIds = cleanIdList(body.studentIds, 'studentIds');
        const output = await transaction(pool, async (db) => {
          await ensureTeacherStudents(db, user.id, studentIds);
          const id = randomUUID();
          await db.query('INSERT INTO student_groups(id,teacher_id,name) VALUES($1,$2,$3)', [id, user.id, name]);
          await replaceGroupStudents(db, user.id, id, studentIds);
          return { group: { id, name, studentIds } };
        });
        return sendJson(res, 201, output);
      }

      params = routeMatch(pathname, /^\/api\/teacher\/groups\/([^/]+)$/);
      if (req.method === 'PATCH' && params) {
        const user = requireUser(context, 'teacher');
        const groupId = cleanId(params[0]);
        const body = await readJson(req);
        const allowed = new Set(['name', 'studentIds']);
        if (!Object.keys(body).length || Object.keys(body).some((key) => !allowed.has(key))) throw badRequest('Nincs módosítható mező.', 'INVALID_INPUT');
        const output = await transaction(pool, async (db) => {
          const found = await db.query('SELECT * FROM student_groups WHERE id=$1 AND teacher_id=$2 FOR UPDATE', [groupId, user.id]);
          if (!found.rowCount) throw notFound();
          const name = body.name === undefined ? found.rows[0].name : cleanText(body.name, 'name', { required: true, max: 120 });
          await db.query('UPDATE student_groups SET name=$1,updated_at=now() WHERE id=$2', [name, groupId]);
          if (body.studentIds !== undefined) await replaceGroupStudents(db, user.id, groupId, cleanIdList(body.studentIds, 'studentIds'));
          const students = await db.query('SELECT student_id FROM group_students WHERE group_id=$1 ORDER BY student_id', [groupId]);
          return { group: { id: groupId, name, studentIds: students.rows.map((row) => row.student_id) } };
        });
        return sendJson(res, 200, output);
      }

      if (req.method === 'GET' && pathname === '/api/teacher/assignments') {
        const user = requireUser(context, 'teacher');
        const rows = await pool.query('SELECT * FROM assignments WHERE teacher_id=$1 ORDER BY created_at DESC', [user.id]);
        const steps = await listAssignmentSteps(pool, rows.rows.map((row) => row.id));
        return sendJson(res, 200, { assignments: rows.rows.map((row) => assignmentRow(row, steps.get(row.id))) });
      }

      if (req.method === 'POST' && pathname === '/api/teacher/assignments') {
        const user = requireUser(context, 'teacher');
        const body = await readJson(req);
        const title = cleanText(body.title, 'title', { required: true, max: 120 });
        const instructions = cleanText(body.instructions, 'instructions', { max: 4000 });
        const dueAt = parseDueAt(body.dueAt);
        const studentIds = cleanIdList(body.studentIds, 'studentIds');
        const groupIds = cleanIdList(body.groupIds, 'groupIds');
        if (!Array.isArray(body.steps) || body.steps.length < 1 || body.steps.length > 20) throw badRequest('1–20 feladatsor-lépés szükséges.', 'INVALID_STEPS');
        const engine = await getEngine();
        const rulesVersion = requestedRulesVersion(engine, body);
        const steps = body.steps.map((step) => {
          if (!step || typeof step !== 'object') throw badRequest('Érvénytelen feladatsor-lépés.', 'INVALID_STEPS');
          if (!Number.isInteger(step.repetitions) || step.repetitions < 1 || step.repetitions > 10) throw badRequest('Az ismétlésszám 1–10 lehet.', 'INVALID_STEPS');
          try {
            return { gameId: step.gameId, settings: settingsForVersion(engine, step.gameId, step.settings || {}, rulesVersion), repetitions: step.repetitions, rulesVersion };
          } catch (error) {
            throw badRequest(error.message || 'Érvénytelen játékbeállítás.', 'INVALID_GAME_SETTINGS');
          }
        });
        const idempotencyKey = req.headers['idempotency-key'];
        if (idempotencyKey != null && (typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.length > 200)) throw badRequest('Érvénytelen Idempotency-Key.', 'INVALID_IDEMPOTENCY_KEY');
        const requestHash = sha256(stableStringify({ title, instructions, dueAt, studentIds, groupIds, steps }));
        const output = await transaction(pool, async (db) => {
          if (idempotencyKey) {
            await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))', [user.id, idempotencyKey]);
            const previous = await db.query("SELECT * FROM idempotency_keys WHERE teacher_id=$1 AND scope='assignment:create' AND key=$2", [user.id, idempotencyKey]);
            if (previous.rowCount) {
              if (previous.rows[0].request_hash !== requestHash) throw conflict('Ez az Idempotency-Key más kéréshez már használatban van.', 'IDEMPOTENCY_CONFLICT');
              return previous.rows[0].response;
            }
          }
          await ensureTeacherStudents(db, user.id, studentIds);
          await ensureTeacherGroups(db, user.id, groupIds);
          const members = groupIds.length ? await db.query(
            `SELECT DISTINCT gs.student_id FROM group_students gs JOIN student_groups g ON g.id=gs.group_id
             WHERE g.teacher_id=$1 AND g.id=ANY($2::uuid[])`, [user.id, groupIds],
          ) : { rows: [] };
          const targetIds = [...new Set([...studentIds, ...members.rows.map((row) => row.student_id)])];
          if (!targetIds.length) throw badRequest('Legalább egy tanulót vagy nem üres csoportot válassz.', 'NO_RECIPIENTS');
          const assignmentId = randomUUID();
          const created = await db.query(
            'INSERT INTO assignments(id,teacher_id,title,instructions,due_at) VALUES($1,$2,$3,$4,$5) RETURNING *',
            [assignmentId, user.id, title, instructions, dueAt],
          );
          for (const studentId of targetIds) await db.query('INSERT INTO assignment_students(assignment_id,student_id) VALUES($1,$2)', [assignmentId, studentId]);
          const savedSteps = [];
          for (let index = 0; index < steps.length; index += 1) {
            const step = steps[index];
            const id = randomUUID();
            await db.query(
              'INSERT INTO assignment_steps(id,assignment_id,position,game_id,settings,repetitions,rules_version) VALUES($1,$2,$3,$4,$5,$6,$7)',
              [id, assignmentId, index, step.gameId, jsonb(step.settings), step.repetitions, step.rulesVersion],
            );
            savedSteps.push({ id, ...step });
          }
          const response = { assignment: { ...assignmentRow(created.rows[0], savedSteps), studentIds: targetIds } };
          if (idempotencyKey) await db.query(
            "INSERT INTO idempotency_keys(teacher_id,scope,key,request_hash,response) VALUES($1,'assignment:create',$2,$3,$4)",
            [user.id, idempotencyKey, requestHash, jsonb(response)],
          );
          return response;
        });
        return sendJson(res, 201, output);
      }

      params = routeMatch(pathname, /^\/api\/teacher\/assignments\/([^/]+)$/);
      if (req.method === 'GET' && params) {
        const user = requireUser(context, 'teacher');
        const assignmentId = cleanId(params[0]);
        const found = await pool.query('SELECT * FROM assignments WHERE id=$1 AND teacher_id=$2', [assignmentId, user.id]);
        if (!found.rowCount) throw notFound();
        const steps = await listAssignmentSteps(pool, [assignmentId]);
        const students = await pool.query(
          `SELECT u.id,u.display_name,
             COALESCE((SELECT count(*)::int FROM results r WHERE r.assignment_id=$1 AND r.student_id=u.id),0) AS completed,
             COALESCE((SELECT sum(repetitions)::int FROM assignment_steps WHERE assignment_id=$1),0) AS total
           FROM assignment_students ast JOIN users u ON u.id=ast.student_id
           WHERE ast.assignment_id=$1 ORDER BY u.display_name`, [assignmentId],
        );
        const results = await pool.query('SELECT * FROM results WHERE assignment_id=$1 ORDER BY created_at DESC', [assignmentId]);
        return sendJson(res, 200, {
          assignment: assignmentRow(found.rows[0], steps.get(assignmentId)),
          students: students.rows.map((student) => ({ id: student.id, displayName: student.display_name, completed: student.completed, total: student.total, results: results.rows.filter((raw) => raw.student_id === student.id).map((raw) => resultRow(raw, false, true)) })),
          results: results.rows.map((row) => resultRow(row, false, true)),
        });
      }

      if (req.method === 'GET' && pathname === '/api/teacher/results') {
        const user = requireUser(context, 'teacher');
        const studentId = url.searchParams.get('studentId');
        const assignmentId = url.searchParams.get('assignmentId');
        if (studentId) cleanId(studentId, 'studentId');
        if (assignmentId) cleanId(assignmentId, 'assignmentId');
        const rows = await pool.query(
          `SELECT r.* FROM results r JOIN users student ON student.id=r.student_id
           WHERE student.created_by=$1 AND ($2::uuid IS NULL OR r.student_id=$2) AND ($3::uuid IS NULL OR r.assignment_id=$3)
           ORDER BY r.created_at DESC LIMIT 1000`, [user.id, studentId, assignmentId],
        );
        return sendJson(res, 200, { results: rows.rows.map((row) => resultRow(row, false, true)) });
      }

      params = routeMatch(pathname, /^\/api\/teacher\/results\/([^/]+)$/);
      if (req.method === 'GET' && params) {
        const user = requireUser(context, 'teacher');
        const resultId = cleanId(params[0]);
        const found = await pool.query(
          'SELECT r.*,student.display_name AS student_display_name,a.title AS assignment_title FROM results r JOIN users student ON student.id=r.student_id LEFT JOIN assignments a ON a.id=r.assignment_id AND a.teacher_id=$2 WHERE r.id=$1 AND student.created_by=$2',
          [resultId, user.id],
        );
        if (!found.rowCount) throw notFound();
        return sendJson(res, 200, { result: resultRow(found.rows[0], true, true) });
      }

      if (req.method === 'GET' && pathname === '/api/student/assignments') {
        const user = requireUser(context, 'student');
        const rows = await pool.query(
          `SELECT a.* FROM assignments a JOIN assignment_students ast ON ast.assignment_id=a.id
           WHERE ast.student_id=$1 ORDER BY a.created_at DESC`, [user.id],
        );
        const ids = rows.rows.map((row) => row.id);
        const steps = await listAssignmentSteps(pool, ids);
        const counts = ids.length ? await pool.query(
          `SELECT assignment_step_id,count(*)::int completed FROM results
           WHERE student_id=$1 AND assignment_id=ANY($2::uuid[]) GROUP BY assignment_step_id`, [user.id, ids],
        ) : { rows: [] };
        const countMap = new Map(counts.rows.map((row) => [row.assignment_step_id, row.completed]));
        const assignments = rows.rows.map((row) => {
          const mappedSteps = steps.get(row.id).map((step) => ({ ...step, completed: countMap.get(step.id) || 0 }));
          return {
            ...assignmentRow(row, mappedSteps),
            completed: mappedSteps.reduce((sum, step) => sum + step.completed, 0),
            total: mappedSteps.reduce((sum, step) => sum + step.repetitions, 0),
          };
        });
        return sendJson(res, 200, { assignments });
      }

      if (req.method === 'GET' && pathname === '/api/results') {
        const user = requireUser(context, 'student');
        const rows = await pool.query('SELECT * FROM results WHERE student_id=$1 ORDER BY created_at DESC LIMIT 200', [user.id]);
        return sendJson(res, 200, { results: rows.rows.map((row) => resultRow(row)) });
      }

      if (req.method === 'GET' && pathname === '/api/progress') {
        const user = requireUser(context, 'student');
        const totals = await pool.query('SELECT count(*)::int rounds,COALESCE(sum(correct),0)::int correct,COALESCE(sum(total),0)::int total FROM results WHERE student_id=$1', [user.id]);
        const games = await pool.query(
          `SELECT game_id,COALESCE((settings->>'level')::int,1) level,max(percent)::int best_percent,count(*)::int rounds
           FROM results WHERE student_id=$1 GROUP BY game_id,COALESCE((settings->>'level')::int,1) ORDER BY game_id,level`, [user.id],
        );
        const all = await pool.query('SELECT stars FROM results WHERE student_id=$1', [user.id]);
        const stars = all.rows.reduce((sum, row) => sum + (row.stars ?? 0), 0);
        const ungradedStars = all.rows.filter(row => row.stars === null).length;
        const rank = stars >= 60 ? 'Emlékmester' : stars >= 30 ? 'Gyakorló' : stars >= 10 ? 'Felfedező' : 'Kezdő';
        const total = totals.rows[0].total;
        const correct = totals.rows[0].correct;
        return sendJson(res, 200, {
          rounds: totals.rows[0].rounds,
          correct,
          total,
          percent: total ? Math.round(correct * 100 / total) : 0,
          stars,
          ungradedStars,
          rank,
          games: games.rows.map((row) => ({ gameId: row.game_id, level: row.level, bestPercent: row.best_percent, rounds: row.rounds })),
        });
      }

      if (req.method === 'POST' && pathname === '/api/attempts') {
        const user = requireUser(context, 'student');
        const body = await readJson(req);
        const engine = await getEngine();
        const output = await transaction(pool, async (db) => {
          let gameId;
          let settings;
          let rulesVersion = requestedRulesVersion(engine, body);
          let stepId = null;
          if (body.assignmentStepId) {
            stepId = cleanId(body.assignmentStepId, 'assignmentStepId');
            await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))', [user.id, stepId]);
            const step = await db.query(
              `SELECT s.* FROM assignment_steps s JOIN assignment_students ast ON ast.assignment_id=s.assignment_id
               WHERE s.id=$1 AND ast.student_id=$2`, [stepId, user.id],
            );
            if (!step.rowCount) throw notFound('A kiosztott lépés nem található.');
            gameId = step.rows[0].game_id;
            settings = step.rows[0].settings;
            rulesVersion = step.rows[0].rules_version;
            if(rulesVersion > (body.clientRulesVersion ?? 1))throw conflict('A feladathoz frissítsd az oldalt.', 'CLIENT_UPDATE_REQUIRED');
            const completed = await db.query('SELECT count(*)::int count FROM results WHERE student_id=$1 AND assignment_step_id=$2', [user.id, stepId]);
            if (completed.rows[0].count >= step.rows[0].repetitions) throw conflict('Ezt a lépést már teljesítetted.', 'REPETITIONS_COMPLETE');
            const pending = await db.query(
              `SELECT * FROM attempts WHERE student_id=$1 AND assignment_step_id=$2 AND submitted_at IS NULL
               ORDER BY created_at DESC LIMIT 1 FOR UPDATE`, [user.id, stepId],
            );
            if (pending.rowCount && new Date(pending.rows[0].expires_at) > new Date()) {
              const row = pending.rows[0];
              return { attempt: { id: row.id, seed: Number(row.seed), gameId: row.game_id, settings: row.settings, rulesVersion: row.rules_version, assignmentStepId: row.assignment_step_id, expiresAt: row.expires_at } };
            }
            if (pending.rowCount) await db.query('DELETE FROM attempts WHERE id=$1', [pending.rows[0].id]);
          } else {
            gameId = body.gameId;
            try { settings = settingsForVersion(engine, gameId, body.settings || {}, rulesVersion); }
            catch (error) { throw badRequest(error.message || 'Érvénytelen játékbeállítás.', 'INVALID_GAME_SETTINGS'); }
          }
          const id = randomUUID();
          const seed = randomInt(0, 0x1_0000_0000);
          const expiresAt = new Date(Date.now() + config.attemptHours * 3_600_000);
          await db.query(
            `INSERT INTO attempts(id,student_id,game_id,settings,seed,assignment_step_id,expires_at,rules_version)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id, user.id, gameId, jsonb(settings), seed, stepId, expiresAt, rulesVersion],
          );
          return { attempt: { id, seed, gameId, settings, rulesVersion, assignmentStepId: stepId, expiresAt: expiresAt.toISOString() } };
        });
        return sendJson(res, 201, output);
      }

      params = routeMatch(pathname, /^\/api\/attempts\/([^/]+)\/submit$/);
      if (req.method === 'POST' && params) {
        const user = requireUser(context, 'student');
        const attemptId = cleanId(params[0]);
        const body = await readJson(req);
        if (!Object.hasOwn(body, 'answer')) throw badRequest('A nyers válasz hiányzik.', 'INVALID_ANSWER');
        if (['correct', 'total', 'percent', 'score'].some((key) => Object.hasOwn(body, key))) throw badRequest('Kliensoldali pontszám nem küldhető.', 'CLIENT_SCORE_REJECTED');
        const answerHash = sha256(stableStringify(body.answer));
        const engine = await getEngine();
        const output = await transaction(pool, async (db) => {
          const found = await db.query('SELECT * FROM attempts WHERE id=$1 FOR UPDATE', [attemptId]);
          if (!found.rowCount) throw notFound();
          const attempt = found.rows[0];
          if (attempt.student_id !== user.id) throw forbidden('Másik tanuló körét nem küldheted be.');
          const existing = await db.query('SELECT * FROM results WHERE attempt_id=$1', [attemptId]);
          if (existing.rowCount) {
            if (existing.rows[0].answer_hash !== answerHash) throw conflict('A kört már más válasszal beküldted.', 'ATTEMPT_ALREADY_SUBMITTED');
            return { result: resultRow(existing.rows[0]), duplicate: true };
          }
          if (new Date(attempt.expires_at) <= new Date()) throw conflict('A kör lejárt. Indíts új kört.', 'ATTEMPT_EXPIRED');
          let assignmentId = null;
          if (attempt.assignment_step_id) {
            const step = await db.query('SELECT * FROM assignment_steps WHERE id=$1 FOR UPDATE', [attempt.assignment_step_id]);
            if (!step.rowCount) throw conflict('A kiosztott lépés már nem érhető el.', 'ASSIGNMENT_UNAVAILABLE');
            assignmentId = step.rows[0].assignment_id;
            const membership = await db.query('SELECT 1 FROM assignment_students WHERE assignment_id=$1 AND student_id=$2', [assignmentId, user.id]);
            if (!membership.rowCount) throw forbidden();
            const completed = await db.query('SELECT count(*)::int count FROM results WHERE student_id=$1 AND assignment_step_id=$2', [user.id, attempt.assignment_step_id]);
            if (completed.rows[0].count >= step.rows[0].repetitions) throw conflict('Ezt a lépést már teljesítetted.', 'REPETITIONS_COMPLETE');
          }
          let score;
          try { score = engine.scoreAttempt(attempt.game_id, attempt.settings, Number(attempt.seed), body.answer, attempt.rules_version); }
          catch (error) { throw badRequest(error.message || 'Érvénytelen válasz.', 'INVALID_ANSWER'); }
          if (!score || !Number.isInteger(score.correct) || !Number.isInteger(score.total) || score.total < 1 || score.correct < 0 || score.correct > score.total) {
            throw new Error('A scoreAttempt érvénytelen eredményt adott.');
          }
          const percent = Math.round(score.correct * 100 / score.total);
          const stars = score.stars === undefined && attempt.rules_version === 1 ? (percent===100?3:percent>=60?2:percent>0?1:0) : (score.stars ?? null);
          if(stars !== null && (!Number.isInteger(stars) || stars<0 || stars>3))throw new Error('Érvénytelen csillagérték.');
          const starBasis = score.starBasis || (attempt.rules_version === 1 ? 'legacy-v1' : 'reference-unmeasured');
          const id = randomUUID();
          const duration = Math.max(0, Math.round(Date.now() - new Date(attempt.created_at).valueOf()));
          const inserted = await db.query(
            `INSERT INTO results(id,attempt_id,student_id,assignment_id,assignment_step_id,game_id,settings,answer,answer_hash,correct,total,percent,summary,details,duration,rules_version,stars,star_basis)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
            [id, attemptId, user.id, assignmentId, attempt.assignment_step_id, attempt.game_id, jsonb(attempt.settings), jsonb(body.answer), answerHash, score.correct, score.total, percent, String(score.summary || ''), jsonb(score.details ?? []), duration, attempt.rules_version, stars, starBasis],
          );
          await db.query('UPDATE attempts SET submitted_at=now() WHERE id=$1', [attemptId]);
          return { result: resultRow(inserted.rows[0]), duplicate: false };
        });
        return sendJson(res, 200, output);
      }

      if (!pathname.startsWith('/api/') && await serveStatic(req, res, config.distDir, pathname)) return;
      throw notFound(pathname.startsWith('/api/') ? 'Az API végpont nem található.' : 'Az oldal nem található.');
    } catch (error) {
      if (res.headersSent) return res.end();
      if (error instanceof HttpError) return sendJson(res, error.status, { error: { code: error.code, message: error.message } });
      // Do not expose database, filesystem, or secret-bearing errors to clients.
      return sendJson(res, 503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'A szolgáltatás átmenetileg nem érhető el.' } });
    }
  };
}
