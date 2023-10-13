<template lang="">
  <div class="device-select">
    <a-space>
      <a-select
        :value="props.modelValue.audioDeviceId"
        style="width: 120px"
        :options="audioMediaStreamTrackOptions"
        @change="audioChange"
        :field-names="fieldNames"
        :disabled="props.modelValue.audioDisabled"
      >
        <template #suffixIcon><AudioFilled :style="{ fontSize }" /></template>
      </a-select>
      &nbsp;
      <a-button
        @click="audioDisabledToggle"
        shape="circle"
        :icon="h((props.modelValue.audioDisabled ? AudioMutedOutlined: AudioOutlined))"
      />
      <a-select
        :value="props.modelValue.cameraDeviceId"
        style="width: 120px"
        :options="cameraMediaStreamTrackOptions"
        @change="cameraChange"
        :field-names="fieldNames"
        :disabled="props.modelValue.cameraDisabled"
      >
        <template #suffixIcon><Icon :size="fontSize"><Video48Filled /></Icon></template>
      </a-select>
      &nbsp;
      <a-button
        @click="cameraDisabledToggle"
        shape="circle"
        :icon="h(Icon, {class: 'anticon'}, () => h(props.modelValue.cameraDisabled ? VideoOff48Regular : Video48Regular))"
      />
      &nbsp;
      <a-cascader
        v-if="false"
        :value="props.modelValue.resolution || []"
        style="width: 120px"
        :allowClear="false"
        :options="resolutionOptions"
        @change="resolutionChange"
      >
        <template #suffixIcon><Icon :size="fontSize"><VideoSettingsOutlined /></Icon></template>
        <template #expandIcon>
          <!-- <ShrinkOutlined /> -->
        </template>
      </a-cascader>
    </a-space>
    <template v-if="props.state">
      &nbsp;
      <a-button
        @click="dispalyEnabledToggle"
        :icon="h(Icon, {class: 'anticon', style: { fontSize }}, () => h(props.modelValue.dispalyEnabled ? DeviceDesktopOff : DeviceDesktop))"
        type="primary"
      >
        {{ props.modelValue.dispalyEnabled ? '取消共享' : '共享屏幕' }}
      </a-button>
      &nbsp;
      <a-button
        shape="circle"
        type="primary"
        :icon="h(Icon, {class: 'anticon'}, () => h(ChatboxEllipsesOutline))"
        @click="chatBoxToggle"
        >
      </a-button>
      &nbsp;
      <a-button 
        @click="exit"
        :icon="h(Icon, {class: 'anticon', style: { fontSize }}, () => h(ExitToAppFilled))"
        type="primary"
        danger
      >
        退出房间
      </a-button>
    </template>
  </div>
</template>
<script lang="ts" setup>
import { reactive, ref, h, watch, Ref, computed, inject } from 'vue';
import { AudioFilled, CameraFilled, AudioOutlined, AudioMutedOutlined, ShrinkOutlined } from '@ant-design/icons-vue';
import { Icon } from '@vicons/utils'
import { Video48Regular, VideoOff48Regular, Video48Filled } from '@vicons/fluent';
import { DeviceDesktop, DeviceDesktopOff } from '@vicons/tabler'
import { ExitToAppFilled, VideoSettingsOutlined } from '@vicons/material'
import { ChatboxEllipsesOutline } from '@vicons/ionicons5'
import RTCClient from '/@/utils/WebRTC/rtc-client';
import { DeviceInfo } from '/@/utils/MediaDevices/mediaDevices';
import { onError } from '/@/utils/WebRTC/message';

type Resolution = 2160 | 1440 | 1080 | 720 | 480 | 360 | 240 | 144 | 0
export interface Props {
  modelValue: {
    audioDisabled: boolean;
    cameraDisabled: boolean;
    audioDeviceId: string;
    cameraDeviceId: string;
    dispalyEnabled: boolean;
    resolution?: number[]; // 分辨率
  },
  state: boolean,
}
export type ModelValue = Props['modelValue']

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ModelValue];
  dispalyEnabledToggle: [value: boolean],
  audioDisabledToggle: [value: boolean],
  cameraDisabledToggle: [value: boolean],
  audioChange: [value: string],
  cameraChange: [value: string],
  resolutionChange: [value: MediaTrackConstraints],
  chatBoxToggle: [value: boolean],
  exit: [],
}>()

const rtc = inject<RTCClient>('rtc')

const fieldNames = { value: 'deviceId' }
const fontSize = ref('1.3em')
// 媒体流列表
type Options = Array<DeviceInfo>
const audioMediaStreamTrackOptions = ref<Options>([])
const cameraMediaStreamTrackOptions = ref<Options>([])
const resolutionMax = ref(0)
const resolution = ref<{
  label: string;
  value: Resolution;
}[]>([
  { label: '2160p 4K', value: 2160 },
  { label: '1440p 2K', value: 1440 },
  { label: '1080p HD', value: 1080 },
  { label: '720p', value: 720 },
  { label: '480p', value: 480 },
  { label: '360p', value: 360 },
  { label: '240p', value: 240 },
  { label: '144p', value: 144 },
  { label: '自动', value: 0 },
])
const proportion = ref([
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '21:9', value: 21 / 9 },
])
const resolutionOptions = computed(() => {
  return resolution.value.filter((item) => item.value <= resolutionMax.value)
    .map(item => {
      if (item.value === 0) {
        return item
      }
      return { ...item, children: proportion.value }
    })
})

