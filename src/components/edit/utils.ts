import { Merge } from '@/utils/type'

export function getPrimitiveImage(file: File): Promise<{
  image: HTMLImageElement,
  close: () => void
}> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.src = URL.createObjectURL(file)
    image.style.position = 'absolute'
    image.style.left = '-10000px'
    image.style.top = '-10000px'

    image.onload = function () {
      resolve({image, close})
    };
    image.onerror = reject
    document.body.appendChild(image)
    function close() {
      image.remove()
    }
  })
}

type Options = {
  lineWidth: number;
  lineColor: string;
  pointList: number[][];
  scaleInfo?: {
    wScale: number,
    hScale: number
  }
}

export function drawLine(canvas: HTMLCanvasElement, options: Options) {
  const { wScale, hScale } = options.scaleInfo || {}
  const { lineWidth, lineColor, pointList, scaleInfo } = options
  const [minWidth, minHeight, maxWidth, maxHeight] = getRectInfo(pointList)
  if (!scaleInfo) {
    setCanvasSize(canvas, {minWidth, minHeight, maxWidth, maxHeight, lineWidth})
  }
  const ctx = canvas.getContext('2d')
  setCanvasCtxStyle(ctx, { lineWidth, lineColor })
  ctx.beginPath()
  
  ctx.lineCap = 'round'; // 线段端点为圆角
  ctx.lineJoin = 'round'; // 线段交汇处为圆角
  pointList.forEach((point) => {
    if (!scaleInfo) {
      ctx.lineTo(point[0] - minWidth + lineWidth / 2, point[1] - minHeight + lineWidth / 2)
    } else {
      ctx.lineTo(point[0] * wScale, point[1] * hScale)
    }
  })
  ctx.stroke()
}

export function drawRect(canvas: HTMLCanvasElement, options: Options) {
  const { wScale, hScale } = options.scaleInfo || {}
  const { lineWidth, lineColor, pointList, scaleInfo } = options
  const [minWidth, minHeight, maxWidth, maxHeight] = getRectInfo(pointList)
  if (!scaleInfo) {
    setCanvasSize(canvas, {minWidth, minHeight, maxWidth, maxHeight, lineWidth})
  }

  const ctx = canvas.getContext('2d')  
  setCanvasCtxStyle(ctx, { lineWidth, lineColor })
  ctx.beginPath()
  
  if (!scaleInfo) {
    ctx.strokeRect(lineWidth / 2, lineWidth / 2, maxWidth - minWidth, maxHeight - minHeight);
  } else {
    ctx.strokeRect(minWidth * wScale, minHeight * hScale, (maxWidth - minWidth) * wScale, (maxHeight - minHeight) * hScale);
  }
}

export function renderMosaic(ctx: CanvasRenderingContext2D, imgData: ImageData, options?: {
  left: number,
  top: number,
}) {
  const { left = 0, top = 0 } = options || {}
  const { data, width, height } = imgData
  const block = 4 * 5
  for (let i = 0; i < width; i += block) {
    for (let j = 0; j < height; j += block){
      const index = (i + j * width) * 4
      const [r, g, b, a] = [data[index], data[index + 1], data[index + 2], data[index + 3]]
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`
      ctx.fillRect(i + left, j + top, block, block)
    }
  }
}

export function drawMosaic(canvas: HTMLCanvasElement, options: Merge<Options, {img: HTMLImageElement}>) {
  const { wScale = 1, hScale = 1 } = options.scaleInfo || {}
  const { lineWidth, pointList, scaleInfo, img } = options
  const [minWidth, minHeight, maxWidth, maxHeight] = getRectInfo(pointList)
  let canvasRect: ReturnType<typeof setCanvasSize>
  if (!scaleInfo) {
    canvasRect = setCanvasSize(canvas, {minWidth, minHeight, maxWidth, maxHeight, lineWidth})
  }

  const ctx = canvas.getContext('2d')
  const { width, height } = img.getBoundingClientRect()
  const imgCanvas = document.createElement('canvas')
  imgCanvas.width = width
  imgCanvas.height = height
  const imgCtx = imgCanvas.getContext('2d')
  imgCtx.drawImage(img, 0, 0, width, height)
  
  if (!scaleInfo) {
    const { left, top, width, height } = canvasRect
    try {
      const imgData = imgCtx.getImageData(left, top, width, height)
      renderMosaic(ctx, imgData)
    } catch (error) {}
  } else {
    const imgData = imgCtx.getImageData(minWidth * wScale, minHeight * hScale, (maxWidth - minWidth) * wScale, (maxHeight - minHeight) * hScale)
    const mosaicCanvas = document.createElement('canvas')
    mosaicCanvas.width = (maxWidth - minWidth) * wScale
    mosaicCanvas.height = (maxHeight - minHeight) * hScale
    const mosaicCtx = mosaicCanvas.getContext('2d')
    renderMosaic(mosaicCtx, imgData)
    ctx.drawImage(mosaicCanvas, minWidth * wScale, minHeight * hScale)
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