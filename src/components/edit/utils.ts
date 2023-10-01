export function getImageOriginalSize(file: File): Promise<{
  width: number,
  height: number,
}> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.src = URL.createObjectURL(file)
    image.style.position = 'absolute'
    image.style.left = '-10000px'
    image.style.top = '-10000px'
    image.onload = function () {
      resolve({
        width: image.width,
        height: image.height
      })
      image.remove()
    };
    image.onerror = reject
    document.body.appendChild(image)
  })
}