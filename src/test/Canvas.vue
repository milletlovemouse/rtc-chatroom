<template lang="">
  <div class="canvas">
    <div class="upload">
      <a-button v-select-file="selectFileOption" type="primary">上传图片</a-button>
      &nbsp;
      <a-button type="primary" @click="toggle">切换滚动条</a-button>
      <scrollbar :type="types[0]">
        <li
          v-for="img in images"
          :key="img.file.name"
          v-menu="menuList.map(menu => ({...menu, img}))"
        >
          <img :src="img.url" :alt="img.file.name">
        </li>
      </scrollbar>
      <scrollbar :type="types[1]">
        <li
          v-for="img in images"
          :key="img.file.name"
          v-menu="menuList.map(menu => ({...menu, img}))"
        >
          <img :src="img.url" :alt="img.file.name">
        </li>
      </scrollbar>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { reactive, nextTick} from 'vue';
import { MenuList, MenuItem } from '@/components/menu/menu';
import { useEditImage } from '@/components/edit/EditImage';
import scrollbar from '@/components/scrollbar.vue';
import { DownloadOutlined, EditFilled, DeleteFilled } from '@ant-design/icons-vue';
import { saveFileByUrl } from '@/utils/fileUtils';
import { Merge } from '../utils/type';
type Img = {
  file: File,
  url: string
}
const menuList = reactive<MenuList>([
  {
    name: '编辑图片',
    icon: EditFilled,
    methods: edit
  },
  {
    name: '下载',
    icon: DownloadOutlined,
    methods: download
  },
  {
    name: '删除',
    icon: DeleteFilled,
    methods: remove
  },
])

const images = reactive<Img[]>([])
const selectFileOption = {
  accept: ["image/*"],
  callback: uploadImage,
  max: 1024 * 1024 * 1024,
  multiple: true
}

type Menu = Merge<MenuItem, {img: Img}>;
function edit(value: Menu) {
  const { img } = value;
  useEditImage(img, {
    save: updateImage
  });
}

function updateImage(newImg: Img, oldImg: Img) {
  const index = images.findIndex(item => item === oldImg);
  images[index].file = newImg.file;
  images[index].url = newImg.url;
}

function download(value: Menu) {
  const { url, file } = value.img;
  saveFileByUrl(url, file.name)
}

function remove(value: Menu) {
  const { img } = value;
  const index = images.findIndex(item => item === img);
  images.splice(index, 1);
}

function uploadImage(files: FileList, err: Error, inputFiles: FileList) {
  err && console.error(err);
  images.push(...Array.from(files).map(file => ({
    file,
    url: URL.createObjectURL(file)
  })))
}

const types = reactive<string[]>(['x', 'y'])
const toggle = () => {
  const temp = types[0]
  types[0] = types[1]
  types[1] = temp
}
</script>
<style lang="scss" scoped>
  .canvas {
    $padding: 5px;
    $height: calc(var(--main-height) - 2 * $padding);
    height: $height;
    padding: $padding;
    .upload {
      button {
        margin-bottom: 5px;
      }
      .scroll-container-x {
        margin-bottom: 10px;
        li {
          display: inline-block;
          width: 100px;
          height: 100px;
          margin-right: 5px;
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }
      }
      .scroll-container-y {
        margin-bottom: 10px;
        height: max(calc($height - 500px), 0px);
        width: min(100%, 200px);
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }
  }
</style>