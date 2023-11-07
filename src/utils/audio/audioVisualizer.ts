import { isType } from '@/utils/util'

type Source = MediaStream | HTMLAudioElement | HTMLVideoElement

enum SourceType {
  MediaStream = 'MediaStream',
  HTMLAudioElement = 'HTMLAudioElement',
  HTMLVideoElement = 'HTMLVideoElement',
}

const isMediaStream = (source: Source) => isType(source, SourceType.MediaStream)
const isHTMLMediaElement = (source: Source) => isType(source, SourceType.HTMLAudioElement) || isType(source, SourceType.HTMLVideoElement)

export function audioVisualizer(
  draw: (dataArray: Uint8Array, ctx?: CanvasRenderingContext2D, canvas?: HTMLCanvasElement) => void,
  options?: { fftSize: number }
) {
  return function start (
    audioSource: Source,
    canvas?: HTMLCanvasElement
  ) {
    const { fftSize = 2048 } = options || {}
    const audioCtx = new window.AudioContext()
    const analyser = audioCtx.createAnalyser();
    const source = createSource()
    source.connect(analyser)
    analyser.fftSize = fftSize
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let id: number
    (function drawVisual() {
      id = requestAnimationFrame(drawVisual);
      analyser.getByteFrequencyData(dataArray);
      const context = canvas.getContext?.('2d');
      draw(dataArray, context, canvas)
    }())

    return function cancel() {
      cancelAnimationFrame(id);
      source.disconnect(analyser);
      if (isHTMLMediaElement(audioSource)) {
        analyser.disconnect(audioCtx.destination);
      }
    }

    function createSource() {
      if (isMediaStream(audioSource)) {
        return audioCtx.createMediaStreamSource(audioSource as MediaStream)
      } else if (isHTMLMediaElement(audioSource)) {
        analyser.connect(audioCtx.destination);
        return audioCtx.createMediaElementSource(audioSource as HTMLMediaElement)
      }
    }
  }
}

export const audioVisible = audioVisualizer((dataArray, ctx, canvas) => {  
  const width =  canvas.width;
  const height = canvas.height;
  const max = Math.max(...dataArray);
  const av_height = max * height / 255
  ctx.fillStyle = 'rgb(255, 255, 255)';
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, width / 2, 0, 2 * Math.PI)
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = "#07c160"
  const base_x = height / 5
  let lv = 1
  const opacity = av_height > base_x * lv ? 1 : 0
  if (canvas.style.opacity !== String(opacity)) {
    canvas.style.opacity = String(opacity)
  }
  while(av_height > base_x * lv) {
    ctx.beginPath();
    ctx.arc(0, height / 2, base_x * (lv - 0.5), Math.PI / 16 * 29,  Math.PI / 16 * 3);
    ctx.stroke()
    lv++
  }
}, { fftSize: 32 })