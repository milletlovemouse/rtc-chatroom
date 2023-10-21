<template lang="">
  <div v-if="images.length" class="file-box">
    <scrollbar class="file-list" type="x">
      <li
        v-for="img in images"
        :key="img.file.name"
        v-menu="getMenuList(img)"
      >
        <img
          v-if="isImage(img.file)"
          v-edit-image="{img, handler: updateImage}"
          :src="img.url"
          :title="img.file.name"
          :alt="img.file.name"
          style="cursor: zoom-in"
        >
        <img
          v-else
          :src="img.url"
          :title="img.file.name"
          :alt="img.file.name"
        >
      </li>
    </scrollbar>
  </div>
</template>
<script lang="ts" setup>
import { DeleteFilled, EditFilled } from '@ant-design/icons-vue';
import { computed, reactive } from 'vue';
import { Merge } from '../utils/type';
import { useEditImage } from './edit/EditImage';
import { MenuItem, MenuList } from './menu/menu';
import scrollbar from '@/components/scrollbar.vue';
export type Img = {
  file: File,
  url: string
}

const props = defineProps<{
  fileList: Array<Img>
}>()
const emits = defineEmits<{
  remove: [value: Img, index: number],
  updateImage: [value: Img, index: number]
}>()
const isImage = (file: File) => file.type.match('image')
const images = computed(() => props.fileList.map(fileItem => ({
  file: fileItem.file,
  url: isImage(fileItem.file) ? URL.createObjectURL(fileItem.file) : fileItem.url
})))

const menuList = reactive<MenuList>([
  {
    name: '编辑图片',
    icon: EditFilled,
    methods: edit
  },
  {
    name: '删除',
    icon: DeleteFilled,
    methods: remove
  },
])

function getMenuList(img: Img) {
  if (isImage(img.file)) {
    return menuList.map(menu => ({...menu, img}))
  }
  return [{...menuList[1], img}]
}

type Menu = Merge<MenuItem, {img: Img}>;
function edit(value: Menu) {
  useEditImage(value.img, (newImg, oldImg) =>{
    updateImage(newImg, oldImg)
  });
}

function updateImage(newImg: Img, oldImg: Img) {
  const index = images.value.findIndex(item => item.file === oldImg.file);
  emits('updateImage', newImg, index);
}

function remove(value: Menu) {
  const { img } = value;
  const index = images.value.findIndex(item => item.file === img.file);
  emits('remove', img, index);
}
</script>
<style lang="scss">
  .file-box {
    position: relative;
    width: 100%;
    max-height: 70px;
    margin-top: 5px;
    padding: 0 20px;
    .file-list {
      .scroll-bar {
        .scroll-bar-inner {
          background: #444;
        }
      }
    }
    li {
      display: inline-block;
      width: 50px;
      height: 50px;
      margin-right: 5px;
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
  
</style>