import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const configuredBase = mode === 'github' ? process.env.VITE_BASE_PATH : '/';
  const basePath = configuredBase?.replace(/^\/+|\/+$/g, '');
  const base = basePath ? `/${basePath}/` : '/';

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['nysl-logo.png'],
        manifest: {
          name: 'Northside Youth Soccer League',
          short_name: 'NYSL',
          description: 'League updates, game schedules, and venues for NYSL families.',
          theme_color: '#174734',
          background_color: '#f6f5ef',
          display: 'standalone',
          lang: 'en-US',
          start_url: base,
          scope: base,
          icons: [
            {
              src: `${base}assets/manifest-icon-192.maskable.png`,
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: `${base}assets/manifest-icon-512.maskable.png`,
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globIgnores: ['**/assets/apple-splash-*.png'],
        },
      }),
    ],
  };
});
