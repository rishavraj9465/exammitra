import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";

// pdf.js normally imports this worker dynamically. Serverless bundlers cannot
// discover that runtime import, so expose the statically bundled handler for
// pdf.js's Node/fake-worker path.
globalThis.pdfjsWorker ||= { WorkerMessageHandler };

export async function extractPdf(buffer) {
  if (!buffer.subarray(0, 1024).includes(Buffer.from("%PDF-")))
    throw new Error(
      "This file is not a valid PDF. Please upload a text-based PDF.",
    );
  let pdf;
  try {
    pdf = await getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      isEvalSupported: false,
      disableFontFace: true,
    }).promise;
    if (pdf.numPages > 100)
      throw new Error(
        "This PDF has more than 100 pages. Please split it into smaller PDFs.",
      );
    const pages = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      pages.push({
        number,
        text: content.items
          .map((i) => i.str + (i.hasEOL ? "\n" : " "))
          .join("")
          .trim(),
      });
      page.cleanup();
    }
    if (pages.reduce((n, p) => n + p.text.length, 0) < 40)
      throw new Error(
        "No readable text was found. Scanned or empty PDFs are not supported yet. Upload a text-based PDF.",
      );
    if (pages.some((p) => p.text.length < 10))
      throw new Error(
        "One or more pages have no readable text. Remove blank or scanned pages before uploading so nothing is silently skipped.",
      );
    return pages;
  } catch (e) {
    if (e.name === "PasswordException")
      throw new Error(
        "This PDF is password-protected. Upload an unlocked copy.",
      );
    if (["InvalidPDFException", "UnknownErrorException"].includes(e.name))
      throw new Error(
        "This PDF could not be read. Try exporting a new text-based PDF.",
      );
    throw e;
  } finally {
    if (pdf) await pdf.destroy();
  }
}
export function chunkPages(pages, maxChars = 18000) {
  const chunks = [];
  let current = "";
  for (const page of pages) {
    for (let start = 0; start < page.text.length; start += maxChars - 80) {
      const part = `\n[Page ${page.number}]\n${page.text.slice(start, start + maxChars - 80)}\n`;
      if (current.length + part.length > maxChars && current) {
        chunks.push(current);
        current = "";
      }
      current += part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
