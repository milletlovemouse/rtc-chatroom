import { Ref, watch } from "vue"

export default function useResizeObserver(target: Ref<Element>, callback: ResizeObserverCallback) {
  let resizeObserver: ResizeObserver
  const disconnect = () => {
    resizeObserver && resizeObserver.disconnect()
    resizeObserver = null
  }
  return () => {
    disconnect()
    watch(() => target.value, (con) => {
      disconnect()
      if (con) {
        resizeObserver = new ResizeObserver(callback)
        resizeObserver.observe(con)
      }
    }, { immediate: true })
    return disconnect
  }
}