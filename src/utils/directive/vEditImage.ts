import { App, DirectiveBinding } from "vue";
import { Img, Save, useEditImage } from "@/components/edit/EditImage"

export type Options = {
  img: Img,
  once?: boolean,
  handler: Save
}
export default function editImage(app: App) {
  const ImgMap = new WeakMap<Element, Options>(); // 指令接收的参数可能存在更新，顶层作用域代理参数
  app.directive('edit-image', {
    mounted(el: Element, binding: DirectiveBinding<Options>) {
      ImgMap.set(el, binding.value);
      el.addEventListener('click', () => {
        const { img, once, handler } = ImgMap.get(el);
        const close = useEditImage(img, (...args) => {
          handler(...args);
          if (once) {
            close();
          }
        });
      })
    },
    updated(el: Element, binding: DirectiveBinding<Options>) {
      ImgMap.set(el, binding.value);
    },
    unmounted(el: Element) {
      ImgMap.delete(el);
    }
  })
}