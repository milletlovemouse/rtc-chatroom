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