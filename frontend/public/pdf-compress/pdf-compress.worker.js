let gsModule = null;
let initPromise = null;
let gsOutputHandler = null;

const GS_BASE = '/pdf-compress/';

const QUALITY_SETTINGS = {
  screen: {
    PDFSETTINGS: '/screen',
    ColorImageResolution: 72,
    GrayImageResolution: 72,
  },
  ebook: {
    PDFSETTINGS: '/ebook',
    ColorImageResolution: 150,
    GrayImageResolution: 150,
  },
  printer: {
    PDFSETTINGS: '/printer',
    ColorImageResolution: 300,
    GrayImageResolution: 300,
  },
  prepress: {
    PDFSETTINGS: '/prepress',
    ColorImageResolution: 300,
    GrayImageResolution: 300,
  },
};

function toUint8Array(pdfData) {
  if (pdfData instanceof Uint8Array) return pdfData;
  if (pdfData instanceof ArrayBuffer) return new Uint8Array(pdfData);
  if (Array.isArray(pdfData)) return new Uint8Array(pdfData);
  throw new Error('Invalid PDF data format');
}

function getCallMain(gs) {
  if (typeof self.callMain === 'function') return self.callMain;
  if (typeof callMain === 'function') return callMain;
  if (typeof gs.callMain === 'function') return gs.callMain;
  throw new Error('PDF tools could not load');
}

function cleanupFiles(gs, paths) {
  for (const p of paths) {
    try {
      gs.FS.unlink(p);
    } catch {}
  }
}

async function initGhostscript() {
  if (gsModule) return gsModule;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      const timeout = setTimeout(() => {
        reject(new Error('PDF tools took too long to load'));
      }, 120000);

      self.Module = {
        locateFile(file) {
          if (file === 'gs.wasm') return `${GS_BASE}gs.wasm`;
          return file;
        },
        noExitRuntime: true,
        noInitialRun: true,
        print(text) {
          if (gsOutputHandler) gsOutputHandler(text);
        },
        printErr(text) {
          if (gsOutputHandler) gsOutputHandler(text);
        },
        onRuntimeInitialized() {
          clearTimeout(timeout);
          gsModule = Module;
          resolve(gsModule);
        },
        onAbort() {
          clearTimeout(timeout);
          reject(new Error('PDF tools could not start'));
        },
      };

      if (typeof callMain === 'undefined') {
        const ourMessageHandler = self.onmessage;
        importScripts(`${GS_BASE}gs.js`);
        const gsOnMessage = self.onmessage;
        self.onmessage = function (msg) {
          if (msg.data && typeof msg.data === 'object' && msg.data.type) {
            if (ourMessageHandler) ourMessageHandler.call(self, msg);
          } else if (msg.data && msg.data.funcName && typeof msg.data.funcName === 'string') {
            if (gsOnMessage) {
              try {
                gsOnMessage.call(self, msg);
              } catch {}
            }
          }
        };
      }

      if (typeof Module === 'undefined' || !Module) {
        clearTimeout(timeout);
        reject(new Error('Module not found after loading gs.js'));
        return;
      }

      if (typeof runtimeInitialized !== 'undefined' && runtimeInitialized) {
        clearTimeout(timeout);
        gsModule = Module;
        resolve(gsModule);
      }
    } catch (error) {
      console.error('[pdf-tools] init failed:', error);
      reject(new Error('PDF tools could not start'));
    }
  });

  return initPromise;
}

async function runGs(inputs, inputNames, outputName, extraArgs, options = {}) {
  const { pageCount = 0, quiet = true, pageOffset = 0, globalTotal = 0 } = options;
  const gs = await initGhostscript();
  const callMainFunc = getCallMain(gs);
  const touched = [];
  const progressState = {
    startPage: 1,
    endPage: pageCount || 0,
    total: pageCount || 0,
    lastPage: 0,
  };

  function emitGsProgress() {
    const localEnd = progressState.endPage || progressState.total || 1;
    const localStart = progressState.startPage || 1;
    const localSpan = Math.max(localEnd - localStart + 1, progressState.total || 1);
    const localCurrent =
      progressState.lastPage > 0
        ? Math.min(localSpan, progressState.lastPage - localStart + 1)
        : 0;

    const total = globalTotal || pageCount || localSpan;
    const current = pageOffset + localCurrent;
    const globalPage = pageOffset + (progressState.lastPage || 0);

    const label =
      progressState.lastPage > 0 && total > 0
        ? `Processing page ${globalPage} of ${total}`
        : pageCount > 0
          ? `Compressing ${pageCount} pages…`
          : 'Compressing PDF…';

    self.postMessage({
      type: 'progress',
      current: Math.min(current, total),
      total,
      label,
    });
  }

  function handleGsOutput(text) {
    if (!text) return;
    const str = String(text);
    const range = str.match(/Processing pages\s+(\d+)\s+through\s+(\d+)/i);
    if (range) {
      progressState.startPage = parseInt(range[1], 10);
      progressState.endPage = parseInt(range[2], 10);
      progressState.total = progressState.endPage - progressState.startPage + 1;
      emitGsProgress();
    }
    const pageMatch = str.match(/\bPage\s+(\d+)\b/i);
    if (pageMatch) {
      progressState.lastPage = parseInt(pageMatch[1], 10);
      emitGsProgress();
    }
  }

  gsOutputHandler = handleGsOutput;

  try {
    for (let i = 0; i < inputs.length; i += 1) {
      gs.FS.writeFile(inputNames[i], toUint8Array(inputs[i]));
      touched.push(inputNames[i]);
    }

    const args = [
      '-dNOPAUSE',
      '-dBATCH',
      ...(quiet ? ['-dQUIET'] : []),
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      ...extraArgs,
      `-sOutputFile=${outputName}`,
      ...inputNames,
    ];

    callMainFunc(args);
    touched.push(outputName);
    return gs.FS.readFile(outputName);
  } finally {
    gsOutputHandler = null;
    cleanupFiles(gs, touched);
  }
}

