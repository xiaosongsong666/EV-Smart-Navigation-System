import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

/* ------------------------------------------------------------------ */
/*  Service Worker 注册（模块四：离线缓存）                              */
/*  在页面加载完成后注册 public/sw.js，让它接管瓦片请求做 Cache-First。    */
/* ------------------------------------------------------------------ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker 注册成功，缓存范围:', registration.scope);
      })
      .catch((err) => {
        console.warn('❌ Service Worker 注册失败（离线缓存不可用）:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
