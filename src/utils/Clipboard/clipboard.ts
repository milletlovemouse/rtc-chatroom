import { message } from 'ant-design-vue';
import { fileAndBlobToBase64 } from '../fileUtils';
import { useError, useSuccess } from '../message';

export enum ClipboardItemTypes {
  /** 文本 */
  TEXT = 'text/plain',
  /** 图像 */
  IMAGE = 'image/png'
}

export type ClipboardItemType = typeof ClipboardItemTypes[keyof typeof ClipboardItemTypes];

export type ClipboardList = Array<{ type: ClipboardItemType, value: string }>

export enum DescEnum {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  COPY_SUCCESS = 'COPY_SUCCESS',
  COPY_FAILED = 'COPY_FAILED',
}
export enum DescMap {
  READ_PERMISSION_DENIED = '剪切板读取访问权限被拒绝',
  NO_VALID_DATA_ON_CLIPBOARD = '剪切板中没有有效的数据',
  SUCCESS = '剪切板操作成功',
  FAILED = '剪切板操作失败',
  COPY_SUCCESS = '复制成功',
  COPY_FAILED = '复制失败',
}

const format = (description: string) => description.split(' ').join('_').toUpperCase().replace('.', '')
const onError = useError(DescMap, format)
const onSuccess = useSuccess(DescMap, format)

// 读取剪切板
export const read = (): Promise<ClipboardList> => {
  return new Promise(async (resolve, reject) => {
    try {
      // 创建一个ClipboardList类型的数组
      const list: ClipboardList = []
      // 读取剪切板
      const clipboards = await navigator.clipboard.read()
      // 遍历剪切板
      for (let clipboardItem of clipboards) {
        // 遍历剪切板中的每一个类型
        for (let type of clipboardItem.types) {
          // 获取类型的文件
          const blob = await clipboardItem.getType(type)
          // 调用clipCategory函数，获取文件的值
          const value = await clipCategory(blob, type)
          // 如果值存在，则添加到ClipboardList数组中
          if(value) {
            list.push({
              type: type as ClipboardItemTypes,
              value
            })
          }
        }
      }
      // 返回ClipboardList数组
      resolve(list)
      onSuccess(DescEnum.SUCCESS)
    } catch (error) {
      // 捕获错误
      reject(error)
      // 调用onError函数，捕获错误信息
      onError(error.message)
    }
  })
}

export const clipCategory = (blob: Blob, type: string): Promise<string | null> => {
  // 根据类型判断是否需要处理
  switch (type) {
    case ClipboardItemTypes.TEXT:
      // 读取文本
      return readAsText(blob)
    case ClipboardItemTypes.IMAGE:
      // 读取图片
      return fileAndBlobToBase64(blob)
    default:
      // 如果不是正确的类型，则返回null
      return Promise.resolve(null);
  }
}

export const readAsText = (blobData: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 创建一个文件读取器
    const reader = new FileReader()
    // 监听读取完成事件
    reader.onload = () => {
      // 解析读取的结果
      resolve(reader.result as string)
    }
    // 监听读取错误事件
    reader.onerror = reject
    // 使用文件读取器读取blobData
    reader.readAsText(blobData)
  })
}

export const writeclipText = async (text: string) => {
  try {
    // 将文本写入剪切板
    await navigator.clipboard.writeText(text)
    console.log("Fetched image copied.");
    onSuccess(DescEnum.COPY_SUCCESS)
  } catch (err) {
    console.error(err.name, err.message);
    onError(err.message)
  }
}

// 目前只能写入image/png图片数据
export const writeClipImg = async (img: Blob) => {
  try {
    // 将图片数据写入剪切板
    await navigator.clipboard.write([
      new ClipboardItem({
        [img.type]: img,
      }),
    ]);
    onSuccess(DescEnum.COPY_SUCCESS)
    console.log("Fetched image copied.");
  } catch (err) {
    console.error(err.name, err.message);
    onError(err.message)
  }
}