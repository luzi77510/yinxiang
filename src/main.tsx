import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout, ErrorState, Loading } from './components/Layout';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import Info from './pages/Info';
const Admin = lazy(() => import('./pages/Admin'));
import './styles.css';
class Boundary extends React.Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="state-screen">
        <h1>页面需要重新整理一下</h1>
        <p>你的答案会保留在当前浏览器中。</p>
        <button className="primary" onClick={() => location.reload()}>
          刷新页面
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <Boundary>
    <HashRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/admin/*" element={<Admin />} />
          <Route
            path="*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/test" element={<Quiz />} />
                  <Route path="/result/:id" element={<Result />} />
                  <Route path="/share/local/:token" element={<Result shared local />} />
                  <Route path="/share/:token" element={<Result shared />} />
                  <Route path="/about" element={<Info />} />
                  <Route path="/privacy" element={<Info privacy />} />
                  <Route
                    path="*"
                    element={<ErrorState message="这个页面还没有被发现，先回首页看看吧。" />}
                  />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </Suspense>
    </HashRouter>
  </Boundary>,
);
