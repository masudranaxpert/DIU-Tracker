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

  // Create an iframe to render the node in isolation, preventing html2canvas from
  // scanning Tailwind v4's custom color functions (like oklch) in parent document stylesheets.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = `${node.offsetWidth}px`;
  iframe.style.height = `${node.offsetHeight}px`;
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Could not access iframe document');
    }

    // Set basic styling for the iframe document body
    iframeDoc.body.style.margin = '0';
    iframeDoc.body.style.padding = '0';
    iframeDoc.body.style.background = '#ffffff';

    // Clone the node to render in the iframe
    const clonedNode = node.cloneNode(true) as HTMLElement;
    iframeDoc.body.appendChild(clonedNode);

    // Wait for images to load inside the iframe
    const imgs = Array.from(clonedNode.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolveImg) => {
            if (img.complete) {
              resolveImg();
            } else {
              img.onload = () => resolveImg();
              img.onerror = () => resolveImg();
            }
          })
      )
    );

    const { default: html2canvas } = await import('html2canvas');
    return await html2canvas(clonedNode, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: node.offsetWidth,
      height: node.offsetHeight,
      windowWidth: node.offsetWidth,
      windowHeight: node.offsetHeight,
    });
  } finally {
    document.body.removeChild(iframe);
  }
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
