import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createStore } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';
import seed from '../shared/seed.json' with { type: 'json' };
test('真实API：认证、持久化、评分、分享、版本、权限与统计', async (t) => {
  const store = createStore(':memory:');
  store.admin('test-admin', 'Test-only-password-2026');
  store.admin('editor', 'Test-editor-password-2026', 'editor');
  const server = createApp(store).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    server.close();
    store.db.close();
  });
  function client() {
    const jar = new Map();
    return async (path, method = 'GET', body, headers = {}) => {
      const res = await fetch(url + '/api' + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      for (const c of res.headers.getSetCookie()) {
        const [pair] = c.split(';'),
          at = pair.indexOf('=');
        jar.set(pair.slice(0, at), pair.slice(at + 1));
      }
      const text = await res.text();
      return {
        status: res.status,
        data: res.headers.get('Content-Type')?.includes('json') ? JSON.parse(text) : text,
        headers: res.headers,
      };
    };
  }
  const owner = client(),
    stranger = client(),
    admin = client(),
    editor = client();
  let session, result, share, newVersion;
  const answers = Object.fromEntries(
    seed.questions.map((q) => [q.id, q.options.find((o) => o.dimension === 'P').id]),
  );
  await t.test('未认证访问被拒绝，跨域写入被拒绝', async () => {
    assert.equal((await stranger('/admin/stats')).status, 401);
    assert.equal(
      (await stranger('/sessions', 'POST', {}, { Origin: 'https://untrusted.example' })).status,
      403,
    );
  });
  await t.test('新建会话隐藏评分映射并保存草稿', async () => {
    const r = await owner('/sessions', 'POST', {});
    assert.equal(r.status, 201);
    session = r.data;
    assert.equal(session.config.questions.length, 18);
    assert.equal(session.config.questions[0].options[0].dimension, undefined);
    assert.equal(
      (await owner(`/sessions/${session.id}/answers`, 'PUT', { answers: { Q1: 'A' } })).status,
      200,
    );
    assert.equal((await owner(`/sessions/${session.id}`)).data.answers.Q1, 'A');
  });
  await t.test('校验答案完整性，正式分数由服务端重算', async () => {
    assert.equal(
      (await owner(`/sessions/${session.id}/submit`, 'POST', { answers: { Q1: 'A' } })).status,
      400,
    );
    const r = await owner(`/sessions/${session.id}/submit`, 'POST', {
      answers,
      scores: { P: 0, G: 18, M: 0 },
    });
    assert.equal(r.status, 200);
    result = r.data;
    assert.equal(result.result, 'P');
    assert.equal(result.scores.P, 18);
    assert.equal(result.normalized.P, 100);
  });
  await t.test('私有结果需要原始会话，重复提交幂等', async () => {
    assert.equal((await stranger(`/sessions/${session.id}`)).status, 404);
    const r = await owner(`/sessions/${session.id}/submit`, 'POST', { answers: {} });
    assert.deepEqual(r.data, result);
    assert.equal(store.get('SELECT COUNT(*) n FROM sessions WHERE completed IS NOT NULL').n, 1);
  });
  await t.test('公开分享仅返回摘要，可以撤销', async () => {
    share = (await owner(`/sessions/${session.id}/share`, 'POST', {})).data.token;
    const publicResult = await stranger(`/share/${share}`);
    assert.equal(publicResult.status, 200);
    for (const field of ['answers', 'scores', 'id', 'reason'])
      assert.equal(publicResult.data[field], undefined);
    assert.equal(publicResult.data.template.analysis, undefined);
    await owner(`/sessions/${session.id}/share`, 'DELETE');
    assert.equal((await stranger(`/share/${share}`)).status, 404);
  });
  await t.test('管理员真实认证，内容运营不能发布或查看个人答案', async () => {
    assert.equal(
      (await admin('/admin/login', 'POST', { username: 'test-admin', password: 'wrong' })).status,
      401,
    );
    assert.equal(
      (
        await admin('/admin/login', 'POST', {
          username: 'test-admin',
          password: 'Test-only-password-2026',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await editor('/admin/login', 'POST', {
          username: 'editor',
          password: 'Test-editor-password-2026',
        })
      ).status,
      200,
    );
    assert.equal((await editor('/admin/stats')).status, 200);
    assert.equal((await editor('/admin/records')).status, 403);
    assert.equal((await editor('/admin/publish', 'POST', { config: seed })).status, 403);
  });
  await t.test('保存、发布与回滚版本，已有会话和结果使用旧快照', async () => {
    const pending = (await owner('/sessions', 'POST', {})).data,
      c = structuredClone(seed);
    c.questions[0].text = '新的题目文案';
    c.results.P.name = '新版本称号';
    await editor('/admin/draft', 'PUT', { config: c });
    assert.equal((await admin('/admin/config')).data.draft.questions[0].text, '新的题目文案');
    const published = await admin('/admin/publish', 'POST', { config: c, note: '测试版本' });
    assert.equal(published.status, 200);
    newVersion = published.data.version;
    const fresh = (await stranger('/sessions', 'POST', {})).data;
    assert.equal(fresh.version, newVersion);
    assert.equal((await owner(`/sessions/${pending.id}`)).data.version, seed.version);
    const oldResult = (await owner(`/sessions/${pending.id}/submit`, 'POST', { answers })).data;
    assert.equal(oldResult.template.name, seed.results.P.name);
    assert.equal(
      (await owner(`/sessions/${session.id}`)).data.result.template.name,
      seed.results.P.name,
    );
    assert.equal((await admin('/admin/rollback', 'POST', { version: seed.version })).status, 200);
    const active = (await admin('/admin/config')).data.active;
    assert.equal(active.questions[0].text, seed.questions[0].text);
  });
  await t.test('非法版本不能发布；统计使用真实会话、独立彩蛋口径', async () => {
    const bad = structuredClone(seed);
    bad.questions.pop();
    assert.equal((await admin('/admin/publish', 'POST', { config: bad })).status, 400);
    const stat = (await admin('/admin/stats')).data;
    assert.equal(stat.started, 3);
    assert.equal(stat.completed, 2);
    assert.equal(stat.distribution.P, 2);
    assert.equal(stat.egg, 0);
    assert.equal(stat.normalCount, 2);
    assert.equal(stat.averageSeconds >= 0, true);
  });
  await t.test('CSV导出受保护，操作记录可追溯', async () => {
    assert.equal((await stranger('/admin/export')).status, 401);
    const csv = await admin('/admin/export');
    assert.equal(csv.status, 200);
    assert.ok(csv.data.includes(session.id));
    assert.ok((await admin('/admin/audit')).data.some((l) => l.action === 'export'));
  });
  await t.test('删除结果同时删除分享，退出登录后失去权限', async () => {
    const token = (await owner(`/sessions/${session.id}/share`, 'POST', {})).data.token;
    await owner(`/sessions/${session.id}`, 'DELETE');
    assert.equal((await stranger(`/share/${token}`)).status, 404);
    await admin('/admin/logout', 'POST', {});
    assert.equal((await admin('/admin/config')).status, 401);
  });
});
