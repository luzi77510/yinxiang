import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCircle2 as CloudCheck, Sparkles } from 'lucide-react';
import { readLocal, loadSession, saveLocal, saveAnswers, submitSession, STATIC } from '../api';
import type { Session } from '../types';
import { Loading, ErrorState } from '../components/Layout';
export default function Quiz() {
  const nav = useNavigate(),
    [s, setS] = useState<Session | null>(null),
    [index, setIndex] = useState(0),
    [error, setError] = useState(''),
    [loadError, setLoadError] = useState(''),
    [busy, setBusy] = useState(false),
    [saveState, setSaveState] = useState(''),
    [retry, setRetry] = useState(0);
  const queue = useRef(Promise.resolve()),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const local = readLocal();
    if (!local) {
      nav('/', { replace: true });
      return;
    }
    if (local.completed) {
      nav(`/result/${local.id}`, { replace: true });
      return;
    }
    let active = true;
    loadSession(local.id)
      .then((next) => {
        if (active) {
          setS(next);
          setIndex(next.index || 0);
          setLoadError('');
        }
      })
      .catch((e) => {
        if (active) setLoadError(e.message);
      });
    return () => {
      active = false;
    };
  }, [nav, retry]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [index]);
  if (loadError) return <ErrorState message={loadError} retry={() => setRetry((n) => n + 1)} />;
  if (!s) return <Loading />;
  const question = s.config.questions[index],
    selected = s.answers[question.id],
    count = Object.keys(s.answers).length;
  function select(value: string) {
    if (!s || busy) return;
    const next = { ...s, answers: { ...s.answers, [question.id]: value }, index };
    try {
      saveLocal(next);
      setS(next);
      setError('');
      setSaveState('正在保存…');
      queue.current = queue.current
        .catch(() => {})
        .then(() => saveAnswers(next))
        .then(() => setSaveState(STATIC ? '进度已保存在本机' : '进度已保存'))
        .catch(() => setSaveState('已保存在本机，提交时将同步'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function next() {
    if (!s || !selected || busy) return;
    setError('');
    if (index < 17) {
      const i = index + 1;
      saveLocal({ ...s, index: i });
      setIndex(i);
      return;
    }
    setBusy(true);
    try {
      await queue.current;
      const result = await submitSession(s, s.answers);
      nav(`/result/${result.id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function previous() {
    if (!s || index === 0 || busy) return;
    setIndex(index - 1);
    saveLocal({ ...s, index: index - 1 });
  }
  return (
    <section className="quiz-shell">
      <div className="quiz-top">
        <Link to="/">
          <ArrowLeft size={16} />
          稍后再来
        </Link>
        <span>
          <Sparkles size={14} />
          你的第一印象探索
        </span>
      </div>
      <div className="progress-label">
        <span>跟着直觉走就好</span>
        <strong>
          {String(index + 1).padStart(2, '0')}
          <small> / 18</small>
        </strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="答题进度"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={18}
      >
        <span style={{ width: `${(count / 18) * 100}%` }} />
      </div>
      <div className="question-card" key={question.id}>
        <span className="question-kicker">QUESTION {String(index + 1).padStart(2, '0')}</span>
        <h1 ref={heading} tabIndex={-1}>
          {question.text}
        </h1>
        <p className="question-hint">没有对错，选择最接近你的那一个。</p>
        <div
          className="options"
          role="radiogroup"
          aria-label={question.text}
          onKeyDown={(e) => {
            if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
              e.preventDefault();
              const current = question.options.findIndex((o) => o.id === selected);
              const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
              const i = (current + dir + 4) % 4;
              select(question.options[i].id);
              (e.currentTarget.children[i] as HTMLElement).focus();
            }
          }}
        >
          {question.options.map((o) => (
            <button
              type="button"
              key={o.id}
              className={`option ${selected === o.id ? 'selected' : ''}`}
              role="radio"
              aria-checked={selected === o.id}
              tabIndex={selected ? (selected === o.id ? 0 : -1) : 0}
              onClick={() => select(o.id)}
              disabled={busy}
            >
              <span className="option-letter">{o.id}</span>
              <span>{o.text}</span>
              <span className="option-check">{selected === o.id && <Check size={17} />}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="quiz-actions">
        <button className="text-button" onClick={previous} disabled={index === 0 || busy}>
          <ArrowLeft size={17} />
          上一题
        </button>
        <button className="primary" onClick={() => void next()} disabled={!selected || busy}>
          {busy ? '正在整理你的画像…' : index === 17 ? '查看我的第一印象' : '下一题'}
          {!busy && <ArrowRight size={18} />}
        </button>
      </div>
      <p className="save-note">
        <CloudCheck size={15} />
        {saveState || '答案会自动保存，随时可以回来。'}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <p className="quiz-bottom">你不需要成为别人，做自己就很好。</p>
    </section>
  );
}
