import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base './' keeps asset paths relative, so the build works on GitHub Pages
// under any repository name. Routing uses HashRouter for the same reason.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
