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
    <a-button @click="shareDisplayMedia" type="primary">共享屏幕</a-button>
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
// 切换禁用状态
const audioDisabledToggle = () => {
  audioDisabled.value = !audioDisabled.value
}
const cameraDisabledToggle = () => {
  cameraDisabled.value = !cameraDisabled.value
}

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


const webrtcList = ref<ConnectorInfo[]>(null)
const videoList = ref<HTMLVideoElement[]>(null)

rtc.on('connectorInfoListChange', (data: ConnectorInfo[]) => {
  console.log('onConnectorInfoListChange', data);
  data.forEach(item => console.log('forEach', item.remoteStream))
  webrtcList.value = data
})

watch(webrtcList, async () => {
  await nextTick()
  webrtcList.value.forEach((webrtcItem, index) => {
    const video = videoList.value[index]
    const { remoteStream, streaTtype } = webrtcItem
    if (remoteStream && remoteStream !== video.srcObject) {
      video.srcObject = remoteStream
      // console.log(remoteStream);
      video.play()
    }
  })
}, { deep: true })

const audioChange = (deviceId: ConstrainDOMString) => {
  audioInfo.deviceId = deviceId
  console.log(deviceId);
}

const cameraChange = (deviceId: ConstrainDOMString) => {
  cameraInfo.deviceId = deviceId
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
    // shareDisplayMedia()
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
let displayStream = ref<MediaStream>()
async function shareDisplayMedia() {
  displayStream.value = await rtc.shareDisplayMedia()
  displayVideo.value.srcObject = displayStream.value
  displayVideo.value.muted = true
  displayVideo.value.play()
}

let localStream = ref<MediaStream>()
async function showLocalStream() {
  localStream.value = await rtc.getLocalStream()
  video.value.srcObject = localStream.value
  video.value.muted = true
  video.value.play()
  rtc.mediaDevices.startDisplayMediaStreamTrack()
}

function exit() {
  if(!rtc) return
  rtc.close()
  rtc = null
  localStream = null
  video.value.pause()
  video.value.srcObject = null
}

// watch(
//   cameraDisabled,
//   (value) => {
//     if (value) {
//       rtc.hideLocalStream(video.value)
//     } else {
//       rtc.showLocalStream(video.value)
//     }
//   }
// )

// watch(
//   () => [audioInfo, cameraInfo],
//   async () => {
//     showLocalStream()
//   },
//   {
//     deep: true,
//   }
// )
init()

onBeforeUnmount(() => {
  exit()
})
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