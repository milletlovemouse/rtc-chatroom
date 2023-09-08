import { App } from "vue";
import selectFile from "./vSelectFile";

const defineDirective = (app: App) => {
  // 文件选择指令
  selectFile(app);
};

export default {
  install(app: App) {
    defineDirective(app)
  }
};