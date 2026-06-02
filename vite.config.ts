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
