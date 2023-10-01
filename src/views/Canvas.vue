<template lang="">
  <div class="canvas">
    <div class="upload">
      <a-button v-select-file="selectFileOption" type="primary">上传图片</a-button>
      <ul class="image-list">
        <li v-for="img in images" :key="img.file.name" v-menu="menuList.map(menu => ({...menu, img}))">
          <img :src="img.url" :alt="img.file.name">
        </li>
      </ul>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { reactive, nextTick} from 'vue';
import { MenuList, MenuItem } from '@/components/menu/menu';
import { useEditImage } from '@/components/edit/EditImage';
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
  useEditImage(img, (newImg) =>{
    img.url = newImg.url;
    img.file = newImg.file;
  });
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

</script>
<style lang="scss">
  .canvas {
    $padding: 5px;
    height: calc(var(--main-height) - 2 * $padding);
    padding: $padding;
    .upload {
      button {
        margin-bottom: 5px;
      }
      .image-list {
        display: flex;
        flex-wrap: wrap;
        li {
          width: 100px;
          height: 100px;
          margin-right: 5px;
          margin-bottom: 5px;
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }
      }
    }
  }
</style>