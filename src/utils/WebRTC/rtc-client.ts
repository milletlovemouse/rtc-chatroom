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
  EXIT = "exit",
}

export type Options = {
  configuration: RTCConfiguration,
  constraints: MediaStreamConstraints
}

export type WebRTCType = "user" | "display"
export type WebRTCItem = {
  type?: WebRTCType,
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
  private _displayState: boolean = false;
  constructor(options: Options) {
    super({ host, port});
    this.constraints = options.constraints;
    this.configuration = options.configuration;
    this.mediaDevices = new MediaDevices(this.constraints);
    this.init()
  }

  get displayState() {
    return this._displayState
  }

  init() {
    this.bindSocketEvent();
    // 这段代码之后要转移到业务代码块
    window.addEventListener('unload', (event) => {
      event.preventDefault();
      this.close()
    });
  }

  async createWebRTC(type?: WebRTCType): Promise<string> {
    const webrtc = new WebRTC(this.configuration)
    const webrtcId = crypto.randomUUID()
    const webrtcItem: WebRTCItem = {
      webrtcId,
      webrtc,
      type
    }
    this.webrtcMap.set(webrtcId, webrtcItem)
    if (type === 'user') {
      await webrtc.addLocalStream(this.mediaDevices)
    } else if (type === 'display') {
      await webrtc.shareDisplayMedia(this.mediaDevices)
    }
    this.bindWebRTCEvent(webrtcItem)
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
    this.onMessage(MessageEvent.EXIT, this.exitMessage.bind(this))
  }

  bindWebRTCEvent(webrtcItem: WebRTCItem) {
    webrtcItem.webrtc.on('icecandidate', this.onicecandidate.bind(this, webrtcItem))
    webrtcItem.webrtc.on('track', this.ontrack.bind(this, webrtcItem))
  }

  bindDisplayMediaDevicesEvent() {
    this.mediaDevices.displayStream_on('ended', this.displayStreamEnded.bind(this))
  }

  private displayStreamEnded(event: Event) {
    this._displayState = false
    console.log('displayStreamEnded', event);
  }

  private async createDisplayWebRTC(merberId: string) {
    try {
      const type = 'display'
      const webrtcId = await this.createWebRTC(type)

      const displayWebrtcItem = this.webrtcMap.get(webrtcId)
      const webrtc = displayWebrtcItem.webrtc
      const offer = await webrtc.peerConnection.createOffer()
      await webrtc.peerConnection.setLocalDescription(offer)
      this.sendOfferMessage({ webrtcId, merberId, offer, type })
    } catch (error) {
      console.error(error)
    }
  }

  public async shareDisplayMedia() {
    const webrtcList = Array.from(this.webrtcMap.keys()).map(id => this.webrtcMap.get(id))
    const isExistDisplay = webrtcList.some(item => item.type === 'display')
    if (isExistDisplay) {
      console.log('存在共享屏幕的成员')
      return
    }
    // 过滤共享屏幕的非成员类型 为后期经过配置决定是否可存在多屏幕共享做准备
    await Promise.all(webrtcList.filter(item => item.type !== 'display').map(async webrtcItem => {
      await this.createDisplayWebRTC(webrtcItem.merberId)
    }))
    const stream = await this.getDisplayStream()
    this.bindDisplayMediaDevicesEvent()
    this._displayState = true
    return stream
  }

  private async getOfferMessage(memberInfo: {merberId: string}) {
    if (this._displayState) {
      this.createDisplayWebRTC(memberInfo.merberId)
    }
    try {
      const type = 'user'
      const merberId = memberInfo.merberId
      const webrtcId = await this.createWebRTC(type)
      const webrtcItem = this.webrtcMap.get(webrtcId)
      const webrtc = webrtcItem.webrtc
      const offer = await webrtc.peerConnection.createOffer()
      await webrtc.peerConnection.setLocalDescription(offer)
      // console.log('signalingState', webrtc.peerConnection.signalingState)
      this.sendOfferMessage({ webrtcId, merberId, offer, type })
    } catch (error) {
      console.error(error)
    }
  }

  private async offerMessage(data: {
    connectorWebrtcId: string,
    merberId: string,
    offer: RTCSessionDescriptionInit,
    type?: WebRTCType
  }) {
    try {
      const { connectorWebrtcId, merberId, type } = data
      const createType = type === 'user' ? 'user' : undefined
      const offer = new RTCSessionDescription(data.offer)
      const webrtcId = await this.createWebRTC(createType)
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
    this[MittEventName.WEBRTC_MAP_CHANGE]()
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

  private exitMessage(data: { webrtcId: string }) {
    console.log('exitMessage', data)
    this.closeWebRTCbyId(data.webrtcId)
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
    offer: RTCSessionDescriptionInit,
    type?: WebRTCType
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

  private sendExit() {
    const ids = Array.from(this.webrtcMap.keys())
    if (!ids.length) return
    const snedMessage = ids.map(id => {
      const webrtcItem = this.webrtcMap.get(id)
      const { connectorWebrtcId, merberId } = webrtcItem
      return {
        connectorWebrtcId,
        merberId
      }
    })
    this.sendMessage(MessageEvent.EXIT, snedMessage)
  }

  async getLocalStream() {
    try {
      // 获取本地媒体流
      const localStream = await this.mediaDevices.getUserMedia()
      const audioTracks = localStream.getAudioTracks()
      // 暂时移除音频轨道
      // this.mediaDevices.removeTrack(audioTracks, localStream)
      // await this.mediaDevices.stop(audioTracks[0]?.id)
      return localStream
    } catch (error) {
      const message = error.message.toUpperCase()
      console.error(message)
    }
  }

  async getDisplayStream() {
    try {
      // 获取本地屏幕媒体流
      const displayStream = await this.mediaDevices.getDisplayMedia()
      const audioTracks = displayStream.getAudioTracks()
      // 暂时移除音频轨道
      // this.mediaDevices.removeTrack(audioTracks, displayStream)
      // await this.mediaDevices.stop(audioTracks[0]?.id)
      return displayStream
    } catch (error) {
      const message = error.message.toUpperCase()
      console.error(message)
    }
  }

  // 防抖通知
  private timer: NodeJS.Timeout;
  private [MittEventName.WEBRTC_MAP_CHANGE]() {
    if (this.timer) {
      clearTimeout(this.timer)
    }
    this.timer = setTimeout(() => {
      emitter.emit(MittEventName.WEBRTC_MAP_CHANGE, this.webrtcMap)
      clearTimeout(this.timer)
      this.timer = null
    }, 200)
  }

  closeWebRTCbyId(webrtcId: string) {
    const webrtcItem = this.webrtcMap.get(webrtcId)
    if (webrtcItem) {
      webrtcItem.webrtc.close()
      this.webrtcMap.delete(webrtcId)
    }
    this[MittEventName.WEBRTC_MAP_CHANGE]()
  }

  closeAllWebRTC() {
    Array.from(this.webrtcMap.keys()).forEach(webrtcId => {
      this.closeWebRTCbyId(webrtcId)
    })
  }

  close() {
    this.sendExit()
    this.closeAllWebRTC()
    this.mediaDevices.close()
    this.socket.close();
    emitter.all.clear()
  }
}