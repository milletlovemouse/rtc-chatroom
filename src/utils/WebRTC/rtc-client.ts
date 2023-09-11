import mitt from 'mitt'
import SocketClient from "../socket-client";
import WebRTC from "./WebRTC";
import MediaDevices from "../MediaDevices/mediaDevices";
import { useError, useSuccess } from "../message";

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
export const onSuccess = useSuccess(Message, format)

type MittEvent  = {
  'webrtc-map-change': WebRTCMap
}
enum MittEventName {
  WEBRTC_MAP_CHANGE = "webrtc-map-change",
}
const emitter = mitt<MittEvent>()

export enum MessageEvent {
  OFFER = "offer",
  ANSWER = "answer",
  GET_OFFER = "getOffer",
  ICE_CANDIDATE = "icecandidate",
}

export type Options = {
  configuration: RTCConfiguration,
  constraints: MediaStreamConstraints
}

export type WebRTCItem = {
  webrtcId: string,
  webrtc: WebRTC,
  merberId?: string,
  connectorWebrtcId?: string
  remoteStream?: MediaStream,
}
export type WebRTCMap = Map<string, WebRTCItem>

const host = 'ws://' + window.location.hostname;
const port = 3000

export default class RTCClient extends SocketClient {
  configuration: RTCConfiguration
  constraints: MediaStreamConstraints
  mediaDevices: MediaDevices;
  webrtcMap: WebRTCMap = new Map();
  constructor(options: Options) {
    super({ host, port});
    this.constraints = options.constraints;
    this.configuration = options.configuration;
    this.mediaDevices = new MediaDevices(this.constraints);
    this.init()
  }

  init() {
    this.bindSocketEvent();
    // 这段代码之后要转移到业务代码块
    window.addEventListener('unload', (event) => {
      event.preventDefault();
      this.close()
    });
  }

  async createWebRTC(): Promise<string> {
    const webrtc = new WebRTC(this.configuration)
    const webrtcId = crypto.randomUUID()
    const webrtcItem = {
      webrtcId,
      webrtc
    }
    this.webrtcMap.set(webrtcId, webrtcItem)
    await webrtc.addLocalStream(this.mediaDevices)
    this.bindWebRTCEvent(webrtcItem)
    // console.log('this.webrtcMap', Array.from(this.webrtcMap));
    // emitter.emit(MittEventName.WEBRTC_MAP_CHANGE, this.webrtcMap)
    return webrtcId
  }

  on(eventName: keyof MittEvent, callback: (...args: any[]) => void){
    emitter.on(eventName, callback)
  }

  off(eventName: keyof MittEvent, callback: (...args: any[]) => void){
    emitter.off(eventName, callback)
  }

  onWebRTCMapChange(callback: (...args: any[]) => void) {
    this.on(MittEventName.WEBRTC_MAP_CHANGE, callback)
  }

  bindSocketEvent() {
    this.onMessage(MessageEvent.OFFER, this.offerMessage.bind(this))
    this.onMessage(MessageEvent.ANSWER, this.answerMessage.bind(this))
    this.onMessage(MessageEvent.GET_OFFER, this.getOfferMessage.bind(this))
    this.onMessage(MessageEvent.ICE_CANDIDATE, this.icecandidateMessage.bind(this))
  }

  bindWebRTCEvent(webrtcItem: WebRTCItem) {
    webrtcItem.webrtc.on('icecandidate', this.onicecandidate.bind(this, webrtcItem))
    webrtcItem.webrtc.on('track', this.ontrack.bind(this, webrtcItem))
  }

  private async getOfferMessage(memberInfo: {id: string}) {
    try {
      const merberId = memberInfo.id
      const webrtcId = await this.createWebRTC()
      const webrtcItem = this.webrtcMap.get(webrtcId)
      const webrtc = webrtcItem.webrtc
      const offer = await webrtc.peerConnection.createOffer()
      await webrtc.peerConnection.setLocalDescription(offer)
      // console.log('signalingState', webrtc.peerConnection.signalingState)
      this.sendOfferMessage({ webrtcId, merberId, offer })
    } catch (error) {
      console.error(error)
    }
  }

