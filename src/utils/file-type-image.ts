const modules = import.meta.glob('../assets/file-type/*.png', { eager: true })
/**
 * 获取文件类型
 * @param {String} fileName 文件名
 */
export function getFileType(fileName: string) {
  const strArr = fileName.split('.')
  return strArr[strArr.length - 1].toLowerCase()
}

/**
 * 获取类型文件名字
 * @param {String} fileName 文件名
 */
export function getFileImageName(fileName: string) {
  const fileType = getFileType(fileName)
  switch (fileType) {
    case 'doc':
    case 'docx':
      return 'word.png'
    case 'zip':
    case 'rar':
      return 'zip.png'
    case 'pdf':
      return 'pdf.png'
    case 'xls':
    case 'xlsx':
      return 'excel.png'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
      return 'jpg.png'
    default:
      return 'txt.png'
  }
}

/**
 * 获取文件名图片
 * @param {String} fileName 文件名
 */
export default function getFileTypeImage(fileName: string) {
  const url = `../assets/file-type/${getFileImageName(fileName)}`
  return (modules[url] as { default: string }).default
}