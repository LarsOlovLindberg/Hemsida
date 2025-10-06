// "C:\Users\lars-\gman-web\js\modules\ui\events.js"
import { handleTemplateFileSelect, savePdfMappings } from "../pdf/pdfTemplates.js";

export function setupEventListeners() {
  document.getElementById("periodStart_ars")?.addEventListener("change", window.handleArsrakningPeriodChange);
  document.getElementById("periodSlut_ars")?.addEventListener("change", window.handleArsrakningPeriodChange);

  document.querySelectorAll('input[name="rakningTyp_ars"]').forEach(radio => {
    radio.addEventListener("change", window.setPeriodDatesForArsrakningTab);
  });

  document.getElementById("fileInput")?.addEventListener("change", window.handleFileSelect);

  ["adjustmentTax", "adjustmentGarnishment", "adjustmentHousing", "adjustmentAddCost"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", window.calculateAdjustedGrossIncome)
  );

  ["arvForvalta", "arvSorja", "arvExtra", "arvBilersattning", "arvKostnadsersattning"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", window.beraknaArvode)
  );

  document.getElementById("templateFileInput")?.addEventListener("change", handleTemplateFileSelect);
  document.getElementById("saveMappingButton")?.addEventListener("click", savePdfMappings);

  const hmSel = document.getElementById("generatorHuvudmanSelect");
  hmSel?.addEventListener("change", () => {
    const pnr = hmSel.value || "";
    window.populateTemplateSelect?.(pnr);
    window.checkGeneratorSelections?.();
  });
  document.getElementById("generatorTemplateSelect")?.addEventListener("change", window.checkGeneratorSelections);
  document.getElementById("loadDataForPdfButton")?.addEventListener("click", window.loadDataForPdf);
  document.getElementById("generateFinalPdfButton")?.addEventListener("click", window.generateFinalPdf);

  document.getElementById("arkivHuvudmanSelect")?.addEventListener("change", window.handleArkivHuvudmanSelect);
  document.getElementById("uploadArkivButton")?.addEventListener("click", window.uploadArkivDokument);
  document.getElementById("arkivFilInput")?.addEventListener("change", window.checkArkivUploadButton);
  document.getElementById("arkivDokumentTyp")?.addEventListener("input", window.checkArkivUploadButton);

  document.getElementById("ocrFakturaInput")?.addEventListener("change", window.handleOcrFakturaUpload);

  document.body.addEventListener("click", function (event) {
    const btn = event.target.closest("button");
    if (!btn) return;
    switch (btn.id) {
      case "saveHuvudmanButton":
        window.saveHuvudmanFullDetails?.();
        break;
      case "btnNyOfn":
        window.openNewOverformyndareModal?.();
        break;
      case "btnRedigeraOfn":
        window.openEditOverformyndareModal?.();
        break;
      case "btnSparaRedogorelse":
        window.collectAndSaveRedogorelseData?.();
        break;
    }
  });

  const saveLinkButton = document.getElementById("saveLinkButton");
  saveLinkButton?.addEventListener("click", window.handleSaveLink);

  const clearLinkFormButton = document.getElementById("clearLinkFormButton");
  clearLinkFormButton?.addEventListener("click", window.clearLinkForm);

  const rpaButton = document.getElementById("startRpaButton");
  rpaButton?.addEventListener("click", window.startRpaPaymentProcess);

  console.log("[EventListeners] Uppkopplat.");
}
