import { CloseOutlined } from "@ant-design/icons-vue";
import { App, createApp, defineComponent, onMounted, onUnmounted, PropType, ref, watch } from "vue";
import style from "./PreviewImage.module.scss"

export type Img = {
  url: string;
  name: string
}

const PriviewImage = defineComponent({
  name: "PriviewImage",
  props: {
    img: Object as PropType<Img>,
    close: {
      type: Function as PropType<() => void>,
      default: () => {}
    }
  },
  setup(props) {
    const scale = ref(1)
    const cursor = ref('grab')
    let coordinate: {x: number, y: number}
    let transform: {x: number, y: number} = {x: 0, y: 0}
    let styleTransform: {x: number, y: number} = {x: 0, y: 0}
    let target: EventTarget
    const wheel = (e: WheelEvent) => {
      scale.value = Math.min(10, Math.max(0.1, scale.value + ((e.deltaY < 0 ? 1 : -1) * 0.1 * scale.value)))
    }
    const mouseMove = (e: MouseEvent) => {
      const { x, y } = e
      transform = { x: transform.x + x - coordinate.x, y: transform.y + y - coordinate.y }
      styleTransform = {x: transform.x / scale.value, y: transform.y / scale.value}
      ;(target as HTMLElement).style.transform = `translate(${styleTransform.x}px, ${styleTransform.y}px)`
      coordinate = { x, y }
    }
    const updateMouseState = (e: MouseEvent) => {
      const state = e.type === 'mousedown' ? true : false
      if (state) {
        if (e.buttons !== 1) return
        cursor.value = 'grabbing'
        coordinate = { x: e.x, y: e.y }
        document.addEventListener('mousemove', mouseMove)
        target = e.target
      } else {
        cursor.value = 'grab'
        document.removeEventListener('mousemove', mouseMove)
        target = null
      }
    }
    watch(() => scale.value, () => {
      transform = {x: styleTransform.x * scale.value, y: styleTransform.y * scale.value}
    })

    onMounted(() => {
      document.addEventListener('mouseup', updateMouseState)
    })
    onUnmounted(() => {
      document.removeEventListener('mouseup', updateMouseState)
    })
    return () => (
      <div class={style.previewImage} onWheel={wheel}>
        <div class="close" onClick={props.close}><CloseOutlined /></div>
        <div class="mask-layer"></div>
        <div class="preview-image-container">
          <img
            class="image"
            style={{
              scale: scale.value,
              cursor: cursor.value
            }}
            src={props.img.url}
            alt={props.img.name}
            onMousedown={updateMouseState}
            onMouseup={updateMouseState}
          />
        </div>
      </div>
    )
  }
})

export function usePriviewImage(img: Img){
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
  app = createApp(PriviewImage, { img, close })
  app.mount(root)
  document.body.appendChild(root)
  return close
}

export default PriviewImage