import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx'
import ViteSvgLoader from 'vite-svg-loader';
import path from "path";

export default defineConfig({
  plugins: [
    vue(),
    ViteSvgLoader(),
    vueJsx(),
  ],
  resolve: {
    alias: {
      '/@/': path.resolve(__dirname, '.', 'src') + '/',
      '@/': path.resolve(__dirname, '.', 'src') + '/',
    },
  },
  server: {
    proxy: {
      '/api': {
        // target: 'http://localhost:3000',
        target: 'http://192.168.50.144:3000',
        rewrite: path => {
          return path.replace(/^\/api/, '')
        }
      },
    }
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
          drop_console: true,
          drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          index: ['./index.html'],
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "/@/styles/variables.scss";`
      }
    }
  }
});
