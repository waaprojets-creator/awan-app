import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import reactNativeWeb from 'vite-plugin-react-native-web';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      reactNativeWeb(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'react-native/Libraries/Utilities/codegenNativeComponent': path.resolve(__dirname, 'src/utils/codegenNativeComponent.js'),
        'react-native-web/Libraries/Utilities/codegenNativeComponent': path.resolve(__dirname, 'src/utils/codegenNativeComponent.js'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return;
            // Toute la famille React dans un seul chunk — évite les dépendances
            // circulaires entre vendor et vendor-react causées par react-native-web
            // qui importe react-dom (et react-dom importe react).
            if (id.includes('/react') || id.includes('react-native')) return 'vendor-react';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('date-fns')) return 'vendor-dates';
            if (id.includes('lucide')) return 'vendor-icons';
            if (id.includes('zod')) return 'vendor-zod';
            return 'vendor';
          },
        },
      },
    },
    base: './',
    optimizeDeps: {
      include: [
        'react-native-safe-area-context',
        'react-native-svg',
      ],
      esbuildOptions: {
        resolveExtensions: ['.web.js', '.js', '.ts', '.jsx', '.tsx', '.json'],
        plugins: [
          {
            name: 'react-native-web-codegen',
            setup(build) {
              build.onResolve({ filter: /codegenNativeComponent/ }, args => {
                return { path: path.resolve(__dirname, 'src/utils/codegenNativeComponent.js') };
              });
            },
          },
        ],
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
