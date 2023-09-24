<template lang="">
  <div class="rtc-chat" :class="{open: props.open}">
    <MessageList :message-list="messageList" />
    <div class="send-tool">
      <Icon class="tool" size="1.75em"><ImageOutline v-select-file="selectImageConfig" /></Icon>
      <Icon class="tool" size="1.75em"><DriveFileMoveRound v-select-file="selectFileConfig" /></Icon>
    </div>
    <div class="send">
      <input
        class="chat-input"
        v-model="inputValue"
        @keyup.enter="sendMessage"
        placeholder="请输入消息内容"
      />
      <a-button type="primary" size="large" @click="sendMessage">Send</a-button>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { inject, reactive, ref } from 'vue';
import { Icon } from '@vicons/utils'
import { ImageOutline } from "@vicons/ionicons5"
import { DriveFileMoveRound } from '@vicons/material'
import { base64ToFile, fileAndBlobToBase64, fileToBlob, saveFile, sliceFileAndBlobToArrayBuffer, sliceFileAndBlobToBase64, sliceFileOrBlob } from '/@/utils/fileUtils';
import RTCClient from '/@/utils/WebRTC/rtc-client';
import { formatDate } from '/@/utils/formatDate';
import getFileTypeImage from '/@/utils/file-type-image';
import MessageList from '/@/components/chat/message.vue';
import { Message } from '/@/utils/WebRTC/rtc-client';

type MessageItem = {
  id: string;
  isSelf: boolean;
  username: string;
  HHmmss: string;
  type: 'file' | 'text';
  text?: string;
  fileInfo?: Awaited<ReturnType<typeof getFileInfo>>;
  avatar: ReturnType<typeof createAvatar>;
}

const props = defineProps<{
  open: boolean;
}>()

const rtc = inject<RTCClient>('rtc')

rtc.on('message', async (message: MessageItem) =>{
  message.isSelf = false
  messageList.push(message)
  console.log(message);
})

const inputValue = ref('')
let messageList = reactive<MessageItem[]>([])

const selectImageConfig = {
  multiple: true,
  accept: ["image/*"],
  callback: sendFileMessage,
  max: 1024 * 1024 * 10,
}

const selectFileConfig = {
  multiple: true,
  accept: ["*/*"],
  callback: sendFileMessage,
  max: 1024 * 1024 * 1024,
}

function sendMessage() {
  const { username } = rtc.userInfo
  const date = new Date
  const { HHmmss } = formatDate(date)
  const messageItem: MessageItem = {
    username,
    type: 'text',
    id: crypto.randomUUID(),
    isSelf: true,
    HHmmss,
    text: inputValue.value,
    avatar: createAvatar(username[0])
  }
  rtc.channelSendMesage(messageItem)
  messageList.push(messageItem)
  inputValue.value = ''
}

async function sendFileMessage(files: File[], err: Error, inputFiles: File[]) {
  err && console.error(err);
  const { username } = rtc.userInfo
  const date = new Date
  const { HHmmss } = formatDate(date)
  files.forEach(async file => {
    const messageItem: MessageItem = {
      id: crypto.randomUUID(),
      isSelf: true,
      username,
      HHmmss,
      type: 'file',
      fileInfo: await getFileInfo(file),
      avatar: createAvatar(username[0])
    }
    console.log(messageItem);
    messageList.push(messageItem)
    rtc.channelSendMesage(messageItem)
    delete messageItem.fileInfo.chunks
  })
}

async function getFileInfo(file: File) {
  const { name, size, type } = file
  const kb = 1024
  const mb = 1024 * kb
  const gb = 1024 * mb
  const formatSize = size < (gb / 2)
    ? size < mb
      ? (size / kb).toFixed(2) + 'KB' 
      : (size / mb).toFixed(2) + 'MB'
    : (size / gb).toFixed(2) + 'GB';
  let url = getFileTypeImage(name)
  let chunks = await sliceFileAndBlobToBase64(file, 180 * 1024)
  return {
    name,
    size: formatSize,
    type,
    file,
    FQ: chunks.length,
    chunks,
    url
  }
}

function createAvatar(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 50;
  canvas.height = 50;
  const cans = canvas.getContext("2d");
  cans.font = "2em Microsoft JhengHei"; //字体
  cans.fillStyle = "#333"; //字体填充颜色
  cans.textAlign = "left"; //对齐方式
  cans.textBaseline = "middle"
  cans.fillText(text, canvas.width / 3, canvas.height / 2); //被填充的文本
  return canvas.toDataURL("image/png")
}

function clearMessage() {
  messageList = reactive([])
}

defineExpose({
  clearMessage
})
</script>
<style lang="scss">
.rtc-chat {
  position: relative;
  width: 0px;
  height: inherit;
  border: none;
  border-radius: 8px;
  overflow: hidden;
  float: right;
  transition: all 0.5s;
  $openWidth: 500px;
  &.open {
    width: $openWidth;
    border: 2px solid #444;
  }

  .send-tool {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 20px 0;
    color: #444;
    .tool {
      cursor: pointer;
    }
  }
  .send {
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    padding: 5px 10px 20px 10px;
    border-top: 2px ;
    bottom: 10px;
    .chat-input {
      width: 80%;
      padding: 5px 10px;
      outline: none;
      border: 1px solid #444;
      border-radius: 4px;
      background: transparent;
      font-size: 1.15em;
      letter-spacing: 0.005em;
      color: #fff;
      caret-color: #fff;
    }
  }
}
</style>