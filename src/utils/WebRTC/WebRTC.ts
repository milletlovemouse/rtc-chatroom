import CustomEvent from "../event"

export default class WebRTC {
  configuration: RTCConfiguration
  peerConnection: RTCPeerConnection
  dataChannel: RTCDataChannel
  peerConnectionEventTaget: CustomEvent
  dataChannelEventTarget: CustomEvent

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
    this.peerConnectionEventTaget = new CustomEvent(this.peerConnection)
    this.peerConnection.setConfiguration(this.configuration);
  }

  createDataChannel(label: string, option?: RTCDataChannelInit) {
    this.dataChannel = this.peerConnection.createDataChannel(label, option);
    this.dataChannelEventTarget = new CustomEvent(this.dataChannel)
    return this.dataChannel
  }

  get signalingState(): RTCSignalingState {
    return this.peerConnection.signalingState
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

  async createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    return this.peerConnection.createAnswer(options)
  }

  async createOffer(options?: RTCAnswerOptions): Promise<RTCSessionDescriptionInit> {
    return this.peerConnection.createOffer(options)
  }

  close() {
    this.peerConnectionEventTaget.close()
    this.dataChannelEventTarget?.close()
    this.peerConnection.close()
    this.peerConnection = null
    this.dataChannel?.close()
    this.dataChannel = null
  }
}