import path from "path";
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx'
import ViteSvgLoader from 'vite-svg-loader';
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    ViteSvgLoader(),
    vueJsx(),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false
        })
      ]
    })
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
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: path => {
          return path.replace(/^\/api/, '')
        }
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
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
