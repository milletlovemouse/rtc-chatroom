import mitt from 'mitt'
import deepcopy from "deepcopy"
import SocketClient from "../socket-client";
import WebRTC from "./WebRTC";
import MediaDevices from "../MediaDevices/mediaDevices";
import Queue from '../queue';
import { debounce } from '../util'
import observer from '../observer';
import CustomEventTarget from '../event';
import { onError } from './message'
import { sliceBase64ToFile } from '../fileUtils';

const timerTime = 100;

export type Message = {
  id: string;
  isSelf: boolean;
  username: string;
  HHmmss: string;
  type: 'file' | 'text';
  text?: string;
  fileInfo?: {
    name: string;
    size: string;
    type: string;
    url: string;
    FQ: number;
    file: File;
    chunks: string[];
  };
  avatar: string;
}

export type FileMessageData = {
  id: string;
  chunk: string;
}

export enum DatachannelReadyState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
}

export type Datachannel = {
  readyState: DatachannelReadyState;
  bufferedAmount: number;
  bufferedAmountLowThreshold: number;
  send(data: string): void;
  close(): void;
}

enum MittEventName {
  CONNECTOR_INFO_LIST_CHANGE = "connectorInfoListChange",
  DISPLAY_STREAM_CHANGE = "displayStreamChange",
  LOCAL_STREAM_CHANGE = "localStreamChange",
  MESSAGE = "message",
}
type MittEventType  = {
  'connectorInfoListChange': Pick<ConnectorInfo, 'streamType' | 'connectorId' | 'remoteStream'>[];
  'displayStreamChange': MediaStream,
  'localStreamChange': MediaStream,
  'message': Message,
}
const emitter = mitt<MittEventType>()

enum MessageEventType {
  OFFER = "offer",
  ANSWER = "answer",
  GET_OFFER = "getOffer",
  ICE_CANDIDATE = "icecandidate",
  JOIN = "join",
  LEAVE = "leave",
  CLOSE = "close",
  ERROR = "error",
  RECONNECT = "reconnect",
  RECONNECT_WORK = "reconnectWork",
  CHAT = "chat",
  FILE = "file",
}

enum UserState {
  JOIN = "join",
  LEAVE = "leave",
}

enum ErrorMessageType {
  REPEAT = 'repeat'
}

enum PeerConnectionEvent {
  TRACK = "track",
  ICE_CANDIDATE = "icecandidate",
  DATACHANNEL = "datachannel"
}

enum DatachannelEvent {
  MESSAGE = 'message'
}

type MessageDataType = 'offer' | 'answer' | 'icecandidate' | 'getOffer' | 'leave' | 'close' | 'chat' | 'file'
type ChannelMessageData = {
  type: MessageDataType,
  data?: {
    [x: string]: any
  }
}

type ReconnectMessageData = {
  type: MessageDataType,
  connectorId: string,
  memberId: string
  data?: {
    [x: string]: any
  },
}

enum MediaStreamTrackEvent {
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
  memberId: string;
  remoteConnectorId?: string;
  remoteStream?: MediaStream;
  channel?: RTCDataChannel;
  senders?: RTCRtpSender[];
  receivers?: RTCRtpReceiver[];
  transceivers?: RTCRtpTransceiver[];
  messageList: Record<string, Message>;
  chunks: Record<string, string[]>;
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

export type UserInfo = {
  id: string,
  username?: string,
  roomname?: string
}

export default class RTCClient extends SocketClient {
  configuration: RTCConfiguration
  streamConstraints: MediaStreamConstraints
  mediaDevices: MediaDevices;
  userInfo: UserInfo = {
    id: crypto.randomUUID()
  }
  private connectorInfoMap: ConnectorInfoMap = new Map();
  constructor(options: Options) {
    super(options.socketConfig);
    this.streamConstraints = options.constraints;
    this.configuration = options.configuration;
    this.mediaDevices = new MediaDevices(this.streamConstraints);
    this.init()
  }
  
  /**
   * 共享屏幕状态
   */
  private _displayState: boolean = false;
  get displayState() {
    return this._displayState
  }

