import mitt from 'mitt'
import deepcopy from "deepcopy"
import SocketClient from "../socket-client";
import WebRTC from "./WebRTC";
import MediaDevices from "../MediaDevices/mediaDevices";
import CustomEventTarget from '../event';
import { debounce } from '../util'
import { sliceBase64ToFile } from '../fileUtils';
import { isObject, isBoolean } from "../util"

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
  index: number;
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
  ERROR = "error"
}

export type ConnectorInfoList = Pick<ConnectorInfo, 'streamType' | 'connectorId' | 'remoteStream'>[]
type MittEventType  = {
  'connectorInfoListChange': ConnectorInfoList,
  'displayStreamChange': MediaStream,
  'localStreamChange': MediaStream,
  'message': Message,
  'error': ErrorMessage
}

export type ErrorMessage = {
  type: string,
  message: string
}

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
  TEXT = "text",
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
export type StreamType = 'user' | 'display' | 'remoteDisplay';

enum TypeEnum {
  OFFER = 'offer',
  ANSWER = 'answer',
}
type Type = 'offer' | 'answer';

enum KindEnum {
  AUDIO = 'audio',
  VIDEO = 'video',
  VIDEOINPUT = 'videoinput',
  AUDIOINPUT = 'audioinput',
}
type Kind = 'audio' | 'video';

enum ControlEnum {
  ADD = 'add',
  REMOVE = 'remove',
}
type ControlType = 'add' | 'remove'

