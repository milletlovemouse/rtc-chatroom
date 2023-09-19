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

  public async getUserMedia(): Promise<MediaStream> {
    if (this.localStream) return this.localStream
    this.localStream = await navigator.mediaDevices.getUserMedia(this.constraints)
    this.locaStreamEventTaget = new CustomEventTarget(this.localStream)
    return this.localStream
  }

  public async getDisplayMedia(): Promise<MediaStream> {
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

  public async getUserMediaStreamTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getUserMedia()).getTracks()
  }

  public async getUserAudioTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getUserMedia()).getAudioTracks()
  }

  public async getUserVideoTracks(): Promise<MediaStreamTrack[]>{
    return (await this.getUserMedia()).getVideoTracks()
  }

  public async getDisplayMediaStreamTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getDisplayMedia()).getTracks()
  }

  public async getDisplayAudioTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getDisplayMedia()).getAudioTracks()
  }

  public async getDisplayVideoTracks(): Promise<MediaStreamTrack[]>{
    return (await this.getDisplayMedia()).getVideoTracks()
  }

  public addTrack(track: MediaStreamTrack | MediaStreamTrack[], stream: MediaStream) {
    // 将一个或多个新轨道添加到MediaStream流
    track = Array.isArray(track) ? track : [track]
    track.map(track => stream.addTrack(track))
  }

  public removeTrack(track: MediaStreamTrack | MediaStreamTrack[], stream: MediaStream) {
    // 从MediaStream流中删除一个或多个轨道
    track = Array.isArray(track) ? track : [track]
    track.map(track => stream.removeTrack(track))
  }

  // 开启本地某个媒体轨道或开启所有媒体轨道
  public async startUserMediaStreamTrack(id?: string) {
    if (!this.localStream) return
    for (const track of await this.getUserMediaStreamTracks()) {
      if(id && track.id !== id) continue
      track.enabled = true
    }
  }

  // 停止本地某个媒体轨道或停止所有媒体轨道
  public async stopUserMediaStreamTrack(id?: string) {
    if (!this.localStream) return
    for (const track of await this.getUserMediaStreamTracks()) {
      if(id && track.id !== id) continue
      track.stop()
      track.enabled = false
    }
  }

  public async startDisplayMediaStreamTrack(id?: string) {
    if (!this.displayStream) return
    for (const track of await this.getDisplayMediaStreamTracks()) {
      if(id && track.id !== id) continue
      track.enabled = true
    }
  }

  public async stopDisplayMediaStreamTrack(id?: string) {
    if (!this.displayStream) return
    for (const track of await this.getDisplayMediaStreamTracks()) {
      if(id && track.id !== id) continue
      track.stop()
      track.enabled = false
    }
  }

  public closeUserMediaStream() {
    this.stopUserMediaStreamTrack()
    this.locaStreamEventTaget?.close()
    this.localStream = null
    let trackEventTarget = null
    while(trackEventTarget = this.locaStreamTrackEventTargets.pop()) {
      trackEventTarget.close()
    }
  }

  public closeDisplayMediaStream() {
    this.stopDisplayMediaStreamTrack()
    this.displayStreamEventTarget?.close()
    this.displayStream = null
    let trackEventTarget = null
    while(trackEventTarget = this.displayStreamTrackEventTargets.pop()) {
      trackEventTarget.close()
    }
  }

  public close() {
    // 关闭MediaStream
    this.closeUserMediaStream()
    this.closeDisplayMediaStream()
  }
}
