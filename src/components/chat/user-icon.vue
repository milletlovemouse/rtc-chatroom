<template>
  <div
    class="user-icon"
    :style="{
      // border: `2px solid ${token.colorBorder}`,
      borderRadius: token.borderRadius,
      background: '#2b2b2b',
    }"
  >
    <UserOutlined v-bind="$attrs" style="font-size: 35em"/>
  </div>
</template>
<script lang="ts" setup>
import { theme } from 'ant-design-vue';
import { UserOutlined } from '@ant-design/icons-vue';
const { token } = theme.useToken();
</script>