type SendGetOfferMessageData =  {
  kind?: Kind,
  type?: ControlType
}

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
  chunks: Record<string, [string, number][]>;
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
  readonly messageQueueSize = 1024 * 1024 * 15
  private emitter = mitt<MittEventType>()
  private connectorInfoMap: ConnectorInfoMap = new Map();
  private audioState = true;
  private videoState = true;
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

  public on<K extends keyof MittEventType, Args extends MittEventType[K]>(type: K, listener: (args: Args) => void){
    this.emitter.on(type, listener)
  }

  public off(type: keyof MittEventType, listener?: (...args: any[]) => void){
    this.emitter.off(type, listener)
  }

  public getDevicesInfoList() {
    return MediaDevices.enumerateDevices()
  }

  public getVideoDeviceInfo() {
    return new Promise<MediaDeviceInfo>(async(resolve, reject) => {
      try {
        const videoTracks = await this.mediaDevices.getUserVideoTracks()
        if (!videoTracks || !videoTracks.length) {
          reject(new Error('video device not found'))
          return
        }
        const deviceInfoList = await this.getDevicesInfoList()
        const videoDeviceInfo = deviceInfoList.find(item => item.label === videoTracks[0].label && item.kind === KindEnum.VIDEOINPUT)
        resolve(videoDeviceInfo)
      } catch (error) {
        reject(error)
      }
    })
  }

  public getAudioDeviceInfo() {
    return new Promise<MediaDeviceInfo>(async(resolve, reject) => {
      try {
        const audioTracks = await this.mediaDevices.getUserAudioTracks()
        if (!audioTracks || !audioTracks.length) {
          reject(new Error('audio device not found'))
          return
        }
        const deviceInfoList = await this.getDevicesInfoList()
        const audioDeviceInfo = deviceInfoList.find(item => item.label === audioTracks[0].label && item.kind === KindEnum.AUDIOINPUT)
        resolve(audioDeviceInfo)
      } catch (error) {
        reject(error)
      }
    })
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
    try {
      const localStream = await this.mediaDevices.getUserMedia()
      const audioTracks = localStream.getAudioTracks()
      const videoTracks = localStream.getVideoTracks()
      connectorInfo.senders = webrtc.addTrack([...videoTracks, ...audioTracks], localStream)
      if (!this.audioState) {
        this.removeTrack(connectorInfo, KindEnum.AUDIO)
      }
      if (!this.videoState) {
        this.removeTrack(connectorInfo, KindEnum.VIDEO)
      }
    } catch (error) {
      if (connectorInfo.type === TypeEnum.OFFER) {
        webrtc.peerConnection.addTransceiver(KindEnum.VIDEO)
        webrtc.peerConnection.addTransceiver(KindEnum.AUDIO)
      }
      connectorInfo.senders = []
      console.error(error)
    }
  }
  
  /**
   * 添加共享屏幕媒体流
   * @param connectorInfo 
   */
  private async addDisplayStream(connectorInfo: ConnectorInfo) {
    try {
      const { webrtc } = connectorInfo
      const localDisplayStream = await this.mediaDevices.getDisplayMedia()
      const audioTracks = localDisplayStream.getAudioTracks()
      const videoTracks = localDisplayStream.getVideoTracks()
      webrtc.addTrack([...videoTracks, ...audioTracks], localDisplayStream)
    } catch (error) {
      console.error(error)
    }
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
    const webrtcList = Array.from(this.connectorInfoMap.values())
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
      this.emitter.emit(MittEventName.DISPLAY_STREAM_CHANGE, stream)
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
    this.emitter.emit(MittEventName.DISPLAY_STREAM_CHANGE, null)
    this.connectorInfoMap.forEach(connectorInfo => {
      if (connectorInfo.streamType === StreamTypeEnum.DISPLAY) {
        const { remoteConnectorId } = connectorInfo
        this.sendCloseMessage(connectorInfo, { connectorId: remoteConnectorId })
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
      const { id, type } = data as Message
      if (type === MessageEventType.TEXT) {
        this.emitter.emit(MittEventName.MESSAGE, data as Message)
        return
      }
      connectorInfo.messageList[id] = data as Message
      chunksMerge(id)
    } else if (type === MessageEventType.FILE) { // 接收文件碎片
      const { id, chunk, index } = data as FileMessageData
      const chunks = connectorInfo.chunks[id] = (connectorInfo.chunks[id] || [])
      chunks.push([chunk, index])
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
        const flieChunks = chunks.sort((a, b) => a[1] - b[1]).map(([chunk]) => chunk)
        message.fileInfo.file = sliceBase64ToFile(flieChunks, name)
        this.emitter.emit(MittEventName.MESSAGE, message)
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
    const remoteStream = streams[0]
    if (!remoteStream) return
    connectorInfo.remoteStream = remoteStream
    remoteStream.onremovetrack = this.onremovetrack.bind(this)
    this[MittEventName.CONNECTOR_INFO_LIST_CHANGE]()
  }

  private onremovetrack() {
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
      this[MittEventName.CONNECTOR_INFO_LIST_CHANGE]()
    }
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
    const { type, data } = message
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
      if (data) {
        const { kind, type } = data
        if (type === ControlEnum.ADD) {
          pc.addTransceiver(kind)
        }
      }
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

  private errorMessage(error: ErrorMessage) {
    if (error.type === ErrorMessageType.REPEAT) {
      this._state = ''
    }
    this.emitter.emit(MittEventName.ERROR, error)
    console.error(error.message)
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
    const maxMessageSize = webrtc.peerConnection.sctp.maxMessageSize
    const bufferedAmount = channel?.bufferedAmount ?? webrtc.dataChannel.bufferedAmount
    if (bufferedAmount + maxMessageSize > this.messageQueueSize) {
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
      chunks.forEach((chunk, index) => {
        this.channelSend(connectorInfo, {
          type: MessageEventType.FILE,
          data: {
            id: data.id,
            index,
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
  private async restartConnector(connectorInfo: ConnectorInfo, sendGetOfferMessage: SendGetOfferMessageData) {
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
      data = {
        type: MessageEventType.GET_OFFER,
        data: sendGetOfferMessage
      }
    }
    this.channelSend(connectorInfo, data)
  }

  private async addTrack(connectorInfo: ConnectorInfo, track: MediaStreamTrack) {
    let localStream = this.mediaDevices.localStream
    if (!localStream) {
      localStream = await this.mediaDevices.getUserMedia()
    }
    const senders = connectorInfo.webrtc.addTrack(track, localStream)
    connectorInfo.senders.push(...senders)
  }

  private removeTrack(connectorInfo: ConnectorInfo, kind: Kind) {
    const senders = connectorInfo.senders.filter((s) => s.track?.kind === kind);
    connectorInfo.senders = connectorInfo.senders.filter((s) => s.track?.kind !== kind)
    connectorInfo.webrtc.removeTrack(senders)
  }

  /**
   * 切换设备媒体轨道
   * @param deviceId 
   * @param kind 
   */
  public async replaceTrack(deviceId: string, kind: Kind) {
    const constraint = this.streamConstraints[kind]
    if (isBoolean(constraint)) {
      this.streamConstraints[kind] = {
        deviceId
      }
    } else if (isObject(constraint)) {
      (this.streamConstraints[kind] as MediaTrackConstraints).deviceId = deviceId
    } else {
      this.streamConstraints[kind] = { deviceId }
    }
    const stream = await navigator.mediaDevices.getUserMedia(this.streamConstraints);
    const [track] = kind === KindEnum.AUDIO ? stream.getAudioTracks() : stream.getVideoTracks();
    const localStream = this.mediaDevices.localStream;
    if (localStream) {
      const [localTrack] = kind === KindEnum.AUDIO ? localStream.getAudioTracks() : localStream.getVideoTracks();
      localStream.removeTrack(localTrack);
      localStream.addTrack(track);
    }
    this.connectorInfoMap.forEach(async (connectorInfo) => {
      const { streamType, webrtc: { peerConnection: pc } } = connectorInfo;
      if (streamType === StreamTypeEnum.DISPLAY || streamType === StreamTypeEnum.REMOTE_DISPLAY) {
        return;
      }
      // sender.replaceTrack(track)
      this.removeTrack(connectorInfo, kind);
      this.addTrack(connectorInfo, track);
      this.restartConnector(connectorInfo, {
        kind,
        type: ControlEnum.ADD
      });
    });
  }

  public async replaceVideoTrack(deviceId: string) {
    await this.replaceTrack(deviceId, KindEnum.VIDEO)
    this.emitter.emit(MittEventName.LOCAL_STREAM_CHANGE, await this.getLocalStream())
  }

  public async replaceAudioTrack(deviceId: string) {
    await this.replaceTrack(deviceId, KindEnum.AUDIO)
  }

  /**
   * 切换设备状态，本质还是改变媒体轨道
   * @param state 
   * @param kind 
   */
  public async deviceSwitch(state: boolean, kind: Kind) {
    if (kind === KindEnum.AUDIO) {
      this.audioState = state
    } else if (kind === KindEnum.VIDEO) {
      this.videoState = state
    }
    const stream = await navigator.mediaDevices.getUserMedia(this.streamConstraints);
    const [track] = kind === KindEnum.AUDIO ? stream.getAudioTracks() : stream.getVideoTracks();
    const localStream = this.mediaDevices.localStream;
    if (localStream) {
      if (state) {
        localStream.addTrack(track);
      } else {
        const [localTrack] = kind === KindEnum.AUDIO ? localStream.getAudioTracks() : localStream.getVideoTracks();
        localStream.removeTrack(localTrack);
      }
    }
    this.connectorInfoMap.forEach(async (connectorInfo) => {
      const { streamType, webrtc } = connectorInfo;
      if (streamType === StreamTypeEnum.DISPLAY || streamType === StreamTypeEnum.REMOTE_DISPLAY) {
        return;
      }
      if (state) {
        this.addTrack(connectorInfo, track);
      } else {
        this.removeTrack(connectorInfo, kind);
      }
      this.restartConnector(connectorInfo, {
        kind,
        type: state ? ControlEnum.ADD : ControlEnum.REMOVE,
      });
    });
  }

  public async disableAudio() {
    await this.deviceSwitch(false, KindEnum.AUDIO)
  }

  public async enableAudio() {
    await this.deviceSwitch(true, KindEnum.AUDIO)
  }

  public async disableVideo() {
    await this.deviceSwitch(false, KindEnum.VIDEO)
    this.emitter.emit(MittEventName.LOCAL_STREAM_CHANGE, null)
  }

  public async enableVideo() {
    await this.deviceSwitch(true, KindEnum.VIDEO)
    this.emitter.emit(MittEventName.LOCAL_STREAM_CHANGE, await this.getLocalStream())
  }

  public async getLocalStream() {
    try {
      // 获取本地媒体流
      const localStream = await navigator.mediaDevices.getUserMedia({
        ...this.streamConstraints,
        audio: false
      })
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
    this.emitter.emit(
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
    this.emitter.all.clear()
  }, timerTime)

  public close() {
    this.closeAllConnector()
    this.mediaDevices.close()
    this.socket.close();
    this.clearEmitter
  }
}