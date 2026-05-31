import type { ToolsFilesPlugin } from './tools-files';

export class ToolsFilesWeb implements ToolsFilesPlugin {
  async openPdf(): Promise<void> {
    throw new Error('Open PDF is only available in the mobile app.');
  }

  async openToolsFolder(): Promise<void> {
    throw new Error('Open folder is only available in the mobile app.');
  }
}
