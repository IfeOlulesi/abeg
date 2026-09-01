import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Same-origin app: served by FastAPI from web/dist. base '/' so assets
// resolve at /assets/... regardless of the route the app is mounted on.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
