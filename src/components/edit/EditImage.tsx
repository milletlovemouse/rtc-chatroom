import { defineComponent, createApp, PropType, ref, App, onUnmounted, watch, nextTick, onMounted, computed } from "vue";
import { SaveOutlined, ScissorOutlined, CloseOutlined } from "@ant-design/icons-vue";
import { Edit32Regular } from "@vicons/fluent";
import { PenFountain } from "@vicons/carbon";
import { getPrimitiveImage } from "./utils";
import style from "./EditImage.module.scss"
import { base64ToFile } from "/@/utils/fileUtils";
import useResizeObserver from "/@/hooks/useResizeObserver";
import { colorToHalfTransparent } from "/@/utils/colorUtils";

export type Img = {
  file: File,
  url: string
}

export type CssStyle = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  opacity?: number;
}

export type Save = (newImg: Img, oldImg: Img ) => void;

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
      required: true
    },
    save: {
      type: Function as PropType<Save>,
      required: true
    },
    from: Object as PropType<CssStyle>,
  },
  setup(props) {
    const root = ref<HTMLElement>(null)
    const image = ref<HTMLImageElement>(null)
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
    const berder = 1
    let down = false // 记录鼠标按下
    let position = 0 // 记录鼠标落点
    let cutInfo = ref({...cutStyle})
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
        width = Math.max(right - x, 0)
        cutInfo.value.left = (x - parentLeft) + 'px'
        cutInfo.value.width = width + 'px'
        updateMaskStyle(rect, parentRect)
      }
      function updateTop() {
        height = Math.max(bottom - y, 0)
        cutInfo.value.top = y - parentTop + 'px'
        cutInfo.value.height = height + 'px'
        updateMaskStyle(rect, parentRect)
      }
      function updateWidth() {
        width = Math.max(x - left, 0)
        cutInfo.value.width = width + 'px'
        updateMaskStyle(rect, parentRect)
      }
      function updateHeight() {
        height = Math.max(y - top, 0)
        cutInfo.value.height = height + 'px'
        updateMaskStyle(rect, parentRect)
      }
    }

    function updateMaskStyle(rect: DOMRect, parentRect: DOMRect) {
      const { width: rectWidth, height: rectHeight } = rect
      const { width: parentWidth, height: parentHeight } = parentRect
      let left = Number(cutInfo.value.left.replace('px', ''))
      let top = Number(cutInfo.value.top.replace('px', ''))
      let width = Number(cutInfo.value.width.replace('px', ''))
      let height = Number(cutInfo.value.height.replace('px', ''))
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

      let left = Number(cutInfo.value.left.replace('px', ''))
      let top = Number(cutInfo.value.top.replace('px', ''))
      left = Math.max(left +  (x - downX), 0)
      top = Math.max(top +  (y - downY), 0)
      left = Math.min(left, parentWidth - width)
      top = Math.min(top, parentHeight - height)
      cutInfo.value.left = left + 'px'
      cutInfo.value.top = top + 'px'
      updateMaskStyle(rect, parentRect)
    }

    function updateDown(e: MouseEvent) {
      e.preventDefault()
      e.stopPropagation()
      down = e.type === 'mousedown'
      if (down) {
        document.addEventListener('mousemove', updateCutInfo)
      } else {
        document.removeEventListener('mousemove', updateCutInfo)
      }
    }

    function observerImage() {
      let imageSize: { width?: number, height?: number } = {}
      watch(() => image.value, () => {
        if (!image.value) return
        const { width, height } = image.value.getBoundingClientRect()
        imageSize = {
          width,
          height
        }
      })

      const resizeObserver = useResizeObserver(image, ([entry]) => {        
        if (!image.value || !region.value) return
        nextTick(() => {
          const { borderBoxSize } = entry
          const { inlineSize: newWidth, blockSize: newHeight } = borderBoxSize[0]
          const { width: oldWidth, height: oldHeight } = imageSize
          imageSize = {
            width: newWidth,
            height: newHeight
          }
          const left = Number(cutInfo.value.left.replace('px', '')) * newWidth / oldWidth
          const top = Number(cutInfo.value.top.replace('px', '')) * newHeight / oldHeight
          cutInfo.value.left = left + 'px'
          cutInfo.value.top = top + 'px'
          if (!cutInfo.value.width.match('%')) {
            const width = Number(cutInfo.value.width.replace('px', '')) * newWidth / oldWidth
            cutInfo.value.width = width + 'px'
          }
          if (!cutInfo.value.height.match('%')) {
            const height = Number(cutInfo.value.height.replace('px', '')) * newHeight / oldHeight
            cutInfo.value.height = height + 'px'
          }
          const parent = region.value?.parentElement
          const parentRect = parent?.getBoundingClientRect()
          const rect = region.value?.getBoundingClientRect()
          updateMaskStyle(rect, parentRect)
        })
      })
      let disconnect: () => void
      watch(() => region.value, () => {
        disconnect && disconnect()
        if (!region.value) {
          disconnect = null
          return
        }
        disconnect = resizeObserver()
      })
    }
    observerImage()

    type LineInfo = {
      color: string;
      lineWidth: number;
      pointList: Array<[number, number]>
    }
    const canvasInfo = ref<{
      pointerEvents: 'none' | 'auto';
      pencil?: {
        list: Array<LineInfo>
      }
    }>({
      pointerEvents: 'auto',
    })
    const lineColor = ref<string>('#FF0000')
    const lineWidth = ref<number>(2)
    const resetCanvasInfo = () => {
      const canvasInfoListKey = ['pencil']
      canvasInfoListKey.forEach(key => delete canvasInfo.value[key])
    }
    function pencilMouse(e: MouseEvent) {
      const list = canvasInfo.value.pencil?.list || []
      const { offsetX, offsetY } = e
      switch(e.type) {
        case 'mousedown':
          list.push({
            color: lineColor.value,
            lineWidth: lineWidth.value,
            pointList: [[offsetX, offsetY]]
          })
          canvasInfo.value.pencil = { list }
          image.value.addEventListener('mousemove', pencilMouse)
          document.addEventListener('mouseup', pencilMouse)
          break
        case 'mousemove':
        case 'mouseup':
          const lineInfo = list.at(-1)
          if (penState.value === 'markerpen') {
            lineInfo.pointList[1] = [offsetX, offsetY]
          } else {
            lineInfo.pointList.push([offsetX, offsetY])
          }
          
          if (e.type === 'mouseup') {
            image.value.removeEventListener('mousemove', pencilMouse)
            document.removeEventListener('mouseup', pencilMouse)
          }
          break
        default: break
      }
    }

    type PenState = 'pencil' | 'markerpen'
    const penState = ref<PenState>(null)
    const pencil = (e: Event, options: {
      lineColor: string,
      lineWidth: number,
      state: PenState
    }) => {
      e.stopPropagation()
      lineWidth.value = options.lineWidth
      lineColor.value = options.lineColor
      penState.value = options.state
      cutState.value = false
      reset()
    }

    const cutState = ref(false) // 记录是否开始裁剪
    const cut = (e: Event) => {
      e.stopPropagation()
      cutState.value = !cutState.value
      penState.value = null
      reset()
    }

    const img = ref<Img>(props.img)
    watch(() => props.img, () => {
      img.value = props.img
    }, { deep: true })

    const save = async (e: Event) => {
      e.stopPropagation()
      const canvasInfoListKey = ['pencil']
      if (!region.value && !canvasInfoListKey.find(key => !!canvasInfo.value[key])) return
      const canvas = document.createElement('canvas')
      const { width: imgWidth, height: imgHeight } = image.value.getBoundingClientRect()
      const { image: primitiveImage, close } = await getPrimitiveImage(img.value.file)
      const { width: primitiveW, height: primitiveH } = primitiveImage
      const scaleInfo = {
        wScale: primitiveW / imgWidth,
        hScale: primitiveH / imgHeight
      }
      const ctx = canvas.getContext('2d')
      // 裁剪
      if (region.value) {
        const { width, height } = region.value.getBoundingClientRect()
        const left = Number(cutInfo.value.left.replace('px', '')) * scaleInfo.wScale
        const top = Number(cutInfo.value.top.replace('px', '')) * scaleInfo.hScale
        const canvasWidth = width * scaleInfo.wScale
        const canvasHeight = height * scaleInfo.hScale
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        ctx.drawImage(primitiveImage, left, top, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight)
      } else {
        const canvasWidth = imgWidth * scaleInfo.wScale
        const canvasHeight = imgHeight * scaleInfo.hScale
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        ctx.drawImage(primitiveImage, 0, 0, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight)
      }

      canvasInfoListKey.forEach(key => {
        const data = canvasInfo.value[key]
        if (!data) return
        switch (key) {
          case 'pencil':
            data.list.forEach((list: LineInfo) => setCanvas(canvas, list, scaleInfo))
          default: break
        }
      })

      const dataURL = canvas.toDataURL(img.value.file.type)
      const newImg = {
        url: dataURL,
        file: base64ToFile(dataURL, img.value.file.name)
      }
      props.save(newImg, img.value)
      img.value = newImg
      cutState.value = false
      penState.value = null
      resetCanvasInfo()
      reset()
      close()
    }

    const reset = () => {
      // 重置裁剪
      if (!cutState.value) {
        cutInfo.value = {...cutStyle}
        document.removeEventListener('mousedown', updateDown)
        document.removeEventListener('mouseup', updateDown)
        document.removeEventListener('mousemove', updateCursor)
        root.value.parentElement.style.cursor = 'auto'
      } else {
        document.addEventListener('mousedown', updateDown)
        document.addEventListener('mouseup', updateDown)
        document.addEventListener('mousemove', updateCursor)
      }
      // 重置画笔
      if (penState.value) {
        canvasInfo.value.pointerEvents = 'none'
        image.value.style.cursor = 'crosshair'
        image.value.addEventListener('mousedown', pencilMouse)
      } else {
        image.value.style.cursor = 'auto'
        image.value.removeEventListener('mousedown', pencilMouse)
      }
    }

    const updateMoveDown = (e: MouseEvent) => {
      // 按下还是抬起
      if (e.type === 'mousedown') {
        e.stopPropagation()
        const { x, y } = e
        downInfo = { x, y }
        document.addEventListener('mousemove', updateRegion)
      } else {
        document.removeEventListener('mousemove', updateRegion)
      }
    }

    const showToolBar = ref(!props.from)
    const from = computed(() => {
      if (props.from) {
        const clientWidth = window.innerWidth
        const clientHeight = window.innerHeight
        const parentLeft = window.innerWidth / 20
        const parentTop = window.innerHeight / 20
        const parentMaxWidth = window.innerWidth - parentLeft * 2
        const parentMaxHeight = window.innerHeight - parentTop * 2
        const from = {...props.from as CssStyle}
        
        from.left = Math.min(from.left - (clientWidth - Math.min(from.width, parentMaxWidth)) / 2, from.left)
        from.top = Math.min(from.top - (clientHeight - Math.min(from.height, parentMaxHeight)) / 2, from.top)
        Object.keys(from).forEach(key => {
          from[key] = from[key] + 'px'
        })
        from.opacity = 0.5
        return from
      } 
      return {}
    })
    const transition = ref(from.value)
    const close = (e: MouseEvent) => {
      e.stopPropagation()
      if (props.from) {
        resetCanvasInfo()
        transition.value = from.value
        showToolBar.value = false
        image.value.ontransitionend = () => {
          props.close()
        }
      } else {
        props.close()
      }
    }

    onMounted(() => {
      if (props.from) {
        setTimeout(() => {
          transition.value = {}
        })
        image.value.ontransitionend = () => {
          showToolBar.value = true
        }
      }
    })

    onUnmounted(() => {
      document.removeEventListener('mousedown', updateDown)
      document.removeEventListener('mouseup', updateDown)
      document.removeEventListener('mousemove', updateCursor)
      document.removeEventListener('mousemove', updateCutInfo)
      document.removeEventListener('mousemove', updateRegion)
    })

    function setCanvas(canvas: any, lineInfo: LineInfo, scaleInfo?: {
      wScale: number,
      hScale: number
    }) {
      if (!canvas) return
      const { wScale = 1, hScale = 1 } = scaleInfo || {}
      const [minWidth, minHeight, maxWidth, maxHeight] = lineInfo.pointList.reduce((a, b) => {
        return [
          Math.min(a[0], b[0]) * wScale,
          Math.min(a[1], b[1]) * hScale,
          Math.max(a[2], b[0]) * wScale,
          Math.max(a[3], b[1]) * hScale
        ]
      }, [Infinity, Infinity, 0, 0])
      if (!scaleInfo) {
        canvas.width = maxWidth - minWidth + lineInfo.lineWidth
        canvas.height = maxHeight - minHeight + lineInfo.lineWidth
        canvas.style.left = minWidth - lineInfo.lineWidth / 2 + 'px'
        canvas.style.top = minHeight - lineInfo.lineWidth / 2 + 'px'
      }
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = lineInfo.color
      ctx.lineWidth = lineInfo.lineWidth
      ctx.lineCap = 'round'; // 线段端点为圆角
      ctx.lineJoin = 'round'; // 线段交汇处为圆角
      ctx.beginPath()
      lineInfo.pointList.forEach((point) => {
        if (!scaleInfo) {
          ctx.lineTo(point[0] - minWidth + lineInfo.lineWidth / 2, point[1] - minHeight + lineInfo.lineWidth / 2)
        } else {
          ctx.lineTo(point[0] * wScale, point[1] * hScale)
        }
      })
      ctx.stroke()
    }
    return () => (
      <div ref={root} class={style.editImage}>
        <div class="close" onClick={close}><CloseOutlined /></div>
        <div class="mask-layer"></div>
        <div class="edit-image-container">
          <img
            ref={image}
            style={{
              ...transition.value
            }}
            class="image"
            src={img.value.url}
            alt={img.value.file.name}
          />
          {
            (canvasInfo.value.pencil?.list || []).map((lineInfo) => {
              return <canvas class="canvas" style={{pointerEvents: canvasInfo.value.pointerEvents}} ref={(e) => setCanvas(e, lineInfo)}></canvas>
            })
          }
          { cutState.value
            ? <div class="cut">
                <div 
                  ref={region}
                  style={cutInfo.value}
                  class="region"
                  onMousedown={updateMoveDown}
                  onMouseup={updateMoveDown}
                >
                  <div class="left-top"></div>
                  <div class="left-bottom"></div>
                  <div class="right-top"></div>
                  <div class="right-bottom"></div>
                </div>
                <div ref={topEl} class="top"></div>
                <div ref={bottomEl} class="bottom"></div>
                <div ref={leftEl} class="left"></div>
                <div ref={rightEl} class="right"></div>
              </div>
            : null }
          { showToolBar.value ?
            <div class="toolbar" onMousedown={(e) => e.stopPropagation()}>
              <span class='anticon xicon' title="画笔" tabindex="-1" onClick={(e) => pencil(e, {
                lineWidth: 2,
                lineColor: '#FF0000',
                state: 'pencil'
              })}>
                <Edit32Regular></Edit32Regular>
              </span>
              <span class='anticon xicon' title="记号笔" tabindex="-1" onClick={(e) => pencil(e, {
                lineWidth: 15,
                lineColor: colorToHalfTransparent('#FF0000', 0.4),
                state: 'markerpen'
              })}>
                <PenFountain></PenFountain>
              </span>
              <ScissorOutlined title="裁剪" onClick={cut} />
              <SaveOutlined title="保存" onClick={save} />
            </div> : null }
        </div>
      </div>
    )
  }
})

export function useEditImage(img: Img, options: {
  save: Save,
  from?: CssStyle
}){
  const { save, from } = options || {}
  const root = document.createElement('div')
  Object.keys(style).forEach(key => root.style[key] = style[key])
  let app: App
  const close = () => {
    app.unmount()
    root.remove()
  }
  app = createApp(EditImage, { img, close, save, from })
  app.mount(root)
  document.body.appendChild(root)
  return close
}

export default EditImage