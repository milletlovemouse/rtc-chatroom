<template lang="">
  <div class="chat-join">
    <div class="video-box">
      <video ref="video" v-if="props.stream" :srcObject="props.stream"></video>
      <UserIcon v-else/>
    </div>
    <form ref="form" class="form">
      <div class="input-box">
        <a-input v-model:value="userInfo.roomname" :bordered="false" required />
        <span>Roomname</span>
        <i></i>
      </div>
      <div class="input-box">
        <a-input v-model:value="userInfo.username" :bordered="false" required />
        <span>Username</span>
        <i></i>
      </div>
      <input type="submit" value="加入房间">
    </form>
  </div>
</template>
<script lang="ts" setup>
import { nextTick, onMounted, reactive, Ref, ref, watch } from 'vue';
import UserIcon from '/@/components/chat/user-icon.vue';

const props = defineProps<{
  stream: Ref<MediaStream> | null | undefined
}>()
const emit = defineEmits<{
  join: [value: {username: string, roomname: string}]
}>()
const video = ref<HTMLVideoElement>(null)
const form = ref<HTMLFormElement>(null)
const userInfo = reactive({
  username: '',
  roomname: '',
})

watch(props, async ({ stream }) => {
  await nextTick()
  if (stream) {
    video.value.play()
  }
}, { immediate: true })

const join = (e: Event) => {
  e.preventDefault()
  emit('join', {...userInfo})
}

onMounted(() => {
  form.value.addEventListener('submit', join)
})
</script>
<style lang="scss" scoped>
.chat-join {
  $margin: 24px;
  $height: calc(var(--main-height) - 32px - $margin * 3);
  height: $height;
  .video-box {
    display: flex;
    justify-content: center;
    align-items: center;
    height: calc(100% - 60px);
    text-align: center;
    video {
      width: 35em;
      border-radius: 8px;
      // aspect-ratio: 1;
    }
  }
  .form {
    display: flex;
    justify-content: center;
    ::v-deep {
      .input-box {
        position: relative;
        width: 240px;
        margin: 0 5px;
        input {
          color: #fff;
          caret-color: #fff;
          font-size: 1em;
          letter-spacing: 0.005em;
          z-index: 10;
          &:valid ~span, 
          &:focus ~span {
            color: #000;
            font-size: 1.25em;
            transform: translateY(-35px);
          }
          &:valid ~i, 
          &:focus ~i {
            height: 32px;
          }
          
        }
        span {
          position: absolute;
          top: -20px;
          left: 0px;
          padding: 20px 0px 10px;
          pointer-events: none;
          color: #8f8f8f;
          font-size: 1em;
          letter-spacing: 0.05em;
          transition: 0.5s;
        }
        i {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          height: 2px;
          background: #000;
          border-radius: 4px;
          overflow: hidden;
          transition: 0.5s;
          pointer-events: none;
        }
      }
    }
    input[type="submit"] {
      border: none;
      outline: none;
      background: #000;
      cursor: pointer;
      font-size: 0.9em;
      border-radius: 4px;
      font-weight: 600;
      width: 100px;
      color: #fff;
      &:active {
        opacity: 0.75;
      }
    }
  }
}
</style>