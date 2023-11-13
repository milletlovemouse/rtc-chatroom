export type Merge<T, U, R = Omit<T, keyof U> & U> = {
  [K in keyof R]: R[K]
};

export type Optional<T, K extends keyof T = keyof T> = Merge<{
  [P in K]?: T[P]
}, {
  [P in Exclude<keyof T, K>]: T[P]
}>

export interface AudioElement extends HTMLAudioElement {
  setSinkId(deviceId: string): Promise<void>;
}

export type SrcObject = MediaStream | MediaSource | Blob | File