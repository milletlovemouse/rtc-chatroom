export type Merge<T, U> = Omit<T, keyof U> & U;

export interface AudioElement extends HTMLAudioElement {
  setSinkId(deviceId: string): Promise<void>;
}

export type SrcObject = MediaStream | MediaSource | Blob | File