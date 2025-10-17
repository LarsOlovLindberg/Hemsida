// ============================================================
// pdfTemplates.js - PDF-mall generering
// Sökväg: js/modules/pdf/pdfTemplates.js
// ============================================================

import {
  getCaseInsensitive,
  safe,
  formatCurrency,
  formatDate,
  formatDateForPdf,
  yearForFilename,
  triggerDownload,
} from "../utils/helpers.js";

// ============================================================
// PDF CONFIGURATION
// ============================================================

const PDF_CONFIG = {
  fonts: {
    regular: "/fonts/LiberationSans-Regular.ttf",
    bold: "/fonts/LiberationSans-Bold.ttf",
    italic: "/fonts/LiberationSans-Italic.ttf",
  },
  fallbackFonts: {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
  },
  pageSize: {
    width: 595.28, // A4 width in points
    height: 841.89, // A4 height in points
  },
  margins: {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50,
  },
  colors: {
    black: { r: 0, g: 0, b: 0 },
    gray: { r: 0.5, g: 0.5, b: 0.5 },
    lightGray: { r: 0.8, g: 0.8, b: 0.8 },
    blue: { r: 0, g: 0.4, b: 0.8 },
    red: { r: 0.8, g: 0, b: 0 },
    green: { r: 0, g: 0.6, b: 0 },
  },
  fontSize: {
    title: 18,
    header: 14,
    subheader: 12,
    body: 10,
    small: 8,
  },
};

// ============================================================
// PDF BASE CLASS
// ============================================================

class PDFGenerator {
  constructor() {
    this.pdfDoc = null;
    this.page = null;
    this.regularFont = null;
    this.boldFont = null;
    this.italicFont = null;
    this.y = 0;
    this.pageNumber = 1;
  }

  /**
   * Initierar PDF-dokumentet.
   */
  async initialize() {
    if (!window.PDFLib) {
      throw new Error("PDFLib är inte laddat.");
    }

    const { PDFDocument, rgb } = window.PDFLib;
    this.pdfDoc = await PDFDocument.create();
    this.rgb = rgb;

    // Ladda fonter
    await this.loadFonts();

    // Skapa första sidan
    this.addPage();
  }

  /**
   * Laddar fonter.
   */
  async loadFonts() {
    const { StandardFonts } = window.PDFLib;

    try {
      // Försök ladda anpassade fonter
      if (window.fontkit) {
        this.pdfDoc.registerFontkit(window.fontkit);

        const regularBytes = await fetch(PDF_CONFIG.fonts.regular).then(r => r.arrayBuffer());
        this.regularFont = await this.pdfDoc.embedFont(regularBytes);

        try {
          const boldBytes = await fetch(PDF_CONFIG.fonts.bold).then(r => r.arrayBuffer());
          this.boldFont = await this.pdfDoc.embedFont(boldBytes);
        } catch {
          this.boldFont = this.regularFont;
        }

        try {
          const italicBytes = await fetch(PDF_CONFIG.fonts.italic).then(r => r.arrayBuffer());
          this.italicFont = await this.pdfDoc.embedFont(italicBytes);
        } catch {
          this.italicFont = this.regularFont;
        }
      } else {
        throw new Error("fontkit saknas");
      }
    } catch (error) {
      console.warn("[PDF] Kunde inte ladda anpassade fonter, använder fallback:", error);
      // Använd standard-fonter
      this.regularFont = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
      this.boldFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
      this.italicFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    }
  }

  /**
   * Lägger till en ny sida.
   */
  addPage() {
    this.page = this.pdfDoc.addPage([PDF_CONFIG.pageSize.width, PDF_CONFIG.pageSize.height]);
    this.y = PDF_CONFIG.pageSize.height - PDF_CONFIG.margins.top;
    this.pageNumber++;
  }

  /**
   * Kontrollerar om ny sida behövs.
   * @param {number} neededSpace - Behövt utrymme i points
   */
  checkNewPage(neededSpace) {
    if (this.y - neededSpace < PDF_CONFIG.margins.bottom) {
      this.addPage();
      return true;
    }
    return false;
  }

