import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Sparkles,
  Heart,
  Check,
  Plus,
  Minus,
  Smile,
  Feather,
  MoveUpRight,
} from 'lucide-react';
import { Character } from '../components/Art';
import { Modal } from '../components/Layout';
import { createSession, readLocal } from '../api';
const cards = [
  {
    type: 'G',
    en: 'THE SPOTLIGHT',
    name: '自带主角光环',
    desc: '不用刻意闪耀，也会被看见。',
    label: '气场系',
    no: '02',
  },
  {
    type: 'P',
    en: 'THE SUNSHINE',
    name: '人间小太阳',
    desc: '你的出现，让空气都变柔软。',
    label: '亲和系',
    no: '01',
  },
  {
    type: 'M',
    en: 'THE MYSTERY',
    name: '神秘感狙击手',
    desc: '故事从好奇你的那一刻开始。',
    label: '神秘系',
    no: '03',
  },
];
export default function Home() {
  const nav = useNavigate(),
    [draft] = useState(readLocal),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState(false),
    [faq, setFaq] = useState<number | null>(0);
  async function start(fresh = false) {
    if (draft && !draft.completed && !fresh) {
      nav('/test');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createSession();
      nav('/test');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }
  return (
    <>
      <section className="hero section-width">
        <div className="hero-copy">
          <div className="eyebrow">
            <span />
            一场关于「你」的好奇心实验
          </div>
          <h1 aria-label="别人对你的第一印象测试">
            别人对你的
            <br />
            <span className="title-underline">第一印象</span>测试
            <span className="title-spark" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p className="hero-subtitle">
            初次见面，
            <br className="mobile-break" />
            你在别人眼里究竟是什么画风？
          </p>
          <p className="hero-description">
            也许是让人想靠近的小太阳，
            <br />
            也许是人群中的主角，或是一本读不完的故事。
            <br />
            换个视角，遇见你还没发现的自己。
          </p>
          <div className="hero-meta">
            <span>
              <span className="meta-number">18</span> 道情境题
            </span>
            <i />
            <span>
              <Clock3 size={15} />约 3 分钟
            </span>
            <i />
            <span>凭直觉选就好</span>
          </div>
          <button className="primary hero-cta" disabled={busy} onClick={() => void start()}>
            {busy ? '准备中…' : draft && !draft.completed ? '继续我的探索' : '开始我的探索'}
            <ArrowRight size={20} />
          </button>
          <div className="cta-note">
            <Check size={13} />
            没有标准答案，也没有哪一种更好。
            {draft && !draft.completed && (
              <button onClick={() => setConfirm(true)}>重新开始</button>
            )}
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="hero-art-container">
          <div className="hero-art" aria-label="三种第一印象人格卡牌">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <span className="art-spark spark-one">✧</span>
            <span className="art-spark spark-two">✳</span>
            <div className="art-note">
              第一眼，就很特别 <MoveUpRight size={18} />
            </div>
            <span className="art-pill">
              <span />
              解锁你的隐藏画风
            </span>
            {cards.map((c) => (
              <div key={c.type} className={`persona-card hero-card card-${c.type}`}>
                <div className="card-top">
                  <span>IMPRESSION LAB</span>
                  <span>NO. {c.no}</span>
                </div>
                <div className="card-frame">
                  <span className="card-orbit" />
                  <Character type={c.type} />
                </div>
                <span className="card-type">{c.en}</span>
                <h2>{c.name}</h2>
                <div className="card-bottom">
                  <span>{c.label}</span>
                  <Sparkles size={14} />
                </div>
              </div>
            ))}
            <span className="hand-note">nice to meet another you.</span>
            <svg className="doodle-arrow" viewBox="0 0 130 70" aria-hidden="true">
              <path
                d="M4 8q79 66 109 6m-5 1 15-8-1 17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </section>
      <section className="reassurance section-width">
        <div>
          <span className="mini-icon">
            <Feather size={20} />
          </span>
          <p>
            <strong>轻松一点，做你自己</strong>
            <small>选择最像你的那个反应</small>
          </p>
        </div>
        <div>
          <span className="mini-icon">
            <Heart size={20} />
          </span>
          <p>
            <strong>每一种结果，都有魅力</strong>
            <small>看见自己的特质和可能性</small>
          </p>
        </div>
        <div>
          <span className="mini-icon">
            <Sparkles size={20} />
          </span>
          <p>
            <strong>收下一张专属印象卡</strong>
            <small>也把这份好奇分享给朋友</small>
          </p>
        </div>
      </section>
      <section className="types-section section-width" id="personas">
        <div className="section-kicker">A LITTLE PREVIEW</div>
        <div className="section-heading">
          <h2>
            你的第一印象，<span>可能是…</span>
          </h2>
          <p>三种不同的光，都是你独有的模样。</p>
        </div>
        <div className="preview-grid">
          {[cards[1], cards[0], cards[2]].map((c) => (
            <article className={`preview-card preview-${c.type}`} key={c.type}>
              <div className="preview-top">
                <span>{c.label}</span>
                <ArrowUpRight size={20} />
              </div>
              <Character type={c.type} />
              <div className="preview-copy">
                <small>{c.en}</small>
                <h3>{c.name}</h3>
                <p>{c.desc}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="hidden-note">
          <Sparkles size={14} />
          听说，还有一种意料之外的隐藏画风，等你发现。
        </p>
      </section>
      <section className="how-section section-width">
        <div className="how-intro">
          <span className="section-kicker">JUST BE YOURSELF</span>
          <h2>
            认识另一个视角的你，
            <br />
            只需要三分钟。
          </h2>
          <p>
            不用反复斟酌，也不用选择“更好”的答案。
            <br />
            那个下意识的你，就已经足够有趣。
          </p>
          <Link to="/about">
            了解这场测试 <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="steps">
          {[
            ['01', '跟随第一反应', '18 个日常社交场景，选择最像你的反应。'],
            ['02', '收获你的印象画像', '看看亲和感、气场感与神秘感如何组成你。'],
            ['03', '留下一点新的发现', '带走专属卡片，也给日常社交一点小灵感。'],
          ].map(([n, t, d]) => (
            <div className="step" key={n}>
              <span>{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="faq-section section-width">
        <div>
          <span className="section-kicker">BEFORE WE START</span>
          <h2>你可能还想知道</h2>
        </div>
        <div>
          {[
            [
              '这个测试有标准答案吗？',
              '没有。每道题描述一个日常情境，按最接近你的真实反应选择即可，结果也没有好坏之分。',
            ],
            [
              '测试结果能代表别人真实的评价吗？',
              '结果根据你的自述选择生成，反映本次情境中的行为倾向，不代表他人真实评价，也不是专业心理测量。',
            ],
            ['需要登录或者付费吗？', '不需要。可以匿名完成全部测试，查看结果并自愿保存海报。'],
          ].map(([q, a], i) => (
            <div className="faq-item" key={q}>
              <button aria-expanded={faq === i} onClick={() => setFaq(faq === i ? null : i)}>
                {q}
                {faq === i ? <Minus size={17} /> : <Plus size={17} />}
              </button>
              {faq === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </section>
      <section className="closing section-width">
        <Smile size={34} />
        <div>
          <h2>准备好，换个角度看自己了吗？</h2>
          <p>18 道题，一个可能让你会心一笑的新发现。</p>
        </div>
        <button className="primary" disabled={busy} onClick={() => void start()}>
          来认识一下我 <ArrowRight size={19} />
        </button>
      </section>
      {confirm && (
        <Modal title="重新开始这场探索？" onClose={() => setConfirm(false)}>
          <p>当前尚未完成的答案将从本机清除。</p>
          <div className="button-row">
            <button className="secondary" onClick={() => setConfirm(false)}>
              继续保留
            </button>
            <button className="primary" disabled={busy} onClick={() => void start(true)}>
              重新开始
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
