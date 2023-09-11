import { io, Socket } from "socket.io-client";

export type Options = {
  host: string;
  port: number;
}

export default class SocketClient {
  socket: Socket;

  constructor(options: Options) {
    const { host, port } = options;
    const url = host + ":" + port;
    this.socket = io(url);
    this.bind()
  }

  public sendMessage(messageName: string, message?: any) {
    this.socket.emit(messageName, message);
  }

  public onMessage(messageName: string, callback: <T>(message: T) => void) {
    this.socket.on(messageName, callback);
  }

  public offMessage(messageName: string, callback: <T>(message: T) => void) {
    this.socket.off(messageName, callback);
  }

  public sendTextMessage(message: string) {
    this.socket.emit("text", message);
  }

  public sendImageMessage(message: File | Blob | string) {
    this.socket.emit("image", message);
  }

  public sendFileMessage(message: File | Blob | string) {
    this.socket.emit("file", message);
  }

  bind() {
    this.socket.on("connect", () => {
      console.log('connect', this.socket.id);
    });
    
    this.socket.on("disconnect", () => {
      console.log('disconnect');
    });
  }

  close() {
    this.socket.close();
  }
}
