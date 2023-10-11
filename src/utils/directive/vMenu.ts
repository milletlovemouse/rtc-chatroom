import { App, DirectiveBinding } from "vue";
import { MenuList } from '@/components/menu/menu';
import useMenu from "/@/hooks/useMenu";

export default function menu(app: App) {
  const menuMap = new WeakMap<Element, MenuList>(); // 指令接收的参数可能存在更新，顶层作用域代理参数
  app.directive("menu", {
    mounted(el: Element, binding: DirectiveBinding<MenuList>) {
      const menuList = binding.value;
      menuMap.set(el, menuList);
      el.addEventListener(
        "contextmenu",
        (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          const menuList = menuMap.get(el)
          useMenu(event, menuList)
        },
        false
      );
    },
    updated(el: Element, binding: DirectiveBinding<MenuList>) {
      const menuList = binding.value;
      menuMap.set(el, menuList);
    },
    unmounted(el: Element) {
      menuMap.delete(el);
    }
  });
}