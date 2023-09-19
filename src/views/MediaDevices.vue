<template lang="">
  <div class="rtc">
    <template v-if="!isInRoom">
      <Join :stream="localStream" @join="join" />
    </template>
    <template v-else>
      <div class="rtc-main">
        <div class="video-box" v-if="localStream">
          <video ref="video" :srcObject="localStream"></video>
        </div>
        <div class="video-box" v-if="displayStream">
          <video ref="displayVideo" :srcObject="localStream"></video>
        </div>
        <div class="video-box" v-for="connectorInfo in memberList" :key="connectorInfo.id">
          <video ref="videoList" :srcObject="connectorInfo.remoteStream"></video>
        </div>
      </div>
    </template>
    <div class="rtc-footer">
      <device-select
        v-model="deviceInfo"
        :state="isInRoom"
        @audioChange="audioChange"
        @cameraChange="cameraChange"
        @audioDisabledToggle="audioDisabledToggle"
        @cameraDisabledToggle="cameraDisabledToggle"
        @dispalyEnabledToggle="shareDisplayMedia"
        @resolutionChange="resolutionChange"
        @exit="exit" />
    </div> 
  </div>
</template>
<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref, shallowRef, watchEffect, watch, h, onUnmounted, computed, Ref, shallowReactive, onBeforeUnmount } from 'vue';
import MediaDevices, { DeviceInfo } from '/@/utils/MediaDevices/mediaDevices';
import RTCClient, { ConnectorInfoMap, ConnectorInfo } from '/@/utils/WebRTC/rtc-client';
import { onError } from '../utils/WebRTC/message';
import DeviceSelect, { ModelValue } from '/@/components/chat/DeviceSelect.vue';
import Join from '/@/components/chat/Join.vue';

const isInRoom = ref<boolean>(false)
// 媒体元素
const video = ref<HTMLVideoElement>(null)
const displayVideo = ref<HTMLVideoElement>(null)
// 本地流
let localStream = ref<MediaStream>(null)
// 屏幕共享媒体流
let displayStream = ref<MediaStream>(null)

const deviceInfo = ref<ModelValue>({
  audioDisabled: false,
  cameraDisabled: false,
  audioDeviceId: '',
  cameraDeviceId: '',
  dispalyEnabled: false
})

const join = (userInfo: { username: string, roomname: string }) => {
  fetch(`/api/checkUsername?${new URLSearchParams(userInfo).toString()}`, { method: 'GET' })
    .then(response => response.json())
    .then(async data => {
      if (!data.isRepeat) {
        isInRoom.value = true
        rtc.join(userInfo)
        await nextTick()
        video.value.play()
        return
      }
      onError('房间内用户名已存在')
    })
    .catch(() => {
      onError('检查用户名失败')
    })
}

// const host = 'ws://' + window.location.hostname;
const host = 'ws://192.168.50.144'
const port = 3000

const memberList = ref<Pick<ConnectorInfo, "streamType" | "connectorId" | "remoteStream">[]>([])
const videoList = ref<HTMLVideoElement[]>([])

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
    audio: deviceInfo.value.audioDisabled ? false : {
      deviceId: deviceInfo.value.audioDeviceId
    },
    video: deviceInfo.value.cameraDisabled ? false : {
      deviceId: deviceInfo.value.cameraDeviceId
    }
  },
  socketConfig: {
    host,
    port,
  }
})

rtc.on('connectorInfoListChange', (data) => {
  console.log('onConnectorInfoListChange', data);
  memberList.value = data
})

rtc.on('displayStreamChange', async (stream) => {
  displayStream.value = stream
  await nextTick()
  displayVideo.value?.play()
})

rtc.on('localStreamChange', async (stream) => {
  localStream.value = stream
  if (!isInRoom.value) return
  await nextTick()
  video.value?.play()
})

watch(memberList, async () => {
  await nextTick()
  memberList.value.forEach((connectorInfo, index) => {
    const video = videoList.value[index]
    video?.play()
  })
}, { deep: true })

// 麦克风设备切换禁用状态
const audioDisabledToggle = (value: boolean) => {
  if (value) {
    rtc.disableAudio()
  } else {
    rtc.enableAudio()
  }
}
// 摄像头设备切换禁用状态
const cameraDisabledToggle = (value: boolean) => {
  if (value) {
    rtc.disableVideo()
  } else {
    rtc.enableVideo()
  }
}

// 麦克风设备切换处理事件
const audioChange = (deviceId: string) => {
  rtc.replaceAudioTrack(deviceId)
}

// 摄像头设备切换处理事件
const cameraChange = (deviceId: string) => {
  rtc.replaceVideoTrack(deviceId)
}

// 切换屏幕共享
async function shareDisplayMedia(value: boolean) {
  if (!value) {
    rtc.cancelShareDisplayMedia()
    return
  }
  rtc.shareDisplayMedia().catch(() => {
    deviceInfo.value.dispalyEnabled = false
  })
}

(function showLocalStream() {
  rtc.getLocalStream().then((stream) => {
    localStream.value = stream
    video.value?.play()
  })
})()

// 切换分辨率
const resolutionChange = (constraints: MediaTrackConstraints) => {
  // rtc.setVideoSettings(constraints)
}

// 退出房间
function exit() {
  rtc.leave()
  isInRoom.value = false
}

const close = (event: Event) => {
  event.preventDefault();
  exit()
  rtc.close()
}

onMounted(() => {
  window.addEventListener('unload', close);
})

onBeforeUnmount(() => {
  rtc.close()
  window.removeEventListener('unload', close);
})

// let aspect_ratio = 1
// const aspectRatio = computed<number>(() => {
//   if (!localStream.value) return aspect_ratio
//   const videoTrack = localStream.value.getVideoTracks()[0]
//   if (!videoTrack) return aspect_ratio
//   const settings = videoTrack.getSettings()
//   aspect_ratio = settings.aspectRatio
//   return aspect_ratio
// })

// const videoWidth = computed<string>(() => {
//   let num = memberList.value.length
//   if (localStream.value) num++
//   if (displayStream.value) num++
//   const percentage = 
//     num > 6
//       ? 25 
//       : num > 4
//         ? 33 : num > 1
//           ? 50 : 100
//   return Math.max((100 / num), percentage).toFixed(2) + '%'
// })
const width = '640px', height = '480px'
</script>
<style lang="scss" scoped>
.rtc {
  position: relative;
  height: 100%;
  .rtc-main {
    $margin: 24px;
    $height: calc(var(--main-height) - 32px - $margin * 3);
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    height: $height;
    margin: 0 0 $margin 0;
    overflow-y: auto;
    .video-box {
      $padding: 5px;
      // width: v-bind(width);
      // height: v-bind(height);
      padding: $padding;
      text-align: center;
      // aspect-ratio: v-bind(aspectRatio);
      video {
        width: v-bind(width);
        height: v-bind(height);
        border-radius: 8px;
        // aspect-ratio: v-bind(aspectRatio);
      }
    }
  }
}
</style>