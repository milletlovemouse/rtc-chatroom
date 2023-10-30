import { useError, useSuccess, useWarning } from "../message"

const Message = {
  USER_PERMISSION_DENIED: "用户未允许浏览器访问摄像头和麦克风",
  DISPLAY_PERMISSION_DENIED: "用户已取消屏幕共享",
  DISPLAY_SUCCESS: "已开启屏幕共享",
  USER_SUCCESS: "用户已加入会议",
  USER_COULD_NOT_START_VIDEO_SOURCE: "无法开启摄像头",
}

type MessageKeyMap = {
  [x in keyof typeof Message]: x
}

export const MessageKeyMap: MessageKeyMap = {
  USER_PERMISSION_DENIED: "USER_PERMISSION_DENIED",
  DISPLAY_PERMISSION_DENIED: "DISPLAY_PERMISSION_DENIED",
  DISPLAY_SUCCESS: "DISPLAY_SUCCESS",
  USER_SUCCESS: "USER_SUCCESS",
  USER_COULD_NOT_START_VIDEO_SOURCE: "USER_COULD_NOT_START_VIDEO_SOURCE",
}

const format = (description: string) => description.split(' ').join('_').toUpperCase()
export const onError = useError(Message, format)
export const onWarning = useWarning(Message, format)
export const onSuccess = useSuccess(Message, format)