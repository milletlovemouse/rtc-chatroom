<template lang="">
  <div ref="root" class="member">
    <div class="member-list">
      <div class="video-box" v-for="connectorInfo in memberList" :key="connectorInfo.connectorId">
        <video
          ref="videoList"
          v-if="connectorInfo.videoActive"
          :srcObject="connectorInfo.remoteStream"
          :muted="connectorInfo.connectorId ==='local'"
        ></video>
        <UserIcon v-else />
        <audio
          ref="audioList"
          v-if="connectorInfo.connectorId !=='local' && !connectorInfo.videoActive && connectorInfo.audioActive"
          :srcObject="connectorInfo.remoteStream"
        ></audio>
        <canvas ref="canvas" v-if="connectorInfo.audioActive" width="30" height="30" style="border-radius: 50%"></canvas>
      </div>
    </div>
    <div class="question-master">
      <div class="video-box main-video-box" v-if="mainStream">
        <video ref="mainVideo" :srcObject="mainStream.remoteStream"></video>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import UserIcon from '/@/components/UserIcon.vue';
import { ConnectorInfoList, StreamType } from '/@/utils/WebRTC/rtc-client';
import { audioVisible } from "@/utils/audio/audioVisualizer";

const props = defineProps<{
  memberList: ConnectorInfoList,
  mainStream?: {
    streamType: StreamType,
    connectorId: string,
    remoteStream: MediaStream,
  },
}>()

const root = ref<HTMLElement>(null)

defineExpose({
  get el(){
    return root.value
  }
})
// 媒体元素
const videoList = ref<HTMLVideoElement[]>()
const audioList = ref<HTMLAudioElement[]>()
const mainVideo = ref<HTMLVideoElement>()

const memberList = computed(() => {
  return props.memberList.map((item) => {
    const audioActive = !!item.remoteStream?.getAudioTracks()?.length
    const videoActive = !!item.remoteStream?.getVideoTracks()?.length
    return {
      ...item,
      audioActive,
      videoActive
    }
  })
})

const mainStream = computed(() => props.mainStream)

watch(() => mainStream.value, async () => {
  await nextTick()
  if (!mainVideo.value) return
  mainVideo.value.onloadedmetadata = () => {
    mainVideo.value.play();
  };
})

let closes: (() => void)[] = []
const canvas = ref<HTMLCanvasElement[]>()

watch(() => memberList.value, async () => {
  await nextTick()
  closes.forEach((close) => close())
  let videoIndex = 0, audioIndex = 0, canvasIndex = 0
  closes = memberList.value.map((connectorInfo) => {
    let mediaList: HTMLMediaElement[], index: number
    let close = () => {}
    if (connectorInfo.audioActive) {
      close = audioVisible(connectorInfo.remoteStream, canvas.value[canvasIndex++])
    }
    if (connectorInfo.videoActive) {
      mediaList = videoList.value
      index = videoIndex++
    } else if (connectorInfo.audioActive) {
      mediaList = audioList.value
      index = audioIndex++
    } else return close
    const mediaEl = mediaList[index]
    if (!mediaEl) return close
    mediaEl.onloadedmetadata = () => {
      mediaEl.play();
    };
    return close
  })
}, { deep: true, immediate: true})

onUnmounted(() => {
  closes.forEach((close) => close())
})

const display = computed(() => mainStream.value ? 'block' : 'grid')

const columns = computed(() => {
  const num = memberList.value.length
  return Math.min(Math.ceil(Math.sqrt(num)), 4)
})

const rows = computed(() => {
  const num = memberList.value.length
  return Math.ceil(num / columns.value)
})

const cloWidth = computed(() => {
  return (100 / columns.value).toFixed(2) + '%'
})

const rowHeight = computed(() => {
  const num = memberList.value.length
  if (num > 16) return '25%'
  return (100 / rows.value).toFixed(2) + '%'
})

const width = computed(() => mainStream.value ? '248px' : '100%')

const background = computed(() => mainStream.value ? '#222' : 'transparent')
</script>
<style lang="scss" scoped>
.member {
  $width: 500px;
  $margin: 24px;
  $padding: 5px;
  $height: calc(var(--main-height) - 32px - $margin * 3);
  margin: 0 0 $margin 0;
  .member-list {
    display: v-bind(display);
    grid-template-columns: repeat(v-bind(columns), v-bind(cloWidth));
    grid-template-rows: repeat(v-bind(rows), v-bind(rowHeight));
    float: left;
    width: v-bind(width);
    height: $height;
    background: v-bind(background);
    border-radius: 6px;
    overflow-y: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { 
      width: 0 !important;
    }
  }
  .video-box {
    position: relative;
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
    canvas {
      position: absolute;
      left: 20px;
      bottom: 20px;
    }
  }
  .question-master {
    display: flex;
    justify-content: center;
    align-items: center;
    height: $height;
    border-radius: 6px;
    background: #111;
    .main-video-box {
      height: inherit;
      video {
        height: inherit;
        object-fit: contain;
      }
    }
  }
  &::after {
    content: "";
    clear: both;
    display: block;
  }
}
</style>