  /**
   * Ritar text.
   * @param {string} text - Text att rita
   * @param {object} options - Options (x, y, size, font, color, align)
   */
  drawText(text, options = {}) {
    const {
      x = PDF_CONFIG.margins.left,
      y = this.y,
      size = PDF_CONFIG.fontSize.body,
      font = this.regularFont,
      color = PDF_CONFIG.colors.black,
      align = "left",
    } = options;

    let drawX = x;

    // Hantera alignment
    if (align === "center") {
      const textWidth = font.widthOfTextAtSize(text, size);
      drawX = (PDF_CONFIG.pageSize.width - textWidth) / 2;
    } else if (align === "right") {
      const textWidth = font.widthOfTextAtSize(text, size);
      drawX = PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.right - textWidth;
    }

    this.page.drawText(text, {
      x: drawX,
      y: y,
      size: size,
      font: font,
      color: this.rgb(color.r, color.g, color.b),
    });

    // Uppdatera y-position om det inte var explicit satt
    if (!options.y) {
      this.y -= size * 1.5;
    }
  }

  /**
   * Ritar flerradigt text med automatisk radbrytning.
   * @param {string} text - Text att rita
   * @param {object} options - Options
   */
  drawMultiLineText(text, options = {}) {
    const {
      x = PDF_CONFIG.margins.left,
      size = PDF_CONFIG.fontSize.body,
      font = this.regularFont,
      color = PDF_CONFIG.colors.black,
      maxWidth = PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right,
      lineHeight = 1.5,
    } = options;

    const paragraphs = String(text || "").split("\n");

    for (const paragraph of paragraphs) {
      const words = paragraph.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth && currentLine) {
          // Rita nuvarande rad
          this.checkNewPage(size * lineHeight + 5);
          this.drawText(currentLine, { x, size, font, color, y: this.y });
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      // Rita sista raden i paragrafen
      if (currentLine) {
        this.checkNewPage(size * lineHeight + 5);
        this.drawText(currentLine, { x, size, font, color, y: this.y });
      }
    }
  }

  /**
   * Ritar en linje.
   * @param {number} x1 - Start X
   * @param {number} y1 - Start Y
   * @param {number} x2 - Slut X
   * @param {number} y2 - Slut Y
   * @param {object} options - Options (thickness, color)
   */
  drawLine(x1, y1, x2, y2, options = {}) {
    const { thickness = 1, color = PDF_CONFIG.colors.black } = options;

    this.page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: thickness,
      color: this.rgb(color.r, color.g, color.b),
    });
  }

  /**
   * Ritar en rektangel.
   * @param {number} x - X-position
   * @param {number} y - Y-position
   * @param {number} width - Bredd
   * @param {number} height - Höjd
   * @param {object} options - Options (borderColor, borderWidth, fillColor)
   */
  drawRectangle(x, y, width, height, options = {}) {
    const { borderColor = PDF_CONFIG.colors.black, borderWidth = 1, fillColor = null } = options;

    if (fillColor) {
      this.page.drawRectangle({
        x: x,
        y: y,
        width: width,
        height: height,
        color: this.rgb(fillColor.r, fillColor.g, fillColor.b),
      });
    }

    if (borderWidth > 0) {
      this.page.drawRectangle({
        x: x,
        y: y,
        width: width,
        height: height,
        borderColor: this.rgb(borderColor.r, borderColor.g, borderColor.b),
        borderWidth: borderWidth,
      });
    }
  }

  /**
   * Ritar en tabell.
   * @param {array} headers - Tabellhuvuden
   * @param {array} rows - Tabellrader
   * @param {object} options - Options
   */
  drawTable(headers, rows, options = {}) {
    const {
      x = PDF_CONFIG.margins.left,
      columnWidths = null,
      headerBg = PDF_CONFIG.colors.lightGray,
      headerFont = this.boldFont,
      cellFont = this.regularFont,
      fontSize = PDF_CONFIG.fontSize.body,
      padding = 5,
      rowHeight = 25,
    } = options;

    const tableWidth = PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.left - PDF_CONFIG.margins.right;
    const numColumns = headers.length;
    const colWidths = columnWidths || Array(numColumns).fill(tableWidth / numColumns);

    // Rita headers
    this.checkNewPage(rowHeight + 10);
    const headerY = this.y;

    // Header bakgrund
    this.drawRectangle(x, headerY - rowHeight, tableWidth, rowHeight, {
      fillColor: headerBg,
      borderWidth: 1,
    });

    // Header text
    let currentX = x;
    headers.forEach((header, i) => {
      this.drawText(header, {
        x: currentX + padding,
        y: headerY - rowHeight / 2 - fontSize / 2,
        size: fontSize,
        font: headerFont,
      });
      currentX += colWidths[i];
    });

    this.y = headerY - rowHeight;

    // Rita rader
    rows.forEach(row => {
      this.checkNewPage(rowHeight + 10);
      const rowY = this.y;

      // Cell borders
      currentX = x;
      colWidths.forEach(width => {
        this.drawRectangle(currentX, rowY - rowHeight, width, rowHeight, {
          borderWidth: 1,
        });
        currentX += width;
      });

      // Cell text
      currentX = x;
      row.forEach((cell, i) => {
        this.drawText(String(cell), {
          x: currentX + padding,
          y: rowY - rowHeight / 2 - fontSize / 2,
          size: fontSize,
          font: cellFont,
        });
        currentX += colWidths[i];
      });

      this.y = rowY - rowHeight;
    });

    this.y -= 10; // Extra space efter tabell
  }

  /**
   * Lägger till sidfot med sidnummer.
   */
  addPageFooters() {
    const pages = this.pdfDoc.getPages();
    const totalPages = pages.length;

    pages.forEach((page, index) => {
      const pageNum = index + 1;
      const text = `Sida ${pageNum} av ${totalPages}`;
      const textWidth = this.regularFont.widthOfTextAtSize(text, PDF_CONFIG.fontSize.small);

      page.drawText(text, {
        x: PDF_CONFIG.pageSize.width - PDF_CONFIG.margins.right - textWidth,
        y: PDF_CONFIG.margins.bottom / 2,
        size: PDF_CONFIG.fontSize.small,
        font: this.regularFont,
        color: this.rgb(PDF_CONFIG.colors.gray.r, PDF_CONFIG.colors.gray.g, PDF_CONFIG.colors.gray.b),
      });
    });
  }

  /**
   * Sparar och laddar ner PDF.
   * @param {string} filename - Filnamn
   */
  async save(filename) {
    // Lägg till sidfötter
    this.addPageFooters();

    // Spara PDF
    const pdfBytes = await this.pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    triggerDownload(blob, filename);
  }
}

