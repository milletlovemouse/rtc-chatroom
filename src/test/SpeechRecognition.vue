<template lang="">
  <div class="speech-recognition">
    <h1>Please say</h1>
    <ul>
      <li v-for="value in values" ::key="value">{{ value }}</li>
    </ul>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import speechRecognition from '@/utils/audio/speechRecognition';
const values = ref([])
speechRecognition(values)
</script>
<style lang="scss">
  .speech-recognition {
    height: inherit;
  }
</style>