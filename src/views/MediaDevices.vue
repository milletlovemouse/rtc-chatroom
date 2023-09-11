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
    <a-card title="Video" :bordered="false">
      <video ref="video"></video>
      <!-- <video ref="displayVideo"></video> -->
      <video v-for="webrtcItem in webrtcList" :key="webrtcItem.id" ref="videoList"></video>
    </a-card>
  </div>
</template>
<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref, shallowRef, watchEffect, watch, h, onUnmounted, computed, Ref, shallowReactive } from 'vue';
import { AudioFilled, CameraFilled, AudioOutlined, AudioMutedOutlined } from '@ant-design/icons-vue';
import { Icon } from '@vicons/utils'
import { Video48Regular, VideoOff48Regular, Video48Filled } from '@vicons/fluent';
import MediaDevices, { DeviceInfo } from '/@/utils/MediaDevices/mediaDevices';
import RTCClient, { onError, WebRTCMap, WebRTCItem } from '/@/utils/WebRTC/rtc-client';

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

const rtc = new RTCClient({
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
  }
})


const webrtcList = ref<WebRTCItem[]>(null)
const videoList = ref<HTMLVideoElement[]>(null)

rtc.onWebRTCMapChange((data: WebRTCMap) => {
  webrtcList.value = [...data.keys()].map(key => data.get(key))
})

watch(webrtcList, async () => {
  await nextTick()
  webrtcList.value.forEach((stream, index) => {
    const video = videoList.value[index]
    const remoteStream = stream.remoteStream
    if (remoteStream) {
      video.srcObject = stream.remoteStream
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
    const localStream = await rtc.getLocalStream()
    video.value.srcObject = localStream
    video.value.play()
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

function shareDisplayMedia() {
  // rtc.shareDisplayMedia(displayVideo.value)
}

function showLocalStream() {
  // rtc.showLocalStream(video.value)
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

onUnmounted(() => {
  rtc.close()
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