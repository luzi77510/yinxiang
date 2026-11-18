import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Sparkles, X, LoaderCircle, ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="印象研究所首页">
      <span className="brand-mark">
        <Sparkles size={22} />
      </span>
      <span>
        印象研究所<small>IMPRESSION LAB</small>
      </span>
    </Link>
  );
}
export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = location.pathname.startsWith('/admin')
      ? '管理后台 · 印象研究所'
      : '别人对你的第一印象测试 · 印象研究所';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = /^\/(result|admin)/.test(location.pathname)
      ? 'noindex,nofollow'
      : 'index,follow';
    document.head.append(meta);
    return () => meta.remove();
  }, [location.pathname]);
  return (
    <>
      <header className="site-header">
        <Brand />
        <nav>
          <Link to="/about">
            关于这场测试 <ArrowUpRight size={14} />
          </Link>
          <span className="edition">
            VOL. 01 <span>·</span> 关于第一眼
          </span>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <Link to="/" className="footer-word">
          每一种你，都很特别。
          <Sparkles size={15} />
        </Link>
        <p>一份轻松的自我探索，给日常一点新的视角。</p>
        <div>
          <span>© {new Date().getFullYear()} 印象研究所</span>
          <Link to="/about">测试说明</Link>
          <Link to="/privacy">隐私说明</Link>
        </div>
      </footer>
    </>
  );
}
export function Loading({ text = '正在准备你的探索…' }: { text?: string }) {
  return (
    <div className="state-screen" role="status">
      <LoaderCircle className="spin" size={30} />
      <p>{text}</p>
    </div>
  );
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-screen">
      <Sparkles size={30} />
      <h1>稍等，出了点小状况</h1>
      <p role="alert">{message}</p>
      <div className="button-row">
        {retry && (
          <button className="primary" onClick={retry}>
            再试一次
          </button>
        )}
        <Link className="secondary" to="/">
          <ArrowLeft size={16} />
          返回首页
        </Link>
      </div>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      d?.close();
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button className="icon-button" aria-label="关闭" onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
