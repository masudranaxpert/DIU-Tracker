import { PDFDocument } from 'pdf-lib';

export async function getPdfPageCount(input: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(input, { ignoreEncryption: true });
  return doc.getPageCount();
}
