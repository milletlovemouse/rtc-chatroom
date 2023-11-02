import { blobToFile, saveFile } from "@/utils/fileUtils";
import html2canvas from "@/utils/Canvas/html2canvas";

function useVideoRecorder(el: HTMLElement, options?: {
  background?: string;
  track?: MediaStreamTrack[];
}) {
  return videoRecorder(el, options)
}

function videoRecorder(el: HTMLElement, options?: {
  background?: string;
  track?: MediaStreamTrack[];
}) {
  const { background, track } = options || {}
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let animationFrameId = null
  animationFrameId = requestAnimationFrame(function createCanvas() {
    animationFrameId = requestAnimationFrame(createCanvas)
    const htmlCanvas = html2canvas(el)
    const { width, height } = htmlCanvas
    canvas.width = width
    canvas.height = height
    ctx.save()
    if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)
    }
    ctx.drawImage(htmlCanvas, 0, 0, width, height)
    ctx.restore()
  })

  const stream = canvas.captureStream(25);
  if (track) {
    track.forEach(t => stream.addTrack(t))
  }
  // const recorderOptions = {
  //   audioBitsPerSecond : 128000,
  //   videoBitsPerSecond : 2500000,
  //   mimeType : 'video/mp4'
  // }
  const recorder = new MediaRecorder(stream);

  let chunks: Blob[] = []
  recorder.onstop = function() {
    cancelAnimationFrame(animationFrameId)
    const blob = new Blob(chunks, { type: 'video/mp4' });
    saveFile(blobToFile(blob, '视频录制'))
    chunks = []
  }

  recorder.ondataavailable = function(e) {
    chunks.push(e.data);
  }

  recorder.start();

  return recorder;
}

export default useVideoRecorder;