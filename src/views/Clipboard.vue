<template lang="">
  <div>
    <a-button @click="openClipboard" type="primary">打开剪切板</a-button>
    <!-- 在这里加个空格符号 -->
    &nbsp;&nbsp;
    <a-button v-select-file="selectFileOption" type="primary">复制png图片</a-button>
    &nbsp;&nbsp;
    <a-button @click="() => writeclipText('向剪切板内添加文本')" type="primary">复制文本</a-button>
    <div style="padding: 30px">
      <a-card title="剪切板" :bordered="false" style="width: 300px">
        <ul>
          <li v-for="(item, index) in clipboardList" :key="index">
            <p v-if="isText(item.type)">{{ item.value }}</p>
            <img v-else-if="isImage(item.type)" style="width: 100%;" :src="item.value" alt="">
          </li>
        </ul>
      </a-card>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { reactive } from 'vue';
import { fileToBlob } from '/@/utils/fileUtils';
import { 
  ClipboardItemTypes,
  ClipboardList,
  read,
  writeClipImg,
  writeclipText
} from '/@/utils/Clipboard/clipboard';

const clipboardList = reactive<ClipboardList>([])
const selectFileOption = {
  accept: ["image/png"],
  callback: handleBatchImport,
  max: 1024 * 1024 * 1024,
}

async function handleBatchImport(files: FileList, err: Error, inputFiles: FileList) {
  const file = files[0];
  const blob = await fileToBlob(file);
  writeClipImg(blob)
}

const isText = (type: string) => {
  return type === ClipboardItemTypes.TEXT;
}
const isImage = (type: string) => {
  return type === ClipboardItemTypes.IMAGE;
}
const openClipboard = async () => {
  clipboardList.splice(0)
  const list = await read();
  clipboardList.push(...list)
}

</script>
<style lang="">
  
</style>