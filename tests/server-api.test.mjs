import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from '../server/index.js';
import { migrate } from '../server/migrate.js';
import { sha256 } from '../server/security.js';
import { createPglitePool } from '../server/testing/pglite-pool.js';

const engine = {
  normalizeGameSettings(gameId, settings) {
    if (gameId !== 'grid') throw new Error('Ismeretlen játék.');
    const level = settings?.level ?? 1;
    if (![1, 2, 3].includes(level)) throw new Error('Érvénytelen szint.');
    return { level, rounds: 1 };
  },
  scoreAttempt(gameId, settings, seed, answer) {
    assert.equal(gameId, 'grid');
    assert.equal(typeof seed, 'number');
    if (!answer || !Array.isArray(answer.cells) || answer.cells.some((cell) => !Number.isInteger(cell))) throw new Error('Érvénytelen válasz.');
    const correct = Number(answer.cells[0] === 1) + Number(answer.cells[1] === 2);
    return { correct, total: 2, percent: correct * 50, summary: `${correct}/2`, details: [{ expected: [1, 2], answer: answer.cells }] };
  },
};

function cookieFrom(response) {
  return response.headers.get('set-cookie')?.split(';')[0];
}

test('complete school API flow enforces auth, ownership, CSRF and retry safety', async (t) => {
  const db = new PGlite();
  const pool = createPglitePool(db);
  await migrate(pool);
  await migrate(pool);
  const origin = 'http://127.0.0.1';
  const server = createServer({
    pool,
    gameEngine: engine,
    config: { bootstrapToken: 'bootstrap-test-token', allowedOrigins: [origin], secureCookies: false },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  });

  async function request(path, { method = 'GET', body, cookie, csrf, includeOrigin = true, headers = {} } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(includeOrigin && method !== 'GET' ? { origin } : {}),
        ...(cookie ? { cookie } : {}),
        ...(csrf ? { 'x-csrf-token': csrf } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await response.json();
    return { response, json };
  }

  let reply = await request('/api/session');
  assert.equal(reply.response.status, 200);
  assert.equal(reply.json.setupRequired, true);
  assert.equal(reply.json.csrfToken, null);
  reply = await request('/api/attempts/00000000-0000-4000-8000-000000000000/submit', { method: 'POST', body: { answer: { cells: [] } } });
  assert.equal(reply.response.status, 401);

  reply = await request('/api/auth/setup', { method: 'POST', includeOrigin: false, body: { token: 'bootstrap-test-token', username: 'tanar1', displayName: 'Tanár', password: 'biztonsagos-jelszo' } });
  assert.equal(reply.response.status, 403);

  reply = await request('/api/auth/setup', { method: 'POST', body: { token: 'wrong-token', username: 'tanar1', displayName: 'Tanár', password: 'biztonsagos-jelszo' } });
  assert.equal(reply.response.status, 401);

  reply = await request('/api/auth/setup', { method: 'POST', body: { token: 'bootstrap-test-token', username: 'tanar1', displayName: 'Tanár', password: 'biztonsagos-jelszo' } });
  assert.equal(reply.response.status, 201, JSON.stringify(reply.json));
  const teacherCookie = cookieFrom(reply.response);
  const teacherCsrf = reply.json.csrfToken;
  const rawCookieToken = decodeURIComponent(teacherCookie.split('=')[1]);
  const sessionDebug = await pool.query('SELECT count(*)::int count,bool_or(expires_at>now()) active,bool_or(token_hash=$1) matches FROM sessions', [sha256(rawCookieToken)]);
  assert.deepEqual(sessionDebug.rows[0], { count: 1, active: true, matches: true });
  const authenticatedSession = await request('/api/session', { cookie: teacherCookie });
  assert.equal(authenticatedSession.json.user?.role, 'teacher', JSON.stringify({ hasCookie: Boolean(teacherCookie), session: authenticatedSession.json }));

  const duplicateSetup = await request('/api/auth/setup', { method: 'POST', body: { token: 'bootstrap-test-token', username: 'masiktanar', displayName: 'Másik', password: 'biztonsagos-jelszo' } });
  assert.equal(duplicateSetup.response.status, 409);

  reply = await request('/api/teacher/groups', { method: 'POST', cookie: teacherCookie, body: { name: '7. osztály' } });
  assert.equal(reply.response.status, 403);
  reply = await request('/api/teacher/groups', { method: 'POST', cookie: teacherCookie, csrf: teacherCsrf, body: { name: '7. osztály' } });
  assert.equal(reply.response.status, 201, JSON.stringify(reply.json));
  const groupId = reply.json.group.id;

  reply = await request('/api/teacher/students', { method: 'POST', cookie: teacherCookie, csrf: teacherCsrf, body: { username: 'hanna7', displayName: 'Hanna', groupIds: [groupId] } });
  assert.equal(reply.response.status, 201);
  const studentId = reply.json.student.id;
  const activationToken = reply.json.activationToken;

  const activationInfo = await request(`/api/auth/activation?token=${encodeURIComponent(activationToken)}`);
  assert.deepEqual({ username: activationInfo.json.username, displayName: activationInfo.json.displayName }, { username: 'hanna7', displayName: 'Hanna' });
  assert.equal(Object.hasOwn(activationInfo.json, 'token'), false);

  reply = await request('/api/auth/activate', { method: 'POST', body: { token: activationToken, password: 'tanulo-jelszo-123' } });
  assert.equal(reply.response.status, 200);
  const studentCookie = cookieFrom(reply.response);
  const studentCsrf = reply.json.csrfToken;
  assert.equal((await request('/api/auth/activate', { method: 'POST', body: { token: activationToken, password: 'tanulo-jelszo-123' } })).response.status, 404);
  assert.equal((await request('/api/teacher/groups', { cookie: studentCookie })).response.status, 403);

  const assignmentBody = {
    title: 'Fényrács próba',
    groupIds: [groupId],
    steps: [{ gameId: 'grid', settings: { level: 2 }, repetitions: 2 }],
  };
  reply = await request('/api/teacher/assignments', { method: 'POST', cookie: teacherCookie, csrf: teacherCsrf, headers: { 'idempotency-key': 'assignment-one' }, body: assignmentBody });
  assert.equal(reply.response.status, 201);
  const assignment = reply.json.assignment;
  const stepId = assignment.steps[0].id;
  const replay = await request('/api/teacher/assignments', { method: 'POST', cookie: teacherCookie, csrf: teacherCsrf, headers: { 'idempotency-key': 'assignment-one' }, body: assignmentBody });
  assert.equal(replay.response.status, 201);
  assert.equal(replay.json.assignment.id, assignment.id);
  const conflictReplay = await request('/api/teacher/assignments', { method: 'POST', cookie: teacherCookie, csrf: teacherCsrf, headers: { 'idempotency-key': 'assignment-one' }, body: { ...assignmentBody, title: 'Más' } });
  assert.equal(conflictReplay.response.status, 409);

  const studentAssignments = await request('/api/student/assignments', { cookie: studentCookie });
  assert.equal(studentAssignments.json.assignments[0].total, 2);
  assert.equal(studentAssignments.json.assignments[0].completed, 0);

  reply = await request('/api/attempts', { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { gameId: 'wrong', settings: { level: 99 }, assignmentStepId: stepId } });
  assert.equal(reply.response.status, 201);
  assert.equal(reply.json.attempt.gameId, 'grid');
  assert.deepEqual(reply.json.attempt.settings, { level: 2, rounds: 1 });
  const firstAttempt = reply.json.attempt;
  const pendingReplay = await request('/api/attempts', { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { assignmentStepId: stepId } });
  assert.equal(pendingReplay.json.attempt.id, firstAttempt.id);

  const injectedScore = await request(`/api/attempts/${firstAttempt.id}/submit`, { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { answer: { cells: [1, 2] }, correct: 99 } });
  assert.equal(injectedScore.response.status, 400);
  reply = await request(`/api/attempts/${firstAttempt.id}/submit`, { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { answer: { cells: [1, 9] } } });
  assert.equal(reply.response.status, 200);
  assert.equal(reply.json.duplicate, false);
  assert.deepEqual({ correct: reply.json.result.correct, total: reply.json.result.total, percent: reply.json.result.percent }, { correct: 1, total: 2, percent: 50 });
  const firstResultId = reply.json.result.id;
  reply = await request(`/api/attempts/${firstAttempt.id}/submit`, { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { answer: { cells: [1, 9] } } });
  assert.equal(reply.json.duplicate, true);
  assert.equal((await request(`/api/attempts/${firstAttempt.id}/submit`, { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { answer: { cells: [1, 2] } } })).response.status, 409);

  reply = await request('/api/attempts', { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { assignmentStepId: stepId } });
  const secondAttempt = reply.json.attempt;
  const concurrent = await Promise.all([
    request(`/api/attempts/${secondAttempt.id}/submit`, { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { answer: { cells: [1, 2] } } }),
    request(`/api/attempts/${secondAttempt.id}/submit`, { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { answer: { cells: [1, 2] } } }),
  ]);
  assert.deepEqual(concurrent.map((item) => item.response.status), [200, 200]);
  assert.deepEqual(concurrent.map((item) => item.json.duplicate).sort(), [false, true]);
  assert.equal((await request('/api/attempts', { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { assignmentStepId: stepId } })).response.status, 409);

  const details = await request(`/api/teacher/results/${firstResultId}`, { cookie: teacherCookie });
  assert.equal(details.response.status, 200);
  assert.deepEqual(details.json.result.answer, { cells: [1, 9] });
  assert.equal((await request(`/api/teacher/results/${firstResultId}`, { cookie: studentCookie })).response.status, 403);
  assert.equal((await request('/api/teacher/students', { cookie: teacherCookie })).json.students.length, 1);
  assert.equal((await request('/api/teacher/groups', { cookie: teacherCookie })).json.groups[0].studentIds[0], studentId);
  assert.equal((await request('/api/teacher/assignments', { cookie: teacherCookie })).json.assignments[0].id, assignment.id);
  assert.equal((await request(`/api/teacher/assignments/${assignment.id}`, { cookie: teacherCookie })).json.students[0].completed, 2);
  assert.equal((await request(`/api/teacher/results?studentId=${studentId}&assignmentId=${assignment.id}`, { cookie: teacherCookie })).json.results.length, 2);
  assert.equal((await request('/api/results', { cookie: studentCookie })).json.results.length, 2);
  const progress = await request('/api/progress', { cookie: studentCookie });
  assert.deepEqual({ rounds: progress.json.rounds, correct: progress.json.correct, total: progress.json.total, stars: progress.json.stars, rank: progress.json.rank }, { rounds: 2, correct: 3, total: 4, stars: 4, rank: 'Kezdő' });

  reply = await request('/api/teacher/students', { method: 'POST', cookie: teacherCookie, csrf: teacherCsrf, body: { username: 'kontroll7', displayName: 'Kontroll' } });
  const foreignToken = reply.json.activationToken;
  reply = await request('/api/auth/activate', { method: 'POST', body: { token: foreignToken, password: 'kontroll-jelszo-123' } });
  const foreignCookie = cookieFrom(reply.response);
  const foreignCsrf = reply.json.csrfToken;
  assert.equal((await request(`/api/attempts/${firstAttempt.id}/submit`, { method: 'POST', cookie: foreignCookie, csrf: foreignCsrf, body: { answer: { cells: [1, 9] } } })).response.status, 403);
  reply = await request('/api/auth/logout', { method: 'POST', cookie: foreignCookie, csrf: foreignCsrf, body: {} });
  assert.equal(reply.response.status, 200);
  assert.equal((await request('/api/results', { cookie: foreignCookie })).response.status, 401);
  reply = await request('/api/auth/login', { method: 'POST', body: { username: 'kontroll7', password: 'kontroll-jelszo-123' } });
  assert.equal(reply.response.status, 200);
  const reloggedForeignCookie = cookieFrom(reply.response);
  const reloggedForeignCsrf = reply.json.csrfToken;
  reply = await request(`/api/teacher/students/${reply.json.user.id}/reset`, { method: 'POST', cookie: teacherCookie, csrf: teacherCsrf, body: {} });
  assert.equal(reply.response.status, 200);
  assert.equal((await request('/api/results', { cookie: reloggedForeignCookie })).response.status, 401);
  assert.equal((await request(`/api/attempts/${firstAttempt.id}/submit`, { method: 'POST', cookie: reloggedForeignCookie, csrf: reloggedForeignCsrf, body: { answer: { cells: [1, 9] } } })).response.status, 401);
  const resetToken = reply.json.activationToken;
  reply = await request('/api/auth/activate', { method: 'POST', body: { token: resetToken, password: 'uj-kontroll-jelszo' } });
  assert.equal(reply.response.status, 200);

  reply = await request(`/api/teacher/students/${studentId}`, { method: 'PATCH', cookie: teacherCookie, csrf: teacherCsrf, body: { active: false } });
  assert.equal(reply.json.student.active, false);
  assert.equal((await request('/api/results', { cookie: studentCookie })).response.status, 401);
  assert.equal((await request(`/api/attempts/${firstAttempt.id}/submit`, { method: 'POST', cookie: studentCookie, csrf: studentCsrf, body: { answer: { cells: [1, 9] } } })).response.status, 401);
});
