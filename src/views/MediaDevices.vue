<template lang="">
  <div class="rtc">
    <div class="rtc-body" :class={open}>
      <template v-if="!isInRoom">
        <Join :stream="localStream" :joinDisable="joinDisable" @join="join" />
      </template>
      <template v-else>
        <div class="rtc-content">
          <div class="video-box">
            <video ref="video" v-if="localStream && localStream.active" :srcObject="localStream"></video>
            <UserIcon v-else />
          </div>
          <div class="video-box" v-if="displayStream">
            <video ref="displayVideo" :srcObject="localStream"></video>
          </div>
          <div class="video-box" v-for="connectorInfo in memberList" :key="connectorInfo.id">
            <video
              ref="videoList"
              v-if="connectorInfo.videoActive"
              :srcObject="connectorInfo.remoteStream"
            ></video>
            <UserIcon v-else />
            <audio
              v-if="!connectorInfo.videoActive && connectorInfo.audioActive"
              :srcObject="connectorInfo.remoteStream"
            ></audio>
          </div>
        </div>
      </template>
      <div class="rtc-tool">
        <device-select
          ref="deviceSelect"
          v-model="deviceInfo"
          v-model:joinDisable="joinDisable"
          :state="isInRoom"
          @audioChange="audioChange"
          @cameraChange="cameraChange"
          @audioDisabledToggle="audioDisabledToggle"
          @cameraDisabledToggle="cameraDisabledToggle"
          @dispalyEnabledToggle="shareDisplayMedia"
          @resolutionChange="resolutionChange"
          @chatBoxToggle="chatBoxToggle"
          @exit="exit" />
      </div> 
    </div>
    <Chat ref="chat" :open="open" />
  </div>
</template>
<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref, shallowRef, watchEffect, watch, h, onUnmounted, computed, Ref, shallowReactive, onBeforeUnmount, provide } from 'vue';
import MediaDevices, { DeviceInfo } from '/@/utils/MediaDevices/mediaDevices';
import RTCClient, { ConnectorInfoMap, ConnectorInfo } from '/@/utils/WebRTC/rtc-client';
import { onError } from '/@/utils/WebRTC/message';
import DeviceSelect, { ModelValue } from '/@/components/chat/DeviceSelect.vue';
import Chat from '/@/components/chat/Chat.vue';
import Join from '/@/components/chat/Join.vue';
import UserIcon from '/@/components/chat/user-icon.vue';

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

const joinDisable = ref<boolean>(true)

const host = import.meta.env.VITE_HOST
const port = import.meta.env.VITE_PORT

const join = (userInfo: { username: string, roomname: string }) => {
  fetch(`${host}:${port}/checkUsername?${new URLSearchParams(userInfo).toString()}`, { method: 'GET' })
    .then(response => response.json())
    .then(async data => {
      if (!data.isRepeat) {
        isInRoom.value = true
        rtc.join(userInfo)
        await nextTick()
        video.value?.load()
        video.value?.play()
        return
      }
      onError('房间内用户名已存在')
    })
    .catch((err) => {
      console.error(err);
      
      onError('检查用户名失败')
    })
}

const connectorInfoList = ref<Pick<ConnectorInfo, "streamType" | "connectorId" | "remoteStream">[]>([])
const memberList = computed(() => {
  return connectorInfoList.value.map((item) => {
    const audioActive = !!item.remoteStream?.getAudioTracks()?.length
    const videoActive = !!item.remoteStream?.getVideoTracks()?.length
    console.log({
      ...item,
      audioActive,
      videoActive
    });
    
    return {
      ...item,
      audioActive,
      videoActive
    }
  })
})
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

provide('rtc', rtc)

rtc.on('connectorInfoListChange', (data) => {
  console.log('onConnectorInfoListChange', data);
  connectorInfoList.value = data
})

rtc.on('displayStreamChange', async (stream) => {
  displayStream.value = stream
  await nextTick()
  displayVideo.value?.load()
  displayVideo.value?.play()
})

rtc.on('localStreamChange', async (stream) => {
  localStream.value = stream
  if (!isInRoom.value) return
  await nextTick()
  video.value?.load()
  video.value?.play()
})

watch(memberList, async () => {
  console.log(memberList.value)
  await nextTick()
  connectorInfoList.value.forEach((connectorInfo, index) => {
    const video = videoList.value[index]
    video?.load()
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
  rtc.getLocalStream().then(async (stream) => {
    localStream.value = stream
    await nextTick()
    video.value?.load()
    video.value?.play()
  })
})()

// 切换分辨率
const resolutionChange = (constraints: MediaTrackConstraints) => {
  // rtc.setVideoSettings(constraints)
}

const open = ref(false)
const chat = ref(null)
const deviceSelect = ref(null)
const chatBoxToggle = (value: boolean) => {
  open.value = value
}

// 退出房间
function exit() {
  rtc.leave()
  isInRoom.value = false
  open.value = false
  chat.value.clearMessage()
  deviceSelect.value.reset()
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

const columns = computed(() => {
  const num = connectorInfoList.value.length + 1
  return Math.min(Math.ceil(Math.sqrt(num)), 4)
})

const rows = computed(() => {
  const num = connectorInfoList.value.length + 1
  return Math.ceil(num / columns.value)
})

const cloWidth = computed(() => {
  return (100 / columns.value).toFixed(2) + '%'
})

const rowHeight = computed(() => {
  const num = connectorInfoList.value.length + 1
  if (num > 16) return '25%'
  return (100 / rows.value).toFixed(2) + '%'
})

// const overflow = computed(() => {
//   const num = memberList.value.length + 1
//   if (num > 16) return 'scroll'
//   return 'hidden'
// })

</script>
<style lang="scss" scoped>
.rtc {
  position: relative;
  height: 100%;
  $width: 500px;
  $margin: 24px;
  $padding: 5px;
  $height: calc(var(--main-height) - 32px - $margin * 3);
  .rtc-body {
    width: 100%;
    float: left;
    transition: all 0.5s;
    &.open {
      width: calc(100% - 500px);
    }
    .rtc-content {
      display: grid;
      grid-template-columns: repeat(v-bind(columns), v-bind(cloWidth));
      grid-template-rows: repeat(v-bind(rows), v-bind(rowHeight));
      width: 100%;
      height: $height;
      margin: 0 0 $margin 0;
      overflow-y: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar { 
        width: 0 !important;
      }
      .video-box {
        padding: $padding;
        display: flex;
        justify-content: center;
        align-items: center;
        video {
          width: 100%;
          height: 100%;
          border-radius: 8px;
          object-fit: cover;
        }
      }
    }
    &::after {
      content: "";
      clear: both;
      display: block;
    }
  }
}
</style>