<template lang="">
  <div ref="container" :class="className" @scroll.passive="scroll" @wheel.passive="scroll">
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
import { Merge } from '@/utils/type';
import { debounce } from '../utils/util';

type Props = {
  type?: 'x' | 'y'
}

type ScrollRect = {
  width: number,
  height: number,
  scrollWidth: number,
  scrollHeight: number,
  scrollLeft: number,
  scrollTop: number,
}

export type ScrollEvent = Merge<{
  type: string,
  event?: MouseEvent,
  x: number, // 滚动条X轴滚动距离
  y: number // 滚动条Y轴滚动距离
}, ScrollRect>

export type ResizeEvent = Merge<{
  type: string,
  entry: ResizeObserverEntry, 
  x: number,
  y: number
}, ScrollRect>

const props = withDefaults(defineProps<Props>(), {
  type: 'y',
})
const emits = defineEmits<{
  scroll: [event: ScrollEvent],
  resize: [event: ResizeEvent]
}>()

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

let scrollRect: ScrollRect = {
  width: 0,
  height: 0,
  scrollWidth: 0,
  scrollHeight: 0,
  scrollLeft: 0,
  scrollTop: 0,
}

const container = ref<HTMLElement>(null)
const content = ref<HTMLElement>(null)
const scrollBar = ref<HTMLElement>(null)
const inner = ref<HTMLElement>(null)

const updateScrollBarInner: ResizeObserverCallback = ([entry]) => {
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
  scrollRect.scrollWidth = width
  scrollRect.scrollHeight = height
  scrollRect.width = parentWidth
  scrollRect.height = parentHeight

  const { x, y } = transform
  if ((x === 0 && y === 0)) return
  // 更新滚动条位置
  let { scrollLeft, scrollTop } = scrollRect
  const { width: innerWidth, height: innerHeight } = inner.value.getBoundingClientRect()
  if (type === 'y') {
    if (height - scrollTop < parentHeight) {
      scrollTop = Math.max(0, height - parentHeight)
    }
    scrollLeft = 0
    transform.y = Math.max(Math.min(scrollTop * parentHeight / height, parentHeight - innerHeight), 0)
  } else {
    if (width - scrollLeft < parentWidth) {
      scrollLeft = Math.max(0, width - parentWidth)
    }
    scrollTop = 0
    transform.x = Math.max(Math.min(scrollLeft * parentWidth / width, parentWidth - innerWidth), 0)
  }
  
  container.value.scrollLeft = scrollRect.scrollLeft = scrollLeft
  container.value.scrollTop = scrollRect.scrollTop = scrollTop
  scrollBar.value.style.transform = `translate(${scrollLeft}px, ${scrollTop}px)`
  inner.value.style.transform = `translate(${transform.x}px, ${transform.y}px)`
  if (entry.target === container.value) {
    emits('resize', {
      type,
      entry, 
      ...transform,
      ...scrollRect
    })
  }
  
}

const observerContainer = useResizeObserver(container, updateScrollBarInner)
const observerContent = useResizeObserver(content, updateScrollBarInner)
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
  const isInner = target === inner.value
  const baseNumber = isInner ? 1 : -1
  const { x: oldX, y: oldY } = position
  const { x, y } = e
  position.x = x
  position.y = y
  const { width: parentWidth, height: parentHeight } = container.value.getBoundingClientRect()
  const { width, height } = content.value.getBoundingClientRect()
  let { scrollLeft, scrollTop } = container.value
  const scaleWidth = isInner ? width / parentWidth : 1
  const scaleHeight = isInner ? height / parentHeight : 1
  
  if (type === 'x') {
    scrollLeft = Math.max(Math.min(scrollLeft + (x - oldX) * baseNumber * scaleWidth, width - parentWidth), 0)
    container.value.scrollLeft = scrollLeft
  } else {
    scrollTop = Math.max(Math.min(scrollTop + (y - oldY) * baseNumber * scaleHeight, height - parentHeight), 0)
    container.value.scrollTop = scrollTop
  }
  scrollTo(scrollLeft, scrollTop)
}

function onMouseup() {
  document.removeEventListener('mousemove', onMousemove)
}

const stpeCache = (() => {
  let scrollLeftStart: number, stpeTotal = 0
  const clear = debounce(() => { scrollLeftStart = null;stpeTotal = 0 }, 100)
  return (left: number, stpe: number) => {
    stpeTotal += stpe
    scrollLeftStart = scrollLeftStart ?? left
    clear()
    return scrollLeftStart + stpeTotal
  }
})()
function scroll(e: WheelEvent) {
  const type = props.type
  // 鼠标滚轮滚动
  if (inner.value.style.display === 'none' || (type === 'y' && e.type !== 'scroll')) return
  const stpe = e.deltaY
  let { scrollLeft, scrollTop } = container.value
  const { width, height } = content.value.getBoundingClientRect()
  const { width: parentWidth, height: parentHeight } = container.value.getBoundingClientRect()
  const { width: innerWidth, height: innerHeight } = inner.value.getBoundingClientRect()
  if (e.type === 'wheel') {
    scrollLeft = stpeCache(scrollLeft, stpe)
    scrollTo(scrollLeft, 0)
    return
  } else {
    if (type === 'x') {
      transform.y = 0
      transform.x = Math.max(Math.min(scrollLeft * parentWidth / width, parentWidth - innerWidth), 0)
    } else {
      transform.x = 0
      transform.y = Math.max(Math.min(scrollTop * parentHeight / height, parentHeight - innerHeight), 0)
    }
  }
  scrollBar.value.style.transform = `translate(${scrollLeft}px, ${scrollTop}px)`
  inner.value.style.transform = `translate(${transform.x}px, ${transform.y}px)`
  scrollRect.scrollLeft = scrollLeft
  scrollRect.scrollTop = scrollTop
  scrollRect.width = parentWidth
  scrollRect.height = parentHeight
  emits('scroll', {
    type,
    ...transform,
    ...scrollRect
  })
}

function scrollTo(left: number, top: number, option?: {
  behavior?: ScrollBehavior
}) {
  const { behavior = 'auto' } = option || {}
  container.value.scrollTo({
    top,
    left,
    behavior
  })
}

function scrollToTop() {
  scrollTo(0, 0)
}
const toBottom = debounce(() => scrollTo(0, container.value.scrollHeight), 50)
function scrollToBottom() {
  toBottom()
}
function scrollToLeft() {
  scrollTo(0, 0)
}
const toRight = debounce(() => scrollTo(container.value.scrollWidth, 0), 50)
function scrollToRight() {
  toRight()
}

defineExpose({
  get target(): Element { return container.value },
  scrollToTop,
  scrollToBottom,
  scrollToLeft,
  scrollToRight,
  scrollTo
})

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
const overflow_x = computed(() => props.type === 'x' ? 'scroll' : 'hidden')
const overflow_y = computed(() => props.type === 'y' ? 'scroll' : 'hidden')
const padding_right = computed(() => props.type === 'y' ? '10px' : '0')
const padding_bottom = computed(() => props.type === 'x' ? '10px' : '0')
const whiteSpace = computed(() => props.type === 'x' ? 'nowrap' : 'normal')
</script>
<style lang="scss" scoped>
  .scroll-container {
    position: relative;
    padding: 0 v-bind(padding_right) v-bind(padding_bottom) 0;
    overflow-x: v-bind(overflow_x);
    overflow-y: v-bind(overflow_y);
    scrollbar-width: none;
    &::-webkit-scrollbar { 
      width: 0 !important;
    }
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