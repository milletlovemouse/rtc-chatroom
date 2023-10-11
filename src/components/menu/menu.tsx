import { defineComponent, FunctionalComponent, h, PropType, DefineComponent, createApp, Ref, reactive, App } from "vue";
import style  from './menu.module.scss'

export type MenuItem = {
  /** 菜单名称 */
  name: string
  /** 菜单图标 */
  icon: DefineComponent | FunctionalComponent
  /** 菜单事件 */
  methods: (value: MenuItem) => void
}

export type MenuList = Array<MenuItem>
export type Props = {
  /** 菜单数据 */
  menuList: MenuList
}

export const MenuChild = defineComponent({
  name: 'MenuChild',
  props: {
    menu: {
      type: Object as PropType<MenuItem>,
      default: null
    }
  },
  setup(props, { attrs }) {
    return () => (
      <li class={ style.menuChild } onClick={() => props.menu.methods(props.menu)}>
        <span class={ style.prefixIcon }>
          { h(props.menu.icon) }
        </span>
        <span class={ style.menuName }>
          { props.menu.name }
        </span>
      </li>
    );
  }
})

export const Menu = defineComponent({
  name: 'Menu',
  components: {
    MenuChild
  },
  props: {
    menuList: {
      type: Object as PropType<MenuList>,
      default: () => []
    }
  },
  setup(props, { attrs }) {
    return () => (
      <ul class={ style.menu }>
        {props.menuList.map(item => (
          <MenuChild menu={item} />
        ))}
      </ul>
    );
  }
})

export function createMenu(menuList: Ref<MenuList> | MenuList, style: Partial<CSSStyleDeclaration> = {}) {
  const root = document.createElement('div')
  const rootStyle = {
    ...root.style,
    ...style
  }
  Object.keys(rootStyle).forEach(key => root.style[key] = rootStyle[key])
  let app: App
  const close = () => {
    app.unmount()
    root.remove()
  }
  app = createApp(Menu, { menuList })
  app.mount(root)
  const { width: bodyW, height: bodyH } = document.body.getBoundingClientRect()
  document.body.appendChild(root)
  const { left, top, width, height } = root.getBoundingClientRect()
  if (left + width > bodyW) {
    root.style.left = `${bodyW - width}px`
  }
  if (top + height > bodyH) {
    root.style.top = `${bodyH - height}px`
  }
  return close
}

export default Menu