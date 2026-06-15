import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formatPeso } from "@anf/shared";

export interface OrderPdfItem {
  id: number;
  name: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export interface OrderPdfData {
  orderId: number;
  createdAt: string; // ISO
  total: number;
  items: OrderPdfItem[];
}

const COLS = { id: 50, name: 110, unit: 300, qty: 390, amount: 460 };

// Fonts used by the receipt. The masthead reproduces the official Adoracion
// Nocturna Filipina letterhead, whose display faces (Brush Script MT, Old English
// Text MT) are not PDFKit built-ins, so we embed the TrueType files that ship with
// Windows. The body uses Arial rather than PDFKit's built-in Helvetica because the
// built-in's WinAnsi encoding has no peso sign (₱, U+20B1) — it would render as
// "±". Embedded Arial carries the glyph and is metrically ~identical to Helvetica.
// Every font falls back to a standard PDF font if its file is missing (e.g. on CI).
interface ReceiptFonts {
  script: string;
  oldEnglish: string;
  arial: string;
  arialBold: string;
  times: string;
}

function registerFonts(doc: PDFKit.PDFDocument): ReceiptFonts {
  const fontsDir = path.join(process.env.SystemRoot ?? "C:\\Windows", "Fonts");
  const use = (name: string, file: string, fallback: string): string => {
    const filePath = path.join(fontsDir, file);
    try {
      if (fs.existsSync(filePath)) {
        doc.registerFont(name, filePath);
        return name;
      }
    } catch {
      // Registration failed (unreadable/corrupt font) — use the standard fallback.
    }
    return fallback;
  };
  return {
    script: use("BrushScriptMT", "BRUSHSCI.TTF", "Times-Italic"),
    oldEnglish: use("OldEnglishTextMT", "OLDENGL.TTF", "Times-Bold"),
    arial: use("Arial", "arial.ttf", "Helvetica"),
    arialBold: use("ArialBold", "arialbd.ttf", "Helvetica-Bold"),
    times: use("TimesNewRoman", "times.ttf", "Times-Roman"),
  };
}

function drawMasthead(doc: PDFKit.PDFDocument, f: ReceiptFonts): void {
  doc.fillColor("#000");
  doc.font(f.script).fontSize(20).text("The Lord Be Adored - Forever!", { align: "center" });
  doc.font(f.oldEnglish).fontSize(18).text("Adoracion Nocturna Filipina", { align: "center" });
  doc.moveDown(0.2);
  doc.font(f.arialBold).fontSize(11).text("National Council", { align: "center" });
  doc.moveDown(0.2);
  doc.font(f.times).fontSize(10);
  doc.text("Room 305, Pius XII Catholic Center, UN Avenue, Paco Manila 1175, Philippines", {
    align: "center",
  });
  doc.text("Email: anfnationalcouncil1920@gmail.com", { align: "center" });
  doc.text("Website: https://adoracionnocturnafilipina-nc.org/", { align: "center" });
  doc.text("Head Office Landline: 8 - 7000 - 5312", { align: "center" });
}

export function generateOrderPdf(outPath: string, data: OrderPdfData): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    // Embedding TrueType fonts makes PDFKit flush asynchronously, so we pipe to a
    // file stream and resolve on "finish" instead of draining synchronously.
    const stream = fs.createWriteStream(outPath);
    doc.on("error", reject);
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    doc.pipe(stream);

    const f = registerFonts(doc);
    const when = new Date(data.createdAt).toLocaleString("en-PH");

    drawMasthead(doc, f);

    // Rule dividing the centered masthead from the left-aligned order body.
    doc.moveDown(0.6);
    const ruleY = doc.y;
    doc.moveTo(50, ruleY).lineTo(550, ruleY).stroke();
    doc.moveDown(0.8);

    doc.font(f.arial).fillColor("#000").fontSize(14).text(`Order Receipt — Order #${data.orderId}`);
    doc.fontSize(10).fillColor("#555").text(when);
    doc.fillColor("#000").moveDown();

    const headerY = doc.y;
    doc.fontSize(10).font(f.arialBold);
    doc.text("ID", COLS.id, headerY);
    doc.text("Product", COLS.name, headerY);
    doc.text("Unit Price", COLS.unit, headerY, { width: 80, align: "right" });
    doc.text("Qty", COLS.qty, headerY, { width: 50, align: "right" });
    doc.text("Amount", COLS.amount, headerY, { width: 90, align: "right" });
    doc.moveTo(50, headerY + 14).lineTo(550, headerY + 14).stroke();

    doc.font(f.arial);
    let y = headerY + 22;
    for (const item of data.items) {
      doc.text(String(item.id).padStart(4, "0"), COLS.id, y);
      doc.text(item.name, COLS.name, y, { width: 180 });
      doc.text(formatPeso(item.unitPrice), COLS.unit, y, { width: 80, align: "right" });
      doc.text(String(item.quantity), COLS.qty, y, { width: 50, align: "right" });
      doc.text(formatPeso(item.amount), COLS.amount, y, { width: 90, align: "right" });
      y += 20;
    }

    doc.moveTo(50, y + 2).lineTo(550, y + 2).stroke();
    doc.font(f.arialBold).fontSize(12);
    doc.text("TOTAL", COLS.unit, y + 10, { width: 130, align: "right" });
    doc.text(formatPeso(data.total), COLS.amount, y + 10, { width: 90, align: "right" });

    doc.font(f.arial).fontSize(9).fillColor("#777");
    doc.text("Generated by ANF Inventory System", 50, y + 50);

    doc.end();
  });
}
