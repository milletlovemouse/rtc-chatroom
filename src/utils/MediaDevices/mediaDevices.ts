
import { Merge, AudioElement, SrcObject } from "../type"
export type DeviceInfo = MediaDeviceInfo | InputDeviceInfo
export type Constraints = Merge<MediaStreamConstraints, {}>

export default class MediaDevices {
  constraints: MediaStreamConstraints
  constructor(constraints: MediaStreamConstraints) {
    this.constraints = constraints
    this.init()
  }

  private init() {
    this.bindEvent()
  }

  getUserMedia(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(this.constraints)
  }

  getDisplayMedia(): Promise<MediaStream> {
    return navigator.mediaDevices.getDisplayMedia(this.constraints)
  }

  public static enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices()
  }

  public static getSupportedConstraints(): MediaTrackSupportedConstraints {
    return navigator.mediaDevices.getSupportedConstraints();
  }

  async getUserMediaStreamTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getUserMedia()).getTracks()
  }

  async getAudioTracks(): Promise<MediaStreamTrack[]> {
    return (await this.getUserMedia()).getAudioTracks()
  }

  async getVideoTracks(): Promise<MediaStreamTrack[]>{
    return (await this.getUserMedia()).getVideoTracks()
  }

  private bindEvent() {
    navigator.mediaDevices.addEventListener('devicechange', this.devicechange, false);
  }

  private unbindEvent() {
    navigator.mediaDevices.removeEventListener('devicechange', this.devicechange, false);
  }

  private devicechange(event: Event) {
    console.log('devicechange', this, event);
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

  close() {
    this.unbindEvent()
  }
}
