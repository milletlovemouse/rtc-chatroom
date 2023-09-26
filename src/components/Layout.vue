<template>
  <a-layout>
    <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible>
      <div class="logo" />
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline">
        <a-menu-item v-for="router in routerList" :key="router.title" @click="to(router.component)">
          <component :is='router.icon'></component>
          <span>{{ router.title }}</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-header style="background: #fff; padding: 0 16px">
        <menu-unfold-outlined
          v-if="collapsed"
          class="trigger"
          @click="() => (collapsed = !collapsed)"
        />
        <menu-fold-outlined v-else class="trigger" @click="() => (collapsed = !collapsed)" />
      </a-layout-header>
      <a-layout-content
        style="--main-height: calc(100vh - 70px - 64px - 24px);"
        :style="{ 
          margin: '24px 16px 0',
          padding: '5px',
          background: '#2b2b2b' ,
          minHeight: 'var(--main-height)',
          borderRadius: '10px'
        }"
      >
        <template v-if="show">
          <component :is='component'></component>
        </template>
      </a-layout-content>
      <a-layout-footer style="text-align: center">
        Ant Design ©2018 Created by Ant UED
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script lang="ts" setup>
import { FileTextFilled, CameraFilled } from '@ant-design/icons-vue';
import { defineAsyncComponent, ref, markRaw, shallowRef, AsyncComponentLoader  } from 'vue';
import Clipboard from '@/views/Clipboard.vue';
import MediaDevices from '@/views/MediaDevices.vue';
import {
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons-vue';
const selectedKeys = ref<string[]>(['Clipboard']);
const collapsed = ref<boolean>(false);

const routerList = ref([
  { title: 'Clipboard', component: Clipboard, icon: FileTextFilled },
  { title: 'MediaDevices', component: MediaDevices, icon: CameraFilled },
])

const show = ref<boolean>(false)
const component = shallowRef(null)
async function to(comp: typeof routerList.value[0]['component']) {
  component.value = defineAsyncComponent({
    loader: async () => comp
  });
  show.value = true
  // console.log(component.value);
}

to(routerList.value[0].component)
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
