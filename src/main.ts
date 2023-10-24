import { createApp } from 'vue';
// import Antd from 'ant-design-vue';
import App from './App.vue';
import 'ant-design-vue/dist/reset.css';
import './style.css';

import setupDirective from '/@/utils/directive';
import { setupStore } from './store';

function bootstrap() {
  const app = createApp(App);

  setupStore(app)

  setupDirective(app);

  app.mount('#app');
}

bootstrap();