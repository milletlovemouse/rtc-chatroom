<template lang="">
  <div class="rtc">
    <a-space>
      <a-select
        v-model:value="audioInfo.deviceId"
        style="width: 120px"
        :options="audioMediaStreamTrackList"
        @change="audioChange"
        :field-names="fieldNames"
        :disabled="audioDisabled"
      >
        <template #suffixIcon><AudioFilled /></template>
      </a-select>
      &nbsp;
      <a-button @click="audioDisabledToggle" shape="circle" :icon="h((audioDisabled ? AudioMutedOutlined: AudioOutlined))" />
      <a-select
        v-model:value="cameraInfo.deviceId"
        style="width: 120px"
        :options="cameraMediaStreamTrackList"
        @change="cameraChange"
        :field-names="fieldNames"
        :disabled="cameraDisabled"
      >
        <template #suffixIcon><Icon><Video48Filled /></Icon></template>
      </a-select>
      &nbsp;
      <a-button @click="cameraDisabledToggle"  shape="circle" :icon="h(Icon, {class: 'anticon'}, () => h(cameraDisabled ? VideoOff48Regular : Video48Regular))" />
    </a-space>
    &nbsp;
    <a-button @click="shareDisplayMedia" type="primary"  :icon="h(Icon, {class: 'anticon'}, () => h(displayStream ? DeviceDesktopOff : DeviceDesktop))" >{{ displayStream ? '取消共享' : '共享屏幕' }}</a-button>
    &nbsp;
    <a-button @click="exit" type="primary">退出房间</a-button>
    <a-card title="Video" :bordered="false">
      <video v-show="video" ref="video"></video>
      <video v-show="displayStream" ref="displayVideo"></video>
      <video v-for="webrtcItem in webrtcList" :key="webrtcItem.id" ref="videoList"></video>
    </a-card>
  </div>
</template>
<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref, shallowRef, watchEffect, watch, h, onUnmounted, computed, Ref, shallowReactive, onBeforeUnmount } from 'vue';
import { AudioFilled, CameraFilled, AudioOutlined, AudioMutedOutlined } from '@ant-design/icons-vue';
import { Icon } from '@vicons/utils'
import { Video48Regular, VideoOff48Regular, Video48Filled } from '@vicons/fluent';
import { DeviceDesktop, DeviceDesktopOff } from '@vicons/tabler'
import MediaDevices, { DeviceInfo } from '/@/utils/MediaDevices/mediaDevices';
import RTCClient, { ConnectorInfoMap, ConnectorInfo } from '/@/utils/WebRTC/rtc-client';
import { onError } from '../utils/WebRTC/message';

type Options = Array<DeviceInfo>
const fieldNames = { value: 'deviceId' }
// 媒体元素
const video = ref<HTMLVideoElement>(null)
const displayVideo = ref<HTMLVideoElement>(null)
// 媒体流列表
const audioMediaStreamTrackList = ref<Options>([])
const cameraMediaStreamTrackList = ref<Options>([])
// 禁用媒体设备
const audioDisabled = ref(false)
const cameraDisabled = ref(false)

const audioInfo = reactive<MediaTrackConstraints>({
  deviceId: ''
})
const cameraInfo = reactive<MediaTrackConstraints>({
  deviceId: ''
})

const host = 'ws://' + window.location.hostname;
const port = 3000

let rtc = new RTCClient({
  configuration: {
    iceServers: [
      {
        urls: `turn:stun.l.google.com:19302`,
        username: "webrtc",
        credential: "turnserver",
      },
    ],
  },
  constraints: {
    audio: audioDisabled.value ? false : audioInfo,
    video: cameraDisabled.value ? false : cameraInfo
  },
  socketConfig: {
    host,
    port,
  }
})

// 麦克风设备切换禁用状态
const audioDisabledToggle = () => {
  audioDisabled.value = !audioDisabled.value
  if (audioDisabled.value) {
    rtc.disableAudio()
  } else {
    rtc.enableAudio()
  }
}
// 摄像头设备切换禁用状态
const cameraDisabledToggle = () => {
  cameraDisabled.value = !cameraDisabled.value
  if (cameraDisabled.value) {
    rtc.disableVideo()
  } else {
    rtc.enableVideo()
  }
}


