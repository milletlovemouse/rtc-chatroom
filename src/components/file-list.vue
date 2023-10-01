<template lang="">
  <div v-if="images.length" class="file-box">
    <ul class="file-list">
      <li v-for="img in images" :key="img.file.name" v-menu="getMenuList(img)">
        <img :src="img.url" :title="img.file.name" :alt="img.file.name">
      </li>
    </ul>
  </div>
</template>
<script lang="ts" setup>
import { DeleteFilled, EditFilled } from '@ant-design/icons-vue';
import { computed, reactive } from 'vue';
import { Merge } from '../utils/type';
import { useEditImage } from './edit/EditImage';
import { MenuItem, MenuList } from './menu/menu';
type Img = {
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
  const { img } = value;
  const index = images.value.findIndex(item => item.file === img.file);
  const close = useEditImage(img, (newImg) =>{
    emits('updateImage', newImg, index);
    close()
  });
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
  }
  .file-list {
    max-height: inherit;
    padding: 0 20px;
    overflow-y: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { 
      width: 0 !important;
    }
    li {
      display: inline-block;
      width: 50px;
      height: 50px;
      margin-right: 5px;
      margin-bottom: 5px;
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
</style>