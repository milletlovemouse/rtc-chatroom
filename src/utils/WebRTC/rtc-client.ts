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
  'connectorInfoListChange': Pick<ConnectorInfo, 'streamType' | 'connectorId' | 'remoteStream'>[];
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

type ChannelMessageData = {
  type: 'exit' | 'offer' | 'answer' | 'icecandidate' | 'getOffer',
  data?: {
    [x: string]: any
  }
}

enum MediaDevicesEvent {
  ENDED = "ended",
}

type MemberInfo = {
  memberId: string
}
type OfferMessageData = {
  remoteConnectorId: string;
  memberId: string;
  offer: RTCSessionDescriptionInit;
  streamType?: StreamType;
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

enum KindEnum {
  AUDIO = 'audio',
  VIDEO = 'video',
}
type Kind = 'audio' | 'video';

export type ConnectorInfo = {
  type: Type;
  streamType: StreamType;
  webrtc: WebRTC;
  connectorId: string;
  memberId?: string;
  remoteConnectorId?: string;
  remoteStream?: MediaStream;
  channel?: RTCDataChannel;
  senders?: RTCRtpSender[];
  receivers?: RTCRtpReceiver[];
  transceivers?: RTCRtpTransceiver[];
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
  private connectorInfoMap: ConnectorInfoMap = new Map();
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
    window.addEventListener('unload', (event) => {
      event.preventDefault();
      this.close()
    });
  }

  /**
   * 创建客户端之间的连接
   * @param type 
   * @param streamType 
   * @returns 
   */
  async createConnector(type: Type, streamType?: StreamType): Promise<string> {
    const webrtc = new WebRTC(this.configuration)
    const connectorId = crypto.randomUUID()
    const connectorInfo: ConnectorInfo = {
      type,
      streamType,
      connectorId,
      webrtc,
    }
    this.connectorInfoMap.set(connectorId, connectorInfo)
    
    if (streamType === StreamTypeEnum.USER) {
      await this.addLocalStream(connectorInfo)
    } else if (streamType === StreamTypeEnum.DISPLAY) {
      await this.addDisplayStream(connectorInfo)
    } 

    if (type === TypeEnum.OFFER) {
      // 创建信息通道
      webrtc.createDataChannel('chat')
      this.bindDataChannelEvent(connectorInfo)
    } else if (type === TypeEnum.ANSWER) {
      // 绑定监听远端创建信息通道事件
      this.bindPeerConnectionEvent(connectorInfo, PeerConnectionEvent.DATACHANNEL)
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

  /**
   * 添加本地媒体流
   * @param connectorInfo 
   */
  async addLocalStream(connectorInfo: ConnectorInfo) {
    const { webrtc } = connectorInfo
    const localStream = await this.mediaDevices.getUserMedia()
    const audioTracks = localStream.getAudioTracks()
    const videoTracks = localStream.getVideoTracks()
    webrtc.addTrack([...videoTracks, ...audioTracks], localStream)
  }
  
  /**
   * 添加共享屏幕媒体流
   * @param connectorInfo 
   */
  async addDisplayStream(connectorInfo: ConnectorInfo) {
    const { webrtc } = connectorInfo
    const localDisplayStream = await this.mediaDevices.getDisplayMedia()
    const audioTracks = localDisplayStream.getAudioTracks()
    const videoTracks = localDisplayStream.getVideoTracks()
    webrtc.addTrack([...videoTracks, ...audioTracks], localDisplayStream)
  }

  private displayStreamEnded(event: Event) {
    this._displayState = false
    console.log('displayStreamEnded', event);
  }

  /**
   * 创建客户端之间的共享屏幕的连接
   * @param memberInfo 
   */
  private async createDisplayConnector(memberInfo: MemberInfo) {
    const memberId = memberInfo.memberId
    const streamType = StreamTypeEnum.DISPLAY
    const connectorId = await this.createConnector(TypeEnum.OFFER, streamType)
    const connectorInfo = this.connectorInfoMap.get(connectorId)
    const offer = await connectorInfo.webrtc.peerConnection.createOffer()
    await connectorInfo.webrtc.peerConnection.setLocalDescription(offer)
    this.sendOfferMessage({ connectorId, memberId, offer, streamType })
  }

  /**
   * 暴露共享屏幕接口
   */
  public async shareDisplayMedia() {
    const webrtcList = Array.from(this.connectorInfoMap.keys()).map(id => this.connectorInfoMap.get(id))
    const isDisplay = webrtcList.some(item => item.streamType === StreamTypeEnum.DISPLAY)
    const isRemoteDisplay = webrtcList.some(item => item.streamType === StreamTypeEnum.REMOTE_DISPLAY)
    if (isDisplay) {
      console.log('你正在共享屏幕')
      return await this.getDisplayStream()
    }

    if (isRemoteDisplay) {
      console.log('存在远程共享屏幕')
      return
    }

    try {
      // 过滤共享屏幕的非成员类型 为后期经过配置决定是否可存在多屏幕共享做准备
      for(let connectorInfo of webrtcList.filter(item => item.streamType !== StreamTypeEnum.DISPLAY && item.streamType !== StreamTypeEnum.REMOTE_DISPLAY)) {
        await this.createDisplayConnector({ memberId: connectorInfo.memberId })
      }
      const stream = await this.getDisplayStream()
      this.bindDisplayMediaDevicesEvent()
      this._displayState = true
      return stream
    } catch (error) {
      console.error(error);
      return Promise.reject(error)
    }
  }

  /**
   * socket getOffer 消息处理事件，远程客户端发起请求，信令服务器通知
   * @param memberInfo 
   */

  private async getOfferMessage(memberInfo: MemberInfo) {
    const memberId = memberInfo.memberId
    if (this._displayState) {
      this.createDisplayConnector(memberInfo)
    }
    try {
      const streamType = StreamTypeEnum.USER
      const connectorId = await this.createConnector(TypeEnum.OFFER, streamType)
      const connectorInfo = this.connectorInfoMap.get(connectorId)
      const { webrtc } = connectorInfo
      const offer = await webrtc.peerConnection.createOffer()
      await webrtc.peerConnection.setLocalDescription(offer)
      this.sendOfferMessage({ connectorId, memberId, offer, streamType })
    } catch (error) {
      console.error(error)
    }
  }

  /**
   * socket offer 消息处理事件，远程客户端发起请求，信令服务器通知
   * @param memberInfo 
   */
  private async offerMessage(data: OfferMessageData) {
    const memberId = data.memberId
    try {
      const { remoteConnectorId, streamType } = data
      const createType = streamType === StreamTypeEnum.USER ? StreamTypeEnum.USER : StreamTypeEnum.REMOTE_DISPLAY
      const offer = new RTCSessionDescription(data.offer)
      const connectorId = await this.createConnector(TypeEnum.ANSWER, createType)
      const connectorInfo = this.connectorInfoMap.get(connectorId)
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

  /**
   * socket answer 消息处理事件，远程客户端发起请求，信令服务器通知
   * @param memberInfo 
   */
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

  /**
   * dataChannel信息通道消息处理事件
   * @param connectorInfo 
   * @param event 
   */
  private async dataChannelMessage(connectorInfo: ConnectorInfo, event: MessageEvent) {
    const message = JSON.parse(event.data) as ChannelMessageData
    const { type, data  } = message
    const { peerConnection: pc } = connectorInfo.webrtc
    if (type === MessageEventType.EXIT) {
      this.exitMessage(data as {
        connectorId: string,
        memberId: string,
      })
    } else if (type === MessageEventType.GET_OFFER) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const sdp = pc.localDescription.sdp
      this.channelSend(connectorInfo, {
        type: MessageEventType.OFFER,
        data: { sdp, offer }
      })
    } else if (type === MessageEventType.OFFER) {
      const offer = new RTCSessionDescription(data.offer)
      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      pc.setLocalDescription(answer)
      const sdp = pc.remoteDescription.sdp
      this.channelSend(connectorInfo, {
        type: MessageEventType.ANSWER,
        data: { sdp, answer }
      })
      console.log(connectorInfo);
    } else if (type === MessageEventType.ANSWER) {
      const answer = new RTCSessionDescription(data.answer)
      await pc.setRemoteDescription(answer)
      console.log(connectorInfo);
    }
  }

  /**
   * dataChannel exit 成员退出通知事件
   * @param memberInfo 
   */
  private async exitMessage(data: {
    connectorId: string,
    memberId: string,
  }) {
    this.closeWebRTCbyId(data.connectorId)
  }

  /**
   * RTCPeerConnection绑定事件 对等方有新的媒体轨道加入时通知
   * @param connectorInfo 
   * @param event 
   */
  private ontrack = (connectorInfo: ConnectorInfo, event: RTCTrackEvent) => {
    const { peerConnection: pc } = connectorInfo.webrtc
    connectorInfo.senders = pc.getSenders()
    connectorInfo.receivers = pc.getReceivers()
    connectorInfo.transceivers = pc.getTransceivers()
    const remoteStream = event.streams[0]
    connectorInfo.remoteStream = remoteStream
    this[MittEventName.CONNECTOR_INFO_LIST_CHANGE]()
    console.log('ontrack', connectorInfo);
  }

  /**
   * RTCPeerConnection绑定事件 第一次offer SDP、answer SDP交换完成连接成功后执行
   * @param connectorInfo 
   * @param event 
   */
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
    this[MittEventName.CONNECTOR_INFO_LIST_CHANGE]()
    console.log('onicecandidate', connectorInfo);
  }

  /**
   * socket 事件，远程客户端发起，信令服务器通知，ICE Candidate 交换
   * @param data 
   * @returns 
   */
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
    this[MittEventName.CONNECTOR_INFO_LIST_CHANGE]()
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
    streamType?: StreamType
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

  private channelSend(connectorInfo: ConnectorInfo, data: ChannelMessageData) {
    const { type, channel, webrtc } = connectorInfo
    if (type === TypeEnum.OFFER) {
      webrtc.dataChannel.send(JSON.stringify(data))
    } else if (type === TypeEnum.ANSWER) {
      channel.send(JSON.stringify(data))
    }
  }

  private sendExit() {
    if (!this.connectorInfoMap.size) return
    Array.from(this.connectorInfoMap.keys()).forEach(id => {
      const connectorInfo = this.connectorInfoMap.get(id)
      const { remoteConnectorId, memberId } = connectorInfo
      const data: ChannelMessageData = {
        type: MessageEventType.EXIT,
        data: {
          connectorId: remoteConnectorId,
          memberId
        }
      }
      this.channelSend(connectorInfo, data)
    })
  }

  /**
   * 切换设备或设备状态后刷新连接
   * @param connectorInfo 
   */
  private async restartConnector(connectorInfo: ConnectorInfo) {
    const { type, webrtc: { peerConnection: pc } } = connectorInfo
    let data: ChannelMessageData
    if (type === TypeEnum.OFFER) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      const sdp = pc.localDescription.sdp
      data = {
        type: MessageEventType.OFFER,
        data: {
          sdp,
          offer
        }
      }
    } else if (type === TypeEnum.ANSWER) {
      data = { type: MessageEventType.GET_OFFER }
    }
    this.channelSend(connectorInfo, data)
  }

  /**
   * 切换设备媒体轨道
   * @param deviceId 
   * @param kind 
   */
  replaceTrack(deviceId: string, kind: Kind) {
    const type = typeof this.constraints[kind]
    if (type === 'boolean') {
      this.constraints[kind] = {
        deviceId
      }
    } else if (type === 'object') {
      (this.constraints[kind] as MediaTrackConstraints).deviceId = deviceId
    }
    navigator.mediaDevices.getUserMedia(this.constraints).then(stream => {
      const name = kind.charAt(0).toUpperCase() + kind.slice(1)
      const [track] = stream[`get${name}Tracks`]();
      this.connectorInfoMap.forEach(async connectorInfo => {
        const { streamType, webrtc } = connectorInfo
        const pc = webrtc.peerConnection
        if (streamType === StreamTypeEnum.DISPLAY || streamType === StreamTypeEnum.REMOTE_DISPLAY){
          return
        }
        const sender = pc.getSenders().find((s) => s.track?.kind === track?.kind);
        // sender.replaceTrack(track)
        webrtc.removeTrack(sender)
        webrtc.addTrack(track, this.mediaDevices.localStream)

        this.restartConnector(connectorInfo)
      })
    })
  }

  replaceVideoTrack(deviceId: string) {
    this.replaceTrack(deviceId, KindEnum.VIDEO)
  }

  replaceAudioTrack(deviceId: string) {
    this.replaceTrack(deviceId, KindEnum.AUDIO)
  }

  /**
   * 切换设备状态，本质还是改变媒体轨道
   * @param state 
   * @param kind 
   */
  deviceSwitch(state: boolean, kind: Kind) {
    navigator.mediaDevices.getUserMedia(this.constraints).then(stream => {
      const name = kind.charAt(0).toUpperCase() + kind.slice(1)
      const [track] = stream[`get${name}Tracks`]();
      this.connectorInfoMap.forEach(async connectorInfo => {
        const { streamType, webrtc } = connectorInfo
        const pc = webrtc.peerConnection
        if (streamType === StreamTypeEnum.DISPLAY || streamType === StreamTypeEnum.REMOTE_DISPLAY){
          return
        }
        if (state) {
          webrtc.addTrack(track, this.mediaDevices.localStream)
        } else {
          const sender = pc.getSenders().find((s) => s.track?.kind === track?.kind);
          webrtc.removeTrack(sender)
        }
        this.restartConnector(connectorInfo)
      })
    })
  }

  disableAudio() {
    this.deviceSwitch(false, KindEnum.AUDIO)
  }

  enableAudio() {
    this.deviceSwitch(true, KindEnum.AUDIO)
  }

  disableVideo() {
    this.deviceSwitch(false, KindEnum.VIDEO)
  }

  enableVideo() {
    this.deviceSwitch(true, KindEnum.VIDEO)
  }

  async getLocalStream() {
    try {
      // 获取本地媒体流
      const localStream = await navigator.mediaDevices.getUserMedia({
        ...this.constraints,
        audio: false
      })
      return localStream
    } catch (error) {
      console.error(error)
      return Promise.reject(error)
    }
  }

  async getDisplayStream() {
    try {
      // 获取本地屏幕媒体流
      const displayStream = await this.mediaDevices.getDisplayMedia()
      return displayStream
    } catch (error) {
      return Promise.reject(error)
    }
  }

  /**
   * 防抖通知
   */
  private [MittEventName.CONNECTOR_INFO_LIST_CHANGE] = debounce(() => {
    emitter.emit(
      MittEventName.CONNECTOR_INFO_LIST_CHANGE,
      Array.from(this.connectorInfoMap.keys())
        .map(key => {
          const { streamType, connectorId, remoteStream } = this.connectorInfoMap.get(key)
          return {
            streamType,
            connectorId,
            remoteStream
          }
        })
        .filter(connectorInfo => connectorInfo.streamType !== StreamTypeEnum.DISPLAY)
    )
    console.log('[...this.connectorInfoMap.values()]', [...this.connectorInfoMap.values()]);
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