<template lang="">
  <div class="message-file">
    <div class="video-box" v-if="isVideo">
      <video 
        controls
        :title="props.fileInfo.name"
        :srcObject="props.fileInfo.file"
      ></video>
    </div>
    <div class="img-box" v-else>
      <img 
        :title="props.fileInfo.name"
        :src="props.fileInfo.url"
        :alt="props.fileInfo.name"
      />
      <div>
        <span v-if="!isImage" >{{ props.fileInfo.size }}</span>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
  fileInfo: Record<string, any>
}>()
const isVideo = computed(() => {
  return props.fileInfo.type.match('video')
})

const isImage = computed(() => {
  return props.fileInfo.type.match('image')
})
</script>

<style lang="scss">
.message-file {
  .video-box {
    video {
      width: 100%;
    }
  }
  .img-box {
    display: flex;
    flex-direction: column;
    img {
      width: 100%;
    }
    span {
    }
  }
}
</style>