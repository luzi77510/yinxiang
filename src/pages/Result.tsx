import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Download,
  Copy,
  Share2,
  Sparkles,
  Check,
  Heart,
  Trash2,
  Link2Off,
} from 'lucide-react';
import { Character, Radar } from '../components/Art';
import { Loading, ErrorState, Modal } from '../components/Layout';
import {
  loadSession,
  readShare,
  shareUrl,
  copyText,
  event,
  removeResult,
  request,
  STATIC,
  createSession,
} from '../api';
import type { Result as ResultData } from '../types';
export default function ResultPage({
  shared = false,
  local = false,
}: {
  shared?: boolean;
  local?: boolean;
}) {
  const { id, token } = useParams(),
    nav = useNavigate(),
    [result, setResult] = useState<ResultData | null>(null),
    [error, setError] = useState(''),
    [actionError, setActionError] = useState(''),
    [toast, setToast] = useState(''),
    [poster, setPoster] = useState<string | null>(null),
    [posterOpen, setPosterOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0),
    [confirm, setConfirm] = useState<'delete' | 'retest' | 'revoke' | null>(null),
    [nickname, setNickname] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    (shared
      ? readShare(token!, local)
      : loadSession(id!).then((s) => {
          if (!s.result) throw new Error('这次测试尚未完成，请继续答题');
          return s.result;
        })
    )
      .then((r) => {
        if (active) setResult(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    if (shared && !local) event('share_visit', undefined, { token });
    const start = Date.now();
    return () => {
      active = false;
      if (!shared) event('result_stay', id, { value: Math.round((Date.now() - start) / 1000) });
    };
  }, [id, token, shared, local, retry]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  if (error) return <ErrorState message={error} retry={() => setRetry((n) => n + 1)} />;
  if (!result) return <Loading text="正在展开你的第一印象画像…" />;
  const t = result.template,
    type = result.easterEgg ? 'NPC' : result.result;
  async function copy() {
    if (!result) return;
    setActionError('');
    setBusy(true);
    event('share_click', result.id);
    try {
      await copyText(await shareUrl(result));
      setToast('分享链接已复制');
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    if (!result) return;
    setActionError('');
    setBusy(true);
    try {
      const url = await shareUrl(result),
        { createPoster } = await import('../poster'),
        data = await createPoster(result, url, nickname);
      setPoster(data);
      event('poster_success', result.id);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function systemShare() {
    if (!result) return;
    setActionError('');
    setBusy(true);
    event('share_click', result.id);
    try {
      const url = await shareUrl(result);
      if (navigator.share)
        await navigator.share({
          title: `我的第一印象是「${t.name}」`,
          text: '你们觉得准吗？也来探索你的第一印象。',
          url,
        });
      else {
        await copyText(url);
        setToast('链接已复制，发给朋友吧');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirmAction() {
    if (!result) return;
    setBusy(true);
    setActionError('');
    try {
      if (confirm === 'delete') {
        await removeResult(result.id!);
        nav('/');
      } else if (confirm === 'retest') {
        await createSession();
        nav('/test');
      } else {
        await request(`/sessions/${result.id}/share`, { method: 'DELETE' });
        setToast('公开链接已撤销');
      }
      setConfirm(null);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`result-shell theme-${type}`}
      style={
        { '--result-color': t.color, '--result-background': t.background } as React.CSSProperties
      }
    >
      <Link to="/" className="back-link">
        <ArrowLeft size={15} />
        返回研究所
      </Link>
      <div className="result-intro">
        <span className="eyebrow">
          <Sparkles size={14} />
          {shared ? '来自朋友的一张印象卡' : 'YOUR FIRST IMPRESSION'}
        </span>
        <h1>{shared ? 'TA 的第一印象倾向是' : '原来，你是这样的你。'}</h1>
        <p>
          {shared
            ? '每个人都有自己的光。下一张，来看看你的？'
            : '收下这份来自另一个视角的小小发现。'}
        </p>
      </div>
      <article className="result-card">
        <div className="result-card-meta">
          <span>IMPRESSION LAB</span>
          <span>{result.easterEgg ? 'SPECIAL EDITION' : 'PERSONAL PORTRAIT · 01'}</span>
        </div>
        <div className="result-hero">
          <div>
            <span className="result-category">
              {result.easterEgg
                ? '隐藏画风已解锁'
                : { P: '温柔亲和 · 治愈系', G: '自信鲜明 · 气场系', M: '独特反差 · 神秘系' }[
                    result.result
                  ]}
            </span>
            <h2>{t.name}</h2>
            {t.subtitle && <h3>{t.subtitle}</h3>}
            <p className="result-quote">{t.quote}</p>
            <div className="tags">
              {[...t.tags, ...result.tags].map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          <Character type={t.art || type} />
        </div>
      </article>
      <section className="result-block">
        <div className="block-heading">
          <span>01 / YOUR IMPRESSION MAP</span>
          <h2>你的三维印象画像</h2>
        </div>
        <div className="radar-layout">
          <Radar scores={result.normalized} color={result.easterEgg ? '#8A6AAA' : t.color} />
          <div className="dimension-list">
            {(['P', 'G', 'M'] as const).map((d, i) => (
              <div className="dimension" key={d}>
                <div>
                  <strong>{['亲和感', '气场感', '神秘感'][i]}</strong>
                  <span>
                    {result.normalized[d]}
                    <small> / 100</small>
                  </span>
                </div>
                <div className="dimension-track">
                  <span style={{ width: `${result.normalized[d]}%` }} />
                </div>
                <p>
                  {
                    [
                      '让陌生人放下戒备，感到自然和亲近。',
                      '鲜明的个人表达，以及被看见的存在感。',
                      '自己的边界与节奏，让人想进一步了解。',
                    ][i]
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="fine-print">
          分数来自本次选择的分布，不是人群排名。低分只表示该特质在本次选择中较少体现。
        </p>
      </section>
      {!shared && (
        <>
          <section className="result-block prose">
            <div className="block-heading">
              <span>02 / A CLOSER LOOK</span>
              <h2>第一眼之后，还有这些你</h2>
            </div>
            {t.analysis
              ?.split(/(?<=。)/)
              .reduce((parts: string[], sentence, i) => {
                const p = Math.floor(i / 3);
                parts[p] = (parts[p] || '') + sentence;
                return parts;
              }, [])
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            <div className="impressions">
              {t.impressions?.map((impression, i) => (
                <div key={impression}>
                  <span>0{i + 1}</span>
                  <h3>{impression.split('：')[0]}</h3>
                  <p>{impression.split('：').slice(1).join('：')}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="result-block advice-block">
            <div className="block-heading">
              <span>03 / A LITTLE GROWTH</span>
              <h2>给日常社交的一点小灵感</h2>
            </div>
            {t.advice?.map((a, i) => (
              <div className="advice-item" key={a}>
                <span>
                  <Check size={15} />
                </span>
                <p>{a}</p>
              </div>
            ))}
            <div className="result-summary">
              <Heart size={21} />
              <p>{t.summary}</p>
            </div>
          </section>
        </>
      )}
      <section className="result-actions">
        <Sparkles size={25} />
        <h2>{shared ? '每一种你，都值得被发现。' : '这份特别，也可以分享给朋友。'}</h2>
        <p>
          {shared
            ? '18 道情境题，探索属于你的第一印象。'
            : '“你们觉得准吗？”也许会开启一场有趣的聊天。'}
        </p>
        {shared ? (
          <Link className="primary" to="/">
            我也来测测 <ArrowRight size={18} />
          </Link>
        ) : (
          <>
            <div className="button-row">
              <button
                className="primary"
                onClick={() => {
                  setPosterOpen(true);
                  setPoster(null);
                }}
              >
                <Download size={18} />
                生成分享海报
              </button>
              <button className="secondary" disabled={busy} onClick={() => void copy()}>
                <Copy size={17} />
                复制分享链接
              </button>
              <button
                className="icon-button"
                title="系统分享"
                aria-label="系统分享"
                disabled={busy}
                onClick={() => void systemShare()}
              >
                <Share2 size={20} />
              </button>
            </div>
            <button className="text-button retest" onClick={() => setConfirm('retest')}>
              重新探索一次 <ArrowUpRight size={16} />
            </button>
          </>
        )}
        {actionError && (
          <p className="error" role="alert">
            {actionError}
          </p>
        )}
      </section>
      {!shared && (
        <div className="result-tools">
          {!STATIC && (
            <button onClick={() => setConfirm('revoke')}>
              <Link2Off size={14} />
              撤销公开分享链接
            </button>
          )}
          <button onClick={() => setConfirm('delete')}>
            <Trash2 size={14} />
            删除我的测试记录
          </button>
        </div>
      )}
      <p className="result-disclaimer">
        本测试仅供娱乐与自我探索，不代表他人真实评价或专业心理测量结论。
        <br />
        无论结果是什么，你都远比一个标签更丰富。
      </p>
      {posterOpen && (
        <Modal title="收下你的专属印象卡" onClose={() => setPosterOpen(false)}>
          {poster ? (
            <>
              <img className="poster-preview" src={poster} alt="你的第一印象分享海报" />
              <a className="primary full-width" href={poster} download={`第一印象-${t.name}.png`}>
                <Download size={18} />
                保存海报 PNG
              </a>
              <p className="fine-print">手机浏览器也可以长按图片保存。</p>
            </>
          ) : (
            <>
              <p>海报包含你的结果称号、维度分数和测试入口，不包含逐题答案。</p>
              <label className="field">
                海报昵称（选填）
                <input
                  maxLength={12}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="留白也很好"
                />
              </label>
              <button
                className="primary full-width"
                disabled={busy}
                onClick={() => void generate()}
              >
                {busy ? '正在绘制你的印象卡…' : '生成我的印象卡'}
                <Sparkles size={17} />
              </button>
              {actionError && (
                <p className="error" role="alert">
                  {actionError}
                </p>
              )}
            </>
          )}
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm === 'delete'
              ? '删除这次测试记录？'
              : confirm === 'retest'
                ? '开始一次新的探索？'
                : '撤销公开分享链接？'
          }
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm === 'delete'
              ? `这会清除${STATIC ? '当前浏览器保存的记录。已发出的静态分享摘要和已保存的海报无法收回。' : '本次记录，并让公开分享链接失效。已保存的海报无法收回。'}`
              : confirm === 'retest'
                ? '新测试会替换本机当前记录，记得先保存喜欢的海报。'
                : '旧链接将无法继续访问，已保存的海报图片不会被删除。'}
          </p>
          <div className="button-row">
            <button className="secondary" onClick={() => setConfirm(null)}>
              先保留
            </button>
            <button className="primary" disabled={busy} onClick={() => void confirmAction()}>
              {busy ? '处理中…' : '确认'}
            </button>
          </div>
          {actionError && (
            <p className="error" role="alert">
              {actionError}
            </p>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </section>
  );
}
