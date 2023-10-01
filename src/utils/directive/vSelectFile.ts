import { App, DirectiveBinding } from "vue";

/** 视频的联合类型 */
export type VideoType = ".mp4" | ".avi" | ".mov" | ".rmvb" | ".flv" | "video/*";
/** 音频的联合类型 */
export type AudioType = ".mp3" | ".wav" | ".ogg" | ".wma";
/** 图片的联合类型 */
export type ImageType = ".jpg" | ".png" | ".jpeg" | "image/*";
/** 表格数据的联合类型 */
export type ExcelType = ".xls" | ".xlsx";
/** 文档的联合类型 */
export type DocumentType = ".doc" | ".docx";
/** 其他文件的联合类型 */
export type OtherType = ".pdf" | ".txt";
/** 文件上传的类型 */
export type AcceptType = VideoType | AudioType | ImageType | ExcelType | DocumentType | OtherType;
/** 文件上传的配置 */
export interface UploadConfig {
  /** 是否多选 */
  multiple?: boolean;
  /** 允许上传的文件类型 */
  accept?: AcceptType[];
  /** 文件上传成功后的回调 */
  callback?: Function;
  /** 前置校验钩子 */
  beforeCheck?: Function;
  /** 文件上传的最小数量 */
  min?: number;
  /** 文件上传的最大数量 */
  max?: number;
}

function useUpload(config: UploadConfig) {
  const {
    multiple = false,
    accept = [],
    callback = () => {},
    min = 0,
    max = 0
  } = config;
  const $input = createFileInputEle(multiple, accept, callback, min, max);
  document.body.appendChild($input);
  $input.click();
  document.body.removeChild($input);
}


function createFileInputEle(
  multiple: boolean,
  accept: AcceptType[],
  callback: Function,
  min: number,
  max: number
): HTMLInputElement {
  const $input = document.createElement("input");
  $input.type = "file";
  $input.style.position = "absolute";
  $input.style.top = "-10000000px";
  $input.style.left = "-100000000px";
  $input.style.width = "0";
  $input.style.height = "0";
  $input.style.overflow = "hidden";
  $input.multiple = multiple;
  $input.accept = accept.join(",");
  $input.onchange = () => {
    const files = Array.prototype.filter.call(
      $input.files,
      (item: File) => item.size >= min && (max === 0 || item.size <= max)
    );
    let err: string;
    if (files.length !== $input.files.length) {
      err = "存在大小不在范围的文件";
    }
    if (typeof callback === "function") {
      callback(files, err, $input.files);
    }
  };
  return $input
}

export default function selectFile(app: App) {
  app.directive("select-file", {
    mounted: (el: Element, binding: DirectiveBinding<UploadConfig>) => {
      el.addEventListener(
        "click",
        () => {
          const { beforeCheck = () => true } = binding.value;
          if (beforeCheck()) {
            useUpload(binding.value)
          }
        },
        false
      );
    }
  });
}
