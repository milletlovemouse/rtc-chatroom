export function base64ToFile(base64Str: string, filename: string): File {
  if (!filename) filename = "file.png";
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

export function fileAndBlobToBase64(imgData: FileOrBlob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let imgResult: string;
    reader.onload = function () {
      imgResult = reader.result as string;
    };
    reader.onerror = function (error) {
      reject(error);
    };
    reader.onloadend = function () {
      resolve(imgResult);
    };
    reader.readAsDataURL(imgData);
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