  private async offerMessage(data: {
    connectorWebrtcId: string,
    merberId: string,
    offer: RTCSessionDescriptionInit
  }) {
    try {
      const { connectorWebrtcId, merberId } = data
      const offer = new RTCSessionDescription(data.offer)
      const webrtcId = await this.createWebRTC()
      const webrtcItem = this.webrtcMap.get(webrtcId)
      webrtcItem.merberId = merberId // 记录对方的id
      webrtcItem.connectorWebrtcId = connectorWebrtcId // 记录对方的webrtcId
      const webrtc = webrtcItem.webrtc
      await webrtc.peerConnection.setRemoteDescription(offer)
      // console.log('signalingState', webrtc.peerConnection.signalingState)
      const answer = await webrtc.peerConnection.createAnswer()
      await webrtc.peerConnection.setLocalDescription(answer)
      // console.log('signalingState', webrtc.peerConnection.signalingState)
      this.sendAnswerMessage({
        connectorWebrtcId,
        webrtcId,
        merberId,
        answer
      })
    } catch (error) {
      console.error(error)
    }
  }

  private async answerMessage(data: {
    connectorWebrtcId: string,
    webrtcId: string;
    merberId: string,
    answer: RTCSessionDescriptionInit
  }) {
    const { webrtcId, connectorWebrtcId, merberId } = data
    const answer = new RTCSessionDescription(data.answer)
    const webrtcItem = this.webrtcMap.get(webrtcId)
    if (!webrtcItem) {
      return
    }
    try {
      webrtcItem.merberId = merberId // 记录对方的id
      webrtcItem.connectorWebrtcId = connectorWebrtcId // 记录对方的webrtcId
      await webrtcItem.webrtc.peerConnection.setRemoteDescription(answer)
      // console.log('signalingState', webrtcItem.webrtc.peerConnection.signalingState)
    } catch (error) {
      console.error(error)
    }
  }

  private onicecandidate(webrtcItem: WebRTCItem, event: RTCPeerConnectionIceEvent) {
    const { connectorWebrtcId, merberId } = webrtcItem
    const { candidate } = event
    if (connectorWebrtcId && merberId && candidate) {
      this.sendIcecandidateMessage({
        connectorWebrtcId,
        merberId,
        candidate,
      })
    }
  }

  private ontrack(webrtcItem: WebRTCItem, event: RTCTrackEvent) {
    const remoteStream = event.streams[0]
    webrtcItem.remoteStream = remoteStream
    emitter.emit(MittEventName.WEBRTC_MAP_CHANGE, this.webrtcMap)
  }

  private icecandidateMessage(data: {
    webrtcId: string,
    candidate: RTCIceCandidateInit
  }) {
    const { webrtcId } = data
    const webrtcItem = this.webrtcMap.get(webrtcId)
    const candidate = new RTCIceCandidate(data.candidate)
    if (!webrtcItem) {
      return
    }
    webrtcItem.webrtc.peerConnection.addIceCandidate(candidate)
  }

  private sendIcecandidateMessage(data: {
    connectorWebrtcId: string,
    merberId: string,
    candidate: RTCIceCandidateInit
  }) {
    this.sendMessage(MessageEvent.ICE_CANDIDATE, data)
  }

  private async sendOfferMessage(data: {
    webrtcId: string,
    merberId: string,
    offer: RTCSessionDescriptionInit
  }) {
    this.sendMessage(MessageEvent.OFFER, data)
  }

  private async sendAnswerMessage(data: {
    connectorWebrtcId: string,
    webrtcId: string,
    merberId: string,
    answer: RTCSessionDescriptionInit
  }) {
    this.sendMessage(MessageEvent.ANSWER, data)
  }

  async getLocalStream() {
    try {
      // 添加本地媒体流
      const localStream = await this.mediaDevices.getUserMedia()
      const audioTracks = localStream.getAudioTracks()
      localStream.removeTrack(audioTracks[0])
      return localStream
    } catch (error) {
      const message = 'USER_' + error.message.toUpperCase()
      console.error(message)
    }
  }

  closeWebRTCbyId(webrtcId: string) {
    const webrtcItem = this.webrtcMap.get(webrtcId)
    if (webrtcItem) {
      webrtcItem.webrtc.close()
      this.webrtcMap.delete(webrtcId)
    }
  }

  closeAllWebRTC() {
    [...this.webrtcMap.keys()].forEach(key => {
      this.webrtcMap.get(key).webrtc.close()
      this.webrtcMap.delete(key)
    })
  }

  close() {
    this.socket.close();
    this.closeAllWebRTC()
    emitter.all.clear()
  }
  // 获取当前用户信息
  // getUserInfo(): Promise<any> {
  //   return this.sendRequest("getUserInfo");
  // }

  // // 获取房间信息
  // getRoomInfo(): Promise<any> {
  //   return this.sendRequest("getRoomInfo");
  // }

  // 获取房间成员信息
  // getRoomMemberInfo(): Promise<any> {
  //   return this.sendMessage("getRoomMemberInfo");
  // }
}