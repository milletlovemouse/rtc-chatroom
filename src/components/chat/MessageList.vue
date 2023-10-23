<template lang="">
  <scroll-bar ref="scrollbar" @scroll="scroll" class="message-list">
    <div v-for="message in props.messageList" :key="message.id" :class="{'message-item': true, self: message.isSelf}">
      <a-avatar class="message-avatar" :size="50">{{ message.username[0] }}</a-avatar>
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
  </scroll-bar>
  <div class="buts">
    <a-button
      v-show="showTopButton"
      class="to-bottom"
      @click="toBottom"
      type="primary"
      shape="circle"
      :icon="h(Icon, {class: 'anticon'}, () => h(DownToBottom))"
    />
  </div>
</template>
<script lang="ts" setup>
import { ref, watch, nextTick, computed, h } from 'vue';
import MessageFile from '/@/components/chat/MessageFile.vue'
import ScrollBar, { ScrollEvent } from '@/components/scrollbar.vue';
import { Icon } from '@vicons/utils'
import { DownToBottom } from '@vicons/carbon';
const props = defineProps<{
  messageList: []
}>()

const showTop = ref(false)
const showTopButton = computed(() => showTop.value)
const scrollbar = ref(null)

watch(() => props.messageList.length, () => {
  toBottom()
})

function toBottom() {
  scrollbar.value.scrollToBottom()
}

function scroll(e: ScrollEvent) {
  const { scrollTop, scrollHeight, height } = e
  showTop.value = scrollTop + 100 < scrollHeight - height
}
</script>
<style lang="scss">
.message-list {
  height: var(--main-height);
  $padding: 20px;
  &.scroll-container {
    padding: 10px $padding 0;
    .scroll-bar {
      .scroll-bar-inner {
        background: #444;
      }
    }
  }
  $openWidth: 500px;
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
      color: #000;
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
        float: left;
        max-width: calc($openWidth - ($width + $gap + $padding) * 2 - 5px);
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
.buts {
  height: 0;
  position: relative;
  .to-bottom {
    position: absolute;
    right: 10px;
    bottom: 10px;
  }
}
</style>