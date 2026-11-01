import * as THREE from 'three';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// 1. Intercept Three.js internal logging to suppress deprecated Clock warning
if (typeof (THREE as any).setConsoleFunction === 'function') {
  (THREE as any).setConsoleFunction((type: string, message: string, ...params: unknown[]) => {
    if (
      typeof message === 'string' &&
      (message.includes('Clock') ||
        message.includes('THREE.Clock') ||
        message.includes('THREE.Timer'))
    ) {
      return;
    }
    const fn = (console as any)[type] || console.warn;
    fn.call(console, message, ...params);
  });
}

// 2. Filter console.warn directly as an additional safety net
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  for (const arg of args) {
    const str =
      typeof arg === 'string'
        ? arg
        : arg && (arg as any).message
        ? (arg as any).message
        : String(arg || '');
    if (
      str.includes('THREE.Clock') ||
      str.includes('Clock: This module has been deprecated') ||
      str.includes('THREE.Timer')
    ) {
      return;
    }
  }
  origWarn.apply(console, args);
};

createRoot(document.getElementById('root')!).render(<App />);