// ============================================================
// ÅRSRÄKNINGS-PDF
// ============================================================

/**
 * Genererar årsräknings-PDF.
 * @param {object} data - Årsräkningsdata
 */
export async function generateArsrakningPDF(data) {
  console.log("[PDF] Genererar årsräknings-PDF...");

  try {
    const pdf = new PDFGenerator();
    await pdf.initialize();

    const hm = window.currentHuvudmanFullData?.huvudmanDetails;
    if (!hm) throw new Error("Ingen huvudman vald.");

    // Titel
    pdf.drawText("ÅRSRÄKNING", {
      size: PDF_CONFIG.fontSize.title,
      font: pdf.boldFont,
      align: "center",
    });

    pdf.y -= 10;

    // Period
    const periodStart = data.periodStart || "";
    const periodSlut = data.periodSlut || "";
    pdf.drawText(`Period: ${formatDateForPdf(periodStart)} – ${formatDateForPdf(periodSlut)}`, {
      size: PDF_CONFIG.fontSize.body,
      align: "center",
    });

    pdf.y -= 20;

    // Huvudman info
    pdf.drawText("Huvudman", {
      size: PDF_CONFIG.fontSize.header,
      font: pdf.boldFont,
    });
    pdf.drawText(`${safe(getCaseInsensitive(hm, "FORNAMN"))} ${safe(getCaseInsensitive(hm, "EFTERNAMN"))}`, {
      x: PDF_CONFIG.margins.left + 10,
    });
    pdf.drawText(`Personnummer: ${safe(getCaseInsensitive(hm, "PERSONNUMMER"))}`, {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.y -= 20;

    // Kassaflöde
    pdf.drawText("Kassaflöde", {
      size: PDF_CONFIG.fontSize.header,
      font: pdf.boldFont,
    });

    const kassaflodeData = [
      ["Totala inbetalningar", formatCurrency(data.totalaInbetalningar || 0)],
      ["Totala utbetalningar", formatCurrency(data.totalaUtbetalningar || 0)],
      ["Nettokassaflöde", formatCurrency(data.nettokassaflode || 0)],
    ];

    pdf.drawTable(["Beskrivning", "Belopp"], kassaflodeData, {
      columnWidths: [350, 150],
    });

    // Förmögenhet
    pdf.drawText("Förmögenhet", {
      size: PDF_CONFIG.fontSize.header,
      font: pdf.boldFont,
    });

    const formogenhetData = [
      ["Vid periodens start", formatCurrency(data.formogenhetStart || 0)],
      ["Vid periodens slut", formatCurrency(data.formogenhetSlut || 0)],
      ["Förändring", formatCurrency(data.formogenhetForandring || 0)],
    ];

    pdf.drawTable(["Beskrivning", "Belopp"], formogenhetData, {
      columnWidths: [350, 150],
    });

    // Spara
    const filename = `Arsrakning_${getCaseInsensitive(hm, "PERSONNUMMER")?.replace(/\D/g, "")}_${yearForFilename(
      periodStart
    )}.pdf`;
    await pdf.save(filename);

    console.log("[PDF] Årsräknings-PDF genererad:", filename);
  } catch (error) {
    console.error("[PDF] Fel vid generering av årsräknings-PDF:", error);
    throw error;
  }
}

// ============================================================
// REDOGÖRELSE-PDF
// ============================================================

/**
 * Genererar redogörelse-PDF.
 * @param {object} data - Redogörelsedata
 */
export async function generateRedogorelsePDF(data) {
  console.log("[PDF] Genererar redogörelse-PDF...");

  try {
    const pdf = new PDFGenerator();
    await pdf.initialize();

    const hm = window.currentHuvudmanFullData?.huvudmanDetails;
    const gm = window.activeGodManProfile;
    if (!hm || !gm) throw new Error("Huvudman eller God man-profil saknas.");

    // Titel
    pdf.drawText("REDOGÖRELSE", {
      size: PDF_CONFIG.fontSize.title,
      font: pdf.boldFont,
      align: "center",
    });

    pdf.y -= 10;

    // Period
    pdf.drawText(
      `Period: ${formatDateForPdf(data.redogKalenderarStart)} – ${formatDateForPdf(data.redogKalenderarSlut)}`,
      {
        align: "center",
      }
    );

    pdf.y -= 20;

    // Parter
    pdf.drawText("1. Parter", {
      size: PDF_CONFIG.fontSize.subheader,
      font: pdf.boldFont,
    });

    pdf.drawText(
      `Huvudman: ${safe(getCaseInsensitive(hm, "FORNAMN"))} ${safe(getCaseInsensitive(hm, "EFTERNAMN"))} (${safe(
        getCaseInsensitive(hm, "PERSONNUMMER")
      )})`,
      {
        x: PDF_CONFIG.margins.left + 10,
      }
    );

    pdf.drawText(
      `God man: ${safe(getCaseInsensitive(gm, "Fornamn"))} ${safe(getCaseInsensitive(gm, "Efternamn"))} (${safe(
        getCaseInsensitive(gm, "Personnummer")
      )})`,
      {
        x: PDF_CONFIG.margins.left + 10,
      }
    );

    pdf.y -= 20;

    // Boendeform
    pdf.drawText("2. Huvudmannens boendeform", {
      size: PDF_CONFIG.fontSize.subheader,
      font: pdf.boldFont,
    });

    let boendeText = data.redogBoendeform || "Ej angivet";
    if (data.redogBoendeform === "Annat" && data.redogBoendeAnnatText) {
      boendeText = data.redogBoendeAnnatText;
    }

    pdf.drawText(boendeText, {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.y -= 20;

    // Omfattning
    pdf.drawText("3. Uppdragets omfattning", {
      size: PDF_CONFIG.fontSize.subheader,
      font: pdf.boldFont,
    });

    let omfattning = [];
    if (data.redogOmfBevakaRatt) omfattning.push("Bevaka rätt");
    if (data.redogOmfForvaltaEgendom) omfattning.push("Förvalta egendom");
    if (data.redogOmfSorjaForPerson) omfattning.push("Sörja för person");

    pdf.drawText(`Uppdraget omfattar: ${omfattning.join(", ") || "Ej specificerat"}`, {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.y -= 20;

    // Kontakter
    pdf.drawText("4. Kontakter och tidsinsats", {
      size: PDF_CONFIG.fontSize.subheader,
      font: pdf.boldFont,
    });

    pdf.drawText(`Antal besök: ${data.redogAntalBesokTyp || "Ej specificerat"}`, {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.drawText(`Antal telefonsamtal: ${data.redogAntalTelefonsamtal || "0"}`, {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.y -= 20;

    // Underskrift
    pdf.drawText("5. Intygande och underskrift", {
      size: PDF_CONFIG.fontSize.subheader,
      font: pdf.boldFont,
    });

    pdf.drawMultiLineText(
      "Härmed intygas på heder och samvete att de uppgifter som lämnats i denna redogörelse är riktiga.",
      {
        x: PDF_CONFIG.margins.left + 10,
      }
    );

    pdf.y -= 20;

    const ortDatum = `${data.redogUnderskriftOrt || "___________"}, den ${formatDateForPdf(
      data.redogUnderskriftDatum
    )}`;
    pdf.drawText(ortDatum, {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.y -= 30;

    pdf.drawText("________________________________________", {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.drawText(`${safe(getCaseInsensitive(gm, "Fornamn"))} ${safe(getCaseInsensitive(gm, "Efternamn"))}`, {
      x: PDF_CONFIG.margins.left + 10,
    });

    // Spara
    const filename = `Redogorelse_${getCaseInsensitive(hm, "PERSONNUMMER")?.replace(/\D/g, "")}_${yearForFilename(
      data.redogKalenderarStart
    )}.pdf`;
    await pdf.save(filename);

    console.log("[PDF] Redogörelse-PDF genererad:", filename);
  } catch (error) {
    console.error("[PDF] Fel vid generering av redogörelse-PDF:", error);
    throw error;
  }
}

// ============================================================
// ARVODE-PDF
// ============================================================

/**
 * Genererar arvode-PDF.
 * @param {object} data - Arvodedata
 */
export async function generateArvodePDF(data) {
  console.log("[PDF] Genererar arvode-PDF...");

  try {
    const pdf = new PDFGenerator();
    await pdf.initialize();

    const hm = window.currentHuvudmanFullData?.huvudmanDetails;
    const gm = window.activeGodManProfile;
    if (!hm || !gm) throw new Error("Huvudman eller God man-profil saknas.");

    // Titel
    pdf.drawText("ARVODESBERÄKNING", {
      size: PDF_CONFIG.fontSize.title,
      font: pdf.boldFont,
      align: "center",
    });

    pdf.y -= 20;

    // Parter
    pdf.drawText(
      `Huvudman: ${safe(getCaseInsensitive(hm, "FORNAMN"))} ${safe(getCaseInsensitive(hm, "EFTERNAMN"))} (${safe(
        getCaseInsensitive(hm, "PERSONNUMMER")
      )})`,
      {}
    );

    pdf.drawText(
      `God man: ${safe(getCaseInsensitive(gm, "Fornamn"))} ${safe(getCaseInsensitive(gm, "Efternamn"))} (${safe(
        getCaseInsensitive(gm, "Personnummer")
      )})`,
      {}
    );

    pdf.drawText(`Datum: ${formatDateForPdf(new Date().toISOString().slice(0, 10))}`, {});

    pdf.y -= 20;

    // Arvodesdelar
    pdf.drawText("Arvode önskas för:", {
      size: PDF_CONFIG.fontSize.subheader,
      font: pdf.boldFont,
    });

    let arvodesDelar = [];
    if (data.bevakaRatt) arvodesDelar.push("Bevaka rätt");
    if (data.forvaltaEgendom) arvodesDelar.push("Förvalta egendom");
    if (data.sorjaForPerson) arvodesDelar.push("Sörja för person");

    pdf.drawText(arvodesDelar.join(", ") || "Inga delar valda", {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.y -= 10;

    pdf.drawText(`Arbetsinsats: ${data.arbetsinsats || "Normal"}`, {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.y -= 10;

    pdf.drawText(`Prisbasbelopp: ${formatCurrency(data.prisbasbelopp || 0)}`, {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.y -= 20;

    // Beräkning (simplified)
    pdf.drawText("Beräkning:", {
      size: PDF_CONFIG.fontSize.subheader,
      font: pdf.boldFont,
    });

    pdf.drawText(`Beräknat arvode: ${formatCurrency(data.totaltArvode || 0)}`, {
      x: PDF_CONFIG.margins.left + 10,
      font: pdf.boldFont,
    });

    pdf.drawText(`Kostnadsersättning: ${formatCurrency(data.totaltKostnader || 0)}`, {
      x: PDF_CONFIG.margins.left + 10,
    });

    pdf.y -= 10;

    pdf.drawText(`TOTALT: ${formatCurrency(data.totaltBelopp || 0)}`, {
      x: PDF_CONFIG.margins.left + 10,
      font: pdf.boldFont,
      size: PDF_CONFIG.fontSize.header,
    });

    // Spara
    const filename = `Arvode_${getCaseInsensitive(hm, "PERSONNUMMER")?.replace(/\D/g, "")}_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;
    await pdf.save(filename);

    console.log("[PDF] Arvode-PDF genererad:", filename);
  } catch (error) {
    console.error("[PDF] Fel vid generering av arvode-PDF:", error);
    throw error;
  }
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.PDFGenerator = PDFGenerator;
window.generateArsrakningPDF = generateArsrakningPDF;
window.generateRedogorelsePDF = generateRedogorelsePDF;
window.generateArvodePDF = generateArvodePDF;

console.log("[PDF] pdfTemplates.js laddad.");
