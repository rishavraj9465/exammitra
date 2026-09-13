import PDFDocument from "pdfkit";
import fs from "node:fs";
import { samplePages } from "../shared/sample.js";
const doc = new PDFDocument({
  size: "A4",
  margin: 56,
  autoFirstPage: false,
  info: {
    Title: "Introduction to Biology — ExamMitra AI sample",
    Author: "ExamMitra AI",
  },
});
const stream = fs.createWriteStream(
  new URL("../client/public/sample-biology.pdf", import.meta.url),
);
doc.pipe(stream);
for (const page of samplePages) {
  doc.addPage();
  doc
    .fillColor("#5654d6")
    .fontSize(10)
    .text("EXAMMITRA AI  /  CURATED SAMPLE LECTURE");
  doc.moveDown(3);
  const [title, ...rest] = page.text.split("\n");
  doc.fillColor("#232b43").fontSize(28).text(title, { lineGap: 6 });
  doc.moveDown(1);
  doc.fontSize(13).fillColor("#4b5365").text(rest.join("\n"), { lineGap: 9 });
  doc.moveDown(2);
  doc
    .fillColor("#26796d")
    .fontSize(10)
    .text("Sample material for exploring notes, quizzes and flashcards.");
  doc
    .fontSize(9)
    .fillColor("#787d8b")
    .text(`ExamMitra AI  |  Biology  |  Page ${page.number} of 3`, 56, 785, {
      lineBreak: false,
    });
}
doc.end();
await new Promise((resolve, reject) => {
  stream.on("finish", resolve);
  stream.on("error", reject);
});
console.log("Created client/public/sample-biology.pdf (3 pages).");
