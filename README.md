## 项目介绍
### 项目概述
&emsp;&emsp;基于WebRTC实现的能够视频通话、共享屏幕、设备启停、发送消息的匿名视频聊天室，项目并不依赖数据库，只依赖信令服务器完成WebRTC连接与断开后重连，核心在前端部分。

&emsp;&emsp;目前项目还比较小，只有一个单页面和几个组件，都是些业务代码，支撑功能实现的代码我封装为了一个SDK，不依赖开发框架，可以直接移植使用，项目核心就在于此，后面会给出此SDK的API文档；目前还有一些想法没有实现，还在开发当中。

- 前端技术栈：有Vue3和React两个版本
  - Vue3：`Vue3`、`TypeScript`、`Vite4.4`、`Socket.IO`
  - React：`React18`、`TypeScript`、`Webpack5`、`Socket.IO`
- 后端技术栈：`Express`、`Socket.IO`
- 代码仓库：
  - Vue3：[milletlovemouse/Tool-library(github.com)](https://github.com/milletlovemouse/Tool-library)
  - React：[milletlovemouse/chatroom(github.com)](https://github.com/milletlovemouse/chatroom)
  - Server：[milletlovemouse/chatroom-server(github.com)](https://github.com/milletlovemouse/chatroom-server)

### 项目展示
![image.png](https://raw.githubusercontent.com/milletlovemouse/github-file-library/main/images/chatroom_readme.png)

<p align=center><a href="https://www.bilibili.com/video/BV1194y187mc/?share_source=copy_web&vd_source=340ae8bb00ff31aa830e5dc42df14f8b">B站传送门</a></p>

### 启动项目
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
