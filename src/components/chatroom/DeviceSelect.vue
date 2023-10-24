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
      <a-badge :count="store.count">
        <a-button
          shape="circle"
          type="primary"
          :icon="h(Icon, {class: 'anticon'}, () => h(ChatboxEllipsesOutline))"
          @click="chatBoxToggle"
          >
        </a-button>
      </a-badge>
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
import { Video48Regular, VideoOff48Regular, Video48Filled } from '@vicons/fluent';
import { DeviceDesktop, DeviceDesktopOff } from '@vicons/tabler'
import { ExitToAppFilled, VideoSettingsOutlined } from '@vicons/material'
import { ChatboxEllipsesOutline } from '@vicons/ionicons5'
import RTCClient from '/@/utils/WebRTC/rtc-client';
import { DeviceInfo } from '/@/utils/MediaDevices/mediaDevices';
import { onError } from '/@/utils/WebRTC/message';
import { useChatStore } from '@/store/modules/chat';
import { Icon } from '@vicons/utils'

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
  chatBoxToggle: [value: boolean],
  exit: [],
}>()

const store = useChatStore()

const rtc = inject<RTCClient>('rtc')

const fieldNames = { value: 'deviceId' }
const fontSize = ref('1.3em')
// 媒体流列表
type Options = Array<DeviceInfo>
const audioMediaStreamTrackOptions = ref<Options>([])
const cameraMediaStreamTrackOptions = ref<Options>([])

let deviceInfo: ModelValue = null
watch(() => props.modelValue, (data) => {
  deviceInfo = {...data}  
}, { deep: true })
const updataModelValue = (data: Partial<ModelValue>) => {
  deviceInfo = { ...deviceInfo, ...data } // update:modelValue异步更新，将修改的数据保存
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

let open = false
const chatBoxToggle = () => {
  open = !open
  if (open) {
    store.count = 0
  }
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

let videoTips = true
async function initVideoDevice() {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true })
    const deviceInfoList = await rtc.getDevicesInfoList()
    cameraMediaStreamTrackOptions.value = deviceInfoList.filter(info => info.kind === 'videoinput')
  } catch (error) {
    if (videoTips) {
      onError('未能成功访问摄像头')
      console.error(error.message);
    }
    if (error.name !== 'NotFoundError') {
      setTimeout(initVideoDevice, 1000)
      videoTips = false
    }
  }
}

let audioTips = true
async function initAudioDevice() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true })
    const deviceInfoList = await rtc.getDevicesInfoList()
    audioMediaStreamTrackOptions.value = deviceInfoList.filter(info => info.kind === 'audioinput')
  } catch (error) {
    if (audioTips) {
      onError('未能成功访问麦克风')
      console.error(error.message);
    }
    if (error.name !== 'NotFoundError') {
      setTimeout(initAudioDevice, 1000)
      audioTips = false
    }
  }
}

async function initDeviceInfo() {
  initVideoDevice()
  initAudioDevice()
}

initDeviceInfo()
</script>
<style lang="scss" scoped>
  .device-select{
    text-align: center;
  }
</style>