async function compressPDF(pdfData, quality = 'ebook', pageCountHint = 0) {
  const total = pageCountHint > 0 ? pageCountHint : 1;
  const settings = QUALITY_SETTINGS[quality] || QUALITY_SETTINGS.ebook;
  const compressExtra = [
    `-dPDFSETTINGS=${settings.PDFSETTINGS}`,
    '-dDownsampleColorImages=true',
    `-dColorImageResolution=${settings.ColorImageResolution}`,
    '-dDownsampleGrayImages=true',
    `-dGrayImageResolution=${settings.GrayImageResolution}`,
    '-dDownsampleMonoImages=true',
    '-dMonoImageResolution=300',
    '-dAutoRotatePages=/None',
  ];

  self.postMessage({
    type: 'progress',
    current: 0,
    total,
    label: pageCountHint > 0 ? `Starting compression (${pageCountHint} pages)…` : 'Compressing PDF…',
  });

  const result = await runGs(
    [pdfData],
    ['input.pdf'],
    'output.pdf',
    compressExtra,
    { pageCount: pageCountHint, quiet: false, globalTotal: pageCountHint }
  );

  self.postMessage({
    type: 'progress',
    current: total,
    total,
    label: 'Finishing…',
  });
  return result;
}

async function mergePDFs(files) {
  const inputNames = files.map((_, i) => `merge_in_${i}.pdf`);
  return runGs(files, inputNames, 'merged.pdf', ['-dAutoRotatePages=/None']);
}

async function extractPageRange(pdfData, firstPage, lastPage) {
  return runGs(
    [pdfData],
    ['input.pdf'],
    'extract.pdf',
    [
      `-dFirstPage=${firstPage}`,
      `-dLastPage=${lastPage}`,
      '-dAutoRotatePages=/None',
    ]
  );
}

async function splitExtractRanges(pdfData, ranges) {
  const parts = [];

  for (let i = 0; i < ranges.length; i += 1) {
    const { start, end } = ranges[i];
    self.postMessage({
      type: 'progress',
      current: i + 1,
      total: ranges.length,
      label: `Extracting pages ${start}–${end}`,
    });
    parts.push(await extractPageRange(pdfData, start, end));
  }

  if (parts.length === 1) return { data: parts[0].buffer, transfer: [parts[0].buffer] };

  self.postMessage({ type: 'progress', current: ranges.length, total: ranges.length, label: 'Merging extracted parts…' });
  const merged = await mergePDFs(parts);
  return { data: merged.buffer, transfer: [merged.buffer] };
}

function postSuccess(buffer) {
  self.postMessage({ type: 'success', data: buffer }, [buffer]);
}

self.addEventListener('message', async (event) => {
  const { type, quality, data, files, ranges } = event.data;

  try {
    if (type === 'init') {
      await initGhostscript();
      self.postMessage({ type: 'ready' });
      return;
    }

    if (type === 'compress') {
      const pdfData = data instanceof ArrayBuffer ? data : data?.buffer ?? data;
      const pageCount = event.data.pageCount || 0;
      const result = await compressPDF(pdfData, quality || 'ebook', pageCount);
      postSuccess(result.buffer);
      return;
    }

    if (type === 'merge') {
      if (!files?.length || files.length < 2) {
        throw new Error('At least two PDF files are required to merge');
      }
      self.postMessage({ type: 'progress', current: 1, total: 1, label: 'Merging PDFs…' });
      const result = await mergePDFs(files);
      postSuccess(result.buffer);
      return;
    }

    if (type === 'splitExtract') {
      const pdfData = data instanceof ArrayBuffer ? data : data?.buffer ?? data;
      if (!ranges?.length) throw new Error('No page ranges provided');
      const { data: outBuffer, transfer } = await splitExtractRanges(pdfData, ranges);
      postSuccess(outBuffer);
      return;
    }

    throw new Error(`Unknown worker message type: ${type}`);
  } catch (error) {
    console.error('[pdf-tools] worker job failed:', error);
    self.postMessage({
      type: 'error',
      error: error?.message || 'Unknown error occurred',
    });
  }
});
