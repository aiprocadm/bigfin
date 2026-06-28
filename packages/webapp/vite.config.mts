/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { defineConfig, loadEnv, type PluginOption } from 'vite';
import fixReactVirtualized from 'esbuild-plugin-react-virtualized';

const allowedEnvPrefixes = ['VITE_', 'REACT_APP_', 'PUBLIC_URL'];

const pickClientEnv = (env: Record<string, string>) =>
  Object.keys(env).reduce<Record<string, string>>((acc, key) => {
    if (allowedEnvPrefixes.some((prefix) => key.startsWith(prefix))) {
      acc[key] = env[key];
    }

    return acc;
  }, {});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rootDir = __dirname;
  const env = loadEnv(mode, rootDir, '');
  const clientEnv = pickClientEnv(env);
  const port = Number(env.PORT) || 4000;
  const plugins: PluginOption[] = [
    tailwindcss(),
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ];

  return {
    plugins,
    root: rootDir,
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
        '@public': path.resolve(rootDir, 'public'),
        path: 'path-browserify',
      },
    },
    define: {
      'process.env': {
        NODE_ENV: mode,
        PUBLIC_URL: clientEnv.PUBLIC_URL ?? '/',
        ...clientEnv,
      },
    },
    server: {
      host: true,
      port,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
        '/socket': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      // После сплита самые крупные чанки — это намеренно изолированные единицы:
      // app-core (react/redux/app), вся Blueprint и timezone-база moment-timezone
      // (~914 КБ сырых, но всего ~81 КБ в gzip). Они меняются редко и кешируются
      // браузером надолго, поэтому держим порог предупреждения чуть выше app-core,
      // чтобы не шуметь на ожидаемо «толстых» вендор-чанках.
      chunkSizeWarningLimit: 1800,
      rollupOptions: {
        output: {
          // Консервативное разбиение: выносим ТОЛЬКО тяжёлые, самостоятельные
          // вендор-семейства в отдельные кешируемые чанки. React/Redux и весь
          // остальной код оставляем в дефолтном чанке Vite, чтобы не трогать
          // порядок инициализации модулей (там живут TDZ-баги при сплите).
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@blueprintjs')) return 'vendor-blueprint';
            if (id.includes('@radix-ui')) return 'vendor-radix';
            if (/node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|internmap)[\\/]/.test(id))
              return 'vendor-charts';
            if (/node_modules[\\/]moment(-timezone)?[\\/]/.test(id)) return 'vendor-moment';
            return undefined;
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      css: false,
    },
    optimizeDeps: {
      esbuildOptions: {
        plugins: [fixReactVirtualized as any],
      },
    },
  };
});
