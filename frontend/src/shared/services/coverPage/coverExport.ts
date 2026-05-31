export type CoverExportFormat = 'pdf' | 'png';

async function captureCanvas(node: HTMLElement, scale = 2.5): Promise<HTMLCanvasElement> {
  const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      /* fonts api may be unavailable */
    }
  }
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(node, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    width: node.offsetWidth,
    height: node.offsetHeight,
    windowWidth: node.offsetWidth,
    windowHeight: node.offsetHeight,
  });
}

export async function exportCoverPng(node: HTMLElement): Promise<Blob> {
  const canvas = await captureCanvas(node, 3);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image.'))), 'image/png');
  });
}

export async function exportCoverPdf(node: HTMLElement): Promise<Blob> {
  const canvas = await captureCanvas(node, 2.5);
  const { jsPDF: JsPDF } = await import('jspdf');
  const doc = new JsPDF({ unit: 'mm', format: 'a4', compress: true });
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  return doc.output('blob');
}
