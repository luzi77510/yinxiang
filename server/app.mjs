import express from 'express';
import { randomToken, hash, passwordMatches } from './store.mjs';
import { calculateResult, publicConfig, validateConfig } from '../shared/scoring.mjs';
export function createApp(store) {
  const app = express(),
    limits = new Map();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(express.json({ limit: '200kb' }));
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    });
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    const origin = req.headers.origin;
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      origin &&
      origin !== `${req.protocol}://${req.get('host')}`
    )
      return res.status(403).json({ error: '请求来源不被允许' });
    const key = `${req.ip}:${req.path.includes('/login') ? 'login' : 'api'}`,
      now = Date.now(),
      cap = req.path.includes('/login') ? 12 : 300;
    if (limits.size > 10000) for (const [k, v] of limits) if (v.until < now) limits.delete(k);
    const item = limits.get(key);
    if (!item || item.until < now)
      limits.set(key, { n: 1, until: now + (cap === 12 ? 900000 : 60000) });
    else if (++item.n > cap) return res.status(429).json({ error: '操作过于频繁，请稍后再试' });
    const cookies = Object.fromEntries(
      (req.headers.cookie || '')
        .split(';')
        .filter((x) => x.includes('='))
        .map((x) => {
          const i = x.indexOf('=');
          return [x.slice(0, i).trim(), x.slice(i + 1)];
        }),
    );
    req.owner =
      cookies.yx_owner && /^[\w-]{40,100}$/.test(cookies.yx_owner) ? hash(cookies.yx_owner) : null;
    req.login = cookies.yx_admin
      ? store.get(
          'SELECT a.username,a.role FROM logins l JOIN admins a ON a.username=l.username WHERE l.token=? AND l.expires>?',
          hash(cookies.yx_admin),
          store.now(),
        )
      : null;
    next();
  });
  function cookie(res, name, value, maxAge) {
    res.cookie(name, value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge,
      path: '/',
    });
  }
  function own(req, id) {
    const s = store.get('SELECT * FROM sessions WHERE id=? AND owner=?', id, req.owner || '');
    if (!s) {
      const e = new Error('结果不存在、已过期或不属于当前浏览器');
      e.status = 404;
      throw e;
    }
    return s;
  }
  const protect =
    (admin = false) =>
    (req, res, next) => {
      if (!req.login) return res.status(401).json({ error: '请先登录管理后台' });
      if (admin && req.login.role !== 'admin')
        return res.status(403).json({ error: '此操作需要管理员权限' });
      next();
    };
  const payload = (s) => ({
    id: s.id,
    version: s.version,
    answers: JSON.parse(s.answers),
    started: s.started,
    completed: s.completed,
    result: s.result ? JSON.parse(s.result) : null,
    config: publicConfig(store.version(s.version)),
  });
  app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'server' }));
  app.post('/api/sessions', (req, res) => {
    if (!req.owner) {
      const token = randomToken();
      cookie(res, 'yx_owner', token, 30 * 86400000);
      req.owner = hash(token);
    }
    const id = store.id(),
      config = store.active();
    store.run(
      'INSERT INTO sessions(id,owner,version,started) VALUES(?,?,?,?)',
      id,
      req.owner,
      config.version,
      store.now(),
    );
    res.status(201).json(payload(own(req, id)));
  });
  app.get('/api/sessions/:id', (req, res) => res.json(payload(own(req, req.params.id))));
  app.put('/api/sessions/:id/answers', (req, res) => {
    const s = own(req, req.params.id);
    if (s.completed) return res.status(409).json({ error: '本次测试已完成，请开始新测试' });
    const answers = req.body.answers,
      config = store.version(s.version);
    if (
      !answers ||
      typeof answers !== 'object' ||
      Array.isArray(answers) ||
      Object.keys(answers).length > 18 ||
      Object.entries(answers).some(
        ([id, a]) => !config.questions.find((q) => q.id === id)?.options.some((o) => o.id === a),
      )
    )
      return res.status(400).json({ error: '答案格式或选项不合法' });
    store.run('UPDATE sessions SET answers=? WHERE id=?', JSON.stringify(answers), s.id);
    res.json({ ok: true });
  });
  app.post('/api/sessions/:id/submit', (req, res) => {
    const s = own(req, req.params.id);
    if (s.result) return res.json(JSON.parse(s.result));
    const config = store.version(s.version),
      answers = req.body.answers;
    let calculated;
    try {
      calculated = calculateResult(answers, config);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const template = config.results[calculated.easterEgg ? 'NPC' : calculated.result];
    const result = { ...calculated, id: s.id, version: s.version, template, created: store.now() };
    store.transaction(() => {
      store.run(
        'UPDATE sessions SET answers=?,result=?,completed=? WHERE id=? AND completed IS NULL',
        JSON.stringify(answers),
        JSON.stringify(result),
        result.created,
        s.id,
      );
    });
    res.json(result);
  });
  app.delete('/api/sessions/:id', (req, res) => {
    own(req, req.params.id);
    store.run('DELETE FROM sessions WHERE id=?', req.params.id);
    res.json({ ok: true });
  });
  app.post('/api/sessions/:id/share', (req, res) => {
    const s = own(req, req.params.id);
    if (!s.completed) return res.status(400).json({ error: '请先完成测试' });
    let share = store.get('SELECT token FROM shares WHERE session=? AND revoked=0', s.id);
    if (!share) {
      share = { token: randomToken() };
      store.run('INSERT INTO shares VALUES(?,?,?,0)', share.token, s.id, store.now());
    }
    res.json({ token: share.token });
  });
  app.delete('/api/sessions/:id/share', (req, res) => {
    own(req, req.params.id);
    store.run('UPDATE shares SET revoked=1 WHERE session=?', req.params.id);
    res.json({ ok: true });
  });
  app.get('/api/share/:token', (req, res) => {
    const row = store.get(
      'SELECT s.result FROM shares t JOIN sessions s ON s.id=t.session WHERE t.token=? AND t.revoked=0',
      req.params.token,
    );
    if (!row) return res.status(404).json({ error: '分享链接已撤销、过期或不存在' });
    const r = JSON.parse(row.result);
    res.json({
      normalized: r.normalized,
      result: r.result,
      easterEgg: r.easterEgg,
      tags: r.tags,
      template: {
        art: r.template.art,
        name: r.template.name,
        subtitle: r.template.subtitle,
        tags: r.template.tags,
        quote: r.template.quote,
        color: r.template.color,
        background: r.template.background,
      },
    });
  });
  app.post('/api/events', (req, res) => {
    const { type, session, token, value } = req.body;
    if (type === 'share_visit') {
      const share = store.get(
        'SELECT session FROM shares WHERE token=? AND revoked=0',
        typeof token === 'string' ? token : '',
      );
      if (share)
        store.run(
          'INSERT INTO events(type,session,created,value) VALUES(?,?,?,0)',
          type,
          share.session,
          store.now(),
        );
    } else if (['share_click', 'poster_success', 'result_stay'].includes(type) && session) {
      own(req, session);
      store.run(
        'INSERT INTO events(type,session,created,value) VALUES(?,?,?,?)',
        type,
        session,
        store.now(),
        type === 'result_stay' ? Math.max(0, Math.min(3600, Number(value) || 0)) : 0,
      );
    }
    res.json({ ok: true });
  });
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const a =
      typeof username === 'string'
        ? store.get('SELECT * FROM admins WHERE username=?', username)
        : null;
    if (
      typeof password !== 'string' ||
      password.length > 200 ||
      !a ||
      !passwordMatches(password, a.password)
    )
      return res.status(401).json({ error: '账号或密码不正确' });
    const token = randomToken();
    store.run(
      'INSERT INTO logins VALUES(?,?,?)',
      hash(token),
      a.username,
      new Date(Date.now() + 8 * 3600000).toISOString(),
    );
    cookie(res, 'yx_admin', token, 8 * 3600000);
    store.audit(a.username, 'login');
    res.json({ username: a.username, role: a.role });
  });
  app.get('/api/admin/me', protect(), (req, res) => res.json(req.login));
  app.post('/api/admin/logout', protect(), (req, res) => {
    const raw = (req.headers.cookie || '').match(/yx_admin=([\w-]+)/)?.[1];
    if (raw) store.run('DELETE FROM logins WHERE token=?', hash(raw));
    res.clearCookie('yx_admin', { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/admin/config', protect(), (_req, res) =>
    res.json({
      active: store.active(),
      draft: JSON.parse(store.get('SELECT config FROM drafts WHERE id=1')?.config || 'null'),
      versions: store.all('SELECT id,note,created,active FROM versions ORDER BY created DESC'),
    }),
  );
  app.put('/api/admin/draft', protect(), (req, res) => {
    const config = req.body.config;
    if (!config || !Array.isArray(config.questions) || !config.results || !config.rules)
      return res.status(400).json({ error: '配置格式不完整' });
    store.run(
      'INSERT INTO drafts VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET config=excluded.config,updated=excluded.updated',
      JSON.stringify(config),
      store.now(),
    );
    store.audit(req.login.username, 'save_draft');
    res.json({ ok: true });
  });
  app.post('/api/admin/publish', protect(true), (req, res) => {
    let config = req.body.config;
    try {
      validateConfig(config);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    res.json(
      store.publish(
        config,
        String(req.body.note || '更新题库或内容').slice(0, 200),
        req.login.username,
      ),
    );
  });
  app.post('/api/admin/rollback', protect(true), (req, res) => {
    const old = store.version(req.body.version);
    if (!old) return res.status(404).json({ error: '版本不存在' });
    res.json(store.publish(old, `回滚至 ${old.version}`, req.login.username));
  });
  app.get('/api/admin/records', protect(true), (req, res) => {
    const rows = filteredRows(req)
      .slice(0, 500)
      .map((s) => ({
        id: s.id,
        version: s.version,
        started: s.started,
        completed: s.completed,
        answers: JSON.parse(s.answers),
        result: s.result ? JSON.parse(s.result) : null,
      }));
    res.json(rows);
  });
  function filteredRows(req) {
    let rows = store.all('SELECT * FROM sessions ORDER BY started DESC');
    if (req.query.from) rows = rows.filter((s) => s.started.slice(0, 10) >= String(req.query.from));
    if (req.query.to) rows = rows.filter((s) => s.started.slice(0, 10) <= String(req.query.to));
    if (req.query.version) rows = rows.filter((s) => s.version === req.query.version);
    if (req.query.result)
      rows = rows.filter(
        (s) =>
          s.result &&
          (req.query.result === 'NPC'
            ? JSON.parse(s.result).easterEgg
            : !JSON.parse(s.result).easterEgg && JSON.parse(s.result).result === req.query.result),
      );
    return rows;
  }
  app.get('/api/admin/stats', protect(), (req, res) => {
    const sessions = filteredRows(req),
      done = sessions.filter((s) => s.completed),
      results = done.map((s) => JSON.parse(s.result)),
      normal = results.filter((r) => !r.easterEgg),
      egg = results.filter((r) => r.easterEgg),
      ids = new Set(sessions.map((s) => s.id));
    const events = store.all('SELECT * FROM events').filter((e) => ids.has(e.session));
    const choices = {},
      trend = {},
      averages = { P: 0, G: 0, M: 0 },
      drops = {};
    for (const s of sessions) {
      const date = s.started.slice(0, 10);
      trend[date] ??= { date, started: 0, completed: 0 };
      trend[date].started++;
      if (s.completed) trend[date].completed++;
      else {
        const n = Object.keys(JSON.parse(s.answers)).length;
        drops[n] = (drops[n] || 0) + 1;
      }
    }
    for (const s of done)
      for (const [q, a] of Object.entries(JSON.parse(s.answers))) {
        choices[q] ??= {};
        choices[q][a] = (choices[q][a] || 0) + 1;
      }
    for (const r of results) for (const d of ['P', 'G', 'M']) averages[d] += r.normalized[d];
    for (const d of ['P', 'G', 'M'])
      averages[d] = results.length ? Math.round(averages[d] / results.length) : 0;
    res.json({
      started: sessions.length,
      completed: done.length,
      completionRate: sessions.length ? Math.round((done.length / sessions.length) * 100) : 0,
      averageSeconds: done.length
        ? Math.round(
            done.reduce((n, s) => n + (Date.parse(s.completed) - Date.parse(s.started)) / 1000, 0) /
              done.length,
          )
        : 0,
      normalCount: normal.length,
      distribution: Object.fromEntries(
        ['P', 'G', 'M'].map((d) => [d, normal.filter((r) => r.result === d).length]),
      ),
      egg: egg.length,
      eggRate: done.length ? Math.round((egg.length / done.length) * 1000) / 10 : 0,
      shareClicks: events.filter((e) => e.type === 'share_click').length,
      posters: events.filter((e) => e.type === 'poster_success').length,
      shareVisits: events.filter((e) => e.type === 'share_visit').length,
      staySeconds: events.filter((e) => e.type === 'result_stay').reduce((n, e) => n + e.value, 0),
      choices,
      averages,
      drops,
      trend: Object.values(trend),
      asOf: store.now(),
    });
  });
  app.get('/api/admin/export', protect(true), (req, res) => {
    const cell = (v) =>
      '"' +
      String(v ?? '')
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const rows = [
      [
        '会话ID',
        '版本',
        '开始时间',
        '完成时间',
        'P原始分',
        'G原始分',
        'M原始分',
        '正常主结果',
        '彩蛋',
      ],
    ];
    for (const s of filteredRows(req)) {
      const r = s.result ? JSON.parse(s.result) : null;
      rows.push([
        s.id,
        s.version,
        s.started,
        s.completed,
        r?.scores.P,
        r?.scores.G,
        r?.scores.M,
        r?.result,
        r?.easterEgg ? '是' : '否',
      ]);
    }
    store.audit(req.login.username, 'export', String(rows.length - 1));
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="yinxiang-records.csv"',
      })
      .send('\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n'));
  });
  app.get('/api/admin/audit', protect(true), (_req, res) =>
    res.json(store.all('SELECT * FROM audit ORDER BY id DESC LIMIT 100')),
  );
  app.use('/api', (_req, res) => res.status(404).json({ error: '接口不存在' }));
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) console.error('Request error:', err.message);
    res
      .status(status)
      .json({ error: status >= 500 ? '服务器暂时不可用，请稍后重试' : err.message });
  });
  return app;
}
