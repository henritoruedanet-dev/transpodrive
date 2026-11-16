// Ensure window.fetch is assignable for browser extensions and interceptors
try {
  if (typeof window !== 'undefined') {
    let _fetch = window.fetch ? window.fetch.bind(window) : undefined;
    const getter = () => _fetch;
    const setter = (fn: any) => { _fetch = fn; };
    try {
      Object.defineProperty(window, 'fetch', {
        get: getter,
        set: setter,
        configurable: true,
        enumerable: true
      });
    } catch {}
    try {
      if (typeof Window !== 'undefined' && Window.prototype) {
        Object.defineProperty(Window.prototype, 'fetch', {
          get: getter,
          set: setter,
          configurable: true,
          enumerable: true
        });
      }
    } catch {}
  }
} catch {}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
