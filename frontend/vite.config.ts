import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/static': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
          },
        },
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      build: {
        chunkSizeWarningLimit: 1400,
        rollupOptions: {
          output: {
            // Only the heavy, lazily-imported export libs get their own chunk.
            // Everything else (React + all React-consuming libs) stays in one
            // `vendor` chunk so React's module init order is never split.
            manualChunks(id) {
              if (!id.includes('node_modules')) return undefined;
              if (id.includes('xlsx')) return 'vendor-xlsx';
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'vendor-pdf';
              return 'vendor';
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
