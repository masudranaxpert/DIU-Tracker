import { registerPlugin } from '@capacitor/core';

export interface ToolsFilesPlugin {
  openPdf(options: { fileName: string }): Promise<void>;
  openToolsFolder(options: { folderName?: string }): Promise<void>;
}

const ToolsFiles = registerPlugin<ToolsFilesPlugin>('ToolsFiles');

export default ToolsFiles;