  private init() {
    this.bindSocketEvent();
  }

  /**
   * 创建客户端之间的连接
   * @param type 
   * @param streamType 
   * @returns 
   */
  private async createConnector(data: {
    type: Type,
    streamType?: StreamType,
    memberId: string
  }): Promise<string> {
    const { type, streamType, memberId } = data
    const webrtc = new WebRTC(this.configuration)
    const connectorId = crypto.randomUUID()
    const connectorInfo: ConnectorInfo = {
      type,
      streamType,
      connectorId,
      webrtc,
      memberId,
      messageList: {},
      chunks: {},
    }

    if (streamType === StreamTypeEnum.USER) {
      await this.addLocalStream(connectorInfo)
    } else if (streamType === StreamTypeEnum.DISPLAY) {
      await this.addDisplayStream(connectorInfo)
    } 

    if (type === TypeEnum.OFFER) {
      // 创建信息通道
      this.createDataChannel(webrtc)
      this.bindDataChannelEvent(connectorInfo)
    } else if (type === TypeEnum.ANSWER) {
      // 绑定监听远端创建信息通道事件
      this.bindPeerConnectionEvent(connectorInfo, PeerConnectionEvent.DATACHANNEL)
    }

    this.bindPeerConnectionEvent(connectorInfo)
    this.connectorInfoMap.set(connectorId, connectorInfo)
    return connectorId
  }

  private createDataChannel(webrtc: WebRTC) {
    webrtc.createDataChannel('chat')
  }

  public on<K extends keyof MittEventType, Args extends MittEventType[K]>(eventName: K, callback: (args: Args) => void){
    emitter.on(eventName, callback)
  }

  public off(eventName: keyof MittEventType, callback: (...args: any[]) => void){
    emitter.off(eventName, callback)
  }

  private bindSocketEvent() {
    this.onMessage(MessageEventType.OFFER, this.offerMessage.bind(this))
    this.onMessage(MessageEventType.ANSWER, this.answerMessage.bind(this))
    this.onMessage(MessageEventType.GET_OFFER, this.getOfferMessage.bind(this))
    this.onMessage(MessageEventType.ICE_CANDIDATE, this.icecandidateMessage.bind(this))
    this.onMessage(MessageEventType.LEAVE, this.leaveMessage.bind(this))
    this.onMessage(MessageEventType.ERROR, this.errorMessage.bind(this))
    this.onMessage(MessageEventType.RECONNECT, this.reconnectMessage.bind(this))
    this.onConnect(this.reconnect.bind(this))
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

  private bindDisplayMediaStreamTrackEvent() {
    const [ track ] = this.mediaDevices.displayStream.getVideoTracks()
    const trackEventTarget = new CustomEventTarget(track)
    trackEventTarget.on(MediaStreamTrackEvent.ENDED, this.displayStreamTrackEnded.bind(this))
    this.mediaDevices.displayStreamTrackEventTargets.push(trackEventTarget)
  }

  /**
   * 添加本地媒体流
   * @param connectorInfo 
   */
  private async addLocalStream(connectorInfo: ConnectorInfo) {
    const { webrtc } = connectorInfo
    const localStream = await this.mediaDevices.getUserMedia()
    const audioTracks = localStream.getAudioTracks()
    const videoTracks = localStream.getVideoTracks()
    console.log('addLocalStream', audioTracks, videoTracks);
    webrtc.addTrack([...videoTracks, ...audioTracks], localStream)
  }
  
  /**
   * 添加共享屏幕媒体流
   * @param connectorInfo 
   */
  private async addDisplayStream(connectorInfo: ConnectorInfo) {
    const { webrtc } = connectorInfo
    const localDisplayStream = await this.mediaDevices.getDisplayMedia()
    const audioTracks = localDisplayStream.getAudioTracks()
    const videoTracks = localDisplayStream.getVideoTracks()
    webrtc.addTrack([...videoTracks, ...audioTracks], localDisplayStream)
  }

  /**
   * 屏幕共享媒体流的视频轨道启用状态变化处理事件
   * @param event 
   */
  private displayStreamTrackEnded(event: Event) {
    this.cancelShareDisplayMedia()
  }

  /**
   * 创建客户端之间的共享屏幕的连接
   * @param memberInfo 
   */
  private async createDisplayConnector(memberInfo: MemberInfo) {
    const { memberId } = memberInfo
    const streamType = StreamTypeEnum.DISPLAY
    const connectorId = await this.createConnector({type: TypeEnum.OFFER, streamType, memberId})
    const connectorInfo = this.connectorInfoMap.get(connectorId)
    const offer = await connectorInfo.webrtc.peerConnection.createOffer()
    await connectorInfo.webrtc.peerConnection.setLocalDescription(offer)
    this.sendOfferMessage({ connectorId, memberId, offer, streamType })
  }

  /**
   * 暴露共享屏幕接口
   */
  public async shareDisplayMedia() {
    const webrtcList = [...this.connectorInfoMap.values()]
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
        const { memberId } = connectorInfo
        await this.createDisplayConnector({ memberId })
      }
      const stream = await this.getDisplayStream()
      this.bindDisplayMediaStreamTrackEvent()
      this._displayState = true
      emitter.emit(MittEventName.DISPLAY_STREAM_CHANGE, stream)
      return stream
    } catch (error) {
      this._displayState = false
      return Promise.reject(error)
    }
  }

