<template>
  <div
    class="user-icon"
    :style="{
      border: `2px solid #444`,
      borderRadius: token.borderRadius + 'px',
      background: '#2b2b2b',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      fontSize: '35em',
      color: '#111',
      overflow: 'hidden',
    }"
  >
    <UserOutlined />
  </div>
</template>
<script lang="ts" setup>
import { theme } from 'ant-design-vue';
import { UserOutlined } from '@ant-design/icons-vue';

const { token } = theme.useToken();
</script>
<style>
.user-icon {
  .anticon, .anticon svg {
    width: inherit;
    height: inherit;
  }
}
</style>