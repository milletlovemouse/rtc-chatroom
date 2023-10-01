import { defineComponent, Ref, createApp, PropType, reactive, ref, computed, onMounted, App, onUnmounted, watch, nextTick } from "vue";
import { SaveOutlined, ScissorOutlined, CloseOutlined } from "@ant-design/icons-vue";
import { getImageOriginalSize } from "./utils";
import style from "./EditImage.module.scss"
import { base64ToFile } from "/@/utils/fileUtils";

type Img = {
  file: File,
  url: string
}

enum Position {
  Left,
  Left_Top,
  Top,
  Right_Top,
  Right,
  Right_Bottom,
  Bottom,
  Left_Bottom
}

export const EditImage = defineComponent({
  name: 'EditImage',
  props: {
    img: {
      type: Object as PropType<Img>,
      required: true
    },
    close: {
      type: Function as PropType<() => void>,
      default: () => {}
    },
    save: {
      type: Function as PropType<(x: Img) => void>,
      default: () => {}
    }
  },
  setup(props) {
    // 图片文件的尺寸
    const originalSize: { width?: number, height?: number } = {}
    watch(() => props.img.file, async (img) => {
      const { width, height } = await getImageOriginalSize(img)
      originalSize.width = width
      originalSize.height = height
    }, { immediate: true })

    const root = ref<HTMLElement>(null)
    const image = ref<HTMLImageElement>(null)
    // const canvas = ref<HTMLCanvasElement>(null)
    const cutEl = ref<HTMLElement>(null)
    const region = ref<HTMLElement>(null)
    const topEl = ref<HTMLElement>(null)
    const bottomEl = ref<HTMLElement>(null)
    const leftEl = ref<HTMLElement>(null)
    const rightEl = ref<HTMLElement>(null)
    const cursors = ['auto', 'nwse-resize', 'nesw-resize', 'ew-resize', 'ns-resize']
    const cutStyle = {
      left: '0px',
      top: '0px',
      width: '100%',
      height: '100%',
    }
    const berder = 3
    let down = false // 记录鼠标按下
    let position = 0 // 记录鼠标落点
    let cutInfo = ref({...cutStyle})
    const regionStyle = computed(() => ({...cutInfo.value}))
    const ltOverlap = (x: number, y: number) => x < y
    const rbOverlap = (x: number, y: number) => x > y
    const updateCursor = (e: MouseEvent) => {
      e.stopPropagation()
      if (down) return
      const rect = region.value?.getBoundingClientRect()
      const { left, right, top, bottom } = rect
      const { x, y } = e
      if ((ltOverlap(x, left) && ltOverlap(y, top)) || (rbOverlap(x, right) && rbOverlap(y, bottom))) {
        root.value.parentElement.style.cursor = cursors[1]
        position = (ltOverlap(x, left) && ltOverlap(y, top)) ? Position.Left_Top : Position.Right_Bottom
      } else if ((rbOverlap(x, right) && ltOverlap(y, top)) || (ltOverlap(x, left) && rbOverlap(y, bottom))) {
        root.value.parentElement.style.cursor = cursors[2]
        position = (rbOverlap(x, right) && ltOverlap(y, top)) ? Position.Right_Top : Position.Left_Bottom
      } else if (ltOverlap(x, left) || rbOverlap(x, right)) {
        root.value.parentElement.style.cursor = cursors[3]
        position = ltOverlap(x, left) ? Position.Left : Position.Right
      } else if (ltOverlap(y, top) || rbOverlap(y, bottom)) {
        root.value.parentElement.style.cursor = cursors[4]
        position = ltOverlap(y, top) ? Position.Top : Position.Bottom
      }
    }

    function updateCutInfo(e: MouseEvent) {
      if (!down) return
      const parent = region.value?.parentElement
      const parentRect = parent?.getBoundingClientRect()
      const rect = region.value?.getBoundingClientRect()
      let { left: parentLeft, right: parentRight, top: parentTop, bottom: parentBottom } = parentRect
      let { left, right, top, bottom } = rect
      let { x, y } = e
      if (x < parentLeft) x = parentLeft
      if (y < parentTop) y = parentTop

      let width: number, height: number, minSize = 3 * berder

      switch (position) {
        case Position.Left:
          if (x > parentRight - minSize) x = parentRight - minSize
          updateLeft()
          if (width <= minSize){
            position = Position.Right
          }
          break
        case Position.Left_Top:
          if (x > parentRight - minSize) x = parentRight - minSize
          if (y > parentBottom - minSize) y = parentBottom - minSize
          updateLeft()
          updateTop()
          if (width <= minSize && height <= minSize){
            position = Position.Right_Bottom
          } else if (width <= minSize){
            position = Position.Right_Top
          } else if (height <= minSize){
            position = Position.Left_Bottom
          }
          break
        case Position.Top:
          if (y > parentBottom - minSize) y = parentBottom - minSize
          updateTop()
          if (height <= minSize){
            position = Position.Bottom
          }
          break
        case Position.Right_Top:
          if (x > parentRight) x = parentRight
          if (y > parentBottom - minSize) y = parentBottom - minSize
          updateWidth()
          updateTop()
          if (width <= minSize && height <= minSize){
            position = Position.Left_Bottom
          } else if (width <= minSize){
            position = Position.Left_Top
          } else if (height <= minSize){
            position = Position.Right_Bottom
          }
          break
        case Position.Right:
          if (x > parentRight) x = parentRight
          updateWidth()
          if (width <= minSize){
            position = Position.Left
          }
          break
        case Position.Right_Bottom:
          if (x > parentRight) x = parentRight
          if (y > parentBottom) y = parentBottom
          updateWidth()
          updateHeight()
          if (width <= minSize && height <= minSize){
            position = Position.Left_Top
          } else if (width <= minSize){
            position = Position.Left_Bottom
          } else if (height <= minSize){
            position = Position.Right_Top
          }
          break
        case Position.Bottom:
          if (y > parentBottom) y = parentBottom
          updateHeight()
          if (height <= minSize){
            position = Position.Top
          }
          break
        case Position.Left_Bottom:
          if (x > parentRight - minSize) x = parentRight - minSize
          if (y > parentBottom) y = parentBottom
          updateLeft()
          updateHeight()
          if (width <= minSize && height <= minSize){
            position = Position.Right_Top
          } else if (width <= minSize){
            position = Position.Right_Bottom
          } else if (height <= minSize){
            position = Position.Left_Top
          }
          break
        default:
          break
      }

      function updateLeft() {
        width = right - x
        cutInfo.value.left = (x - parentLeft) + 'px'
        cutInfo.value.width = width + 'px'
        requestAnimationFrame(() => updateMaskStyle(rect, parentRect))
      }
      function updateTop() {
        height = bottom - y
        cutInfo.value.top = y - parentTop + 'px'
        cutInfo.value.height = height + 'px'
        requestAnimationFrame(() => updateMaskStyle(rect, parentRect))
      }
      function updateWidth() {
        width = x - left
        cutInfo.value.width = width + 'px'
        requestAnimationFrame(() => updateMaskStyle(rect, parentRect))
      }
      function updateHeight() {
        height = y - top
        cutInfo.value.height = height + 'px'
        requestAnimationFrame(() => updateMaskStyle(rect, parentRect))
      }
    }

    function updateMaskStyle(rect: DOMRect, parentRect: DOMRect) {
      const { width: rectWidth, height: rectHeight } = rect
      const { width: parentWidth, height: parentHeight } = parentRect
      let left = parseInt(cutInfo.value.left.replace('px', ''))
      let top = parseInt(cutInfo.value.top.replace('px', ''))
      let width = parseInt(cutInfo.value.width.replace('px', ''))
      let height = parseInt(cutInfo.value.height.replace('px', ''))
      if (cutInfo.value.width.match('%')) width = rectWidth
      if (cutInfo.value.height.match('%')) height = rectHeight
      leftEl.value.style.top = top + 'px'
      leftEl.value.style.width = left + 'px'
      leftEl.value.style.height = height + 'px'
      topEl.value.style.height = top + 'px'
      rightEl.value.style.top = top + 'px'
      rightEl.value.style.width = parentWidth - width - left + 'px'
      rightEl.value.style.height = height + 'px'
      bottomEl.value.style.height = parentHeight - height - top + 'px'
      // 测试
      // const { width: imgWidth, height: imgHeight } = image.value.getBoundingClientRect()
      // const widthScale = originalSize.width / imgWidth
      // const heightScale = originalSize.height / imgHeight
      // canvas.value.width = width
      // canvas.value.height = height
      // const ctx = canvas.value.getContext('2d')
      // ctx.drawImage(image.value, left * widthScale, top * heightScale, width * widthScale, height * heightScale, 0, 0, width, height)
    }

    let downInfo: {
      x: number
      y: number
    }
    function updateRegion(e: MouseEvent) {
      const { x: downX, y: downY } = downInfo
      const { x, y } = e
      downInfo = { x, y }
      const parent = region.value?.parentElement
      const parentRect = parent?.getBoundingClientRect()
      const rect = region.value?.getBoundingClientRect()
      const { width: parentWidth, height: parentHeight } = parentRect
      const { width, height } = rect

      let left = parseInt(cutInfo.value.left.replace('px', ''))
      let top = parseInt(cutInfo.value.top.replace('px', ''))
      left = Math.max(left +  (x - downX), 0)
      top = Math.max(top +  (y - downY), 0)
      left = Math.min(left, parentWidth - width)
      top = Math.min(top, parentHeight - height)
      cutInfo.value.left = left + 'px'
      cutInfo.value.top = top + 'px'
      requestAnimationFrame(() => updateMaskStyle(rect, parentRect))
    }

    function updateDown(e: MouseEvent) {
      e.stopPropagation()
      down = e.type === 'mousedown'
      if (down) {
        document.addEventListener('mousemove', updateCutInfo)
      } else {
        document.removeEventListener('mousemove', updateCutInfo)
      }
    }

    const cutState = ref(false) // 记录是否开始裁剪
    const cut = (e: Event) => {
      e.stopPropagation()
      cutState.value = !cutState.value
      reset()
    }
    const save = (e: Event) => {
      if (!region.value) return
      e.stopPropagation()
      const canvas = document.createElement('canvas')
      const { width: imgWidth, height: imgHeight } = image.value.getBoundingClientRect()
      const { width, height } = region.value.getBoundingClientRect()
      const left = parseInt(cutInfo.value.left.replace('px', '')) * originalSize.width / imgWidth
      const top = parseInt(cutInfo.value.top.replace('px', '')) * originalSize.height / imgHeight
      const canvasWidth = width * originalSize.width / imgWidth
      const canvasHeight = height * originalSize.height / imgHeight
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image.value, left, top, canvasWidth, canvasHeight, 0, 0, width, height)
      const dataURL = canvas.toDataURL("image/png")
      cutState.value = false
      reset()
      props.save({
        url: dataURL,
        file: base64ToFile(dataURL, props.img.file.name)
      })
    }
    const reset = () => {
      if (!cutState.value) {
        cutInfo.value = {...cutStyle}
        document.removeEventListener('mousedown', updateDown)
        document.removeEventListener('mousemove', updateCursor)
        root.value.parentElement.style.cursor = 'auto'
      } else {
        document.addEventListener('mousedown', updateDown)
        document.addEventListener('mousemove', updateCursor)
      }
    }
    let moveDown = false // 记录是否在裁剪区域按下
    const updateMoveDown = (e: MouseEvent) => {
      e.stopPropagation()
      moveDown = e.type === 'mousedown'
      if (moveDown) {
        const { x, y } = e
        downInfo = { x, y }
        document.addEventListener('mousemove', updateRegion)
      } else {
        document.removeEventListener('mousemove', updateRegion)
      }
    }

    onMounted(() => {
      document.addEventListener('mouseup', updateDown)
    })

    onUnmounted(() => {
      document.removeEventListener('mousedown', updateDown)
      document.removeEventListener('mouseup', updateDown)
      document.removeEventListener('mousemove', updateCursor)
      document.removeEventListener('mousemove', updateCutInfo)
      document.removeEventListener('mousemove', updateRegion)
    })
    return () => (
      <div ref={root} class={style.editImage}>
        <div class={style.close} onClick={props.close}><CloseOutlined /></div>
        <div class={style.maskLayer}></div>
        <div class={style.editImageContainer}>
          <img ref={image} class={style.image} src={props.img.url} alt={props.img.file.name} />
          {/* <canvas ref={canvas} class={style.canvas}></canvas> */}
          { cutState.value
            ? <div ref={cutEl} class={style.cut}>
                <div ref={region} style={regionStyle.value} class={style.region}>
                  <div onMousedown={updateMoveDown} onMouseup={updateMoveDown} class={style.fill}></div>
                </div>
                <div ref={topEl} class={style.top}></div>
                <div ref={bottomEl} class={style.bottom}></div>
                <div ref={leftEl} class={style.left}></div>
                <div ref={rightEl} class={style.right}></div>
              </div>
            : null }
          <div class={style.toolbar} onMousedown={(e) => e.stopPropagation()}>
            <ScissorOutlined title="裁剪" onClick={cut} />
            <SaveOutlined title="保存" onClick={save} />
          </div>
        </div>
      </div>
    )
  }
})

export function useEditImage(img: Ref<Img> | Img, save?: (x: Img) => void){
  const root = document.createElement('div')
  const style = {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: '100%',
  }
  Object.keys(style).forEach(key => root.style[key] = style[key])
  let app: App
  const close = () => {
    app.unmount()
    root.remove()
  }
  app = createApp(EditImage, { img, close, save })
  app.mount(root)
  document.body.appendChild(root)
  return close
}

export default EditImage