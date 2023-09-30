import { App, DirectiveBinding } from "vue";
import { useMenu, MenuList } from '@/components/menu/menu';

export default function menu(app: App) {
  const body = document.querySelector("body");
  let close = () => {} // 顶层作用域，实现只存在一个菜单在页面上
  app.directive("menu", {
    mounted: (el: Element, binding: DirectiveBinding<MenuList>) => {
      const menuList = binding.value;
      el.addEventListener(
        "contextmenu",
        (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          const { x, y } = event
          close()
          close = useMenu(menuList, {
            display: 'inline-block',
            position: 'absolute',
            top: y + 'px',
            left: x + 'px',
          })
          bodyAddListener()
        },
        false
      );
    }
  });
  let state = false // 记录body元素事件状态，菜单作用的element切换时无需频繁注册移除事件
  function bodyAddListener() {
    if (state) return
    body.addEventListener('click', click)
    body.addEventListener('contextmenu', click)
    state = true
  }
  function bodyRemoveListener() {
    if (!state) return
    body.removeEventListener('click', click)
    body.removeEventListener('contextmenu', click)
    state = false
  }
  function click() {
    close()
    bodyRemoveListener()
    close = () => {}
  }
}