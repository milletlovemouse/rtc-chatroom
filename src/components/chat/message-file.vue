<template lang="">
  <div class="message-file">
    <div class="video-box" v-if="isVideo">
      <video
        v-menu="otherMenuList.map(menu => ({...menu, file: props.fileInfo.file}))"
        controls
        :title="props.fileInfo.name"
        :src="srcObject"
      ></video>
    </div>
    <div class="img-box" v-else>
      <img
        v-if="isImage"
        v-menu="imageMenuList.map(menu => ({...menu, file: props.fileInfo.file}))"
        v-preview="{url: srcObject, name: props.fileInfo.name}"
        :title="props.fileInfo.name"
        :src="srcObject"
        :alt="props.fileInfo.name"
        style="cursor: zoom-in"
      />
      <img
        v-else
        v-menu="otherMenuList.map(menu => ({...menu, file: props.fileInfo.file}))"
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
import { MenuList, MenuItem } from '@/components/menu/menu';
import { DownloadOutlined, CopyFilled } from '@ant-design/icons-vue';
import { computed, reactive } from 'vue';
import { writeClipImg } from '/@/utils/Clipboard/clipboard';
import { fileToBlob, saveFile } from '/@/utils/fileUtils';
import { Merge } from '/@/utils/type';

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

const imageMenuList = reactive<MenuList>([
  {
    name: '复制图片',
    icon: CopyFilled,
    methods: copy
  },
  {
    name: '下载',
    icon: DownloadOutlined,
    methods: download
  }
])

const otherMenuList = reactive<MenuList>([imageMenuList[1]])

type Menu = Merge<MenuItem, {file: File}>;
async function copy(data: Menu) {
  const blob = await fileToBlob(data.file, 'image/png')
  writeClipImg(blob)
}

function download(data: Menu) {
  saveFile(data.file)
}
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
  }
}
</style>