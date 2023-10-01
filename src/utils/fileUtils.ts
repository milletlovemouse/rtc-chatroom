export function sliceBase64ToFile(base64Str: string | string[], filename: string): File {
  const blobs = Array.isArray(base64Str) ? base64Str.map(str => base64ToBlob(str)) : [base64ToBlob(base64Str)];
  const type = blobs[0].type;
  const blob = new Blob(blobs, { type });
  return new File([blob], filename, { type: blob.type });
}

export function base64ToBlob(base64Str: string): Blob {
  const array = base64Str.split(",");
  const type = base64Str.split(",")[0].match(/:(.*?);/)[1];
  const bStr = atob(array[1]);
  let n = bStr.length;
  const uint8Array = new Uint8Array(n);
  while (n--) {
    uint8Array[n] = bStr.charCodeAt(n);
  }
  return new Blob([uint8Array], { type });
}

export function sliceFileAndBlobToBase64(file: FileOrBlob, chunkSize: number = 1024 * 1024): Promise<string[]> {
  return Promise.all(sliceFileOrBlob(file, chunkSize).map(blob => fileAndBlobToBase64(blob)));
}

export function sliceFileAndBlobToArrayBuffer(file: FileOrBlob, chunkSize: number = 1024 * 1024): Promise<ArrayBuffer[]> {
  return Promise.all(sliceFileOrBlob(file, chunkSize).map(blob => fileAndBlobToArrayBuffer(blob)));
}

export function sliceFileOrBlob(file: FileOrBlob, chunkSize: number = 1024 * 1024): Blob[] {
  const chunks: Blob[] = []
  for (let offset = 0; offset < file.size; offset += chunkSize) {
    const slice = file.slice(offset, offset + chunkSize);
    const chunk = new Blob([slice], { type: file.type });
    chunks.push(chunk)
  }
  return chunks
}

export function base64ToFile(base64Str: string, filename: string): File {
  const array = base64Str.split(",");
  const mime = array[0].match(/:(.*?);/)[1];
  const bStr = atob(array[1]);
  let n = bStr.length;
  const u8Array = new Uint8Array(n);
  while (n--) {
    u8Array[n] = bStr.charCodeAt(n);
  }
  return new File([u8Array], filename, { type: mime });
}

type FileOrBlob = File | Blob;

export function fileAndBlobToBase64(file: FileOrBlob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let base64Str: string;
    reader.onload = function () {
      base64Str = reader.result as string;
    };
    reader.onerror = function (error) {
      reject(error);
    };
    reader.onloadend = function () {
      const base64String = base64Str.split(',')[1];
      base64Str = `data:${file.type};base64,${base64String}`;
      resolve(base64Str);
    };
    reader.readAsDataURL(file);
  });
}

export function fileAndBlobToArrayBuffer(file: FileOrBlob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let arraybuffer: ArrayBuffer;
    reader.onload = function () {
      arraybuffer = reader.result as ArrayBuffer;
    };
    reader.onerror = function (error) {
      reject(error);
    };
    reader.onloadend = function () {
      resolve(arraybuffer);
    };
    reader.readAsArrayBuffer(file);
  });
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return window.btoa(
    new Uint8Array(buffer).reduce((a, b) => a + String.fromCharCode(b), "")
  );
}

export function base64ToArrayBuffer(base64Str: string): ArrayBuffer {
  const binaryString = window.atob(base64Str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function fileToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let buffer: ArrayBuffer;
    reader.onload = function () {
      buffer = reader.result as ArrayBuffer;
    };
    reader.onerror = function (error) {
      reject(error);
    };
    reader.onloadend = function () {
      resolve(new Blob([buffer], { type: file.type }));
    }
    reader.readAsArrayBuffer(file);
  });
}

export function saveFile(file: File) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function saveFileByUrl(url: string, name: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}
