import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  Layers3,
  SlidersHorizontal,
  Users,
  History,
  ShieldCheck,
  LogOut,
  ArrowUp,
  ArrowDown,
  Save,
  Send,
  Plus,
  Trash2,
  ArrowRight,
  ExternalLink,
  Download,
  FlaskConical,
} from 'lucide-react';
import { Brand, Loading, Modal } from '../components/Layout';
import { Character, Radar } from '../components/Art';
import { STATIC, request } from '../api';
import { calculateResult, validateConfig } from '../../shared/scoring.mjs';
import type { Config, Dimension, Template } from '../types';
type Tab = 'overview' | 'questions' | 'results' | 'rules' | 'records' | 'versions' | 'audit';
const tabs: { id: Tab; name: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', name: '数据总览', icon: LayoutDashboard },
  { id: 'questions', name: '题库管理', icon: ListChecks },
  { id: 'results', name: '结果内容', icon: Layers3 },
  { id: 'rules', name: '规则与模拟', icon: SlidersHorizontal },
  { id: 'records', name: '答题记录', icon: Users },
  { id: 'versions', name: '版本管理', icon: History },
  { id: 'audit', name: '操作日志', icon: ShieldCheck },
];
export default function Admin() {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null),
    [checking, setChecking] = useState(!STATIC),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState<Tab>('overview'),
    [config, setConfig] = useState<Config | null>(null),
    [versions, setVersions] = useState<any[]>([]),
    [stats, setStats] = useState<any>(null),
    [records, setRecords] = useState<any[]>([]),
    [logs, setLogs] = useState<any[]>([]),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [version, setVersion] = useState(''),
    [kind, setKind] = useState(''),
    [question, setQuestion] = useState(0),
    [resultType, setResultType] = useState('P'),
    [rules, setRules] = useState(''),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [simulation, setSimulation] = useState<any>(null),
    [note, setNote] = useState(''),
    [confirm, setConfirm] = useState<{ type: 'publish' | 'rollback'; id?: string } | null>(null);
  const query = new URLSearchParams(
    Object.entries({ from, to, version, result: kind }).filter(([, v]) => v),
  ).toString();
  useEffect(() => {
    if (!STATIC)
      request('/admin/me')
        .then(setUser)
        .catch(() => {})
        .finally(() => setChecking(false));
  }, []);
  async function loadConfig() {
    const data = await request('/admin/config');
    const c = data.draft || data.active;
    setConfig(c);
    setRules(JSON.stringify(c.rules, null, 2));
    setVersions(data.versions);
  }
  async function loadData() {
    setError('');
    try {
      if (tab === 'overview') setStats(await request(`/admin/stats?${query}`));
      if (tab === 'records') setRecords(await request(`/admin/records?${query}`));
      if (tab === 'audit') setLogs(await request('/admin/audit'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (user) void loadConfig().catch((e) => setError(e.message));
  }, [user]);
  useEffect(() => {
    if (user) void loadData();
  }, [tab, user, from, to, version, kind]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setUser(
        await request('/admin/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        }),
      );
      setPassword('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await request('/admin/logout', { method: 'POST' });
      setUser(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function updateConfig(fn: (c: Config) => void) {
    if (!config) return;
    const c = structuredClone(config);
    fn(c);
    setConfig(c);
    setMessage('有未保存的草稿修改');
  }
  async function saveDraft() {
    if (!config) return;
    setBusy(true);
    setError('');
    try {
      await request('/admin/draft', { method: 'PUT', body: JSON.stringify({ config }) });
      setMessage('草稿已保存，发布后对新测试生效');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!config || !confirm) return;
    setBusy(true);
    setError('');
    try {
      if (confirm.type === 'publish') {
        validateConfig(config);
        await request('/admin/publish', { method: 'POST', body: JSON.stringify({ config, note }) });
      } else
        await request('/admin/rollback', {
          method: 'POST',
          body: JSON.stringify({ version: confirm.id }),
        });
      await loadConfig();
      setMessage('版本已发布，历史结果和进行中的测试保持原版本');
      setConfirm(null);
      setNote('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (STATIC)
    return (
      <div className="admin-static">
        <Brand />
        <span className="section-kicker">MANAGEMENT CONSOLE</span>
        <h1>管理后台，需要连接服务器。</h1>
        <p>
          当前是 GitHub Pages
          测试网页，答题与结果保存在本机。完整项目已包含真实数据库、管理员认证和版本管理，在本地启动服务后即可使用。
        </p>
        <div className="code-steps">
          <code>pnpm install</code>
          <code>pnpm admin:init</code>
          <code>pnpm dev</code>
        </div>
        <p className="fine-print">管理员初始凭据保存在本机 first-login.txt，未包含在公开仓库。</p>
        <a
          className="primary"
          href="https://github.com/luzi77510/yinxiang"
          target="_blank"
          rel="noreferrer"
        >
          查看项目与部署说明 <ExternalLink size={17} />
        </a>
        <Link className="text-button" to="/">
          返回测试首页
        </Link>
      </div>
    );
  if (checking) return <Loading />;
  if (!user)
    return (
      <div className="login-page">
        <Brand />
        <form onSubmit={login} className="login-card">
          <span className="section-kicker">IMPRESSION LAB / CONSOLE</span>
          <h1>欢迎回到研究所</h1>
          <p>登录后管理内容与查看真实测试数据。</p>
          <label className="field">
            管理员账号
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="field">
            密码
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary full-width" disabled={busy}>
            {busy ? '登录中…' : '登录管理后台'}
            <ArrowRight size={17} />
          </button>
        </form>
        <Link to="/" className="back-link">
          返回测试首页
        </Link>
      </div>
    );
  if (!config)
    return error ? (
      <div className="state-screen">
        <p role="alert">{error}</p>
        <button className="primary" onClick={() => void loadConfig()}>
          重试
        </button>
      </div>
    ) : (
      <Loading />
    );
  const q = config.questions[question],
    t = config.results[resultType];
  const templateField = (key: keyof Template, value: any) =>
    updateConfig((c) => {
      (c.results[resultType] as any)[key] = value;
    });
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Brand />
        <div className="sidebar-label">管理工作台</div>
        <nav>
          {tabs
            .filter((t) => user.role === 'admin' || !['records', 'audit'].includes(t.id))
            .map((t) => (
              <button
                className={tab === t.id ? 'active' : ''}
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setError('');
                }}
              >
                <t.icon size={19} />
                {t.name}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/" target="_blank">
            <ExternalLink size={16} />
            查看网站
          </Link>
          <button onClick={() => void logout()}>
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div>
            <span className="section-kicker">IMPRESSION LAB / WORKSPACE</span>
            <h1>{tabs.find((t) => t.id === tab)?.name}</h1>
          </div>
          <span className="admin-user">
            <span />
            {user.username} · {user.role === 'admin' ? '管理员' : '内容运营'}
          </span>
        </header>
        <div className="admin-body">
          {error && (
            <p className="admin-alert error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="admin-alert" role="status">
              {message}
            </p>
          )}
          {['overview', 'records'].includes(tab) && (
            <div className="filters">
              <label>
                开始日期
                <input
                  aria-label="开始日期"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                结束日期
                <input
                  aria-label="结束日期"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <label>
                测试版本
                <select value={version} onChange={(e) => setVersion(e.target.value)}>
                  <option value="">全部版本</option>
                  {versions.map((v) => (
                    <option key={v.id}>{v.id}</option>
                  ))}
                </select>
              </label>
              {tab === 'records' && (
                <label>
                  展示结果
                  <select value={kind} onChange={(e) => setKind(e.target.value)}>
                    <option value="">全部结果</option>
                    {['P', 'G', 'M', 'NPC'].map((d) => (
                      <option key={d} value={d}>
                        {config.results[d].name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {tab === 'overview' &&
            (stats ? (
              <>
                <div className="stat-grid">
                  {[
                    ['开始测试', stats.started, '测试会话数'],
                    ['完成测试', stats.completed, `完成率 ${stats.completionRate}%`],
                    ['平均答题时长', `${stats.averageSeconds} s`, '按有效完成会话计算'],
                    ['彩蛋触发', stats.egg, `触发率 ${stats.eggRate}%`],
                  ].map(([name, value, desc]) => (
                    <div className="stat-card" key={String(name)}>
                      <span>{name}</span>
                      <strong>{value}</strong>
                      <small>{desc}</small>
                    </div>
                  ))}
                </div>
                <div className="admin-columns">
                  <section className="admin-panel">
                    <h2>普通结果分布</h2>
                    <p className="fine-print">
                      排除彩蛋会话，样本数 {stats.normalCount}。比例为真实分布。
                    </p>
                    {(['P', 'G', 'M'] as Dimension[]).map((d) => (
                      <div className="metric-row" key={d}>
                        <div>
                          <span>{config.results[d].name}</span>
                          <strong>
                            {stats.distribution[d]} 次 ·{' '}
                            {stats.normalCount
                              ? Math.round((stats.distribution[d] / stats.normalCount) * 100)
                              : 0}
                            %
                          </strong>
                        </div>
                        <div className="metric-track">
                          <span
                            style={{
                              width: `${stats.normalCount ? (stats.distribution[d] / stats.normalCount) * 100 : 0}%`,
                              background: config.results[d].color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {!stats.completed && (
                      <p className="empty-text">还没有完成记录，第一场探索正在路上。</p>
                    )}
                  </section>
                  <section className="admin-panel">
                    <h2>真实分享与互动</h2>
                    <div className="interaction-grid">
                      {[
                        ['分享点击', stats.shareClicks],
                        ['海报生成', stats.posters],
                        ['分享回流', stats.shareVisits],
                        ['结果总停留', `${stats.staySeconds} s`],
                      ].map(([n, v]) => (
                        <div key={String(n)}>
                          <span>{n}</span>
                          <strong>{v}</strong>
                        </div>
                      ))}
                    </div>
                    <p className="fine-print">
                      点击、海报成功和回流分别计数，不将点击视为分享成功。
                    </p>
                  </section>
                </div>
                <section className="admin-panel">
                  <h2>开始日期队列趋势</h2>
                  {stats.trend.length ? (
                    <div className="trend-chart">
                      {stats.trend.slice(-21).map((day: any) => (
                        <div
                          key={day.date}
                          title={`${day.date}：开始 ${day.started}，完成 ${day.completed}`}
                        >
                          <div className="trend-bars">
                            <span
                              style={{
                                height: `${(day.started / Math.max(1, ...stats.trend.map((d: any) => d.started))) * 130}px`,
                              }}
                            />
                            <i
                              style={{
                                height: `${(day.completed / Math.max(1, ...stats.trend.map((d: any) => d.started))) * 130}px`,
                              }}
                            />
                          </div>
                          <small>{day.date.slice(5)}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-text">暂无趋势数据</p>
                  )}
                  <p className="fine-print">
                    紫色：开始；黄色：完成。完成率按所选开始时间队列计算，截止{' '}
                    {new Date(stats.asOf).toLocaleString('zh-CN')}。
                  </p>
                </section>
                <div className="admin-columns">
                  <section className="admin-panel">
                    <h2>选项分布</h2>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>题目ID</th>
                            <th>A</th>
                            <th>B</th>
                            <th>C</th>
                            <th>D</th>
                          </tr>
                        </thead>
                        <tbody>
                          {config.questions.map((q) => (
                            <tr key={q.id}>
                              <td>{q.id}</td>
                              {['A', 'B', 'C', 'D'].map((o) => (
                                <td key={o}>
                                  {stats.choices[q.id]?.[o] || 0} 次 /{' '}
                                  {Math.round(
                                    ((stats.choices[q.id]?.[o] || 0) /
                                      Math.max(
                                        1,
                                        ...[
                                          Object.values(stats.choices[q.id] || {}).reduce(
                                            (a: number, b: unknown) => a + Number(b),
                                            0,
                                          ),
                                        ],
                                      )) *
                                      100,
                                  )}
                                  %
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className="admin-panel">
                    <h2>维度平均分</h2>
                    <Radar scores={stats.averages} />
                    <h2>未完成会话进度</h2>
                    {Object.keys(stats.drops).length ? (
                      Object.entries(stats.drops).map(([n, count]) => (
                        <p key={n}>
                          已回答 {n} 题：{String(count)} 次
                        </p>
                      ))
                    ) : (
                      <p className="empty-text">暂无未完成会话</p>
                    )}
                  </section>
                </div>
              </>
            ) : (
              <Loading />
            ))}
          {['questions', 'results', 'rules'].includes(tab) && (
            <div className="editor-toolbar">
              <span>编辑中的草稿 · {config.version}</span>
              <div className="button-row">
                <button className="secondary" disabled={busy} onClick={() => void saveDraft()}>
                  <Save size={16} />
                  保存草稿
                </button>
                {user.role === 'admin' && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => {
                      try {
                        validateConfig(config);
                        setConfirm({ type: 'publish' });
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <Send size={16} />
                    发布版本
                  </button>
                )}
              </div>
            </div>
          )}
          {tab === 'questions' && (
            <div className="question-editor">
              <div className="question-list">
                <div className="editor-list-header">
                  <strong>题目 · {config.questions.length}</strong>
                  <button
                    className="icon-button"
                    aria-label="新增题目"
                    onClick={() => {
                      updateConfig((c) =>
                        c.questions.push({
                          id: `Q${Date.now()}`,
                          text: '新题目',
                          options: ['A', 'B', 'C', 'D'].map((id, i) => ({
                            id,
                            text: '请填写选项',
                            dimension: (['P', 'G', 'M', 'P'] as Dimension[])[i],
                          })),
                        }),
                      );
                      setQuestion(config.questions.length);
                    }}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                {config.questions.map((item, i) => (
                  <button
                    className={question === i ? 'active' : ''}
                    key={item.id}
                    onClick={() => setQuestion(i)}
                  >
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <p>{item.text}</p>
                  </button>
                ))}
              </div>
              {q && (
                <section className="admin-panel">
                  <div className="panel-title">
                    <h2>{q.id} · 编辑题目</h2>
                    <div className="button-row">
                      <button
                        className="icon-button"
                        title="题目上移"
                        disabled={question === 0}
                        onClick={() => {
                          updateConfig((c) => {
                            [c.questions[question - 1], c.questions[question]] = [
                              c.questions[question],
                              c.questions[question - 1],
                            ];
                          });
                          setQuestion(question - 1);
                        }}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="icon-button"
                        title="题目下移"
                        disabled={question === config.questions.length - 1}
                        onClick={() => {
                          updateConfig((c) => {
                            [c.questions[question + 1], c.questions[question]] = [
                              c.questions[question],
                              c.questions[question + 1],
                            ];
                          });
                          setQuestion(question + 1);
                        }}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        className="icon-button danger"
                        title="从草稿移除题目"
                        onClick={() => {
                          updateConfig((c) => c.questions.splice(question, 1));
                          setQuestion(Math.max(0, question - 1));
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <label className="field">
                    题目正文
                    <textarea
                      value={q.text}
                      rows={3}
                      onChange={(e) =>
                        updateConfig((c) => {
                          c.questions[question].text = e.target.value;
                        })
                      }
                    />
                  </label>
                  <p className="fine-print">稳定 ID：{q.id}。移动显示顺序不会改变规则引用。</p>
                  {q.options.map((o, i) => (
                    <div className="option-editor" key={o.id}>
                      <div>
                        <strong>选项 {o.id}</strong>
                        <button
                          className="icon-button"
                          aria-label={`选项${o.id}上移`}
                          disabled={i === 0}
                          onClick={() =>
                            updateConfig((c) => {
                              const options = c.questions[question].options;
                              [options[i - 1], options[i]] = [options[i], options[i - 1]];
                            })
                          }
                        >
                          <ArrowUp size={14} />
                        </button>
                      </div>
                      <textarea
                        value={o.text}
                        rows={2}
                        onChange={(e) =>
                          updateConfig((c) => {
                            c.questions[question].options[i].text = e.target.value;
                          })
                        }
                      />
                      <select
                        aria-label={`选项${o.id}维度`}
                        value={o.dimension}
                        onChange={(e) =>
                          updateConfig((c) => {
                            c.questions[question].options[i].dimension = e.target
                              .value as Dimension;
                          })
                        }
                      >
                        <option value="P">P · 亲和感</option>
                        <option value="G">G · 气场感</option>
                        <option value="M">M · 神秘感</option>
                      </select>
                    </div>
                  ))}
                  <p className="fine-print">
                    V1 正式发布需要恰好 18 道题，每题4个选项。草稿可暂时不完整。
                  </p>
                </section>
              )}
            </div>
          )}
          {tab === 'results' && (
            <>
              <div className="pill-tabs">
                {['P', 'G', 'M', 'NPC'].map((d) => (
                  <button
                    key={d}
                    className={resultType === d ? 'active' : ''}
                    onClick={() => setResultType(d)}
                  >
                    {config.results[d].name}
                  </button>
                ))}
              </div>
              <div className="admin-columns result-editor">
                <section className="admin-panel">
                  <label className="field">
                    结果名称
                    <input value={t.name} onChange={(e) => templateField('name', e.target.value)} />
                  </label>
                  <label className="field">
                    属性标签（顿号分隔）
                    <input
                      value={t.tags.join('、')}
                      onChange={(e) => templateField('tags', e.target.value.split('、'))}
                    />
                  </label>
                  <label className="field">
                    一句话评语
                    <textarea
                      rows={3}
                      value={t.quote}
                      onChange={(e) => templateField('quote', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    详细分析
                    <textarea
                      rows={7}
                      value={t.analysis}
                      onChange={(e) => templateField('analysis', e.target.value)}
                    />
                  </label>
                  {[
                    ['impressions', '三个典型印象'],
                    ['advice', '三条成长建议'],
                  ].map(([key, label]) => (
                    <label className="field" key={key}>
                      {label}（每行一条）
                      <textarea
                        rows={5}
                        value={(t[key as 'advice'] || []).join('\n')}
                        onChange={(e) =>
                          templateField(key as keyof Template, e.target.value.split('\n'))
                        }
                      />
                    </label>
                  ))}
                  <label className="field">
                    总结语
                    <textarea
                      rows={3}
                      value={t.summary}
                      onChange={(e) => templateField('summary', e.target.value)}
                    />
                  </label>
                  <label className="field">
                    人格插画
                    <select
                      value={t.art || resultType}
                      onChange={(e) => templateField('art', e.target.value)}
                    >
                      {['P', 'G', 'M', 'NPC'].map((d) => (
                        <option key={d} value={d}>
                          {config.results[d].name}形象
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="color-fields">
                    <label>
                      强调色
                      <input
                        type="color"
                        value={t.color}
                        onChange={(e) => templateField('color', e.target.value)}
                      />
                    </label>
                    <label>
                      背景色
                      <input
                        type="color"
                        value={t.background}
                        onChange={(e) => templateField('background', e.target.value)}
                      />
                    </label>
                  </div>
                </section>
                <section className="admin-panel preview-panel">
                  <span className="section-kicker">结果卡片预览</span>
                  <div
                    className="admin-result-preview"
                    style={{
                      background: t.background,
                      color: resultType === 'NPC' ? '#F1DFC4' : '#302941',
                    }}
                  >
                    <Character type={t.art || resultType} />
                    <h2>{t.name}</h2>
                    <p>{t.quote}</p>
                    <div className="tags">
                      {t.tags.map((tag, i) => (
                        <span key={i}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  <p className="fine-print">
                    插画采用内置同一风格的 SVG 形象，海报会使用相同配色和文案。
                  </p>
                </section>
              </div>
            </>
          )}
          {tab === 'rules' && (
            <div className="admin-columns">
              <section className="admin-panel">
                <h2>评分规则配置</h2>
                <p className="fine-print">
                  修改参考题、彩蛋及标签阈值。固定计分方式为每题1分、除以18换算。
                </p>
                <textarea
                  className="code-editor"
                  aria-label="规则JSON"
                  rows={25}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                />
                <button
                  className="secondary"
                  onClick={() => {
                    try {
                      const next = { ...config, rules: JSON.parse(rules) };
                      validateConfig(next);
                      setConfig(next);
                      setMessage('规则校验通过，已应用到当前草稿，请保存或发布');
                      setError('');
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  校验并应用到草稿
                </button>
              </section>
              <section className="admin-panel">
                <h2>
                  <FlaskConical size={19} />
                  规则模拟器
                </h2>
                <p className="fine-print">模拟结果不会写入真实答题记录或统计。</p>
                <div className="simulator-options">
                  {config.questions.map((q) => (
                    <label key={q.id}>
                      {q.id}
                      <select
                        aria-label={`模拟${q.id}`}
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      >
                        <option value="">请选择</option>
                        {q.options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.id} · {o.dimension}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <button
                  className="primary"
                  onClick={() => {
                    try {
                      setSimulation(calculateResult(answers, config));
                      setError('');
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  运行模拟 <ArrowRight size={16} />
                </button>
                {simulation && (
                  <div className="simulation-result">
                    <h3>{config.results[simulation.easterEgg ? 'NPC' : simulation.result].name}</h3>
                    <p>
                      P {simulation.scores.P} / G {simulation.scores.G} / M {simulation.scores.M}
                    </p>
                    <p>
                      正常主结果：{simulation.result}；彩蛋：{simulation.easterEgg ? '是' : '否'}
                    </p>
                    <p>{simulation.reason}</p>
                    <Radar scores={simulation.normalized} />
                  </div>
                )}
              </section>
            </div>
          )}
          {tab === 'records' && (
            <section className="admin-panel">
              <div className="panel-title">
                <h2>答题记录 · 最近最多 500 条</h2>
                <a className="secondary" href={`/api/admin/export?${query}`}>
                  <Download size={16} />
                  导出 CSV
                </a>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>测试会话</th>
                      <th>开始时间</th>
                      <th>正常主结果</th>
                      <th>彩蛋</th>
                      <th>维度原始分</th>
                      <th>答案详情</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id}>
                        <td title={r.id}>
                          {r.id.slice(0, 8)}
                          <small className="table-sub">{r.version}</small>
                        </td>
                        <td>{new Date(r.started).toLocaleString('zh-CN')}</td>
                        <td>{r.result ? config.results[r.result.result].name : '未完成'}</td>
                        <td>{r.result?.easterEgg ? '已触发' : '—'}</td>
                        <td>
                          {r.result
                            ? `P ${r.result.scores.P} / G ${r.result.scores.G} / M ${r.result.scores.M}`
                            : '—'}
                        </td>
                        <td>
                          <details>
                            <summary>查看</summary>
                            <pre>{JSON.stringify(r.answers, null, 2)}</pre>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!records.length && <p className="empty-text">当前筛选条件下没有记录。</p>}
            </section>
          )}
          {tab === 'versions' && (
            <section className="admin-panel">
              <h2>历史发布记录</h2>
              <p className="fine-print">
                每次发布保留完整快照。回滚创建新版本，只影响之后开始的测试。
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>版本</th>
                      <th>发布说明</th>
                      <th>创建时间</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v) => (
                      <tr key={v.id}>
                        <td>{v.id}</td>
                        <td>{v.note}</td>
                        <td>{new Date(v.created).toLocaleString('zh-CN')}</td>
                        <td>{v.active ? '当前生效' : '历史版本'}</td>
                        <td>
                          {!v.active && user.role === 'admin' && (
                            <button
                              className="text-button"
                              onClick={() => setConfirm({ type: 'rollback', id: v.id })}
                            >
                              回滚至此版本
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === 'audit' && (
            <section className="admin-panel">
              <h2>最近 100 条关键操作</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>操作者</th>
                      <th>动作</th>
                      <th>内容</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td>{new Date(l.created).toLocaleString('zh-CN')}</td>
                        <td>{l.actor}</td>
                        <td>{l.action}</td>
                        <td>{l.detail || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
      {confirm && (
        <Modal
          title={confirm.type === 'publish' ? '发布当前草稿？' : '回滚历史配置？'}
          onClose={() => setConfirm(null)}
        >
          <p>发布后，新开始的测试将使用此配置。历史结果及进行中的测试保持原配置。</p>
          {confirm.type === 'publish' && (
            <label className="field">
              发布说明
              <input
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：优化结果文案"
              />
            </label>
          )}
          <div className="button-row">
            <button className="secondary" onClick={() => setConfirm(null)}>
              取消
            </button>
            <button className="primary" disabled={busy} onClick={() => void publish()}>
              {busy ? '发布中…' : '确认发布'}
            </button>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
