<template>
  <div
    class="user-icon"
    :style="{
      // border: `2px solid ${token.colorBorder}`,
      borderRadius: token.borderRadius,
      background: '#2b2b2b',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
    }"
  >
    <UserOutlined v-bind="$attrs" style="font-size: 35em"/>
  </div>
</template>
<script lang="ts" setup>
import { theme } from 'ant-design-vue';
import { UserOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';
const { token } = theme.useToken();
</script>