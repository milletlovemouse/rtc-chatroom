import { MessageEvent, MessageKeyMap } from "./rtc-client"
import MediaDevices from "../MediaDevices/mediaDevices"

export default class WebRTC {
  configuration: RTCConfiguration
  peerConnection: RTCPeerConnection
  dataChannel: RTCDataChannel
  private localRTCRtpSenderList: RTCRtpSender[]
  private localDisplayRTCRtpSenderList: RTCRtpSender[]

  constructor(configuration: RTCConfiguration) {
    this.configuration = configuration
    this.init()
  }

  init() {
    this.createPeerConnection()
  }

  createPeerConnection() {
    // 创建 PeerConnection
    this.peerConnection = new RTCPeerConnection();
    this.peerConnection.setConfiguration(this.configuration);
  }

  on(eventName: string, callback: (...args: any[]) => void) {
    this.peerConnection.addEventListener(eventName, callback)
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

  addTransceiver(track: MediaStreamTrack | MediaStreamTrack[], stream: MediaStream): RTCRtpTransceiver[] {
    track = Array.isArray(track) ? track : [track]
    return track.map(track => this.peerConnection.addTransceiver(track, { streams: [ stream ] }))
  }

  async addLocalStream(mediaDevices: MediaDevices) {
    try {
      // 添加本地媒体流
      const localStream = await mediaDevices.getUserMedia()
      const audioTracks = localStream.getAudioTracks()
      const videoTracks = localStream.getVideoTracks()
      // 移除上次添加的本地流
      this.removeTrack(this.localRTCRtpSenderList)
      
      // 添加本次本地流
      // this.localRTCRtpSenderList = this.addTrack([...videoTracks, ...audioTracks], localStream)
      this.localRTCRtpSenderList = this.addTrack([...videoTracks], localStream)

      console.info(MessageKeyMap.USER_SUCCESS)
    } catch (error) {
      const message = 'USER_' + error.message.toUpperCase()
      console.error(message)
    }
  }

  async removeLocalStream() {
    try {
      // 移除上次添加的本地流
      this.removeTrack(this.localRTCRtpSenderList)
      // 隐藏本地媒体流
      console.info(MessageKeyMap.USER_SUCCESS)
    } catch (error) {
      console.error(error)
    }
  }
  
  async shareDisplayMedia(mediaDevices: MediaDevices) {
    try {
      // 共享屏幕
      const localDisplayStream = await mediaDevices.getDisplayMedia()
      const audioTracks = localDisplayStream.getAudioTracks()
      const videoTracks = localDisplayStream.getVideoTracks()
      // 移除上次添加的本地流
      this.removeTrack(this.localDisplayRTCRtpSenderList)
      // 添加本次本第流
      this.localDisplayRTCRtpSenderList = this.addTrack([...videoTracks, ...audioTracks], localDisplayStream)
      console.info(MessageKeyMap.DISPLAY_SUCCESS)
    } catch (error) {
      const message = 'DISPLAY_' + error.message.toUpperCase()
      console.error(message)
    }
  }

  async cancelShareDisplayMedia() {
    try {
      // 取消共享屏幕
      // 移除上次添加的本地流
      this.removeTrack(this.localDisplayRTCRtpSenderList)
      console.info(MessageKeyMap.DISPLAY_SUCCESS)
    } catch (error) {
      const message = 'DISPLAY_' + error.message.toUpperCase()
      console.error(message)
    }
  }

  async createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    return this.peerConnection.createAnswer(options)
  }

  async createOffer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    return this.peerConnection.createOffer(options)
  }

  createDataChannel(label: string, option: RTCDataChannelInit) {
    this.dataChannel = this.peerConnection.createDataChannel(label, option);
  }

  close() {
    this.peerConnection.close()
  }
}