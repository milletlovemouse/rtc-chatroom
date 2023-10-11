## RTCClient()
### Syntax
`new RTCClient(options)`
### Parameters
`options`

- `configuration:`RTCConfiguration
- `constraints:`MediaStreamConstraints
- `socketConfig:`
   - `host:`域名或者ip
   - `port:`端口
```typescript
import RTCClient from 'rtc-client';

const host = 'https://127.0.0.1'
const port = 3000

const deviceInfo = {
  audioDisabled: false,
  cameraDisabled: false,
  audioDeviceId: '',
  cameraDeviceId: '',
  dispalyEnabled: false
}

const rtc = new RTCClient({
  configuration: {
    iceServers: [
      {
        urls: `turn:stun.l.google.com:19302`,
        username: "webrtc",
        credential: "turnserver",
      },
    ],
  },
  constraints: {
    audio: deviceInfo.value.audioDisabled ? false : {
      deviceId: deviceInfo.value.audioDeviceId
    },
    video: deviceInfo.value.cameraDisabled ? false : {
      deviceId: deviceInfo.value.cameraDeviceId
    }
  },
  socketConfig: {
    host,
    port,
  }
})
```
### Instance methods
#### on（type: string, listener: function）: void
> 绑定event事件

#### off（type: string, listener: function）: void
> 解除绑定event事件

#### shareDisplayMedia(): Promise<MediaStream>
> 开启视频共享

#### cancelShareDisplayMedia(): void
> 取消视频共享

#### join（data: { username: string, roomname: string }）: void
> 加入房间

#### leave(): void
> 离开房间

#### channelSendMesage(): void
> 使用RTCDataChannel数据通道发送消息

#### replaceTrack（deviceId: string, kind: 'video' | 'audio'）: void
> 切换设备媒体轨道

#### replaceVideoTrack（deviceId: string）: void
> 切换视频媒体轨道

#### replaceAudioTrack（deviceId: string）: void
> 切换音频媒体轨道

#### deviceSwitch（state: boolean, kind: 'video' | 'audio'）: void
> 切换设备状态

#### disableAudio(): void
> 禁用麦克风

#### enableAudio(): void
> 启用麦克风

#### disableVideo(): void
> 禁用摄像头

#### enableVideo(): void
> 启用摄像头

#### getLocalStream(): Promise<MediaStream>
> 获取本地媒体流

#### getDisplayStream(): Promise<MediaStream>
> 获取共享屏幕媒体流

#### close(): void
> 关闭rtcclient实例

### Events
#### connectorInfoListChange
> 当与连接的客户端列表发生改变或者更新时触发

```typescript
rtc.on('connectorInfoListChange', (data) => {
  console.log('onConnectorInfoListChange', data);
})
```
#### displayStreamChange
> 当共享屏幕媒体流发生变化时触发

```typescript
rtc.on('displayStreamChange', async (stream) => {
  displayStream = stream
})
```
#### localStreamChange
> 当本地媒体流发生变化时触发

```typescript
rtc.on('localStreamChange', async (stream) => {
  localStream = stream
})
```
#### message
> 当RTCDataChannel数据通道接收到数据时触发

```typescript
rtc.on('message', async (message: MessageItem) =>{
  message.isSelf = false
  messageList.push(message)
  console.log(message);
})
```
