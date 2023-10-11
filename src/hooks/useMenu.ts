import { createMenu, MenuList } from "../components/menu/menu";

const useMenu = (() => {
  const body = document.body
  let state = false // 记录body元素事件状态，菜单作用的element切换时无需频繁注册移除事件
  let close = () => {}
  return (event: MouseEvent, menuList: MenuList) => {
    const { x, y } = event
    close()
    close = createMenu(menuList, {
      display: 'inline-block',
      position: 'absolute',
      top: y + 'px',
      left: x + 'px',
    })
    bodyAddListener()
  }
  
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
})()

export default useMenu
