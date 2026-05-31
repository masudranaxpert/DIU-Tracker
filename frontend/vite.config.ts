import path from 'path';
import { cpSync, existsSync, mkdirSync, createReadStream, statSync } from 'fs';
import type { Connect } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function pdfJsStaticMiddleware(baseDir: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (!req.url) {
      next();
      return;
    }
    const rel = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''));
    const filePath = path.join(baseDir, rel);
    if (!filePath.startsWith(baseDir)) {
      next();
      return;
    }
    try {
      const stat = statSync(filePath);
      if (!stat.isFile()) {
        next();
        return;
      }
      createReadStream(filePath).pipe(res);
    } catch {
      next();
    }
  };
}

function copyPdfJsAssets() {
  const root = __dirname;
  const copies: [string, string][] = [
    ['node_modules/pdfjs-dist/wasm', 'dist/wasm'],
    ['node_modules/pdfjs-dist/cmaps', 'dist/cmaps'],
    ['node_modules/pdfjs-dist/standard_fonts', 'dist/standard_fonts'],
  ];

  return {
    name: 'copy-pdfjs-assets',
    closeBundle() {
      for (const [fromRel, toRel] of copies) {
        const from = path.resolve(root, fromRel);
        const to = path.resolve(root, toRel);
        if (!existsSync(from)) continue;
        mkdirSync(to, { recursive: true });
        cpSync(from, to, { recursive: true });
      }
    },
    configureServer(server) {
      const wasmRoot = path.resolve(root, 'node_modules/pdfjs-dist/wasm');
      const cmapsRoot = path.resolve(root, 'node_modules/pdfjs-dist/cmaps');
      const fontsRoot = path.resolve(root, 'node_modules/pdfjs-dist/standard_fonts');
      server.middlewares.use('/wasm', pdfJsStaticMiddleware(wasmRoot));
      server.middlewares.use('/cmaps', pdfJsStaticMiddleware(cmapsRoot));
      server.middlewares.use('/standard_fonts', pdfJsStaticMiddleware(fontsRoot));
    },
  };
}

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
    plugins: [react(), tailwindcss(), copyPdfJsAssets()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      chunkSizeWarningLimit: 1400,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('pdfjs-dist') || id.includes('pdf-lib')) return 'vendor-pdf-tools';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'vendor-pdf';
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
