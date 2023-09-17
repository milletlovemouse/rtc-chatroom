<template lang="">
  <div class="device-select">
    <a-space>
      <a-select
        :value="props.modelValue.audioDeviceId"
        style="width: 120px"
        :options="audioMediaStreamTrackList"
        @change="audioChange"
        :field-names="fieldNames"
        :disabled="props.modelValue.audioDisabled"
      >
        <template #suffixIcon><AudioFilled /></template>
      </a-select>
      &nbsp;
      <a-button @click="audioDisabledToggle" shape="circle" :icon="h((props.modelValue.audioDisabled ? AudioMutedOutlined: AudioOutlined))" />
      <a-select
        :value="props.modelValue.cameraDeviceId"
        style="width: 120px"
        :options="cameraMediaStreamTrackList"
        @change="cameraChange"
        :field-names="fieldNames"
        :disabled="props.modelValue.cameraDisabled"
      >
        <template #suffixIcon><Icon><Video48Filled /></Icon></template>
      </a-select>
      &nbsp;
      <a-button @click="cameraDisabledToggle" shape="circle" :icon="h(Icon, {class: 'anticon'}, () => h(props.modelValue.cameraDisabled ? VideoOff48Regular : Video48Regular))" />
    </a-space>
    <template v-if="props.state">
      &nbsp;
      <a-button @click="dispalyEnabledToggle" :icon="h(Icon, {class: 'anticon'}, () => h(dispalyEnabled ? DeviceDesktopOff : DeviceDesktop))" type="primary">{{ dispalyEnabled ? '取消共享' : '共享屏幕' }}</a-button>
      &nbsp;
      <a-button @click="exit" :icon="h(Icon, {class: 'anticon'}, () => h(ExitToAppFilled))" type="primary" danger>退出房间</a-button>
    </template>
  </div>
</template>
<script lang="ts" setup>
import { reactive, ref, h, watch, Ref } from 'vue';
import { AudioFilled, CameraFilled, AudioOutlined, AudioMutedOutlined } from '@ant-design/icons-vue';
import { Icon } from '@vicons/utils'
import { Video48Regular, VideoOff48Regular, Video48Filled } from '@vicons/fluent';
import { DeviceDesktop, DeviceDesktopOff } from '@vicons/tabler'
import { ExitToAppFilled } from '@vicons/material'
import MediaDevices, { DeviceInfo } from '/@/utils/MediaDevices/mediaDevices';

export interface Props {
  modelValue: {
    audioDisabled: boolean;
    cameraDisabled: boolean;
    audioDeviceId: string;
    cameraDeviceId: string;
    dispalyEnabled: boolean;
  },
  state: boolean
}
type ModelValue = Props['modelValue']

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ModelValue];
  dispalyEnabledToggle: [value: boolean],
  audioDisabledToggle: [value: boolean],
  cameraDisabledToggle: [value: boolean],
  audioChange: [value: string],
  cameraChange: [value: string],
  exit: [],
}>()

const fieldNames = { value: 'deviceId' }

// watch(device, updataModelValue)
// 媒体流列表
type Options = Array<DeviceInfo>
const audioMediaStreamTrackList = ref<Options>([])
const cameraMediaStreamTrackList = ref<Options>([])

let deviceInfo: ModelValue = null
watch(props.modelValue, (data) => {
  deviceInfo = data
})
const updataModelValue = (data: Partial<ModelValue>) => {
  deviceInfo = { ...deviceInfo, ...data } // update:modelValue异步防抖更新，将修改的数据保存
  console.log('update', { ...props.modelValue, ...deviceInfo });
  emit('update:modelValue', { ...props.modelValue, ...deviceInfo })
}
// 麦克风设备切换禁用状态
const audioDisabledToggle = () => {
  const disabled = !props.modelValue.audioDisabled
  updataModelValue({ audioDisabled: disabled })
  emit('audioDisabledToggle', disabled)
}
// 摄像头设备切换禁用状态
const cameraDisabledToggle = () => {
  const disabled = !props.modelValue.cameraDisabled
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

const exit = () => {
  emit('exit')
}

const mediaDevices = new MediaDevices({
  audio: true,
  video: true
})
async function initDeviceInfo() {
  try {
    const deviceInfoList = await MediaDevices.enumerateDevices()
    const map = new Map<string, DeviceInfo[]>()
    deviceInfoList.forEach((deviceInfo: DeviceInfo) => {
      const list = map.get(deviceInfo.kind) || []
      list.push(deviceInfo)
      map.set(deviceInfo.kind, list)
    })
    audioMediaStreamTrackList.value = map.get('audioinput') as Options
    cameraMediaStreamTrackList.value = map.get('videoinput') as Options
    for (const track of await mediaDevices.getUserMediaStreamTracks()) {
      if (track.kind === 'audio'){
        const deviceId = audioMediaStreamTrackList.value.find(input => input.label === track.label)?.deviceId
        audioChange(deviceId)
      }else if (track.kind === 'video'){
        const deviceId = cameraMediaStreamTrackList.value.find(input => input.label === track.label)?.deviceId
        cameraChange(deviceId)
      }
    }
  } catch (error) {
    console.log(error.message);
  }
}

initDeviceInfo()
</script>
<style lang="scss" scoped>
  .device-select{
    text-align: center;
  }
</style>