import mitt from 'mitt'
import SocketClient from "../socket-client";
import WebRTC from "./WebRTC";
import MediaDevices from "../MediaDevices/mediaDevices";
import Queue from '../queue';
import { debounce } from '../util'

const timerTime = 100;

enum MittEventName {
  CONNECTOR_INFO_LIST_CHANGE = "connectorInfoListChange",
}
type MittEventType  = {
  'connectorInfoListChange': ConnectorInfo[];
}
const emitter = mitt<MittEventType>()

enum MessageEventType {
  OFFER = "offer",
  ANSWER = "answer",
  GET_OFFER = "getOffer",
  ICE_CANDIDATE = "icecandidate",
  EXIT = "exit",
}

enum PeerConnectionEvent {
  TRACK = "track",
  ICE_CANDIDATE = "icecandidate",
  DATACHANNEL = "datachannel"
}

enum DatachannelEvent {
  MESSAGE = 'message'
}

enum MediaDevicesEvent {
  ENDED = "ended",
}

type ChannelMessageData = {
  type: 'exit',
  data: {
    [x: string]: any
  }
}

type MemberInfo = {
  memberId: string
}
type OfferMessageData = {
  remoteConnectorId: string;
  memberId: string;
  offer: RTCSessionDescriptionInit;
  streaTtype?: StreamType;
}

enum StreamTypeEnum {
  USER = 'user',
  DISPLAY = 'display',
  REMOTE_DISPLAY = 'remoteDisplay',
}
type StreamType = 'user' | 'display' | 'remoteDisplay';

enum TypeEnum {
  OFFER = 'offer',
  ANSWER = 'answer',
}
type Type = 'offer' | 'answer';

