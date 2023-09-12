export type Callback =  (...args: any[]) => void
export type EventMap = Map<string, Set<Callback>>

export default class CustomEvent {
  target: EventTarget;
  eventMap: EventMap = new Map()
  constructor(target?: EventTarget) {
    this.target = target
  }

  on(eventName: string, callback: (...args: any[]) => void) {
    this.target.addEventListener(eventName, callback)
    if (this.eventMap.has(eventName)) {
      this.eventMap.get(eventName).add(callback)
    } else {
      this.eventMap.set(eventName, new Set([callback]))
    }
  }

  off(eventName: string, callback?: (...args: any[]) => void) {
    if (!callback && this.eventMap.has(eventName)) {
      this.eventMap.get(eventName).forEach(
        callback => this.target.removeEventListener(eventName, callback)
      )
      this.eventMap.get(eventName).clear()
    }
    this.target.removeEventListener(eventName, callback)
    if (this.eventMap.has(eventName)) {
      this.eventMap.get(eventName).delete(callback)
    }
  }

  offAll() {
    this.eventMap.forEach((value, key) => {
      this.off(key)
    })
  }

  close() {
    this.offAll()
    this.target = null
  }
}