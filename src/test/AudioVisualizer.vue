<template lang="">
  <div class="audio-visualizer">
    <canvas ref="canvas" width="30" height="30" style="border-radius: 20%"></canvas>
    <!-- &nbsp;
    <audio ref="audio" controls :src="audioSrc"></audio> -->
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from "vue"
import { audioVisible } from "@/utils/audio/audioVisualizer";
// import audioSrc from "@/assets/Stay_tonight.wav"

const canvas = ref<HTMLCanvasElement>()
const audio = ref<HTMLAudioElement>()
let close = () => {}

onMounted(() => {
  // HTMLMediaElement
  // audio.value.onloadedmetadata = () => {
  //   audio.value.play();
  //   close = audioVisible(audio.value, canvas.value)
  // };

  // MediaStream 
  navigator.mediaDevices.getUserMedia({audio: true}).then((stream) => {
    close = audioVisible(stream, canvas.value)
  })
})

onBeforeUnmount(() => {
  close()
})
</script>
<style lang="scss">
  .audio-visualizer {
    height: inherit;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>