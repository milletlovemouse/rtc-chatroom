<script setup lang="ts">
import Layout from '/@/components/Layout.vue'
import { ref } from 'vue';
import { theme } from 'ant-design-vue';

const defaultData = {
  borderRadius: '4px',
  colorPrimary: '#444444',
  borderColor: '#444',
};
const data = ref(defaultData);
const { token } = theme.useToken();
</script>

<template>
  <a-config-provider :theme="{ token: { ...defaultData } }">
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
