import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '/@/': path.resolve(__dirname, '.', 'src') + '/',
      '@/': path.resolve(__dirname, '.', 'src') + '/',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 将自定义的 HTML 模板关联到输出
        manualChunks: {
          index: ['./index.html'],
        },
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // additionalData: `@import "/@/styles/variables.scss";` // 你的全局样式文件路径
      }
    }
  }
});
