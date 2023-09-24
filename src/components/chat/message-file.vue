<template lang="">
  <div class="message-file">
    <div class="video-box" v-if="isVideo">
      <video 
        controls
        :title="props.fileInfo.name"
        :src="srcObject"
      ></video>
    </div>
    <div class="img-box" v-else>
      <img 
        :title="props.fileInfo.name"
        :src="srcObject"
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

const srcObject = computed(() => {
  if(!isVideo.value && !isImage.value) {
    return props.fileInfo.url
  }
  return URL.createObjectURL(props.fileInfo.file)
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