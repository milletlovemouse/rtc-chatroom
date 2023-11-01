import { Merge } from '@/utils/type'

export function getOriginalImageRect(file: File): Promise<DOMRect> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.src = URL.createObjectURL(file)
    image.style.position = 'absolute'
    image.style.left = '-10000px'
    image.style.top = '-10000px'

    image.onload = () => {
      resolve(image.getBoundingClientRect())
      image.remove()
    };
    image.onerror = () => {
      reject()
      image.remove()
    }
    document.body.appendChild(image)
  })
}

type Options = {
  lineWidth: number;
  lineColor: string;
  pointList: number[][];
  scaleInfo?: {
    wScale: number,
    hScale: number,
    isSave?: boolean
  }
}

export function drawLine(canvas: HTMLCanvasElement, options: Options) {
  const { wScale, hScale, isSave } = options.scaleInfo || {}
  const { lineWidth, lineColor, pointList } = options
  const [minWidth, minHeight, maxWidth, maxHeight] = getRectInfo(pointList)
  if (!isSave) {
    setCanvasSize(canvas, {minWidth, minHeight, maxWidth, maxHeight, lineWidth})
  }
  const ctx = canvas.getContext('2d')
  setCanvasCtxStyle(ctx, { lineWidth, lineColor })
  ctx.beginPath()
  
  ctx.lineCap = 'round'; // 线段端点为圆角
  ctx.lineJoin = 'round'; // 线段交汇处为圆角

  if (isSave) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(wScale, hScale)
    pointList.forEach((point) => ctx.lineTo(point[0], point[1]))
  } else {
    pointList.forEach((point) => ctx.lineTo(point[0] - minWidth + lineWidth / 2, point[1] - minHeight + lineWidth / 2))
  }
  
  ctx.stroke()
  ctx.save()
}

export function drawRect(canvas: HTMLCanvasElement, options: Options) {
  const { wScale, hScale, isSave } = options.scaleInfo || {}
  const { lineWidth, lineColor, pointList, scaleInfo } = options
  const [minWidth, minHeight, maxWidth, maxHeight] = getRectInfo(pointList)
  if (!isSave) {
    setCanvasSize(canvas, {minWidth, minHeight, maxWidth, maxHeight, lineWidth})
  }

  const ctx = canvas.getContext('2d')  
  setCanvasCtxStyle(ctx, { lineWidth, lineColor })
  ctx.beginPath()
  
  if (isSave) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(wScale, hScale)
    ctx.strokeRect(minWidth, minHeight, maxWidth - minWidth, maxHeight - minHeight);
  } else {
    ctx.strokeRect(lineWidth / 2, lineWidth / 2, maxWidth - minWidth, maxHeight - minHeight);
  }
  ctx.save()
}

export function createMosaic(ctx: CanvasRenderingContext2D, imgData: ImageData) {
  const { data, width, height } = imgData
  const block = 4 * 5
  for (let i = 0; i < width; i += block) {
    for (let j = 0; j < height; j += block){
      const index = (i + j * width) * 4
      const [r, g, b, a] = [data[index], data[index + 1], data[index + 2], data[index + 3]]
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
      ctx.fillRect(i, j, block, block)
    }
  }
}

export function drawMosaic(canvas: HTMLCanvasElement, options: Merge<Options, {img: HTMLImageElement}>) {
  const { wScale = 1, hScale = 1, isSave } = options.scaleInfo || {}
  const { pointList, img } = options
  let [minWidth, minHeight, maxWidth, maxHeight] = getRectInfo(pointList)

  if (!isSave) {
    canvas.width = maxWidth - minWidth
    canvas.height = maxHeight - minHeight
    canvas.style.left = minWidth + 'px'
    canvas.style.top = minHeight + 'px'
  }
  
  minWidth *= wScale
  minHeight *= hScale
  maxWidth *= wScale
  maxHeight *= hScale

  const ctx = canvas.getContext('2d')
  const { width, height } = img.getBoundingClientRect()
  const imgCanvas = document.createElement('canvas')
  imgCanvas.width = width * wScale
  imgCanvas.height = height * hScale
  
  const imgCtx = imgCanvas.getContext('2d')
  imgCtx.drawImage(img, 0, 0, width * wScale, height * hScale)
  try {
    const imgData = imgCtx.getImageData(minWidth, minHeight, maxWidth - minWidth, maxHeight - minHeight)
    const mosaicCanvas = document.createElement('canvas')
    mosaicCanvas.width = maxWidth - minWidth
    mosaicCanvas.height = maxHeight - minHeight
    const mosaicCtx = mosaicCanvas.getContext('2d')
    createMosaic(mosaicCtx, imgData)
    if (!isSave) {
      ctx.scale(1 / wScale, 1 / hScale)
      ctx.drawImage(mosaicCanvas, 0, 0)
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(mosaicCanvas, minWidth, minHeight)
    }
    ctx.save()
  } catch (e) {
    return
  }
}

export function getRectInfo(pointList: number[][]) {
  return pointList.reduce((a, b) => {
    return [
      Math.min(a[0], b[0]),
      Math.min(a[1], b[1]),
      Math.max(a[2], b[0]),
      Math.max(a[3], b[1])
    ]
  }, [Infinity, Infinity, 0, 0])
}

export function setCanvasSize(canvas: HTMLCanvasElement, options: {
  lineWidth?: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}) {
  const {minWidth, minHeight, maxWidth, maxHeight, lineWidth = 0} = options
  canvas.width = maxWidth - minWidth + lineWidth
  canvas.height = maxHeight - minHeight + lineWidth
  canvas.style.left = minWidth - lineWidth / 2 + 'px'
  canvas.style.top = minHeight - lineWidth / 2 + 'px'
  
  return {
    width: canvas.width,
    height: canvas.height,
    left: minWidth - lineWidth / 2,
    top: minHeight - lineWidth / 2
  }
}

export function setCanvasCtxStyle(ctx: CanvasRenderingContext2D, options: {
  lineWidth: number;
  lineColor: string;
}) {
  ctx.strokeStyle = options.lineColor
  ctx.lineWidth = options.lineWidth
}

export default {
  drawLine,
  drawRect,
  drawMosaic
}