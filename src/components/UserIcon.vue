<template>
  <div class="user-icon">
    <UserOutlined />
  </div>
</template>
<script lang="ts" setup>
import { UserOutlined } from '@ant-design/icons-vue';

</script>
<style lang="scss">
.user-icon {
  border: 2px solid #444;
  border-radius: 4px;
  background: #2b2b2b;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  font-size: 35em;
  color: #111;
  overflow: hidden;
  aspect-ratio: 1/0.75;
  .anticon, .anticon svg {
    width: inherit;
    height: inherit;
  }
}
</style>