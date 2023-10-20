import { App } from "vue";
import selectFile from "./vSelectFile";
import menu from "./vMenu";
import editImage from "./vEditImage";
import previewImage from "./vPreview";

const defineDirective = (app: App) => {
  // 文件选择指令
  selectFile(app)
  // 右键菜单
  menu(app)
  // 编辑图片
  editImage(app)
  // 预览指令
  previewImage(app)
};

export default {
  install(app: App) {
    defineDirective(app)
  }
};