import { createApp } from './app/create-app.js';

export { createApp };

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  createApp({ window, document, performance, requestAnimationFrame, setTimeout, clearTimeout }).init();
}
