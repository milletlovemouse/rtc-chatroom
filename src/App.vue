<script setup lang="ts">
import Layout from '/@/components/Layout.vue'
import { ref } from 'vue';
import { theme } from 'ant-design-vue';

const defaultData = {
  borderRadius: 4,
  colorPrimary: '#000',
  borderColor: '#000',
};
const data = ref(defaultData);
const { token } = theme.useToken();
</script>

<template>
  <a-config-provider :theme="{ token: { colorPrimary: data.colorPrimary, borderRadius: `${data.borderRadius}px` } }">
    <a-app>
      <Layout />
    </a-app>
  </a-config-provider>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
