import { App, DirectiveBinding } from "vue"
import { Img, usePriviewImage } from "@/components/preview/PreviewImage"

export default function previewImage(app: App) {
  const ImgMap = new WeakMap<Element, Img>() // 指令接收的参数可能存在更新，顶层作用域代理参数
  app.directive('preview', {
    mounted(el: Element, binding: DirectiveBinding<Img>) {
      ImgMap.set(el, binding.value);
      el.addEventListener('click', () => {
        const img = ImgMap.get(el)
        usePriviewImage(img);
      })
    },
    updated(el: Element, binding: DirectiveBinding<Img>) {
      ImgMap.set(el, binding.value)
    },
    unmounted(el: Element) {
      ImgMap.delete(el)
    }
  })
}