  /**
   * 暴露取消屏幕共享接口
   */
  public cancelShareDisplayMedia() {
    emitter.emit(MittEventName.DISPLAY_STREAM_CHANGE, null)
    this.connectorInfoMap.forEach(connectorInfo => {
      if (connectorInfo.streamType === StreamTypeEnum.DISPLAY) {
        const { connectorId } = connectorInfo
        this.sendCloseMessage(connectorInfo, { connectorId })
      }
    })
    this.closeDisplayConnector()
  }

  private closeDisplayConnector() {
    this.mediaDevices.closeDisplayMediaStream()
    this._displayState = false
    this.connectorInfoMap.forEach(connectorInfo => {
      if (connectorInfo.streamType === StreamTypeEnum.DISPLAY) {
        const { connectorId } = connectorInfo
        this.closeConnectorById(connectorId)
      }
    })
  }

  /**
   * 加入房间状态
   */
  private _state: string = ''
  get state() {
    return this._state
  }

  public join(data: {
    username: string,
    roomname: string
  }) {
    this.userInfo = {...this.userInfo, ...data}
    this.sendJoinMessage({
      id: this.userInfo.id,
      ...data,
    })
    this._state = UserState.JOIN
  }

  public leave() {
    const data = Array.from(this.connectorInfoMap.values()).map(connectorInfo => {
      const { remoteConnectorId, memberId } = connectorInfo
      return {
        remoteConnectorId,
        memberId
      }
    })
    this.sendleaveMessage(data)
    this.closeAllConnector()
    this._state = UserState.LEAVE
  }

  /**
   * socket getOffer 消息处理事件，远程客户端发起请求，信令服务器通知
   * @param memberInfo 
   */

