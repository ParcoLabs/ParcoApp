import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import http from 'http';

interface IssuanceDocInput {
  id: string;
  url: string;
  mimeType?: string | null;
  name: string;
}

interface ExtractionResult {
  text: string;
  status: 'EXTRACTED' | 'FAILED';
  error?: string;
}

async function downloadToTemp(url: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(tmpPath);
    proto.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(tmpPath);
        downloadToTemp(response.headers.location).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode && response.statusCode >= 400) {
        file.close();
        fs.unlinkSync(tmpPath);
        reject(new Error(`HTTP ${response.statusCode} downloading ${url}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(tmpPath); });
      file.on('error', (err) => { fs.unlinkSync(tmpPath); reject(err); });
    }).on('error', (err) => {
      fs.unlinkSync(tmpPath);
      reject(err);
    });
  });
}

function guessMimeType(doc: IssuanceDocInput): string {
  if (doc.mimeType) return doc.mimeType;
  const ext = path.extname(doc.name || doc.url).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.txt') return 'text/plain';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'].includes(ext)) return `image/${ext.slice(1)}`;
  return 'application/octet-stream';
}

async function readLocalFile(filePath: string): Promise<Buffer> {
  const resolved = filePath.startsWith('/')
    ? path.resolve(filePath)
    : path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  return fs.promises.readFile(resolved);
}

async function getFileBuffer(doc: IssuanceDocInput): Promise<Buffer> {
  const url = doc.url;

  if (url.startsWith('/attached_assets') || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return readLocalFile(url);
  }

  const tmpPath = await downloadToTemp(url);
  try {
    return await fs.promises.readFile(tmpPath);
  } finally {
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdfModule = await import('pdf-parse');
  const pdfParse = pdfModule.default || pdfModule;
  const data = await (pdfParse as any)(buffer);
  return data.text || '';
}

export async function extractTextFromIssuanceDocument(
  doc: IssuanceDocInput,
): Promise<ExtractionResult> {
  try {
    const mime = guessMimeType(doc);

    if (mime.startsWith('image/')) {
      return { text: '', status: 'FAILED', error: 'OCR not implemented' };
    }

    if (mime === 'application/pdf') {
      const buffer = await getFileBuffer(doc);
      const text = await extractPdf(buffer);
      if (!text.trim()) {
        return { text: '', status: 'FAILED', error: 'PDF contained no extractable text (may require OCR)' };
      }
      return { text, status: 'EXTRACTED' };
    }

    if (mime === 'text/plain' || mime.startsWith('text/')) {
      const buffer = await getFileBuffer(doc);
      const text = buffer.toString('utf-8');
      return { text, status: 'EXTRACTED' };
    }

    return { text: '', status: 'FAILED', error: `Unsupported mime type: ${mime}` };
  } catch (err: any) {
    return { text: '', status: 'FAILED', error: err.message || 'Unknown extraction error' };
  }
}
