import { message } from 'ant-design-vue';

type Format = (...args: any[]) => string;
const useMessage = (callback: Function) => {
  return function <T>(DescMap?: T, format?: Format) {
    return function(description: string) {
      // 转化错误描述description
      const desc = (format ? format(description) : description) as keyof T
      // 将description转换为枚举值
      const message = DescMap && DescMap[desc] ? DescMap[desc] : description
      // 判断是否为undefined
      if (DescMap && DescMap[desc] === undefined) {
        console.warn(("Undefined message type：" + description))
      }
      // 将枚举值输出到消息中
      callback(message)
    }
  }
}

export const useError = useMessage(message.error)
export const useSuccess = useMessage(message.success)