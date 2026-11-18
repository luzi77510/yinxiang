import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import seed from '../shared/seed.json' with { type: 'json' };
import { validateConfig } from '../shared/scoring.mjs';
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function passwordMatches(password, stored) {
  try {
    const [salt, key] = stored.split(':');
    const value = scryptSync(password, salt, 64);
    return timingSafeEqual(value, Buffer.from(key, 'hex'));
  } catch {
    return false;
  }
}
export function createStore(filename = resolve(process.env.DATA_DIR || 'data', 'yinxiang.sqlite')) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS versions(id TEXT PRIMARY KEY,config TEXT NOT NULL,note TEXT NOT NULL,created TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS drafts(id INTEGER PRIMARY KEY CHECK(id=1),config TEXT NOT NULL,updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,owner TEXT NOT NULL,version TEXT NOT NULL REFERENCES versions(id),answers TEXT NOT NULL DEFAULT '{}',started TEXT NOT NULL,completed TEXT,result TEXT);
    CREATE INDEX IF NOT EXISTS sessions_owner ON sessions(owner);
    CREATE TABLE IF NOT EXISTS shares(token TEXT PRIMARY KEY,session TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,created TEXT NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS share_session ON shares(session);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,type TEXT NOT NULL,session TEXT REFERENCES sessions(id) ON DELETE CASCADE,created TEXT NOT NULL,value INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS admins(username TEXT PRIMARY KEY,password TEXT NOT NULL,role TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS logins(token TEXT PRIMARY KEY,username TEXT NOT NULL REFERENCES admins(username),expires TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);
    PRAGMA user_version=1;`);
  const now = () => new Date().toISOString();
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  if (!get('SELECT id FROM versions LIMIT 1')) {
    validateConfig(seed);
    run(
      'INSERT INTO versions VALUES(?,?,?,?,1)',
      seed.version,
      JSON.stringify(seed),
      '初始正式题库',
      now(),
    );
  }
  const active = () => JSON.parse(get('SELECT config FROM versions WHERE active=1').config);
  const version = (id) => {
    const row = get('SELECT config FROM versions WHERE id=?', id);
    return row ? JSON.parse(row.config) : null;
  };
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      db.exec('COMMIT');
      return value;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  const audit = (actor, action, detail = '') =>
    run(
      'INSERT INTO audit(actor,action,detail,created) VALUES(?,?,?,?)',
      actor,
      action,
      detail,
      now(),
    );
  function publish(config, note, actor) {
    validateConfig(config);
    const id = `v${Date.now()}-${randomBytes(2).toString('hex')}`,
      next = { ...config, version: id };
    transaction(() => {
      run('UPDATE versions SET active=0');
      run('INSERT INTO versions VALUES(?,?,?,?,1)', id, JSON.stringify(next), note, now());
      run('DELETE FROM drafts');
      audit(actor, 'publish', id);
    });
    return next;
  }
  function admin(username, password, role = 'admin') {
    if (
      !/^[\w.-]{3,40}$/.test(username) ||
      typeof password !== 'string' ||
      password.length < 12 ||
      password.length > 200 ||
      !['admin', 'editor'].includes(role)
    )
      throw new Error('用户名需3—40位，密码至少12位，角色需有效');
    run(
      'INSERT INTO admins VALUES(?,?,?) ON CONFLICT(username) DO UPDATE SET password=excluded.password,role=excluded.role',
      username,
      passwordHash(password),
      role,
    );
    run('DELETE FROM logins WHERE username=?', username);
  }
  const cleanup = () => {
    run('DELETE FROM logins WHERE expires<?', now());
    run('DELETE FROM sessions WHERE started<?', new Date(Date.now() - 30 * 86400000).toISOString());
    run(
      'DELETE FROM sessions WHERE completed IS NULL AND started<?',
      new Date(Date.now() - 7 * 86400000).toISOString(),
    );
    run('DELETE FROM audit WHERE created<?', new Date(Date.now() - 90 * 86400000).toISOString());
  };
  cleanup();
  return {
    db,
    get,
    all,
    run,
    active,
    version,
    transaction,
    audit,
    publish,
    admin,
    cleanup,
    now,
    id: randomUUID,
  };
}
