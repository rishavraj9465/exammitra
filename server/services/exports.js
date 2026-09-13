import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
export function markdown(pack, kind = "notes") {
  const c = pack.content;
  let text = `# ${pack.title}\n\n${pack.sample ? "Labelled sample study pack\n\n" : ""}`;
  const refs = (pages) => `Source: ${pages.map((p) => `page ${p}`).join(", ")}`;
  if (kind === "quiz") {
    text += "## Practice questions\n\n";
    c.quiz.forEach((q, i) => {
      text += `${i + 1}. ${q.question}\n${q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}`).join("\n")}\n\n`;
    });
    text += "\n---\n\n## Answer key\n\n";
    c.quiz.forEach(
      (q, i) =>
        (text += `${i + 1}. ${String.fromCharCode(65 + q.answer)} — ${q.explanation}\n${refs(q.pages)}\n\n`),
    );
  } else {
    text += `${c.overview}\n\n`;
    c.topics.forEach(
      (t) => (text += `## ${t.title}\n\n${t.body}\n\n${refs(t.pages)}\n\n`),
    );
    text += "## Key terms\n\n";
    c.terms.forEach(
      (t) => (text += `**${t.term}:** ${t.definition}\n${refs(t.pages)}\n\n`),
    );
    if (c.formulas.length) {
      text += "## Formulas\n\n";
      c.formulas.forEach(
        (t) => (text += `${t.formula}\n${t.explanation}\n${refs(t.pages)}\n\n`),
      );
    }
  }
  return text;
}
export function pdfExport(pack, kind = "notes") {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 54,
      size: "A4",
      bufferPages: true,
      info: { Title: pack.title, Author: "ExamMitra AI" },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font(
      process.env.PDF_FONT_PATH ||
        fileURLToPath(new URL("../assets/DejaVuSans.ttf", import.meta.url)),
    );
    const title = (t) => {
      doc.fillColor("#272c4a").fontSize(20).text(t);
      doc.moveDown(0.7);
    };
    const body = (t) => {
      doc.fillColor("#444859").fontSize(11).text(t, { lineGap: 5 });
      doc.moveDown(0.8);
    };
    const ref = (p) => {
      doc
        .fillColor("#26796d")
        .fontSize(9)
        .text(`Source: ${p.map((n) => `page ${n}`).join(", ")}`);
      doc.moveDown(1);
    };
    doc.fillColor("#5654d6").fontSize(10).text("EXAMMITRA AI");
    doc.moveDown();
    title(pack.title);
    if (pack.sample) body("Labelled sample study pack");
    if (kind === "quiz") {
      title("Practice questions");
      pack.content.quiz.forEach((q, i) => {
        body(`${i + 1}. ${q.question}`);
        q.options.forEach((o, j) =>
          body(`${String.fromCharCode(65 + j)}. ${o}`),
        );
      });
      doc.addPage();
      title("Answer key");
      pack.content.quiz.forEach((q, i) => {
        body(
          `${i + 1}. ${String.fromCharCode(65 + q.answer)}. ${q.explanation}`,
        );
        ref(q.pages);
      });
    } else {
      body(pack.content.overview);
      pack.content.topics.forEach((t) => {
        if (doc.y > 650) doc.addPage();
        title(t.title);
        body(t.body);
        ref(t.pages);
      });
      title("Key terms");
      pack.content.terms.forEach((t) => {
        body(`${t.term}: ${t.definition}`);
        ref(t.pages);
      });
      if (pack.content.formulas.length) {
        title("Formulas");
        pack.content.formulas.forEach((t) => {
          body(`${t.formula}\n${t.explanation}`);
          ref(t.pages);
        });
      }
    }
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i);
      doc
        .fillColor("#777777")
        .fontSize(9)
        .text(`ExamMitra AI  |  ${i + 1} / ${range.count}`, 54, 790, {
          width: 487,
          align: "left",
          lineBreak: false,
        });
    }
    doc.end();
  });
}