const webrtcList = ref<Pick<ConnectorInfo, "streamType" | "connectorId" | "remoteStream">[]>(null)
const videoList = ref<HTMLVideoElement[]>(null)

rtc.on('connectorInfoListChange', (data) => {
  console.log('onConnectorInfoListChange', data);
  data.forEach(item => console.log('forEach', item.remoteStream))
  webrtcList.value = data
})

rtc.on('displayStreamChange', (stream) => {
  if (!stream) {
    displayVideo.value.pause()
    displayVideo.value.srcObject = displayStream.value = null
  } else {
    displayStream.value = stream
    displayVideo.value.srcObject = displayStream.value
    // displayVideo.value.muted = true
    displayVideo.value.play()
  }
})

rtc.on('localStreamChange', (stream) => {
  if (!stream) {
    video.value.pause()
    video.value.srcObject = displayStream.value = null
  } else {
    localStream.value = stream
    video.value.srcObject = localStream.value
    // video.value.muted = true
    video.value.play()
  }
})

watch(webrtcList, async () => {
  await nextTick()
  webrtcList.value.forEach((webrtcItem, index) => {
    const video = videoList.value[index]
    const { remoteStream, streamType } = webrtcItem
    if (remoteStream && remoteStream !== video.srcObject) {
      video.srcObject = remoteStream
      // console.log(remoteStream);
      video.play()
    }
  })
}, { deep: true })

// 麦克风设备切换处理事件
const audioChange = (deviceId: string) => {
  audioInfo.deviceId = deviceId
  rtc.replaceAudioTrack(deviceId)
  console.log(deviceId);
}

// 摄像头设备切换处理事件
const cameraChange = (deviceId: string) => {
  cameraInfo.deviceId = deviceId
  rtc.replaceVideoTrack(deviceId)
  console.log(deviceId);
}

type DeviceInfoList = Record<string, Options>

const enumerateDevices = async (): Promise<DeviceInfoList> => {
  const deviceInfoList = await MediaDevices.enumerateDevices()
  const map = new Map<string, DeviceInfo[]>()
  deviceInfoList.forEach((deviceInfo: DeviceInfo) => {
    const list = map.get(deviceInfo.kind) || []
    list.push(deviceInfo)
    map.set(deviceInfo.kind, list)
  })
  const deviceInfo = {} as DeviceInfoList
  ;[...map.keys()].forEach(kind => {
    deviceInfo[kind] = map.get(kind).map(info => info)
  })
  return deviceInfo
}

const device = rtc.mediaDevices
async function init() {
  try {
    showLocalStream()
    const { audioinput, videoinput } = await enumerateDevices()
    audioMediaStreamTrackList.value = audioinput
    cameraMediaStreamTrackList.value = videoinput
    for (const track of await device.getUserMediaStreamTracks()) {
      if (track.kind === 'audio'){
        audioInfo.deviceId = audioMediaStreamTrackList.value.find(input => input.label === track.label).deviceId
      }else if (track.kind === 'video'){
        cameraInfo.deviceId = cameraMediaStreamTrackList.value.find(input => input.label === track.label).deviceId
      }
    }
  } catch (error) {
    const message = 'USER_' + error.message.toUpperCase()
    onError(message)
    console.log(message);
  }
}

// 开启屏幕共享
let displayStream = ref<MediaStream>()
async function shareDisplayMedia() {
  if (displayStream.value) {
    rtc.cancelShareDisplayMedia()
    return
  }
  rtc.shareDisplayMedia()
}

// 显示本地流
let localStream = ref<MediaStream>()
async function showLocalStream() {
  try {
    localStream.value = await rtc.getLocalStream()
    video.value.srcObject = localStream.value
    // video.value.muted = true
    video.value.play()
  } catch (error) {
    console.log(error);
  }
}

// 退出房间
function exit() {
  if(!rtc) return
  rtc.close()
  rtc = null
  video.value.pause()
  displayVideo.value.pause()
  localStream = displayStream = video.value.srcObject = displayVideo.value.srcObject = null
}

onBeforeUnmount(() => {
  exit()
})

init()
</script>
<style lang="scss" scoped>
.rtc ::v-deep .ant-card-body {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  overflow-x: auto;
  video {
    width: 100%;
  }
}
</style>