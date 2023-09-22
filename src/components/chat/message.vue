<template lang="">
  <div ref="scrollbar" class="message-list">
    <div v-for="message in props.messageList" :key="message.id" :class="{'message-item': true, self: message.isSelf}">
      <div class="message-avatar">
        <img :src="message.avatar"/>
      </div>
      <div class="message-main">
        <div class="message-username">{{ message.username }}</div>
        <div class="message-content">
          <template v-if="message.type === 'text'">
            {{ message.text }}
          </template>
          <template v-else-if="message.type === 'file'">
            <MessageFile :file-info="message.fileInfo" />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue';
import MessageFile from '/@/components/chat/message-file.vue'
const props = defineProps<{
  messageList: []
}>()

const scrollbar = ref(null)

watch(() => props.messageList.length, async () =>{
  await nextTick()
  scrollbar.value.scrollTop = scrollbar.value.scrollHeight
})
</script>
<style lang="scss">
.message-list {
  height: calc(var(--main-height) - 110px);
  $padding: 20px;
  padding: 10px $padding 0;
  overflow-y: auto;
  scrollbar-width: none;
  $openWidth: 500px;
  &::-webkit-scrollbar { 
    width: 0 !important;
  }
  .message-item {
    $gap: 10px;
    $width: 50px;
    width: calc($openWidth - $padding * 2 - 5px);
    margin-bottom: 10px;
    &.self {
      .message-avatar {
        float: right;
      }
      .message-main {
        float: left;
        .message-content {
          float: right;
        }
      }
      .message-main {
        .message-username {
          text-align: right;
        }
      }
    }
    .message-avatar {
      float: left;
      width: $width;
      height: 50px;
      border-radius: 50%;
      background-color: #fff;
      img {
        object-fit: cover;
      }
    }
    .message-main {
      float: right;
      width: calc($openWidth - $width - $gap - $padding * 2 - 5px);
      overflow: hidden;
      .message-username {
        color: #777;
        font-size: 1.1em;
        letter-spacing: 0.05em;
      }
      .message-content {
        width: calc($openWidth - ($width + $gap + $padding) * 2 - 5px);
        padding: 10px;
        background: #444;
        border-radius: 8px;
        font-size: 1.25em;
        color: #999;
        white-space: wrap;
        word-break: break-all;
        word-wrap: break-word;
      }
    }
    &::after {
      content: "";
      clear: both;
      display: block;
    }
  }
}
</style>