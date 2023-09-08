<template lang="">
  <div class="rtc">
    <a-space>
      <a-select
        v-model:value="constraints.audio.deviceId"
        style="width: 120px"
        :options="audioMediaStreamTrackList"
        @change="audioChange"
        :field-names="fieldNames"
      >
        <template #suffixIcon><AudioFilled /></template>
      </a-select>
      <a-select
        v-model:value="constraints.video.deviceId"
        style="width: 120px"
        :options="cameraMediaStreamTrackList"
        @change="cameraChange"
        :field-names="fieldNames"
      >
        <template #suffixIcon><CameraFilled /></template>
      </a-select>
    </a-space>
    &nbsp;
    <a-button @click="shareDisplayMedia" type="primary">共享屏幕</a-button>
    <a-card title="Video" :bordered="false">
      <video ref="video"></video>
      <video ref="displayVideo"></video>
    </a-card>
  </div>
</template>
<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref, shallowRef, watchEffect, watch } from 'vue';
import { AudioFilled, CameraFilled } from '@ant-design/icons-vue';
import MediaDevices, { DeviceInfo } from '/@/utils/MediaDevices/mediaDevices';
import WebRTC, { onError } from '/@/utils/WebRTC/WebRTC';
import { Merge } from '../utils/type';

type Options = Array<DeviceInfo>
const fieldNames = { value: 'deviceId' }
const video = ref<HTMLVideoElement>(null)
const displayVideo = ref<HTMLVideoElement>(null)
const audioMediaStreamTrackList = ref<Options>([])
const cameraMediaStreamTrackList = ref<Options>([])
const constraints = reactive<MediaStreamConstraints>({
  audio: {
    deviceId: ''
  },
  video: {
    deviceId: ''
  },
})

const rtc = new WebRTC(constraints)
const device = rtc.mediaDevices

const audioChange = (deviceId: ConstrainDOMString) => {
  (constraints.audio as MediaTrackConstraints).deviceId = deviceId
  console.log(deviceId);
}

const cameraChange = (deviceId: ConstrainDOMString) => {
  (constraints.video as MediaTrackConstraints).deviceId = deviceId
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

async function init() {
  try {
    rtc.init()
    const { audioinput, videoinput } = await enumerateDevices()
    audioMediaStreamTrackList.value = audioinput
    cameraMediaStreamTrackList.value = videoinput
    for (const track of await device.getUserMediaStreamTracks()) {
      if (track.kind === 'audio'){
        (constraints.audio as MediaTrackConstraints).deviceId = audioMediaStreamTrackList.value.find(input => input.label === track.label).deviceId
      }else if (track.kind === 'video'){
        (constraints.video as MediaTrackConstraints).deviceId = cameraMediaStreamTrackList.value.find(input => input.label === track.label).deviceId
      }
    }
  } catch (error) {
    const message = 'USER_' + error.message.toUpperCase()
    onError(message)
    console.log(message);
  }
}

function shareDisplayMedia() {
  rtc.shareDisplayMedia(displayVideo.value)
}

function showLocalStream() {
  rtc.showLocalStream(video.value)
}

watch(
  constraints,
  async () => {
    showLocalStream()
  },
  {
    deep: true,
  }
)
init()
</script>
<style lang="scss" scoped>
.rtc ::v-deep .ant-card-body {
  display: flex;
  flex-direction: column;
  video {
    width: 100%;
  }
}
</style>