<p align='center'>
  <a href='./README.md'>English</a> | 简体中文
</p>

# 项目介绍
## 项目概述
&emsp;&emsp;基于`WebRTC`实现的`P2P`多人视频聊天室，能够多人视频通话、共享屏幕、设备切换&启停、发送消息，还支持断开重连、视频录制、图片编辑等功能，支撑`RTC`相关功能实现的代码我封装为了一个`SDK`，后面会给出此`SDK`的`API`文档，关于其他功能，例如视频录制、图片编辑等功能我封装为了相关`hook`或自定义指令。

&emsp;&emsp;客户端产生的数据不经过服务器，而是直接通过`WebRTC`协议进行传输，无须担心隐私问题，服务器只负责转发`SDP`建立`WebRTC`连接，服务器可以部署在公网，客户端也可以部署在公网，这样就可以实现跨网段、跨运营商的多人视频通话。

- 前端技术栈：有Vue3和React两个版本
  - Vue3：`Vue3`、`TypeScript`、`Vite4`、`Socket.IO`
  - React：`React18`、`TypeScript`、`Webpack5`、`Socket.IO`
- 后端技术栈：`Express`、`Socket.IO`
- 代码仓库：
  - Vue3：[milletlovemouse/rtc-chatroom](https://github.com/milletlovemouse/rtc-chatroom)
  - React：[milletlovemouse/chatroom](https://github.com/milletlovemouse/chatroom)
  - Server：[milletlovemouse/chatroom-server](https://github.com/milletlovemouse/chatroom-server)
  - SDK：[milletlovemouse/rtc-client](https://github.com/milletlovemouse/rtc-client)

## 项目展示
![image.png](https://raw.githubusercontent.com/milletlovemouse/github-file-library/main/images/chatroom_readme.png)

<p align=center>
  <a target="_blank" href="https://www.bilibili.com/video/BV1194y187mc/?share_source=copy_web&vd_source=340ae8bb00ff31aa830e5dc42df14f8b">B站传送门</a>
  &emsp;
  <a target="_blank" href="https://rtcchatroom.cn/">预览体验</a>
</p>

## 启动项目
> npm
```shell
npm install

npm run dev
```
> yarn
```shell
yarn

yarn dev
```
> pnpm
```shell
pnpm install

pnpm dev
```

## RTCClient()
### Syntax
`new RTCClient(options)`
### Parameters
`options`

- `configuration:`RTCConfiguration
- `constraints:`MediaStreamConstraints
- `socketConfig:`
   - `host:`域名或者ip
   - `port?:`端口
```typescript
import RTCClient from 'rtc-client';

const host = 'https://127.0.0.1'
const port = 3000

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
    audio: true,
    video: true
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

#### getDevicesInfoList(): Promise<MediaDeviceInfo[]>
> 获取设备列表

#### getVideoDeviceInfo(): Promise<MediaDeviceInfo>
> 获取当前使用的视频输入设备信息

#### getAudioDeviceInfo(): Promise<MediaDeviceInfo>
> 获取当前使用的音频输入设备信息

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
