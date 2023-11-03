<template lang="">
  <div v-if="open" class="emojis">
    <ul v-for="emojis in emojisList" :key="emojis.key" :class="emojis.key">
      <li class="title"> {{ emojis.name }} </li>
      <li v-for="emoji in emojis.emojis" :key="emoji" class="emoji" @click="() => select(emoji)">
        {{ emoji }}
      </li>
    </ul>
  </div>
</template>
<script lang="ts" setup>
import emojis from '@/assets/emojis'
import { computed, onMounted, onUnmounted } from 'vue';
const emits = defineEmits<{
  'update:modelValue': [value: boolean],
  select: [value: string]
}>()
const props = defineProps<{
  modelValue: boolean
}>()

const open = computed({
  get: () => props.modelValue,
  set: (val) => {
    emits('update:modelValue', val)
  }
})

const emojiName = { smileysEmojis: '表情', peopleEmojis: '手势及人物' }
const emojisList = Object.keys(emojis).map(key => {
  return {
    key,
    name: emojiName[key],
    emojis: emojis[key]
  }
})

const select = (emoji: string) => {
  emits('select', emoji)
}

const close = () => {
  open.value = false
}

onMounted(() => {
  document.addEventListener('click', close)
})

onUnmounted(() => {
  document.removeEventListener('click', close)
})
</script>
<style lang="scss" scoped>
  .emojis {
    position: absolute;
    bottom: 100%;
    width: 100%;
    height: 300px;
    padding: 0 10px;
    border-radius: 5px;
    background: #111111;
    overflow-y: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { 
      width: 0px !important;
    }
    ul {
      display: flex;
      flex-wrap: wrap;
      li {
        padding: 0 5px;
        &.title {
          width: 100%;
          padding: 10px;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: .2rem;
        }
        &.emoji {
          cursor: pointer;
          font-size: 20px;
          padding: 10px;
        }
      }
    }
  }
</style>