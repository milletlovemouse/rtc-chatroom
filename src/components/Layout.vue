<template>
  <a-layout>
    <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible>
      <div class="logo" />
      <a-menu v-model:selectedKeys="selectedKeys" theme="dark" mode="inline">
        <a-menu-item v-for="router in routerList" :key="router.path" @click="to(router.path)">
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
        :style="{ margin: '24px 16px 0', padding: '24px', background: '#fff', minHeight: 'calc(100vh - 70px - 64px - 24px)' }"
      >
        <div v-if="show">
          <component :is='component'></component>
        </div>
      </a-layout-content>
      <a-layout-footer style="text-align: center">
        Ant Design ©2018 Created by Ant UED
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script lang="ts" setup>
import { FileTextFilled, CameraFilled } from '@ant-design/icons-vue';
import { defineAsyncComponent, ref, markRaw, shallowRef  } from 'vue';
import {
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons-vue';
const selectedKeys = ref<string[]>(['/@/views/Clipboard.vue']);
const collapsed = ref<boolean>(false);

const routerList = ref<any[]>([
  { title: 'Clipboard', path: '/@/views/Clipboard.vue', icon: FileTextFilled },
  { title: 'MediaDevices', path: '/@/views/MediaDevices.vue', icon: CameraFilled },
])

const show = ref<boolean>(false)
const component = shallowRef(null)
async function to(url: string) {
  component.value = defineAsyncComponent(() =>import(url));
  show.value = true
  // console.log(component.value);
}

to('/@/views/Clipboard.vue')
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
