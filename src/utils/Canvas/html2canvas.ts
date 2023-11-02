
export function html2canvas(el: Element) {
  const rect = el.getBoundingClientRect();
  const { width, height, left, top } = rect
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  fillCanvas(ctx, el, {
    parentWidth: width,
    parentHeight: height,
    parentLeft: left,
    parentTop: top,
  });
  return canvas;
}

function fillCanvas(ctx: CanvasRenderingContext2D, el: Element, options: {
  parentWidth: number,
  parentHeight: number,
  parentLeft: number;
  parentTop: number;
}) {
  const { parentWidth, parentHeight, parentLeft, parentTop } = options;
  const rect = el.getBoundingClientRect();
  const { width, height, left, top } = rect
  if (left + width < parentLeft || top + height < parentTop || left > parentLeft + parentWidth || top > parentTop + parentHeight) {
    next()
    return
  }
  ctx.save();
  const tag = el.tagName;
  switch(tag) {
    case 'IMG':
    case 'SVG':
    case 'VIDEO':
    case 'CANVAS':
      ctx.drawImage(el as HTMLCanvasElement, left - parentLeft, top - parentTop, width, height);
      return
    default:
      const { backgroundColor } = getComputedStyle(el)
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(left - parentLeft, top - parentTop, width, height);
      break
  }
  ctx.restore();
  next()
  function next() {
    Array.prototype.forEach.call(el.children, (child: Element) => {
      fillCanvas(ctx, child, options)
    })
  }
}

export default html2canvas