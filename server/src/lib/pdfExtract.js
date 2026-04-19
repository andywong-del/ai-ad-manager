import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractPdfText(buffer) {
  const data = new Uint8Array(buffer);
  const doc = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  const parts = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map(item => item.str).join(' '));
  }
  return parts.join('\n');
}
