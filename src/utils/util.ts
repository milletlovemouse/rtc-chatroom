export function debounce<T>(
  fn: (...args: any[]) => T,
  delay: number,
  immediate: boolean = false
) { 
  let isInvoke = false
  let timer: NodeJS.Timeout = null
  const _debounce = function (...args: any[]): Promise<T> { 
    return new Promise((resolve, reject) => {
      if (immediate && !isInvoke) {
        try {
          const result = fn.apply(this, args) as T
          resolve(result)
        } catch (error) {
          reject(error)
        }
        isInvoke = true
      } else { 
        timer && clearTimeout(timer)
        timer = setTimeout(() => { 
          try {
            const result = fn.apply(this, args) as T
            resolve(result)
          } catch (error) {
            reject(error)
          }
          isInvoke = false
        }, delay)
      }
    })
  }

  _debounce.cancel = function () { 
    if (timer) clearTimeout(timer)
    timer = null
    isInvoke = false
  }

  return _debounce
}

export function throttle<T>(
  fn: (...args: any[]) => T,
  interval: number,
  options = {
    leading: true,
    trailing: false
  }
) {
  const { leading, trailing } = options
  let lastTime = 0
  let timer = null

  const _throttle = function (...args: any[]): Promise<T> { 
    return new Promise((resolve, reject) => {
      const nowTime = new Date().getTime()
      if(!lastTime && !leading) lastTime = nowTime
      const remainTime = interval - (nowTime - lastTime)
      if (remainTime <= 0) { 
        if (timer) { 
          clearTimeout(timer)
          timer = null
        }
        try {
          const result = fn.apply(this, args) as T
          resolve(result)
        } catch (error) {
          reject(error)
        }
        lastTime = nowTime
        return 
      } else if (trailing && !timer) { 
        timer = setTimeout(() => { 
          try {
            const result = fn.apply(this, args) as T
            resolve(result)
          } catch (error) {
            reject(error)
          }
          lastTime = !leading ? 0 : new Date().getTime()
          timer = null
        }, remainTime)
      }
    })
  }

  _throttle.cancel = function () { 
    if (timer) clearTimeout(timer)
    timer = null
    lastTime = 0
  }

  return _throttle
}

export const isBoolean = (data: any) => typeof data === 'boolean'
export const isNumber = (data: any) => typeof data === 'number'
export const isString = (data: any) => typeof data === 'string'
export const isFunction = (data: any) => typeof data === 'function'

export const isArray = (data: any) => Array.isArray(data)

export const isType = (data: any, type: string) => toString.call(data) === `[object ${type}]`
export const isObject = (data: any) => isType(data, 'Object')