<template lang="">
  <div ref="root" class="video-recorder" @mousedown="mousedown">
    <div class="video-recorder-tool">
      <Icon v-if="!state" size="1em" title="录制" @click="start"><Record32Regular class="start" /></Icon>
      <template v-else>
        <Icon size="1em" title="停止录制" @click="end"><RecordStop16Regular class="end" /></Icon>
        <span class="time">{{ date }}</span>
      </template>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { Icon } from '@vicons/utils'
import { Record32Regular, RecordStop16Regular } from '@vicons/fluent'
import { computed, onUnmounted, ref, shallowRef } from 'vue';
import { formatTime } from '@/utils/formatDate';
import useVideoRecorder from '@/hooks/useVideoRecorder';
type Props = {
  el?: HTMLElement,
  audioTracks?: MediaStreamTrack[],
}

const props = withDefaults(defineProps<Props>(), {
  el: null,
  audioTracks: () => [],
})
const root = shallowRef<HTMLElement>(null)
const state = ref(false)
const time = ref(0)
const date = computed(() => formatTime(time.value))
let timer = null
const recorder = shallowRef<MediaRecorder>(null)
// 开始录制
const start = () => {
  // 开始录制
  state.value = true
  timeStart()
  recorder.value = useVideoRecorder(props.el, {
    background: '#2b2b2b',
    audioTracks: props.audioTracks,
  })
}

// 结束录制
const end = () => {
  state.value = false
  time.value = 0
  recorder.value.stop()
  recorder.value = null
  clearInterval(timer)
}

const baseTime = 1000
function timeStart() {
  timer = setInterval(() => {
    time.value += baseTime
  }, baseTime)
}
const offset: { x?: number; y?: number } = {}
const transform = { x: 0, y: 0 }
const mousedown = (e: MouseEvent) => {
  e.preventDefault()
  const { x, y } = e
  offset.x = x
  offset.y = y
  document.addEventListener('mousemove', mousemove)
  document.addEventListener('mouseup', mouseup)
}
const mousemove = (e: MouseEvent) => {
  const { x, y } = e
  const { x: x1, y: y1 } = offset
  transform.x += x - x1
  transform.y += y - y1
  root.value.style.transform = `translate(${transform.x}px, ${transform.y}px)`
  offset.x = x
  offset.y = y
}
const mouseup = () => {
  document.removeEventListener('mousemove', mousemove)
  document.removeEventListener('mouseup', mouseup)
}

onUnmounted(() => {
  mouseup()
})
</script>
<style lang="scss">
.video-recorder {
  position: fixed;
  right: 0;
  top: 50%;
  font-size: 2em;
  z-index: 999999999999;
  .video-recorder-tool {
    cursor: move;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 100px;
    transition: width 0.3s;
    .start, .end {
      cursor: pointer;
    }
    .end {
      color: red;
    }
    .time {
      line-height: 1em;
    }
  }
}
</style>