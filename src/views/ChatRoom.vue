<template lang="">
  <div class="rtc">
    <div class="rtc-body" :class={open}>
      <template v-if="!isInRoom">
        <Join :stream="localStream" @join="join" />
      </template>
      <template v-else>
        <MemberList ref="memberListRef" :memberList="memberList" :mainStream="displayStream" />
        <VideoRecorder :el="memberListRef?.el" :track="audioTracks" />
      </template>
      <div class="rtc-tool">
        <device-select
          ref="deviceSelect"
          v-model="deviceInfo"
          :state="isInRoom"
          @audioChange="audioChange"
          @cameraChange="cameraChange"
          @audioDisabledToggle="audioDisabledToggle"
          @cameraDisabledToggle="cameraDisabledToggle"
          @dispalyEnabledToggle="shareDisplayMedia"
          @chatBoxToggle="chatBoxToggle"
          @exit="exit" />
      </div> 
    </div>
    <Chat ref="chat" :open="open" />
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref, computed, onBeforeUnmount, provide } from 'vue';
import RTCClient, { ConnectorInfoList } from '/@/utils/WebRTC/rtc-client';
import { onError } from '/@/utils/WebRTC/message';
import DeviceSelect, { ModelValue } from '/@/components/chatroom/DeviceSelect.vue';
import MemberList from '/@/components/chatroom/MemberList.vue';
import Chat from '/@/components/chat/Chat.vue';
import Join from '/@/components/chatroom/Join.vue';
import VideoRecorder from '/@/components/VideoRecorder.vue';

const memberListRef = ref(null)
const isInRoom = ref<boolean>(false)
// 本地流
let localStream = ref<MediaStream>(null)
// 屏幕共享媒体流
let displayStream = ref<{
  streamType: 'display' | 'remoteDisplay',
  connectorId: 'display',
  remoteStream: MediaStream,
}>(null)

const deviceInfo = ref<ModelValue>({
  audioDisabled: false,
  cameraDisabled: false,
  audioDeviceId: '',
  cameraDeviceId: '',
  dispalyEnabled: false
})

const host = location.host
const baseurl = import.meta.env.VITE_BASE_URL

const join = (userInfo: { username: string, roomname: string }) => {
  fetch(`${baseurl}/checkUsername?${new URLSearchParams(userInfo).toString()}`, { method: 'GET' })
    .then(response => {
      return response.json()
    })
    .then(async data => {
      if (!data.isRepeat) {
        isInRoom.value = true
        rtc.join(userInfo)
        return
      }
      onError('房间内用户名已存在')
    })
    .catch((err) => {
      console.error(err);
      onError('检查用户名失败')
    })
}

const connectorInfoList = ref<ConnectorInfoList>([])
const memberList = computed(() => {
  const mainConnectorInfo = connectorInfoList.value.find(connectorInfo => connectorInfo.streamType !== 'user')
  if (mainConnectorInfo) {
    displayStream.value = {
      streamType: 'remoteDisplay',
      connectorId: 'display',
      remoteStream: mainConnectorInfo.remoteStream,
    }
  } else if (displayStream.value?.streamType !== 'display') {
    displayStream.value = null
  }
  return [{
    streamType: 'user',
    connectorId: 'local',
    remoteStream: localStream.value,
  }, ...connectorInfoList.value.filter(connectorInfo => connectorInfo.streamType === 'user')]
})

const audioTracks = computed(() => memberList.value.map((member) => {
  if (!member.remoteStream) {
    return null
  }
  return member.remoteStream.getAudioTracks()
}).flat())

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
    audio: true,
    video: true
  },
  socketConfig: {
    host,
  }
})

provide('rtc', rtc)

rtc.on('connectorInfoListChange', (data) => {
  console.log('onConnectorInfoListChange', data);
  connectorInfoList.value = data
})

rtc.on('displayStreamChange', async (stream) => {
  displayStream.value = stream ? {
    streamType: 'display',
    connectorId: 'display',
    remoteStream: stream,
  } : null

  deviceInfo.value.dispalyEnabled = !!stream
})

rtc.on('localStreamChange', async (stream) => {
  localStream.value = stream
})

rtc.getAudioDeviceInfo().then((audio) => {
  deviceInfo.value.audioDeviceId = audio.deviceId
}).catch(() => {
  deviceInfo.value.audioDisabled = true
})

rtc.getVideoDeviceInfo().then((video) => {
  deviceInfo.value.cameraDeviceId = video.deviceId
}).catch(() => {
  deviceInfo.value.cameraDisabled = true
})

// 麦克风设备切换禁用状态
const audioDisabledToggle = (value: boolean) => {
  if (value) {
    rtc.disableAudio()
  } else {
    rtc.enableAudio().catch(() => {
      onError('启用麦克风失败')
      deviceInfo.value.audioDisabled = true
    })
  }
}
// 摄像头设备切换禁用状态
const cameraDisabledToggle = (value: boolean) => {
  if (value) {
    rtc.disableVideo()
  } else {
    rtc.enableVideo().catch((e) => {
      onError('启用摄像头失败')
      deviceInfo.value.cameraDisabled = true
    })
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
  rtc.shareDisplayMedia().catch((err) => {
    onError(err.message)
    deviceInfo.value.dispalyEnabled = false
  })
}

(function showLocalStream() {
  rtc.getLocalStream().then(async (stream) => {
    localStream.value = stream
  })
})()

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

</script>
<style lang="scss" scoped>
.rtc {
  position: relative;
  height: 100%;
  overflow: hidden;
  .rtc-body {
    width: 100%;
    float: left;
    transition: all 0.5s;
    &.open {
      width: calc(100% - 500px);
    }
    &::after {
      content: "";
      clear: both;
      display: block;
    }
  }
}
</style>