let deviceInfo: ModelValue = null
watch(() => props.modelValue, (data) => {
  deviceInfo = {...data}  
}, { deep: true })
const updataModelValue = (data: Partial<ModelValue>) => {
  deviceInfo = { ...deviceInfo, ...data } // update:modelValue异步防抖更新，将修改的数据保存
  emit('update:modelValue', { ...props.modelValue, ...deviceInfo })
}
// 麦克风设备切换禁用状态
const audioDisabledToggle = () => {
  const disabled = !props.modelValue.audioDisabled
  audioDisabledChange(disabled)
}

function audioDisabledChange(disabled: boolean) {
  updataModelValue({ audioDisabled: disabled })
  emit('audioDisabledToggle', disabled)
}

// 摄像头设备切换禁用状态
const cameraDisabledToggle = () => {
  const disabled = !props.modelValue.cameraDisabled
  cameraDisabledChange(disabled)
}

function cameraDisabledChange(disabled: boolean) {
  updataModelValue({ cameraDisabled: disabled})
  emit('cameraDisabledToggle', disabled)
}

// 麦克风设备切换处理事件
const audioChange = (deviceId: string) => {
  updataModelValue({ audioDeviceId: deviceId })
  emit('audioChange', deviceId)
}

// 摄像头设备切换处理事件
const cameraChange = (deviceId: string) => {
  updataModelValue({ cameraDeviceId: deviceId })
  emit('cameraChange', deviceId)
}

// 开启/取消共享屏幕
const dispalyEnabledToggle = () => {
  const enabled = !props.modelValue.dispalyEnabled
  updataModelValue({ dispalyEnabled: enabled })
  emit('dispalyEnabledToggle', enabled)
}

const resolutionChange = (resolution: number[]) => {
  console.log(resolution);
  updataModelValue({ resolution })
  emit('resolutionChange', createConstraints(resolution))
}

let open = false
const chatBoxToggle = () => {
  open = !open
  emit('chatBoxToggle', open)
}

const exit = () => {
  emit('exit')
}

function reset() {
  open = false
}

function updateDeviceId(tracks: MediaStreamTrack[]) {
  if (tracks.length === 0) {
    audioDisabledChange(false)
    cameraDisabledChange(false)
  } else if (tracks.length === 1) {
    if (tracks[0].kind === 'audio') {
      audioDisabledChange(false)
    } else if (tracks[0].kind === 'video') {
      cameraDisabledChange(false)
    }
  }
  for (const track of tracks) {
    if (track.kind === 'audio'){
      const deviceId = audioMediaStreamTrackOptions.value.find(input => input.label === track.label)?.deviceId
      updataModelValue({ audioDeviceId: deviceId })
    } else if (track.kind === 'video'){
      const deviceId = cameraMediaStreamTrackOptions.value.find(input => input.label === track.label)?.deviceId
      updataModelValue({ cameraDeviceId: deviceId })
    }
  }
}

defineExpose({
  reset,
  updateDeviceId
})

function createConstraints(resolution: number[]): MediaTrackConstraints {
  const [r, aspectRatio] = resolution
  if (r === 0) {
    return null
  }
  const width = r * aspectRatio
  const constraints = {
    aspectRatio,
    width: { ideal: width },
    advanced: [
      { width: width }, 
      { aspectRatio }
    ],
  }
  return constraints
}

async function initResolution() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true })
  const videoTrack = stream.getVideoTracks()[0]
  const settings = videoTrack.getSettings()
  const { height } = settings
  resolutionMax.value = height
  updataModelValue({ resolution: [0] })
}

let tips = true
async function initDeviceInfo() {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    const deviceInfoList = await rtc.getDevicesInfoList()
    const map = new Map<string, DeviceInfo[]>()
    deviceInfoList.forEach((deviceInfo: DeviceInfo) => {
      const list = map.get(deviceInfo.kind) || []
      list.push(deviceInfo)
      map.set(deviceInfo.kind, list)
    })
    audioMediaStreamTrackOptions.value = map.get('audioinput') as Options
    cameraMediaStreamTrackOptions.value = map.get('videoinput') as Options
    // initResolution()
  } catch (error) {
    if (tips) {
      onError('未能成功访问摄像头或者麦克风，应用无法正常使用')
      console.error(error.message);
    }
    setTimeout(initDeviceInfo, 1000)
    tips = false
  }
}

initDeviceInfo()
</script>
<style lang="scss" scoped>
  .device-select{
    text-align: center;
  }
</style>