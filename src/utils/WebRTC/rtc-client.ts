import mitt from 'mitt'
import SocketClient from "../socket-client";
import WebRTC from "./WebRTC";
import MediaDevices from "../MediaDevices/mediaDevices";
import Queue from '../queue';
import { debounce } from '../util'

const timerTime = 100;

enum MittEventName {
  CONNECTOR_INFO_LIST_CHANGE = "CONNECTOR_INFO_LIST_CHANGE",
}
type MittEventType  = {
  'CONNECTOR_INFO_LIST_CHANGE': ConnectorInfo[];
}
const emitter = mitt<MittEventType>()

enum MessageEvent {
  OFFER = "offer",
  ANSWER = "answer",
  GET_OFFER = "getOffer",
  ICE_CANDIDATE = "icecandidate",
  EXIT = "exit",
}

enum WebRTCEvent {
  TRACK = "track",
  ICE_CANDIDATE = "icecandidate",
}

enum MediaDevicesEvent {
  ENDED = "ended",
}

enum StreamTypeEnum {
  USER = 'user',
  DISPLAY = 'display',
  REMOTE_DISPLAY = 'remoteDisplay',
}
type StreamType = 'user' | 'display' | 'remoteDisplay';

type MemberInfo = {
  memberId: string
}
type OfferMessageData = {
  remoteConnectorId: string;
  memberId: string;
  offer: RTCSessionDescriptionInit;
  type?: StreamType;
}

export type ConnectorInfo = {
  type?: StreamType;
  webrtc: WebRTC;
  connectorId: string;
  memberId?: string;
  remoteConnectorId?: string;
  remoteStream?: MediaStream;
  onicecandidate?: (candidate: RTCIceCandidate) => void;
  ontrack?: (event: RTCTrackEvent) => void;
}
export type ConnectorInfoMap = Map<string, ConnectorInfo>

export type Options = {
  configuration: RTCConfiguration;
  constraints: MediaStreamConstraints;
  socketConfig: {
    host: string;
    port: number;
  }
}

export default class RTCClient extends SocketClient {
  configuration: RTCConfiguration
  constraints: MediaStreamConstraints
  mediaDevices: MediaDevices;
  // WebRTC: WebRTC;
  connectorInfoMap: ConnectorInfoMap = new Map();
  constructor(options: Options) {
    super(options.socketConfig);
    this.constraints = options.constraints;
    this.configuration = options.configuration;
    this.mediaDevices = new MediaDevices(this.constraints);
    // this.WebRTC = new WebRTC(this.configuration)
    this.init()
  }
  
  private _displayState: boolean = false;
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

  async createConnector(type?: StreamType): Promise<string> {
    const webrtc = new WebRTC(this.configuration)
    const connectorId = crypto.randomUUID()
    const connectorInfo: ConnectorInfo = {
      type,
      connectorId,
      webrtc
    }
    this.connectorInfoMap.set(connectorId, connectorInfo)
    if (type === StreamTypeEnum.USER) {
      await webrtc.addLocalStream(this.mediaDevices)
    } else if (type === StreamTypeEnum.DISPLAY) {
      await webrtc.shareDisplayMedia(this.mediaDevices)
    } 
    this.bindWebRTCEvent(connectorInfo)
    return connectorId
  }

  on(eventName: keyof MittEventType, callback: (...args: any[]) => void){
    emitter.on(eventName, callback)
  }

  off(eventName: keyof MittEventType, callback: (...args: any[]) => void){
    emitter.off(eventName, callback)
  }

  onConnectorInfoListChange(callback: (...args: any[]) => void) {
    this.on(MittEventName.CONNECTOR_INFO_LIST_CHANGE, callback)
  }

  bindSocketEvent() {
    this.onMessage(MessageEvent.OFFER, this.offerMessage.bind(this))
    this.onMessage(MessageEvent.ANSWER, this.answerMessage.bind(this))
    this.onMessage(MessageEvent.GET_OFFER, this.getOfferMessage.bind(this))
    this.onMessage(MessageEvent.ICE_CANDIDATE, this.icecandidateMessage.bind(this))
    this.onMessage(MessageEvent.EXIT, this.exitMessage.bind(this))
  }

