<template>
  <a-layout>
    <a-layout-sider v-if="show" v-model:collapsed="collapsed" :trigger="null" collapsible>
      <div class="logo" />
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline">
        <a-menu-item v-for="router in routerList" :key="router.title" @click="to(router.component)">
          <component :is='router.icon'></component>
          <span>{{ router.title }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header v-if="show" style="background: #fff; padding: 0 16px">
        <menu-unfold-outlined
          v-if="collapsed"
          class="trigger"
          @click="() => (collapsed = !collapsed)"
        />
        <menu-fold-outlined v-else class="trigger" @click="() => (collapsed = !collapsed)" />
      </a-layout-header>
      <a-layout-content :style="mainStyle">
        <component :is='component'></component>
      </a-layout-content>
      <a-layout-footer v-if="show" style="text-align: center">
        rtc-chatroom ©2023
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script lang="ts" setup>
import { FileTextFilled, CameraFilled, PictureFilled, AudioOutlined } from '@ant-design/icons-vue';
import { defineAsyncComponent, ref, markRaw, shallowRef, reactive, shallowReactive, computed  } from 'vue';
import { theme } from 'ant-design-vue';
import Clipboard from '@/test/Clipboard.vue';
import ChatRoom from '@/views/ChatRoom.vue';
import Canvas from '@/test/Canvas.vue';
import AudioVisualizer from '@/test/AudioVisualizer.vue';
import SpeechRecognition from '@/test/SpeechRecognition.vue';
import {
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons-vue';

type Component = ReturnType<typeof defineAsyncComponent>

const isDevelopment = ref(import.meta.env.VITE_NODE_ENV === 'development')
const isDevMode = ref(import.meta.env.VITE_DEV_MODE === 'true')
const show = computed(() => isDevelopment.value && isDevMode.value)

const selectedKeys = ref<string[]>(['ChatRoom']);
const collapsed = ref<boolean>(false);

const routerList = shallowReactive([
  { title: 'ChatRoom', component: ChatRoom, icon: CameraFilled },
  { title: 'Clipboard', component: Clipboard, icon: FileTextFilled },
  { title: 'Canvas', component: Canvas, icon: PictureFilled },
  { title: 'AudioVisualizer', component: AudioVisualizer, icon: AudioOutlined },
  { title: 'SpeechRecognition', component: SpeechRecognition, icon: AudioOutlined },
])

const component = shallowRef<Component>(null)

async function to(comp: Component) {
  component.value = show.value ? comp : ChatRoom
}

to(routerList[0].component)
const { token } = theme.useToken()
const mainStyle = reactive({
  '--main-height': show.value ? 'calc(100vh - 70px - 64px - 24px)' : '100vh',
  margin: show.value ? '24px 16px 0' : '0',
  padding: '5px',
  background: '#2b2b2b',
  height: 'var(--main-height)',
  borderRadius: show.value ? '6px' : '0px',
  color: '#fff',
})
</script>
<style>
body {
  background: #2b2b2b;
}

#components-layout-demo-custom-trigger .trigger {
  font-size: 18px;
  line-height: 64px;
  padding: 0 24px;
  cursor: pointer;
  transition: color 0.3s;
}

#components-layout-demo-custom-trigger .trigger:hover {
  color: #1890ff;
}

#components-layout-demo-custom-trigger .logo {
  height: 32px;
  background: rgba(255, 255, 255, 0.3);
  margin: 16px;
}

.site-layout .site-layout-background {
  background: #fff;
}
</style>