  private async getOfferMessage(memberInfo: MemberInfo) {
    const { memberId } = memberInfo
    if (this._displayState) {
      this.createDisplayConnector(memberInfo)
    }
    try {
      const streamType = StreamTypeEnum.USER
      const connectorId = await this.createConnector({ type: TypeEnum.OFFER, streamType, memberId })
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
    const { memberId, remoteConnectorId, streamType } = data
    try {
      const createType = streamType === StreamTypeEnum.USER ? StreamTypeEnum.USER : StreamTypeEnum.REMOTE_DISPLAY
      const offer = new RTCSessionDescription(data.offer)
      const connectorId = await this.createConnector({ type: TypeEnum.ANSWER, streamType: createType, memberId })
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
        answer,
        streamType: createType
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
    if (type === MessageEventType.CLOSE) {
      this.closeMessage(data as { connectorId: string })
    } else if (type === MessageEventType.CHAT) {
      const { id } = data
      connectorInfo.messageList[id] = data as Message
      chunksMerge(id)
    } else if (type === MessageEventType.FILE) { // 接收文件碎片
      const { id, chunk } = data as FileMessageData
      const chunks = connectorInfo.chunks[id] = (connectorInfo.chunks[id] || [])
      chunks.push(chunk)
      chunksMerge(id)
    } else if (
      type === MessageEventType.GET_OFFER ||
      type === MessageEventType.OFFER ||
      type === MessageEventType.ANSWER
    ) {
      this.reconnectWork(connectorInfo, message, this.channelSend)
    }

    function chunksMerge(id: string) {
      const chunks = connectorInfo.chunks[id]
      const message = connectorInfo.messageList[id]
      const { FQ, name } = message.fileInfo
      if (chunks && chunks.length === FQ) {
        delete connectorInfo.messageList[id]
        delete connectorInfo.chunks[id]
        message.fileInfo.file = sliceBase64ToFile(chunks, name)
        emitter.emit(MittEventName.MESSAGE, message)
      }
    }
  }

    /**
   * RTCDataChannel close事件 connector关闭通知事件
   * @param memberInfo 
   */
    private async closeMessage(data: {
      connectorId: string,
    }) {
      this.closeConnectorById(data.connectorId)
    }

  /**
   * socket leave事件 成员退出通知事件
   * @param memberInfo 
   */
  private async leaveMessage(data: {
    connectorId: string,
    memberId: string,
  }) {
    this.closeConnectorById(data.connectorId)
  }

  /**
   * RTCPeerConnection绑定事件 对等方有新的媒体轨道加入时通知
   * @param connectorInfo 
   * @param event 
   */
  private async ontrack(connectorInfo: ConnectorInfo, event: RTCTrackEvent) {
    const { streams } = event
    const { peerConnection: pc } = connectorInfo.webrtc
    connectorInfo.senders = pc.getSenders()
    connectorInfo.receivers = pc.getReceivers()
    connectorInfo.transceivers = pc.getTransceivers()
    const remoteStream = streams[0]
    connectorInfo.remoteStream = remoteStream
    this[MittEventName.CONNECTOR_INFO_LIST_CHANGE]()
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

  /**
   * 房间内断开重连
   * @returns 
   */
  private reconnect() {
    if (!(this._state === UserState.JOIN)) {
      return
    }
    this.sendReconnectMessage(this.userInfo)
  }

  private reconnectMessage(message: ReconnectMessageData) {
    const { type  } = message
    if (type === UserState.LEAVE) {
      const { memberId } = message
      if (memberId) {
        const connectorInfo = Array.from(this.connectorInfoMap.values()).find(item => item.memberId === memberId)
        this.closeConnectorById(connectorInfo.connectorId)
        if (connectorInfo.streamType === StreamTypeEnum.DISPLAY) {
          this.closeDisplayConnector()
        }
        return
      }
      this.closeDisplayConnector()
      this.closeAllConnector()
    } else if (
      type === MessageEventType.GET_OFFER ||
      type === MessageEventType.OFFER ||
      type === MessageEventType.ANSWER
    ) {
      const connectorId = message.connectorId
      const connectorInfo = this.connectorInfoMap.get(connectorId)
      this.reconnectWork(connectorInfo, message, this.sendMessage)
    }
  }

  private async reconnectWork(
    connectorInfo: ConnectorInfo,
    message: ChannelMessageData | ReconnectMessageData,
    send: typeof this.channelSend | typeof this.sendMessage
  ) {
    const { type, data  } = message
    const { peerConnection: pc } = connectorInfo.webrtc
    const sendMessage = (sendMessage: ChannelMessageData) => {
      if (send === this.channelSend) {
        this.channelSend(connectorInfo, sendMessage)
      } else if (send === this.sendMessage) {
        this.sendMessage(MessageEventType.RECONNECT_WORK, {
          ...sendMessage,
          connectorId: connectorInfo.connectorId,
          memberId: (message as ReconnectMessageData).memberId
        })
      }
    }
    if (type === MessageEventType.GET_OFFER) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendMessage({
        type: MessageEventType.OFFER,
        data: { offer }
      })
      
    } else if (type === MessageEventType.OFFER) {
      const offer = new RTCSessionDescription(data.offer)
      await pc.setRemoteDescription(offer)
      const answer = await pc.createAnswer()
      pc.setLocalDescription(answer)
      sendMessage({
        type: MessageEventType.ANSWER,
        data: { answer }
      })
    } else if (type === MessageEventType.ANSWER) {
      const answer = new RTCSessionDescription(data.answer)
      await pc.setRemoteDescription(answer)
    }
  }

  private errorMessage(error: {
    type: string,
    message: string
  }) {
    if (error.type === ErrorMessageType.REPEAT) {
      this._state = ''
    }
    onError(error.message)
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
    streamType?: StreamType,
  }) {
    this.sendMessage(MessageEventType.OFFER, data)
  }

  private async sendAnswerMessage(data: {
    remoteConnectorId: string,
    connectorId: string,
    memberId: string,
    answer: RTCSessionDescriptionInit,
    streamType: StreamType
  }) {
    this.sendMessage(MessageEventType.ANSWER, data)
  }

  private channelSend(connectorInfo: ConnectorInfo, data: ChannelMessageData) {
    const { type, channel, webrtc } = connectorInfo
    const bufferedAmount = channel?.bufferedAmount ?? webrtc.dataChannel.bufferedAmount
    if (bufferedAmount >= 15 * 1024 * 1024) {
      setTimeout(() => this.channelSend(connectorInfo, data), 10)
      return
    }
    if (type === TypeEnum.OFFER) {
      if (webrtc.dataChannel.readyState !== DatachannelReadyState.OPEN) {
        this.channelSend(connectorInfo, data)
        return
      }
      webrtc.dataChannel.send(JSON.stringify(data))
    } else if (type === TypeEnum.ANSWER) {
      if (channel.readyState !== DatachannelReadyState.OPEN) {
        this.channelSend(connectorInfo, data)
        return
      }
      channel.send(JSON.stringify(data))
    } 
  }

  private sendJoinMessage(data: {
    id: string,
    username: string,
    roomname: string,
  }) {
    this.sendMessage(MessageEventType.JOIN, data)
  }

  private sendleaveMessage(data: Array<{
    remoteConnectorId: string,
    memberId: string
  }>) {
    this.sendMessage(MessageEventType.LEAVE, data)
  }

  private sendCloseMessage(connectorInfo: ConnectorInfo, data: { connectorId: string }) {
    this.channelSend(connectorInfo, {
      type: MessageEventType.CLOSE,
      data: data
    })
  }

  private sendReconnectMessage(data: UserInfo) {
    this.sendMessage(MessageEventType.RECONNECT, data)
  }

  public channelSendMesage(data: Message) {
    data = deepcopy(data)
    let chunks = []
    if (data.type === MessageEventType.FILE) {
      chunks = data.fileInfo.chunks
      delete data.fileInfo.chunks
    }
    this.connectorInfoMap.forEach(connectorInfo => {
      this.channelSend(connectorInfo, {
        type: MessageEventType.CHAT,
        data
      })
      chunks.forEach(chunk => {
        this.channelSend(connectorInfo, {
          type: MessageEventType.FILE,
          data: {
            id: data.id,
            chunk
          }
        })
      })
    })
  }

  /**
   * 切换设备或设备状态后刷新连接，刷新依赖于RTCDataChannel信息通道
   * @param connectorInfo 
   */
  private async restartConnector(connectorInfo: ConnectorInfo) {
    const { type, webrtc: { peerConnection: pc } } = connectorInfo
    let data: ChannelMessageData
    if (type === TypeEnum.OFFER) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      data = {
        type: MessageEventType.OFFER,
        data: {
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
  public replaceTrack(deviceId: string, kind: Kind) {
    const type = typeof this.streamConstraints[kind]
    if (type === 'boolean') {
      this.streamConstraints[kind] = {
        deviceId
      }
    } else if (type === 'object') {
      (this.streamConstraints[kind] as MediaTrackConstraints).deviceId = deviceId
    } else {
      this.streamConstraints[kind] = { deviceId }
    }
    navigator.mediaDevices.getUserMedia(this.streamConstraints).then(stream => {
      const [track] = kind === KindEnum.AUDIO ? stream.getAudioTracks() : stream.getVideoTracks()
      const localStream = this.mediaDevices.localStream
      if (localStream) {
        const [localTrack] = KindEnum.AUDIO ? localStream.getAudioTracks() : localStream.getVideoTracks()
        this.mediaDevices.localStream.removeTrack(localTrack)
        this.mediaDevices.localStream.addTrack(track)
      }
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

  public async replaceVideoTrack(deviceId: string) {
    this.replaceTrack(deviceId, KindEnum.VIDEO)
    emitter.emit(MittEventName.LOCAL_STREAM_CHANGE, await this.getLocalStream())
  }

  public replaceAudioTrack(deviceId: string) {
    this.replaceTrack(deviceId, KindEnum.AUDIO)
  }

  /**
   * 切换设备状态，本质还是改变媒体轨道
   * @param state 
   * @param kind 
   */
  public deviceSwitch(state: boolean, kind: Kind) {
    navigator.mediaDevices.getUserMedia(this.streamConstraints).then(stream => {
      const [track] = kind === KindEnum.AUDIO ? stream.getAudioTracks() : stream.getVideoTracks()
      const localStream = this.mediaDevices.localStream
      if (localStream) {
        if (state) {
          localStream.addTrack(track)
        } else {
          const [localTrack] = kind === KindEnum.AUDIO ? localStream.getAudioTracks() : localStream.getVideoTracks()
          localStream.removeTrack(localTrack)
        }
      }
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

  public disableAudio() {
    this.deviceSwitch(false, KindEnum.AUDIO)
  }

  public enableAudio() {
    this.deviceSwitch(true, KindEnum.AUDIO)
  }

  public disableVideo() {
    this.deviceSwitch(false, KindEnum.VIDEO)
    emitter.emit(MittEventName.LOCAL_STREAM_CHANGE, null)
  }

  public async enableVideo() {
    this.deviceSwitch(true, KindEnum.VIDEO)
    emitter.emit(MittEventName.LOCAL_STREAM_CHANGE, await this.getLocalStream())
  }

  public async getLocalStream() {
    try {
      // 获取本地媒体流
      const localStream = await navigator.mediaDevices.getUserMedia({
        ...this.streamConstraints,
        audio: false
      })
      const videoTracks = localStream.getVideoTracks()
      // await this.setVideoSetting(videoTracks[0])
      return localStream
    } catch (error) {
      return Promise.reject(error)
    }
  }

  public async getDisplayStream() {
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
      Array.from(this.connectorInfoMap.values())
        .map(connectorInfo => {
          const { streamType, connectorId, remoteStream } = connectorInfo
          return {
            streamType,
            connectorId,
            remoteStream
          }
        })
        .filter(connectorInfo => connectorInfo.streamType !== StreamTypeEnum.DISPLAY)
    )
  }, timerTime)

  private closeConnectorById(connectorId: string) {
    const connectorInfo = this.connectorInfoMap.get(connectorId)
    if (connectorInfo) {
      connectorInfo.webrtc.close()
      this.connectorInfoMap.delete(connectorId)
    }
    this[MittEventName.CONNECTOR_INFO_LIST_CHANGE]()
  }

  private closeAllConnector() {
    Array.from(this.connectorInfoMap.keys()).forEach(connectorId => {
      this.closeConnectorById(connectorId)
    })
  }

  /**
   * 写这个函数的目的是解决当退出房间时直接emitter.all.clear()清除事件
   * 会导致MittEventName.CONNECTOR_INFO_LIST_CHANGE无法通知外界连接成员列表已改变
   */
  private clearEmitter = debounce(() => {
    emitter.all.clear()
  }, timerTime)

  public close() {
    this.closeAllConnector()
    this.mediaDevices.close()
    this.socket.close();
    this.clearEmitter
  }
}