  bindWebRTCEvent(connectorInfo: ConnectorInfo) {
    connectorInfo.webrtc.on(WebRTCEvent.ICE_CANDIDATE, this.onicecandidate.bind(this, connectorInfo))
    connectorInfo.webrtc.on(WebRTCEvent.TRACK, this.ontrack.bind(this, connectorInfo))
  }

  bindDisplayMediaDevicesEvent() {
    this.mediaDevices.displayStream_on(MediaDevicesEvent.ENDED, this.displayStreamEnded.bind(this))
  }

  private displayStreamEnded(event: Event) {
    this._displayState = false
    console.log('displayStreamEnded', event);
  }

  private async createDisplayWebRTC(memberInfo: MemberInfo) {
    const memberId = memberInfo.memberId
    try {
      const type = StreamTypeEnum.DISPLAY
      const connectorId = await this.createConnector(type)
      const connectorInfo = this.connectorInfoMap.get(connectorId)
      const offer = await connectorInfo.webrtc.peerConnection.createOffer()
      await connectorInfo.webrtc.peerConnection.setLocalDescription(offer)
      this.sendOfferMessage({ connectorId, memberId, offer, type })
    } catch (error) {
      console.error(error)
    }
  }

  public async shareDisplayMedia() {
    const webrtcList = Array.from(this.connectorInfoMap.keys()).map(id => this.connectorInfoMap.get(id))
    const isExistDisplay = webrtcList.some(item => item.type === StreamTypeEnum.DISPLAY || item.type === StreamTypeEnum.REMOTE_DISPLAY)
    if (isExistDisplay) {
      console.log('存在共享屏幕的成员')
      return
    }

    // 过滤共享屏幕的非成员类型 为后期经过配置决定是否可存在多屏幕共享做准备
    for(let connectorInfo of webrtcList.filter(item => item.type !== StreamTypeEnum.DISPLAY && item.type !== StreamTypeEnum.REMOTE_DISPLAY)) {
      await this.createDisplayWebRTC({ memberId: connectorInfo.memberId })
    }
    const stream = await this.getDisplayStream()
    this.bindDisplayMediaDevicesEvent()
    this._displayState = true
    return stream
  }

  private async getOfferMessage(memberInfo: MemberInfo) {
    const memberId = memberInfo.memberId
    if (this._displayState) {
      this.createDisplayWebRTC(memberInfo)
    }
    try {
      const type = StreamTypeEnum.USER
      const connectorId = await this.createConnector(type)
      const connectorInfo = this.connectorInfoMap.get(connectorId)
      const offer = await connectorInfo.webrtc.peerConnection.createOffer()
      await connectorInfo.webrtc.peerConnection.setLocalDescription(offer)
      this.sendOfferMessage({ connectorId, memberId, offer, type })
    } catch (error) {
      console.error(error)
    }
  }

  private async offerMessage(data: OfferMessageData) {
    const memberId = data.memberId
    try {
      const { remoteConnectorId, type } = data
      const createType = type === StreamTypeEnum.USER ? StreamTypeEnum.USER : StreamTypeEnum.REMOTE_DISPLAY
      const offer = new RTCSessionDescription(data.offer)
      const connectorId = await this.createConnector(createType)
      const connectorInfo = this.connectorInfoMap.get(connectorId)
      connectorInfo.memberId = memberId // 记录对方的id
      connectorInfo.remoteConnectorId = remoteConnectorId // 记录对方的connectorId
      await connectorInfo.webrtc.peerConnection.setRemoteDescription(offer)
      const answer = await connectorInfo.webrtc.peerConnection.createAnswer()
      await connectorInfo.webrtc.peerConnection.setLocalDescription(answer)
      this.sendAnswerMessage({
        remoteConnectorId,
        connectorId,
        memberId,
        answer
      })
    } catch (error) {
      console.error(error)
    }
  }

