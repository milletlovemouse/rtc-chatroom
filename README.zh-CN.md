<p align="center">
  <a href="./README.md">English</a> | 简体中文
</p>

# RTC Chatroom

基于 WebRTC 实现的 P2P 多人视频聊天室，支持多人视频通话、屏幕共享、设备切换、音视频启停、即时消息、断线重连、视频录制和图片编辑等功能。

## 项目概述

RTC Chatroom 使用 WebRTC 在客户端之间直接传输音视频流和聊天数据。服务端只负责转发建立 WebRTC 连接所需的 SDP 和信令消息，不中转媒体流和聊天数据。

支撑 RTC 能力的核心代码已封装为 SDK。视频录制、图片编辑等扩展能力则封装为可复用的 hook 或自定义指令。

## 功能特性

- 多人 P2P 视频通话
- 屏幕共享与取消共享
- 摄像头和麦克风设备切换
- 音视频开启与关闭控制
- RTCDataChannel 即时消息
- 断线重连
- 视频录制
- 图片编辑

## 技术栈

- 前端：`Vue 3`、`TypeScript`、`Vite 5`、`Socket.IO`
- UI：`ant-design-vue`
- 状态管理：`Pinia`
- 服务端：`Express`、`Socket.IO`

## 相关仓库

- Vue 3：[milletlovemouse/rtc-chatroom](https://github.com/milletlovemouse/rtc-chatroom)
- React：[milletlovemouse/chatroom](https://github.com/milletlovemouse/chatroom)
- Server：[milletlovemouse/chatroom-server](https://github.com/milletlovemouse/chatroom-server)
- SDK：[milletlovemouse/rtc-client](https://github.com/milletlovemouse/rtc-client)

## 项目展示

![RTC Chatroom 预览图](https://raw.githubusercontent.com/milletlovemouse/github-file-library/main/images/chatroom_readme.png)

<p align="center">
  <a target="_blank" href="https://www.bilibili.com/video/BV1194y187mc/?share_source=copy_web&vd_source=340ae8bb00ff31aa830e5dc42df14f8b">B 站传送门</a>
  &emsp;
  <a target="_blank" href="https://rtcchatroom.cn/">预览体验</a>
</p>

## 快速开始

### 环境要求

- Node.js 18+
- pnpm

### 安装依赖

```shell
pnpm install
```

### 启动开发服务

```shell
pnpm dev
```

### 生产构建

```shell
pnpm build
```

### 预览生产构建

```shell
pnpm preview
```

## RTCClient API

### 创建实例

```typescript
import RTCClient from 'rtc-client';

const host = 'https://127.0.0.1';
const port = 3000;

const rtc = new RTCClient({
  configuration: {
    iceServers: [
      {
        urls: 'turn:stun.l.google.com:19302',
        username: 'webrtc',
        credential: 'turnserver',
      },
    ],
  },
  constraints: {
    audio: true,
    video: true,
  },
  socketConfig: {
    host,
    port,
  },
});
```

### 构造参数

- `configuration: RTCConfiguration` - WebRTC 连接配置。
- `constraints: MediaStreamConstraints` - 本地媒体流约束。
- `socketConfig` - 信令服务配置。
  - `host: string` - 域名或 IP 地址。
  - `port?: number` - 可选端口号。

### 实例方法

- `on(type: string, listener: function): void` - 绑定事件监听器。
- `off(type: string, listener: function): void` - 解绑事件监听器。
- `shareDisplayMedia(): Promise<MediaStream>` - 开始屏幕共享。
- `cancelShareDisplayMedia(): void` - 取消屏幕共享。
- `join(data: { username: string; roomname: string }): void` - 加入房间。
- `leave(): void` - 离开当前房间。
- `getDevicesInfoList(): Promise<MediaDeviceInfo[]>` - 获取设备列表。
- `getVideoDeviceInfo(): Promise<MediaDeviceInfo>` - 获取当前视频输入设备信息。
- `getAudioDeviceInfo(): Promise<MediaDeviceInfo>` - 获取当前音频输入设备信息。
- `channelSendMesage(): void` - 通过 RTCDataChannel 发送消息。
- `replaceTrack(deviceId: string, kind: 'video' | 'audio'): void` - 切换媒体轨道。
- `replaceVideoTrack(deviceId: string): void` - 切换视频媒体轨道。
- `replaceAudioTrack(deviceId: string): void` - 切换音频媒体轨道。
- `deviceSwitch(state: boolean, kind: 'video' | 'audio'): void` - 切换设备启停状态。
- `disableAudio(): void` - 禁用麦克风。
- `enableAudio(): void` - 启用麦克风。
- `disableVideo(): void` - 禁用摄像头。
- `enableVideo(): void` - 启用摄像头。
- `getLocalStream(): Promise<MediaStream>` - 获取本地媒体流。
- `getDisplayStream(): Promise<MediaStream>` - 获取屏幕共享媒体流。
- `close(): void` - 关闭 RTCClient 实例。

### 事件

#### `connectorInfoListChange`

连接的客户端列表发生变化或更新时触发。

```typescript
rtc.on('connectorInfoListChange', (data) => {
  console.log('onConnectorInfoListChange', data);
});
```

#### `displayStreamChange`

屏幕共享媒体流发生变化时触发。

```typescript
rtc.on('displayStreamChange', async (stream) => {
  displayStream = stream;
});
```

#### `localStreamChange`

本地媒体流发生变化时触发。

```typescript
rtc.on('localStreamChange', async (stream) => {
  localStream = stream;
});
```

#### `message`

RTCDataChannel 接收到消息时触发。

```typescript
rtc.on('message', async (message: MessageItem) => {
  message.isSelf = false;
  messageList.push(message);
  console.log(message);
});
```