export type ConnectorInfo = {
  type: Type;
  streaTtype: StreamType;
  webrtc: WebRTC;
  connectorId: string;
  memberId?: string;
  remoteConnectorId?: string;
  remoteStream?: MediaStream;
  channel?: RTCDataChannel;
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
  connectorInfoMap: ConnectorInfoMap = new Map();
  constructor(options: Options) {
    super(options.socketConfig);
    this.constraints = options.constraints;
    this.configuration = options.configuration;
    this.mediaDevices = new MediaDevices(this.constraints);
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

  async createConnector(type: Type, streaTtype?: StreamType): Promise<string> {
    const webrtc = new WebRTC(this.configuration)
    const connectorId = crypto.randomUUID()
    const connectorInfo: ConnectorInfo = {
      type,
      streaTtype,
      connectorId,
      webrtc
    }
    this.connectorInfoMap.set(connectorId, connectorInfo)
    if (streaTtype === StreamTypeEnum.USER) {
      await this.addLocalStream(connectorInfo)
    } else if (streaTtype === StreamTypeEnum.DISPLAY) {
      await this.addDisplayStream(connectorInfo)
    } 
    this.bindPeerConnectionEvent(connectorInfo)
    return connectorId
  }

  on(eventName: keyof MittEventType, callback: (...args: any[]) => void){
    emitter.on(eventName, callback)
  }

  off(eventName: keyof MittEventType, callback: (...args: any[]) => void){
    emitter.off(eventName, callback)
  }

  private bindSocketEvent() {
    this.onMessage(MessageEventType.OFFER, this.offerMessage.bind(this))
    this.onMessage(MessageEventType.ANSWER, this.answerMessage.bind(this))
    this.onMessage(MessageEventType.GET_OFFER, this.getOfferMessage.bind(this))
    this.onMessage(MessageEventType.ICE_CANDIDATE, this.icecandidateMessage.bind(this))
    this.onMessage(MessageEventType.EXIT, this.exitMessage.bind(this))
  }

  private bindPeerConnectionEvent(connectorInfo: ConnectorInfo, eventName?: typeof PeerConnectionEvent.DATACHANNEL) {
    const { webrtc } = connectorInfo
    if (eventName) {
      webrtc.peerConnectionEventTaget.on(eventName, this.ondatachannel.bind(this, connectorInfo))
    }
    webrtc.peerConnectionEventTaget.on(PeerConnectionEvent.ICE_CANDIDATE, this.onicecandidate.bind(this, connectorInfo))
    webrtc.peerConnectionEventTaget.on(PeerConnectionEvent.TRACK, this.ontrack.bind(this, connectorInfo))
  }

  private bindDataChannelEvent(connectorInfo: ConnectorInfo) {
    const { webrtc } = connectorInfo
    webrtc.dataChannelEventTarget.on(DatachannelEvent.MESSAGE, this.dataChannelMessage.bind(this, connectorInfo))
  }

  private bindDisplayMediaDevicesEvent() {
    this.mediaDevices.displayStreamEventTarget.on(MediaDevicesEvent.ENDED, this.displayStreamEnded.bind(this))
  }

  async addLocalStream(connectorInfo: ConnectorInfo) {
    try {
      // 添加本地媒体流
      const { webrtc } = connectorInfo
      const localStream = await this.mediaDevices.getUserMedia()
      const audioTracks = localStream.getAudioTracks()
      const videoTracks = localStream.getVideoTracks()
      // 添加本次本地流
      webrtc.addTrack([...videoTracks, ...audioTracks], localStream)
    } catch (error) {
      const message = 'USER_' + error.message.toUpperCase()
      console.error(message)
    }
  }

  // async removeLocalStream() {
  //   try {
  //     // 移除上次添加的本地流
  //     this.removeTrack(this.localRTCRtpSenderList)
  //     // 隐藏本地媒体流
  //   } catch (error) {
  //     console.error(error)
  //   }
  // }
  
  async addDisplayStream(connectorInfo: ConnectorInfo) {
    try {
      // 共享屏幕
      const { webrtc } = connectorInfo
      const localDisplayStream = await this.mediaDevices.getDisplayMedia()
      const audioTracks = localDisplayStream.getAudioTracks()
      const videoTracks = localDisplayStream.getVideoTracks()
      // 添加本次本第流
      webrtc.addTrack([...videoTracks, ...audioTracks], localDisplayStream)
    } catch (error) {
      const message = 'DISPLAY_' + error.message.toUpperCase()
      console.error(message)
    }
  }

  // async cancelShareDisplayMedia() {
  //   try {
  //     // 取消共享屏幕
  //     // 移除上次添加的本地流
  //     this.removeTrack(this.localDisplayRTCRtpSenderList)
  //   } catch (error) {
  //     const message = 'DISPLAY_' + error.message.toUpperCase()
  //     console.error(message)
  //   }
  // }

  private displayStreamEnded(event: Event) {
    this._displayState = false
    console.log('displayStreamEnded', event);
  }

  private async createDisplayWebRTC(memberInfo: MemberInfo) {
    const memberId = memberInfo.memberId
    try {
      const streaTtype = StreamTypeEnum.DISPLAY
      const connectorId = await this.createConnector(TypeEnum.OFFER, streaTtype)
      const connectorInfo = this.connectorInfoMap.get(connectorId)
      const offer = await connectorInfo.webrtc.peerConnection.createOffer()
      await connectorInfo.webrtc.peerConnection.setLocalDescription(offer)
      this.sendOfferMessage({ connectorId, memberId, offer, streaTtype })
    } catch (error) {
      console.error(error)
    }
  }

  public async shareDisplayMedia() {
    const webrtcList = Array.from(this.connectorInfoMap.keys()).map(id => this.connectorInfoMap.get(id))
    const isExistDisplay = webrtcList.some(item => item.streaTtype === StreamTypeEnum.DISPLAY || item.streaTtype === StreamTypeEnum.REMOTE_DISPLAY)
    if (isExistDisplay) {
      console.log('存在共享屏幕的成员')
      return
    }

    // 过滤共享屏幕的非成员类型 为后期经过配置决定是否可存在多屏幕共享做准备
    for(let connectorInfo of webrtcList.filter(item => item.streaTtype !== StreamTypeEnum.DISPLAY && item.streaTtype !== StreamTypeEnum.REMOTE_DISPLAY)) {
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
      const streaTtype = StreamTypeEnum.USER
      const connectorId = await this.createConnector(TypeEnum.OFFER, streaTtype)
      const connectorInfo = this.connectorInfoMap.get(connectorId)
      const { webrtc } = connectorInfo
      // 创建信息通道
      webrtc.createDataChannel('chat')
      this.bindDataChannelEvent(connectorInfo)
      const offer = await webrtc.peerConnection.createOffer()
      await webrtc.peerConnection.setLocalDescription(offer)
      this.sendOfferMessage({ connectorId, memberId, offer, streaTtype })
    } catch (error) {
      console.error(error)
    }
  }

  private async offerMessage(data: OfferMessageData) {
    const memberId = data.memberId
    try {
      const { remoteConnectorId, streaTtype } = data
      const createType = streaTtype === StreamTypeEnum.USER ? StreamTypeEnum.USER : StreamTypeEnum.REMOTE_DISPLAY
      const offer = new RTCSessionDescription(data.offer)
      const connectorId = await this.createConnector(TypeEnum.ANSWER, createType)
      const connectorInfo = this.connectorInfoMap.get(connectorId)
      this.bindPeerConnectionEvent(connectorInfo, PeerConnectionEvent.DATACHANNEL)
      connectorInfo.memberId = memberId // 记录对方的id
      connectorInfo.remoteConnectorId = remoteConnectorId // 记录对方的connectorId
      const { webrtc } = connectorInfo
      await webrtc.peerConnection.setRemoteDescription(offer)
      const answer = await webrtc.peerConnection.createAnswer()
      await webrtc.peerConnection.setLocalDescription(answer)
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

  /**
   * 接收信息通道
   * @param connectorInfo 
   * @param event 
   */
  private ondatachannel(connectorInfo: ConnectorInfo, event: RTCDataChannelEvent) {
    const { channel } = event
    channel.onmessage = this.dataChannelMessage.bind(this, connectorInfo)
    connectorInfo.channel = channel 
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

  private dataChannelMessage(connectorInfo: ConnectorInfo, event: MessageEvent) {
    console.log('dataChannelMessage');
    const message = JSON.parse(event.data) as ChannelMessageData
    const { type, data  } = message
    if (type === 'exit') {
      this.exitMessage(data as {
        connectorId: string,
        memberId: string,
      })
    }
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
    this.sendMessage(MessageEventType.ICE_CANDIDATE, data)
  }

  private async sendOfferMessage(data: {
    connectorId: string,
    memberId: string,
    offer: RTCSessionDescriptionInit,
    streaTtype?: StreamType
  }) {
    this.sendMessage(MessageEventType.OFFER, data)
  }

  private async sendAnswerMessage(data: {
    remoteConnectorId: string,
    connectorId: string,
    memberId: string,
    answer: RTCSessionDescriptionInit
  }) {
    this.sendMessage(MessageEventType.ANSWER, data)
  }

  private sendExit() {
    if (!this.connectorInfoMap.size) return
    Array.from(this.connectorInfoMap.keys()).forEach(id => {
      const connectorInfo = this.connectorInfoMap.get(id)
      const { remoteConnectorId, memberId, type, channel, webrtc } = connectorInfo
      const data: ChannelMessageData = {
        type: MessageEventType.EXIT,
        data: {
          connectorId: remoteConnectorId,
          memberId
        }
      }
      if (type === TypeEnum.OFFER) {
        webrtc.dataChannel.send(JSON.stringify(data))
      } else if (type === TypeEnum.ANSWER) {
        channel.send(JSON.stringify(data))
      }
    })
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
        .filter(connectorInfo => connectorInfo.streaTtype !== StreamTypeEnum.DISPLAY)
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