  private async answerMessage(data: {
    remoteConnectorId: string,
    connectorId: string;
    memberId: string,
    answer: RTCSessionDescriptionInit
  }) {
    const { connectorId, remoteConnectorId, memberId } = data
    const answer = new RTCSessionDescription(data.answer)
    const connectorInfo = this.connectorInfoMap.get(connectorId)
    if (!connectorInfo) {
      return
    }
    try {
      connectorInfo.memberId = memberId // 记录对方的id
      connectorInfo.remoteConnectorId = remoteConnectorId // 记录对方的connectorId
      await connectorInfo.webrtc.peerConnection.setRemoteDescription(answer)
    } catch (error) {
      console.error(error)
    }
  }

  private onicecandidate(connectorInfo: ConnectorInfo, event: RTCPeerConnectionIceEvent) {
    const { remoteConnectorId, memberId } = connectorInfo
    const { candidate } = event
    if (remoteConnectorId && memberId && candidate) {
      this.sendIcecandidateMessage({
        remoteConnectorId,
        memberId,
        candidate,
      })
    }
  }

  private ontrack = (connectorInfo: ConnectorInfo, event: RTCTrackEvent) => {
    const remoteStream = event.streams[0]
    connectorInfo.remoteStream = remoteStream
    this[MittEventName.CONNECTOR_INFO_LIST_CHANGE]()
  }

  private icecandidateMessage(data: {
    connectorId: string,
    candidate: RTCIceCandidateInit
  }) {
    const { connectorId } = data
    const connectorInfo = this.connectorInfoMap.get(connectorId)
    const candidate = new RTCIceCandidate(data.candidate)
    if (!connectorInfo) {
      return
    }
    connectorInfo.webrtc.peerConnection.addIceCandidate(candidate)
  }

  private async exitMessage(data: {
    connectorId: string,
    memberId: string,
  }) {
    this.closeWebRTCbyId(data.connectorId)
  }

  private sendIcecandidateMessage(data: {
    remoteConnectorId: string,
    memberId: string,
    candidate: RTCIceCandidateInit
  }) {
    this.sendMessage(MessageEvent.ICE_CANDIDATE, data)
  }

  private async sendOfferMessage(data: {
    connectorId: string,
    memberId: string,
    offer: RTCSessionDescriptionInit,
    type?: StreamType
  }) {
    this.sendMessage(MessageEvent.OFFER, data)
  }

  private async sendAnswerMessage(data: {
    remoteConnectorId: string,
    connectorId: string,
    memberId: string,
    answer: RTCSessionDescriptionInit
  }) {
    this.sendMessage(MessageEvent.ANSWER, data)
  }

  private sendExit() {
    if (!this.connectorInfoMap.size) return
    const snedMessage = Array.from(this.connectorInfoMap.keys()).map(id => {
      const connectorInfo = this.connectorInfoMap.get(id)
      const { remoteConnectorId, memberId } = connectorInfo
      return {
        remoteConnectorId,
        memberId
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

  /**
   * 防抖通知
   */
  private [MittEventName.CONNECTOR_INFO_LIST_CHANGE] = debounce(() => {
    emitter.emit(
      MittEventName.CONNECTOR_INFO_LIST_CHANGE,
      Array.from(this.connectorInfoMap.keys())
        .map(key => this.connectorInfoMap.get(key))
        .filter(connectorInfo => connectorInfo.type !== StreamTypeEnum.DISPLAY)
    )
  }, timerTime)

  private closeWebRTCbyId(connectorId: string) {
    const connectorInfo = this.connectorInfoMap.get(connectorId)
    if (connectorInfo) {
      connectorInfo.webrtc.close()
      this.connectorInfoMap.delete(connectorId)
    }
    this[MittEventName.CONNECTOR_INFO_LIST_CHANGE]()
  }

  private closeAllWebRTC() {
    Array.from(this.connectorInfoMap.keys()).forEach(connectorId => {
      this.closeWebRTCbyId(connectorId)
    })
  }

  /**
   * 写这个函数的目的是解决当退出房间时直接emitter.all.clear()清除事件
   * 会导致MittEventName.CONNECTOR_INFO_LIST_CHANGE无法通知外界连接成员列表已改变
   */
  private clearEmitter = debounce(() => {
    emitter.all.clear()
  }, timerTime)

  close() {
    this.sendExit()
    this.closeAllWebRTC()
    this.mediaDevices.close()
    this.socket.close();
    this.clearEmitter
  }
}