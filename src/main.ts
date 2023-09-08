import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import App from './App.vue';
import 'ant-design-vue/dist/reset.css';
import './style.css';

import defineDirective from '/@/utils/directive';

const app = createApp(App);


app.use(Antd).use(defineDirective).mount('#app');
