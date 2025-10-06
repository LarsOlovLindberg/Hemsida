// "C:\Users\lars-\gman-web\js\modules\pdf\pdfUtils.js";
import state from "../../state.js";
import { PDF_FIELD_MAP } from "../constants.js";

export async function setupPdfDocument(templateUrl, fontUrl = "/fonts/LiberationSans-Regular.ttf") {
  try {
    const [existingPdfBytes, fontBytes] = await Promise.all([
      fetch(templateUrl).then(res => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.arrayBuffer();
      }),
      fetch(fontUrl).then(res => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.arrayBuffer();
      }),
    ]);

    if (!existingPdfBytes || existingPdfBytes.byteLength === 0) {
      throw new Error(`PDF-mallen från '${templateUrl}' är tom eller kunde inte laddas.`);
    }

    const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const form = pdfDoc.getForm();
    return { pdfDoc, form, customFont };
  } catch (e) {
    console.error("[setupPdfDocument] Fel:", e);
    alert(`Kunde inte förbereda PDF: ${e.message}`);
    return null;
  }
}

export function buildPdfFieldValues(huvudmanDetails, extraFields = {}) {
  const result = {};
  for (const [jsonKey, pdfKey] of Object.entries(PDF_FIELD_MAP)) {
    result[pdfKey] = huvudmanDetails?.[jsonKey] ?? "";
  }
  for (const [pdfKey, value] of Object.entries(extraFields)) {
    result[pdfKey] = value ?? "";
  }
  return result;
}

export async function fillAndDownloadPdf(pdfUrl, fieldValues, outputFilename = "ifylld_ansokan.pdf") {
  const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  Object.entries(fieldValues).forEach(([fieldName, value]) => {
    try {
      const field = form.getTextField(fieldName);
      field.setText(String(value ?? ""));
    } catch {
      // Ignorera fält som inte finns
    }
  });

  form.flatten();
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = outputFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function generateAndDownloadPdf() {
  const data = state.currentHuvudmanFullData?.huvudmanDetails;
  if (!data) {
    alert("Välj först en huvudman.");
    return;
  }
  const extraFields = {
    manad: new Date().toLocaleString("sv-SE", { month: "long" }),
    datum: new Date().toLocaleDateString("sv-SE"),
    kommunHandlaggare: state.currentFsKommunNamn || "",
    gm: state.activeGodManProfile?.heltNamn || "",
    heltNamn: data.HeltNamn || `${data.Fornamn || ""} ${data.Efternamn || ""}`.trim(),
  };
  const pdfFieldValues = buildPdfFieldValues(data, extraFields);
  await fillAndDownloadPdf("Ansokan_Upplands_Vasby.pdf", pdfFieldValues, "ifylld_ansokan.pdf");
}
