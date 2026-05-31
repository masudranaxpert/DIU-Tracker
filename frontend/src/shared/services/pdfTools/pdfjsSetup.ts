import * as pdfjsLib from 'pdfjs-dist';

let workerConfigured = false;

const assetBase = import.meta.env.BASE_URL;

/** Runtime URLs for pdf.js decoder assets (wasm, cmaps, fonts). */
export function getPdfJsDocumentInit() {
  return {
    wasmUrl: `${assetBase}wasm/`,
    cMapUrl: `${assetBase}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assetBase}standard_fonts/`,
  };
}

/** Configure pdf.js worker once for Vite/Capacitor WebView. */
export function ensurePdfJsWorker(): typeof pdfjsLib {
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    workerConfigured = true;
  }
  return pdfjsLib;
}
