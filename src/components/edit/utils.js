export function getOriginalImageRect(file) {
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
  
  export function drawLine(canvas, options) {
    const { wScale, hScale, isSave } = options.scaleInfo || {}
    const { lineWidth, lineColor, pointList } = options
    const [left, top, width, height] = getRectInfo(pointList)
    if (!isSave) {
      setCanvasSize(canvas, {left, top, width, height, lineWidth})
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
      pointList.forEach((point) => ctx.lineTo(point[0] - left + lineWidth / 2, point[1] - top + lineWidth / 2))
    }
    
    ctx.stroke()
  }
  
  export function drawRect(canvas, options) {
    const { wScale, hScale, isSave } = options.scaleInfo || {}
    const { lineWidth, lineColor, pointList } = options
    const [left, top, width, height] = getRectInfo(pointList)
    if (!isSave) {
      setCanvasSize(canvas, {left, top, width, height, lineWidth})
    }
  
    const ctx = canvas.getContext('2d')  
    setCanvasCtxStyle(ctx, { lineWidth, lineColor })
    ctx.beginPath()
    
    if (isSave) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(wScale, hScale)
      ctx.strokeRect(left, top, width, height);
    } else {
      ctx.strokeRect(lineWidth / 2, lineWidth / 2, width, height);
    }
  }
  
  export function createMosaic(ctx, imgData) {
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
  
  export function drawMosaic(canvas, options) {
    const { wScale = 1, hScale = 1, isSave } = options.scaleInfo || {}
    const { pointList, img } = options
    let [left, top, canvasWidth, canvasHeight] = getRectInfo(pointList)
  
    if (!isSave) {
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      canvas.style.left = left + 'px'
      canvas.style.top = top + 'px'
    }
    
    left *= wScale
    top *= hScale
    canvasWidth *= wScale
    canvasHeight *= hScale
  
    const ctx = canvas.getContext('2d')
    const { width, height } = img.getBoundingClientRect()
    const imgCanvas = document.createElement('canvas')
    imgCanvas.width = width * wScale
    imgCanvas.height = height * hScale
    
    const imgCtx = imgCanvas.getContext('2d')
    imgCtx.drawImage(img, 0, 0, width * wScale, height * hScale)
    try {
      const imgData = imgCtx.getImageData(left, top, canvasWidth, canvasHeight)
      const mosaicCanvas = document.createElement('canvas')
      mosaicCanvas.width = canvasWidth
      mosaicCanvas.height = canvasHeight
      const mosaicCtx = mosaicCanvas.getContext('2d')
      createMosaic(mosaicCtx, imgData)
      if (!isSave) {
        ctx.scale(1 / wScale, 1 / hScale)
        ctx.drawImage(mosaicCanvas, 0, 0)
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(mosaicCanvas, left, top)
      }
    } catch (e) {
      return
    }
  }
  
  export function cropPicture(img, x, y, width, height) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height)
    return canvas
  }
  
  export function getRectInfo(pointList) {
    const [minX, minY, maxX, maxY] = pointList.reduce((a, b) => {
      return [
        Math.min(a[0], b[0]),
        Math.min(a[1], b[1]),
        Math.max(a[2], b[0]),
        Math.max(a[3], b[1])
      ]
    }, [Infinity, Infinity, 0, 0])
    return [
      minX, minY, maxX - minX, maxY - minY
    ]
  }
  
  export function setCanvasSize(canvas, options) {
    const {left, top, width, height, lineWidth = 0} = options
    canvas.width = width + lineWidth
    canvas.height = height + lineWidth
    canvas.style.left = left - lineWidth / 2 + 'px'
    canvas.style.top = top - lineWidth / 2 + 'px'
  }
  
  export function setCanvasCtxStyle(ctx, options) {
    ctx.strokeStyle = options.lineColor
    ctx.lineWidth = options.lineWidth
  }
  
  export default {
    drawLine,
    drawRect,
    drawMosaic
  }