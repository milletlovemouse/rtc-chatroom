<template lang="">
  <div ref="container" :class="className" @wheel="wheel">
    <ul ref="content" @mousedown="onMousedown" class="scroll-content">
      <slot></slot>
    </ul>
    <div ref="scrollBar" class="scroll-bar">
      <div ref="inner" @mousedown="onMousedown" class="scroll-bar-inner">
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import useResizeObserver from '/@/hooks/useResizeObserver';

type Props = {
  type?: 'x' | 'y'
}
const props = withDefaults(defineProps<Props>(), {
  type: 'y',
})
let target: EventTarget = null
let position: {
  x?: number,
  y?: number,
} = {}
let transform: {
  x: number,
  y: number,
} = {
  x: 0,
  y: 0,
}
const container = ref<HTMLElement>(null)
const content = ref<HTMLElement>(null)
const scrollBar = ref<HTMLElement>(null)
const inner = ref<HTMLElement>(null)

const observerContainer = useResizeObserver(container, updateScrollBarInner)
const observerContent = useResizeObserver(content, updateScrollBarInner)
function updateScrollBarInner() {
  const type = props.type
  const { width: parentWidth, height: parentHeight } = container.value.getBoundingClientRect()
  const { width, height } = content.value.getBoundingClientRect()
  // 更新滚动条元素几何信息
  if (type === 'y') {
    const h = Math.min(parentHeight * parentHeight / height, parentHeight)
    inner.value.style.width = '5px'
    inner.value.style.height = h + 'px'
    inner.value.style.display = h === parentHeight ? 'none' : 'block'
  } else {
    const w = Math.min(parentWidth * parentWidth / width, parentWidth)
    inner.value.style.width = w + 'px'
    inner.value.style.height = '5px'
    inner.value.style.display = w === parentWidth ? 'none' : 'block'
  }

  const { x, y } = transform
  if ((x === 0 && y === 0)) return
  // 更新滚动条位置
  let transformX = content.value.style.transform ? Number(content.value.style.transform.replace(/translate\(|px|\)/g, '').split(',')[0]) : 0
  let transformY = content.value.style.transform ? Number(content.value.style.transform.replace(/translate\(|px|\)/g, '').split(',')[1]) : 0
  if (type === 'y') {
    if (height + transformY < parentHeight) {
      transformY = Math.min(0, parentHeight - height)
      transform.y = Math.max(0, -transformY * parentHeight / height)
    } else {
      transform.y = -transformY * parentHeight / height
    }
  } else {
    if (width + transformX < parentWidth) {
      transformX = Math.min(0, parentWidth - width)
      transform.x = Math.max(0, -transformX * parentWidth / width)
    } else {
      transform.x = -transformX * parentWidth / width
    }
  }
  content.value.style.transform = `translate(${transformX}px, ${transformY}px)`
  inner.value.style.transform = `translate(${transform.x}px, ${transform.y}px)`
}

let disconnectContainer = () => {}, disconnectContent = () => {}
function initScrollBar() {
  watch(() => props.type, (type) => {
    nextTick(() => {
      if (type === 'x') {
        scrollBar.value.style.width = '100%'
        scrollBar.value.style.height = '5px'
      } else {
        scrollBar.value.style.width = '5px'
        scrollBar.value.style.height = '100%'
      }
    })
  }, {immediate: true})
  disconnectContainer = observerContainer()
  disconnectContent = observerContent()
}
initScrollBar()

function onMousedown(e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  target = e.target
  position = {
    x: e.x,
    y: e.y,
  }
  document.addEventListener('mousemove', onMousemove)
  document.addEventListener('mouseup', onMouseup)
}

function onMousemove(e: MouseEvent) {
  // 滑动滚动
  const type = props.type
  const baseNumber = target === inner.value ? 1 : -1
  const { x: oldX, y: oldY } = position
  const { x, y } = e
  position.x = x
  position.y = y
  const { width, height } = content.value.getBoundingClientRect()
  const { width: parentWidth, height: parentHeight } = container.value.getBoundingClientRect()
  const { width: innerWidth, height: innerHeight } = inner.value.getBoundingClientRect()
  if (type === 'x') {
    transform.y = 0
    transform.x = Math.max(Math.min(transform.x + (x - oldX) * baseNumber, parentWidth - innerWidth), 0)
  } else {
    transform.x = 0
    transform.y = Math.max(Math.min(transform.y + (y - oldY) * baseNumber, parentHeight - innerHeight), 0)
  }
  const transformX = transform.x * width / parentWidth
  const transformY = transform.y * height / parentHeight
  content.value.style.transform = `translate(${-transformX}px, ${-transformY}px)`
  inner.value.style.transform = `translate(${transform.x}px, ${transform.y}px)`
}

function onMouseup() {
  document.removeEventListener('mousemove', onMousemove)
}

function wheel(e: WheelEvent) {
  // 鼠标滚轮滚动
  if (inner.value.style.display === 'none') return
  const type = props.type
  const { width, height } = content.value.getBoundingClientRect()
  const { width: parentWidth, height: parentHeight } = container.value.getBoundingClientRect()
  const { width: innerWidth, height: innerHeight } = inner.value.getBoundingClientRect()
  const stpe = e.deltaY > 0 ? 20 : -20
  if (type === 'x') {
    transform.y = 0
    transform.x = Math.max(Math.min(transform.x + stpe, parentWidth - innerWidth), 0)
  } else {
    transform.x = 0
    transform.y = Math.max(Math.min(transform.y + stpe, parentHeight - innerHeight), 0)
  }
  const transformX = transform.x * width / parentWidth
  const transformY = transform.y * height / parentHeight
  content.value.style.transform = `translate(${-transformX}px, ${-transformY}px)`
  inner.value.style.transform = `translate(${transform.x}px, ${transform.y}px)`
}

onUnmounted(() => {
  disconnectContainer()
  disconnectContent()
})

// class计算属性
const className = computed(() => ({
  'scroll-container': true,
  'scroll-container-y': props.type === 'y',
  'scroll-container-x': props.type === 'x'
}))

// css计算属性
const padding_right = computed(() => props.type === 'y' ? '10px' : '0')
const padding_bottom = computed(() => props.type === 'x' ? '10px' : '0')
const whiteSpace = computed(() => props.type === 'x' ? 'nowrap' : 'normal')
</script>
<style lang="scss" scoped>
  .scroll-container {
    position: relative;
    padding: 0 v-bind(padding_right) v-bind(padding_bottom) 0;
    overflow: hidden;
    .scroll-content {
      display: inline-block;
      white-space: v-bind(whiteSpace);
      user-select: none;
    }
    .scroll-bar {
      position: absolute;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0);
      border-radius: 5px;
      cursor: pointer;
      .scroll-bar-inner {
        background: #fff;
        border-radius: 5px;
        cursor: pointer;
      }
    }
  }
</style>