<template lang="">
  <div class="rtc-chat" :class="{open: props.open}">
    <MessageList :message-list="messageList" />
    <div class="send-tool">
      <Icon class="tool" size="1.75em"><EmojiSmileSlight24Regular @click="openEmoji" /></Icon>
      <Icon class="tool" size="1.75em"><ImageOutline v-select-file="selectImageConfig" /></Icon>
      <Icon class="tool" size="1.75em"><DriveFileMoveRound v-select-file="selectFileConfig" /></Icon>
    </div>
    <file-list :file-list="fileMessageList" @remove="remove" @updateImage="updateImage"/>
    <div class="send">
      <Emoji v-model="open" @select="selectEmoji" />
      <input
        class="chat-input"
        v-model="inputValue"
        @keyup.enter="sendMessage"
        placeholder="请输入消息内容"
        :maxlength="maxlength"
        :disabled="loading"
      />
      <a-button type="primary" size="large" :loading="loading" @click="sendMessage">发送</a-button>
    </div>
    <div v-if="loading" class="loading">
      <LoadingOutlined />
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, inject, reactive, ref } from 'vue';
import { Icon } from '@vicons/utils'
import { ImageOutline } from "@vicons/ionicons5"
import { LoadingOutlined } from '@ant-design/icons-vue'
import { DriveFileMoveRound } from '@vicons/material'
import { EmojiSmileSlight24Regular } from '@vicons/fluent'
import { fileAndBlobToBase64, sliceFileAndBlobToBase64, sliceFileOrBlob } from '/@/utils/fileUtils';
import RTCClient from '/@/utils/WebRTC/rtc-client';
import { formatDate } from '/@/utils/formatDate';
import getFileTypeImage from '/@/utils/file-type-image';
import MessageList from '/@/components/chat/MessageList.vue';
import FileList, { Img } from '/@/components/FileList.vue';
import Emoji from '/@/components/chat/Emoji.vue';
import { Message } from '/@/utils/WebRTC/rtc-client';
import { useChatStore } from '@/store/modules/chat';
import useWebWorkerFn from '/@/hooks/useWebWorkerFn';

type FileInfo = Awaited<ReturnType<typeof getFileInfo>>
type MessageItem = {
  id: string;
  isSelf: boolean;
  username: string;
  HHmmss: string;
  type: 'file' | 'text';
  text?: string;
  fileInfo?: FileInfo;
}

const props = defineProps<{
  open: boolean;
}>()

const store = useChatStore()

const rtc = inject<RTCClient>('rtc')

rtc.on('message', async (message: MessageItem) =>{
  message.isSelf = false
  messageList.push(message)
  if (!props.open) {
    store.count++
  }
})

const inputValue = ref('')
let messageList = reactive<MessageItem[]>([])

const selectImageConfig = {
  multiple: true,
  accept: ["image/*"],
  callback: uploadFile,
  max: 1024 * 1024 * 10,
}

const selectFileConfig = {
  multiple: true,
  accept: ["*/*"],
  callback: uploadFile,
  max: 1024 * 1024 * 1024,
}
const maxlength = ref(100)
const fileMessageList = reactive<Img[]>([])

function remove(_, index: number) {
  fileMessageList.splice(index, 1);
}

function updateImage(img: Img, index: number) {
  fileMessageList[index].file = img.file
}

const loading = ref(false)
async function sendMessage() {
  if (inputValue.value.length > maxlength.value || loading.value) return
  loading.value = true
  sendTextMessage()
  await sendFileMessage()
  loading.value = false
}

function sendTextMessage() {
  if (!inputValue.value.trim().length) return
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
  }
  rtc.channelSendMesage(messageItem)
  messageList.push(messageItem)
  inputValue.value = ''
}

function sendFileMessage() {
  const promiseAll = []
  while(fileMessageList.length) {
    const fileItem = fileMessageList.shift()
    const { username } = rtc.userInfo
    const date = new Date
    const { HHmmss } = formatDate(date)
    promiseAll.push(
      getFileInfo(fileItem.file).then((fileInfo) => {
        const messageItem: MessageItem = {
          id: crypto.randomUUID(),
          isSelf: true,
          username,
          HHmmss,
          type: 'file',
          fileInfo
        }
        rtc.channelSendMesage(messageItem)
        messageList.push(messageItem)
        delete messageItem.fileInfo.chunks
      }).catch((error) => {
        console.error(error);
      })
    )
  }
  return Promise.all(promiseAll)
}

async function uploadFile(files: File[], err: Error, inputFiles: File[]) {
  err && console.error(err);
  files.forEach(async file => {
    fileMessageList.push({
      file,
      url: getFileTypeImage(file.name)
    })
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
  const url = getFileTypeImage(name)

  const { workerFn } = useWebWorkerFn(sliceFileAndBlobToBase64, {
    fnDependencies: {
      sliceFileOrBlob,
      fileAndBlobToBase64
    }
  })
  
  try {
    const chunks = await workerFn(file, 180 * 1024)
    return {
      name,
      size: formatSize,
      type,
      file,
      FQ: chunks.length,
      chunks,
      url
    }
  } catch (error) {
    return Promise.reject(error)
  }
}

const open = ref(false)
function openEmoji(e: Event) {
  e.stopPropagation()
  open.value = !open.value
}

function selectEmoji(emoji: string) {
  inputValue.value += emoji
}

function clearMessage() {
  messageList = reactive([])
  fileMessageList.splice(0)
}

defineExpose({
  clearMessage
})
</script>
<style lang="scss">
.rtc-chat {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 0px;
  height: calc(var(--main-height) - 2 * 5px);
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
    position: relative;
    display: flex;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    padding: 5px 10px 20px 10px;
    border-top: 2px;
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
  .loading {
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 3em;
    color: #fff;
  }
}
</style>