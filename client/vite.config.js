import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:3500/api/v1';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const getApiBaseUrl = (mode, env) => {
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim();

  if (apiBaseUrl) return apiBaseUrl;
  if (mode !== 'production') return DEFAULT_LOCAL_API_BASE_URL;

  throw new Error(
    'VITE_API_BASE_URL must be set to the absolute Express API URL for production builds.',
  );
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = getApiBaseUrl(mode, env);
  const isRelativeApi = apiBaseUrl.startsWith('/');
  const apiUrl = isRelativeApi ? null : new URL(apiBaseUrl);
  const isLocalApi = isRelativeApi || LOCAL_HOSTS.has(apiUrl.hostname);

  if (mode === 'production' && isRelativeApi) {
    throw new Error(
      'VITE_API_BASE_URL must be absolute in production because the Vercel client is deployed separately from the Express API.',
    );
  }

  if (mode !== 'production' && !isLocalApi && env.ALLOW_REMOTE_API_IN_DEV !== 'true') {
    throw new Error(
      `Refusing to start local dev against remote API "${apiBaseUrl}". ` +
      `Set VITE_API_BASE_URL=${DEFAULT_LOCAL_API_BASE_URL} or ALLOW_REMOTE_API_IN_DEV=true.`,
    );
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
    },
    server: {
      proxy: {
        '/api': {
          target: apiUrl?.origin || new URL(DEFAULT_LOCAL_API_BASE_URL).origin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
