import { defineComponent, createApp, PropType, ref, App, onUnmounted, watch, nextTick, onMounted, computed } from "vue";
import { SaveOutlined, ScissorOutlined, CloseOutlined, RiseOutlined, ExpandOutlined, BorderOutlined } from "@ant-design/icons-vue";
import { IosRedo, IosUndo } from "@vicons/ionicons4"
import { AutoAwesomeMosaicSharp } from "@vicons/material";
import { Edit32Regular } from "@vicons/fluent";
import { PenFountain } from "@vicons/carbon";
import draw, { cropPicture, getOriginalImageRect } from "./utils";
import style from "./EditImage.module.scss"
import { base64ToFile } from "/@/utils/fileUtils";
import useResizeObserver from "/@/hooks/useResizeObserver";
import { colorToHalfTransparent } from "/@/utils/colorUtils";
import { onSuccess, onWarning } from "/@/utils/WebRTC/message";
import deepcopy from "deepcopy";

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
    const inputColor = ref<HTMLInputElement>(null)
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

    // 画笔类型
    type GraphState = 'pencil' | 'markerpen' | 'polyline' | 'rect' | 'mosaic'
    const graphState = ref<GraphState>(null)

    type LineInfo = {
      type: GraphState;
      lineColor: string;
      lineWidth: number;
      pointList: Array<[number, number]>
    }
    const canvasInfo = ref<{
      // css属性，元素不会成为事件的target
      pointerEvents: 'none' | 'auto';
      // 图形打点数据
      graphList?: Array<LineInfo>
    }>({
      pointerEvents: 'auto',
    })
    let redoGraphList: Array<LineInfo> = []
    const lineColor = ref<string>('#FF0000')
    const lineColorRef = computed(() => graphState.value === 'markerpen' ? colorToHalfTransparent(lineColor.value, 0.4) : lineColor.value)
    const lineWidth = ref<number>(2)
    const resetCanvasInfo = () => {
      delete canvasInfo.value.graphList
    }

    // 折线交互状态
    const polylineStateRef = ref({
      down: false,
      move: false,
      begin: true, // 决定当前点是否为折线起始点，受down、move影响
    })

    watch(() => graphState.value, () => {
      polylineStateRef.value = {
        down: false,
        move: false,
        begin: true,
      }
      image.value.removeEventListener('mousemove', drawMouse)
      document.removeEventListener('mouseup', drawMouse)
    })

    // 'pencil' | 'markerpen' | 'rect' mousedown 事件
    const pencilDown = (e: MouseEvent, list: Array<LineInfo>) => {
      const { offsetX, offsetY } = e
      list.push({
        type: graphState.value,
        lineColor: lineColorRef.value,
        lineWidth: lineWidth.value,
        pointList: [[offsetX, offsetY]]
      })
      canvasInfo.value.graphList = list
      image.value.addEventListener('mousemove', drawMouse)
      document.addEventListener('mouseup', drawMouse)
    }
    const markerpenDown = pencilDown
    const rectDown = pencilDown
    const mosaicDown = rectDown

    // 'polyline' mousedown 事件
    const polylineDown = (e: MouseEvent, list: Array<LineInfo>) => {
      const { offsetX, offsetY } = e
      polylineStateRef.value.down = true
      if (polylineStateRef.value.begin) {
        list.push({
          type: graphState.value,
          lineColor: lineColorRef.value,
          lineWidth: lineWidth.value,
          pointList: [[offsetX, offsetY], [offsetX, offsetY]]
        })
      } else {
        const pointList = list.at(-1).pointList
        pointList.push([offsetX, offsetY])
      }
      canvasInfo.value.graphList = list
      if (polylineStateRef.value.begin) {
        image.value.addEventListener('mousemove', drawMouse)
        document.addEventListener('mouseup', drawMouse)
      }
    }

    // 'pencil' mousemove 事件
    const pencilMove = (e: MouseEvent, list: Array<LineInfo>) => {
      const { offsetX, offsetY } = e
      const lineInfo = list.at(-1)
      lineInfo.pointList.push([offsetX, offsetY])
    }

    // 'markerpen' | 'rect' mousemove 事件
    const markerpenMove = (e: MouseEvent, list: Array<LineInfo>) => {
      const { offsetX, offsetY } = e
      const lineInfo = list.at(-1)
      lineInfo.pointList[1] = [offsetX, offsetY]
    }
    const rectMove = markerpenMove
    const mosaicMove = rectMove

    // 'polyline' mousemove 事件
    const polylineMove = (e: MouseEvent, list: Array<LineInfo>) => {
      const { offsetX, offsetY } = e
      const lineInfo = list.at(-1)
      const point = lineInfo.pointList.at(-1)
      point[0] = offsetX
      point[1] = offsetY
      if (polylineStateRef.value.down) {
        polylineStateRef.value.move = true
      }
    }

    // 'pencil' | 'markerpen' | 'rect' mouseup 事件
    const pencilUp = () => {
      image.value.removeEventListener('mousemove', drawMouse)
      document.removeEventListener('mouseup', drawMouse)
    }
    const markerpenUp = pencilUp
    const rectUp = pencilUp
    const mosaicUp = rectUp

    // 'polyline' mouseup 事件
    const polylineUp = () => {
      if (graphState.value === 'polyline') {
        polylineStateRef.value.begin = polylineStateRef.value.move
        polylineStateRef.value.down = false
        polylineStateRef.value.move = false
      }
      if (polylineStateRef.value.begin) {
        image.value.removeEventListener('mousemove', drawMouse)
        document.removeEventListener('mouseup', drawMouse)
      }
    }
    const mouseHandleMap = {
      mousedown: {
        pencil: pencilDown,
        markerpen: markerpenDown,
        polyline: polylineDown,
        rect: rectDown,
        mosaic: mosaicDown,
      },
      mousemove: {
        pencil: pencilMove,
        markerpen: markerpenMove,
        polyline: polylineMove,
        rect: rectMove,
        mosaic: mosaicMove,
      },
      mouseup: {
        pencil: pencilUp,
        markerpen: markerpenUp,
        polyline: polylineUp,
        rect: rectUp,
        mosaic: mosaicUp,
      }
    }

    function drawMouse(e: MouseEvent) {
      if (e.target !== image.value) return
      const list = canvasInfo.value.graphList || []
      mouseHandleMap[e.type][graphState.value](e, list)
      if (e.type === 'mousedown') {
        redoGraphList = []
      }
    }

    const graphStateToggle = (e: Event, options: {
      lineWidth: number,
      state: GraphState
    }) => {
      e.stopPropagation()
      lineWidth.value = options.lineWidth
      graphState.value = graphState.value === options.state ? null : options.state
      cutState.value = false
      reset()
    }

    const cutState = ref(false) // 记录是否开始裁剪
    const cut = (e: Event) => {
      e.stopPropagation()
      cutState.value = !cutState.value
      graphState.value = null
      reset()
    }

    const img = ref<Img>(props.img)
    watch(() => props.img, () => {
      img.value = props.img
    }, { deep: true })

    const originalImageRect = ref<DOMRect>(null)
    watch(() => img.value, async () => {
      originalImageRect.value = await getOriginalImageRect(img.value.file)
    }, { deep: true, immediate: true })

    const save = async (e: Event) => {
      e.stopPropagation()
      if (!canvasInfo.value.graphList && !region.value) {
        onWarning('无任何操作！')
        return
      }
      let canvas = document.createElement('canvas')
      const { width: imgWidth, height: imgHeight } = image.value.getBoundingClientRect()
      const { width: primitiveW, height: primitiveH } = originalImageRect.value
      const scaleInfo = {
        wScale: primitiveW / imgWidth,
        hScale: primitiveH / imgHeight
      }
      const ctx = canvas.getContext('2d')
      const canvasWidth = imgWidth * scaleInfo.wScale
      const canvasHeight = imgHeight * scaleInfo.hScale
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      ctx.drawImage(image.value, 0, 0, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight)

      if (canvasInfo.value.graphList)
        canvasInfo.value.graphList.forEach((list: LineInfo) => setCanvas(canvas, list, {...scaleInfo, isSave: true}))

      // 裁剪
      if (region.value) {
        const { width, height } = region.value.getBoundingClientRect()
        const left = Number(cutInfo.value.left.replace('px', '')) * scaleInfo.wScale
        const top = Number(cutInfo.value.top.replace('px', '')) * scaleInfo.hScale
        const cvsWidth = width * scaleInfo.wScale
        const cvsHeight = height * scaleInfo.hScale
        canvas = cropPicture(canvas, left, top, cvsWidth, cvsHeight)
      }

      const dataURL = canvas.toDataURL(img.value.file.type)
      const newImg = {
        url: dataURL,
        file: base64ToFile(dataURL, img.value.file.name)
      }
      props.save(newImg, img.value)
      img.value = newImg
      lineInfoMap = {}
      cutState.value = false
      graphState.value = null
      resetCanvasInfo()
      reset()
      onSuccess('保存成功！')
    }

    const reset = () => {
      // 重置裁剪
      if (cutState.value) {
        document.addEventListener('mousedown', updateDown)
        document.addEventListener('mouseup', updateDown)
        document.addEventListener('mousemove', updateCursor)
      } else {
        cutInfo.value = {...cutStyle}
        document.removeEventListener('mousedown', updateDown)
        document.removeEventListener('mouseup', updateDown)
        document.removeEventListener('mousemove', updateCursor)
        root.value.parentElement.style.cursor = 'auto'
      }
      // 重置画笔
      if (graphState.value) {
        canvasInfo.value.pointerEvents = 'none'
        image.value.style.cursor = 'crosshair'
        image.value.addEventListener('mousedown', drawMouse)
      } else {
        image.value.style.cursor = 'auto'
        image.value.removeEventListener('mousedown', drawMouse)
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

    const undo = () => {
      if (!canvasInfo.value.graphList?.length){
        return
      }
      const lineInfo = canvasInfo.value.graphList.pop()
      redoGraphList.push(lineInfo)
      const key = `canvas-${lineInfo.type}-${canvasInfo.value.graphList.length}`
      delete lineInfoMap[key]
    }

    const redo = () => {
      if (!redoGraphList.length) {
        return
      }
      const lineInfo = redoGraphList.pop()
      canvasInfo.value.graphList.push(lineInfo)      
    }

    const lineWidthResize = (e: WheelEvent) => {
      if (!graphState.value) return
      const value = e.deltaY > 0 ? 1 : -1
      lineWidth.value = Math.max(1, Math.min(16, lineWidth.value + value))
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
        graphState.value = null
        cutState.value = false
        transition.value = from.value
        showToolBar.value = false
        reset()
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
      document.addEventListener('wheel', lineWidthResize)
    })

    onUnmounted(() => {
      document.removeEventListener('mousedown', updateDown)
      document.removeEventListener('mouseup', updateDown)
      document.removeEventListener('mousemove', updateCursor)
      document.removeEventListener('mousemove', updateCutInfo)
      document.removeEventListener('mousemove', updateRegion)
      document.removeEventListener('mouseup', drawMouse)
      document.removeEventListener('wheel', lineWidthResize)
    })

    // 已经渲染的数据
    let lineInfoMap: Record<string, LineInfo> = {}
    /**
     * @param canvas 
     * @param lineInfo 
     * @param scaleInfo // 与原图的缩放比例，保存时此参数才最需要
     * @returns 
     */
    function setCanvas(canvas: HTMLCanvasElement, lineInfo: LineInfo & {key?: string}, scaleInfo?: {
      wScale: number,
      hScale: number,
      isSave?: boolean
    }) {
      if (!canvas) return
      const key = lineInfo.key
      if (key) {
        // 已经渲染的数据不再渲染
        if (lineInfoMap[key] && JSON.stringify(lineInfoMap[key]) === JSON.stringify(lineInfo)) {
          return
        } else {
          // 数据更新重新保存
          lineInfoMap[key] = deepcopy(lineInfo)
        }
      }
      
      const { lineColor, lineWidth, pointList } = lineInfo
      const option = {
        lineColor,
        lineWidth,
        pointList,
        scaleInfo
      }
      
      if (lineInfo.type === 'rect') {
        draw.drawRect(canvas, option)
      } else if (lineInfo.type === 'mosaic') {
        if (!scaleInfo) {
          const { width: imgWidth, height: imgHeight } = image.value.getBoundingClientRect()
          const { width: primitiveW, height: primitiveH } = originalImageRect.value
          option.scaleInfo = {
            wScale: primitiveW / imgWidth,
            hScale: primitiveH / imgHeight
          }
        }
        draw.drawMosaic(canvas, {
          ...option,
          img: image.value
        })
      } else {
        draw.drawLine(canvas, option)
      }
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
            (canvasInfo.value.graphList || []).map((lineInfo, index) => {
              return (
                <canvas
                  class="canvas"
                  ref={(e) => setCanvas(e as HTMLCanvasElement, {...lineInfo, key: `canvas-${lineInfo.type}-${index}`})}
                  key={`canvas-${lineInfo.type}-${index}`}
                  style={{pointerEvents: canvasInfo.value.pointerEvents}}>
                </canvas>
              )
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
              <span
                title={`${lineWidth.value}`}
                class="anticon edit-style"
                onClick={() => inputColor.value.click()}
              >
                <span class="line-width">
                  <span
                    class="point"
                    style={{
                      background: lineColorRef.value,
                      width: lineWidth.value + 'px',
                      height: lineWidth.value + 'px'
                    }}
                  ></span>
                </span>
                <input type="color" ref={inputColor} v-model={lineColor.value} />
              </span>
              <BorderOutlined
                class={{active: graphState.value === 'rect'}}
                title="矩形"
                onClick={(e) => graphStateToggle(e, {
                  lineWidth: 2,
                  state: 'rect'
                })}
              />
              <RiseOutlined
                class={{active: graphState.value === 'polyline'}}
                title="折线"
                onClick={(e) => graphStateToggle(e, {
                  lineWidth: 5,
                  state: 'polyline'
                })}
              />
              <span
                class={{
                  anticon: true,
                  xicon: true,
                  active: graphState.value === 'pencil'
                }}
                title="画笔"
                tabindex="-1"
                onClick={(e) => graphStateToggle(e, {
                  lineWidth: 2,
                  state: 'pencil'
                })}
              >
                <Edit32Regular />
              </span>
              <span 
                class={{
                  anticon: true,
                  xicon: true,
                  active: graphState.value === 'markerpen'
                }}
                title="记号笔"
                tabindex="-1"
                onClick={(e) => graphStateToggle(e, {
                  lineWidth: 15,
                  state: 'markerpen'
                })}
              >
                <PenFountain />
              </span>
              <span
                class={{
                  anticon: true,
                  xicon: true,
                  active: graphState.value === 'mosaic'
                }}
                title="马赛克"
                tabindex="-1"
                onClick={(e) => graphStateToggle(e, {
                  lineWidth: 0,
                  state: 'mosaic'
                })}
              >
                <AutoAwesomeMosaicSharp />
              </span>
              <ExpandOutlined class={{active: cutState.value}} title="裁剪" onClick={cut} />
              {/* <ScissorOutlined class={{active: cutState.value}} title="裁剪" onClick={cut} /> */}
              <span
                class="anticon xicon"
                title="撤销"
                tabindex="-1"
                onClick={undo}
              >
                <IosUndo />
              </span>
              <span
                class="anticon xicon"
                title="重做"
                tabindex="-1"
                onClick={redo}
              >
                <IosRedo />
              </span>
              <CloseOutlined title="退出编辑" onClick={close} />
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