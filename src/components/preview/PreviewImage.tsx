import { CloseOutlined } from "@ant-design/icons-vue";
import { App, computed, createApp, defineComponent, onMounted, onUnmounted, PropType, ref, watch } from "vue";
import style from "./PreviewImage.module.scss"

export type Img = {
  url: string;
  name: string
}

export type CssStyle = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  opacity?: number;
}

const PriviewImage = defineComponent({
  name: "PriviewImage",
  props: {
    from: {
      type: Object as PropType<CssStyle>,
    },
    img: {
      type: Object as PropType<Img>,
      required: true
    },
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
    let styleTransform = ref({x: 0, y: 0})
    let target: EventTarget
    const wheel = (e: WheelEvent) => {
      scale.value = Math.min(10, Math.max(0.1, scale.value + ((e.deltaY < 0 ? 1 : -1) * 0.1 * scale.value)))
    }
    const mouseMove = (e: MouseEvent) => {
      const { x, y } = e
      transform = { x: transform.x + x - coordinate.x, y: transform.y + y - coordinate.y }
      styleTransform.value = {x: transform.x / scale.value, y: transform.y / scale.value}
      ;(target as HTMLElement).style.transform = `translate(${styleTransform.value.x}px, ${styleTransform.value.y}px)`
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
      transform = {x: styleTransform.value.x * scale.value, y: styleTransform.value.y * scale.value}
    })

    const from = computed(() => {
      if (props.from) {
        const clientWidth = window.innerWidth
        const clientHeight = window.innerHeight
        const parentLeft = window.innerWidth / 20
        const parentTop = window.innerHeight / 20
        const parentMaxWidth = window.innerWidth - parentLeft * 2
        const parentMaxHeight = window.innerHeight - parentTop * 2
        const from = {...props.from as CssStyle}
        
        from.left = Math.min(from.left - (clientWidth - Math.min(from.width, parentMaxWidth)) / 2, from.left) - styleTransform.value.x
        from.top = Math.min(from.top - (clientHeight - Math.min(from.height, parentMaxHeight)) / 2, from.top) - styleTransform.value.y
        Object.keys(from).forEach(key => {
          from[key] = from[key] + 'px'
        })
        from.opacity = 0.5
        return from
      } 
      return {}
    })
    const transition = ref(from.value)
    const imgRef = ref<HTMLImageElement>(null)
    const close = (e: MouseEvent) => {
      e.stopPropagation()
      if (props.from) {
        transition.value = from.value
        imgRef.value.ontransitionend = () => {
          props.close()
        }
      } else {
        props.close()
      }
    }

    onMounted(() => {
      document.addEventListener('mouseup', updateMouseState)
      if (props.from) {
        setTimeout(() => {
          transition.value = {}
        })
      }
    })
    onUnmounted(() => {
      document.removeEventListener('mouseup', updateMouseState)
    })
    return () => (
      <div class={style.previewImage} onClick={close} onWheel={wheel}>
        <div class="close" onClick={close}><CloseOutlined /></div>
        <div class="mask-layer"></div>
        <div class="preview-image-container">
          <img
            ref={imgRef}
            class="image"
            style={{
              scale: scale.value,
              cursor: cursor.value,
              ...transition.value
            }}
            src={props.img.url}
            alt={props.img.name}
            onMousedown={updateMouseState}
            onMouseup={updateMouseState}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    )
  }
})

export function usePriviewImage(img: Img, from?: CssStyle){
  const root = document.createElement('div')
  Object.keys(style).forEach(key => root.style[key] = style[key])
  let app: App
  const close = () => {
    app.unmount()
    root.remove()
  }
  app = createApp(PriviewImage, { img, close, from })
  app.mount(root)
  document.body.appendChild(root)
  return close
}

export default PriviewImage