<template>
  <a-layout>
    <a-layout-sider v-if="isDevelopment" v-model:collapsed="collapsed" :trigger="null" collapsible>
      <div class="logo" />
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline">
        <a-menu-item v-for="router in routerList" :key="router.title" @click="to(router.component)">
          <component :is='router.icon'></component>
          <span>{{ router.title }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header v-if="isDevelopment" style="background: #fff; padding: 0 16px">
        <menu-unfold-outlined
          v-if="collapsed"
          class="trigger"
          @click="() => (collapsed = !collapsed)"
        />
        <menu-fold-outlined v-else class="trigger" @click="() => (collapsed = !collapsed)" />
      </a-layout-header>
      <a-layout-content :style="mainStyle">
        <template v-if="show">
          <component :is='component'></component>
        </template>
      </a-layout-content>
      <a-layout-footer v-if="isDevelopment" style="text-align: center">
        Tool-library ©2023
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script lang="ts" setup>
import { FileTextFilled, CameraFilled, PictureFilled, CloudDownloadOutlined } from '@ant-design/icons-vue';
import { defineAsyncComponent, ref, markRaw, shallowRef, reactive, shallowReactive  } from 'vue';
import Clipboard from '@/views/Clipboard.vue';
import MediaDevices from '@/views/MediaDevices.vue';
import Canvas from '@/views/Canvas.vue';
import {
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons-vue';

type Component = ReturnType<typeof defineAsyncComponent>

const isDevelopment = ref(import.meta.env.VITE_NODE_ENV === 'development')
const selectedKeys = ref<string[]>(['Clipboard']);
const collapsed = ref<boolean>(false);

const routerList = shallowReactive([
  { title: 'Clipboard', component: Clipboard, icon: FileTextFilled },
  { title: 'MediaDevices', component: MediaDevices, icon: CameraFilled },
  { title: 'Canvas', component: Canvas, icon: PictureFilled },
])

const show = shallowRef<boolean>(false)
const component = shallowRef<Component>(null)

async function to(comp: Component) {
  component.value = isDevelopment.value ? comp : MediaDevices
  show.value = true
}

to(routerList[0].component)

const mainStyle = reactive({
  '--main-height': isDevelopment.value ? 'calc(100vh - 70px - 64px - 24px)' : '100vh',
  margin: isDevelopment.value ? '24px 16px 0' : '0',
  padding: '5px',
  background: '#2b2b2b' ,
  minHeight: 'var(--main-height)',
  borderRadius: '6px',
  color: '#fff',
})
</script>
<style>
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
