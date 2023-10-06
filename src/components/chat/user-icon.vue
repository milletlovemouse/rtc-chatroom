<template>
  <div
    class="user-icon"
    :style="{
      border: `2px solid #444`,
      borderRadius: token.borderRadius,
      background: '#2b2b2b',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      fontSize: '35em',
      color: '#111',
    }"
  >
    <UserOutlined />
  </div>
</template>
<script lang="ts" setup>
import { theme } from 'ant-design-vue';
import { UserOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';
const { token } = theme.useToken();
</script>