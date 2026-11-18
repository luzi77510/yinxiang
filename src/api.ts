import seed from '../shared/seed.json';
import { calculateResult } from '../shared/scoring.mjs';
import type { Answers, Result, Session } from './types';
export const STATIC = __PAGES__;
const KEY = 'yinxiang.session.v1';
export async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: '网络连接失败，请稍后重试' }));
    throw new Error(data.error || '操作失败');
  }
  return response.json();
}
export function readLocal(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Date.now() - Date.parse(s.started) > (s.completed ? 30 : 7) * 86400000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}
export function saveLocal(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    throw new Error('浏览器存储不可用，请允许本站保存答题进度');
  }
}
export function clearLocal() {
  localStorage.removeItem(KEY);
}
export async function createSession(): Promise<Session> {
  const s: Session = STATIC
    ? {
        id: crypto.randomUUID(),
        version: seed.version,
        answers: {},
        started: new Date().toISOString(),
        completed: null,
        result: null,
        config: {
          version: seed.version,
          questions: seed.questions.map((q) => ({
            ...q,
            options: q.options.map(({ id, text }) => ({ id, text })),
          })),
        },
      }
    : await request('/sessions', { method: 'POST' });
  saveLocal(s);
  return s;
}
export async function loadSession(id: string): Promise<Session> {
  if (STATIC) {
    const s = readLocal();
    if (s?.id === id) return s;
    throw new Error('当前浏览器中没有这份结果，请重新测试');
  }
  const s = await request<Session>(`/sessions/${encodeURIComponent(id)}`);
  const local = readLocal();
  if (local?.id === s.id && !s.completed) {
    s.answers = { ...s.answers, ...local.answers };
    s.index = local.index;
  }
  saveLocal(s);
  return s;
}
export async function saveAnswers(s: Session) {
  saveLocal(s);
  if (!STATIC)
    await request(`/sessions/${s.id}/answers`, {
      method: 'PUT',
      body: JSON.stringify({ answers: s.answers }),
    });
}
export async function submitSession(s: Session, answers: Answers): Promise<Result> {
  let result: Result;
  if (STATIC) {
    if (s.result) return s.result;
    const r = calculateResult(answers, seed);
    result = {
      ...r,
      id: s.id,
      version: seed.version,
      template: seed.results[(r.easterEgg ? 'NPC' : r.result) as keyof typeof seed.results],
      created: new Date().toISOString(),
    } as Result;
  } else
    result = await request(`/sessions/${s.id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  saveLocal({ ...s, answers, result, completed: result.created || new Date().toISOString() });
  return result;
}
export async function removeResult(id: string) {
  if (!STATIC) await request(`/sessions/${id}`, { method: 'DELETE' });
  clearLocal();
}
export function summaryToken(result: Result) {
  const data = { n: result.normalized, r: result.result, e: result.easterEgg ? 1 : 0 };
  return btoa(JSON.stringify(data)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
export async function shareUrl(result: Result) {
  const token = STATIC
    ? summaryToken(result)
    : (await request<{ token: string }>(`/sessions/${result.id}/share`, { method: 'POST' })).token;
  return `${location.href.split('#')[0]}#/share/${STATIC ? 'local/' : ''}${token}`;
}
export async function readShare(token: string, local = false): Promise<Result> {
  if (!local) {
    if (STATIC) throw new Error('此链接需要原服务器提供数据');
    return request(`/share/${encodeURIComponent(token)}`);
  }
  try {
    if (token.length > 1000) throw Error();
    const d = JSON.parse(atob(token.replaceAll('-', '+').replaceAll('_', '/')));
    if (
      !['P', 'G', 'M'].includes(d.r) ||
      ![0, 1].includes(d.e) ||
      !d.n ||
      Object.keys(d.n).sort().join('') !== 'GMP' ||
      Object.values(d.n).some((n) => !Number.isInteger(n) || Number(n) < 0 || Number(n) > 100) ||
      Math.abs((Object.values(d.n) as number[]).reduce((a, b) => a + b, 0) - 100) > 1
    )
      throw Error();
    const t = seed.results[(d.e ? 'NPC' : d.r) as keyof typeof seed.results];
    return {
      normalized: d.n,
      result: d.r,
      easterEgg: !!d.e,
      tags: [],
      template: {
        name: t.name,
        tags: t.tags,
        quote: t.quote,
        color: t.color,
        background: t.background,
      },
    };
  } catch {
    throw new Error('分享链接格式不正确');
  }
}
export function event(type: string, session?: string, extra?: Record<string, unknown>) {
  if (STATIC) return;
  void request('/events', {
    method: 'POST',
    body: JSON.stringify({ type, session, ...extra }),
    keepalive: true,
  }).catch(() => {});
}
export async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('复制失败，请使用系统分享');
}
