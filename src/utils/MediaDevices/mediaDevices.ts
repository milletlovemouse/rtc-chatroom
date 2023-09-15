import { Merge } from "../type"
export type DeviceInfo = MediaDeviceInfo | InputDeviceInfo
export type Constraints = Merge<MediaStreamConstraints, {}>
import CustomEventTarget from "../event"

export default class MediaDevices {
  constraints: MediaStreamConstraints
  localStream: MediaStream
  displayStream: MediaStream
  locaStreamEventTaget: CustomEventTarget
  displayStreamEventTarget: CustomEventTarget
  locaStreamTrackEventTargets: CustomEventTarget[] = []
  displayStreamTrackEventTargets: CustomEventTarget[] = []
  constructor(constraints: MediaStreamConstraints) {
    this.constraints = constraints
  }

  async getUserMedia(): Promise<MediaStream> {
    if (this.localStream) return this.localStream
    this.localStream = await navigator.mediaDevices.getUserMedia(this.constraints)
    this.locaStreamEventTaget = new CustomEventTarget(this.localStream)
    return this.localStream
  }

  async getDisplayMedia(): Promise<MediaStream> {
    if (this.displayStream) return this.displayStream
    this.displayStream = await navigator.mediaDevices.getDisplayMedia(this.constraints)
    this.displayStreamEventTarget = new CustomEventTarget(this.displayStream)
    return this.displayStream
  }

  // 获取设备信息
  public static enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices()
  }

  public static getSupportedConstraints(): MediaTrackSupportedConstraints {
    return navigator.mediaDevices.getSupportedConstraints();
  }

  async getUserMediaStreamTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getUserMedia()).getTracks()
  }

  async getUserAudioTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getUserMedia()).getAudioTracks()
  }

  async getUserVideoTracks(): Promise<MediaStreamTrack[]>{
    return (await this.getUserMedia()).getVideoTracks()
  }

  async getDisplayMediaStreamTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getDisplayMedia()).getTracks()
  }

  async getDisplayAudioTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getDisplayMedia()).getAudioTracks()
  }

  async getDisplayVideoTracks(): Promise<MediaStreamTrack[]>{
    return (await this.getDisplayMedia()).getVideoTracks()
  }

  addTrack(track: MediaStreamTrack | MediaStreamTrack[], stream: MediaStream) {
    // 将一个或多个新轨道添加到MediaStream流
    track = Array.isArray(track) ? track : [track]
    track.map(track => stream.addTrack(track))
  }

  removeTrack(track: MediaStreamTrack | MediaStreamTrack[], stream: MediaStream) {
    // 从MediaStream流中删除一个或多个轨道
    track = Array.isArray(track) ? track : [track]
    track.map(track => stream.removeTrack(track))
  }

  // 开启本地某个媒体轨道或开启所有媒体轨道
  async startUserMediaStreamTrack(id?: string) {
    if (!this.localStream) return
    for (const track of await this.getUserMediaStreamTracks()) {
      if(id && track.id !== id) continue
      track.enabled = true
    }
  }

  // 停止本地某个媒体轨道或停止所有媒体轨道
  async stopUserMediaStreamTrack(id?: string) {
    if (!this.localStream) return
    for (const track of await this.getUserMediaStreamTracks()) {
      if(id && track.id !== id) continue
      track.stop()
      track.enabled = false
    }
  }

  async startDisplayMediaStreamTrack(id?: string) {
    if (!this.displayStream) return
    for (const track of await this.getDisplayMediaStreamTracks()) {
      if(id && track.id !== id) continue
      track.enabled = true
    }
  }

  async stopDisplayMediaStreamTrack(id?: string) {
    if (!this.displayStream) return
    for (const track of await this.getDisplayMediaStreamTracks()) {
      if(id && track.id !== id) continue
      track.stop()
      track.enabled = false
    }
  }

  closeUserMediaStream() {
    this.stopUserMediaStreamTrack()
    this.locaStreamEventTaget?.close()
    this.localStream = null
    let trackEventTarget = null
    while(trackEventTarget = this.locaStreamTrackEventTargets.pop()) {
      trackEventTarget.close()
    }
  }

  closeDisplayMediaStream() {
    this.stopDisplayMediaStreamTrack()
    this.displayStreamEventTarget?.close()
    this.displayStream = null
    let trackEventTarget = null
    while(trackEventTarget = this.displayStreamTrackEventTargets.pop()) {
      trackEventTarget.close()
    }
  }

  close() {
    // 关闭MediaStream
    this.closeUserMediaStream()
    this.closeDisplayMediaStream()
  }
}
