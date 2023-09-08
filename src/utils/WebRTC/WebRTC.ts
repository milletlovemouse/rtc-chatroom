import { useError, useSuccess } from "../message";
import MediaDevices from "/@/utils/MediaDevices/mediaDevices";

const Message = {
  USER_PERMISSION_DENIED: "用户未允许浏览器访问摄像头和麦克风",
  DISPLAY_PERMISSION_DENIED: "用户已取消屏幕共享",
  DISPLAY_SUCCESS: "已开启屏幕共享",
  USER_SUCCESS: "用户已加入会议",
}

type MessageKeyMap = {
  [x in keyof typeof Message]: x
}

const MessageKeyMap: MessageKeyMap = {
  USER_PERMISSION_DENIED: "USER_PERMISSION_DENIED",
  DISPLAY_PERMISSION_DENIED: "DISPLAY_PERMISSION_DENIED",
  DISPLAY_SUCCESS: "DISPLAY_SUCCESS",
  USER_SUCCESS: "USER_SUCCESS",
}

const format = (description: string) => description.split(' ').join('_').toUpperCase()
export const onError = useError(Message, format)
export const onSuccess = useSuccess(Message, format)

export default class WebRTC {
  mediaDevices: MediaDevices
  localStream: MediaStream
  localDisplayStream: MediaStream
  remoteStream: MediaStream
  peerConnection: RTCPeerConnection
  private localRTCRtpSenderList: RTCRtpSender[]
  private localDisplayRTCRtpSenderList: RTCRtpSender[]

  constructor(constraints: MediaStreamConstraints) {
    this.mediaDevices = new MediaDevices(constraints);
    this.init()
  }

  init() {
    this.createPeerConnection()
  }

  createPeerConnection() {
    // 创建 PeerConnection
    this.peerConnection = new RTCPeerConnection();
  }

  addTrack(track: MediaStreamTrack | MediaStreamTrack[], stream: MediaStream): RTCRtpSender[] {
    // 将本地媒体流添加到 PeerConnection
    track = Array.isArray(track) ? track : [track]
    return track.map(track => this.peerConnection.addTrack(track, stream))
  }

  removeTrack(sender: RTCRtpSender | RTCRtpSender[] = []): void {
    // 从 PeerConnection 中移除媒体流
    const senderList = Array.isArray(sender) ? sender : [sender]
    senderList.forEach(sender => this.peerConnection.removeTrack(sender))
  }

  async showLocalStream(video: HTMLVideoElement) {
    try {
      // 显示本地媒体流
      this.localStream = await this.mediaDevices.getUserMedia()
      const audioTracks = this.localStream.getAudioTracks()
      const videoTracks = this.localStream.getVideoTracks()
      // 移除上次添加的本地流
      this.removeTrack(this.localRTCRtpSenderList)
      // 添加本次本第流
      this.localRTCRtpSenderList = this.addTrack([...videoTracks, ...audioTracks], this.localStream)
      // 移除自己的音轨
      this.mediaDevices.removeTrack(audioTracks, this.localStream)
      video.srcObject = this.localStream
      video.play()
      this.onSuccess(MessageKeyMap.USER_SUCCESS)
    } catch (error) {
      const message = 'USER_' + error.message.toUpperCase()
      this.onError(message)
    }
  }
  
  async shareDisplayMedia(video: HTMLVideoElement) {
    try {
      // 共享屏幕
      this.localDisplayStream = await this.mediaDevices.getDisplayMedia()
      const audioTracks = this.localDisplayStream.getAudioTracks()
      const videoTracks = this.localDisplayStream.getVideoTracks()
      // 移除上次添加的本地流
      this.removeTrack(this.localDisplayRTCRtpSenderList)
      // 添加本次本第流
      this.localDisplayRTCRtpSenderList = this.addTrack([...videoTracks, ...audioTracks], this.localDisplayStream)
      // 移除自己的音轨
      this.mediaDevices.removeTrack(audioTracks, this.localDisplayStream)
      video.srcObject = this.localDisplayStream
      video.play()
      this.onSuccess(MessageKeyMap.DISPLAY_SUCCESS)
    } catch (error) {
      const message = 'DISPLAY_' + error.message.toUpperCase()
      this.onError(message)
    }
  }

  private onError(message: string) {
    onError(message)
    console.error(message);
  }

  private onSuccess(message: string) {
    onSuccess(message)
    console.log(message);
  }
}