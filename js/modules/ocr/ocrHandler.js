// ============================================================
// ocrHandler.js - OCR-hantering för dokument
// Sökväg: js/modules/ocr/ocrHandler.js
// ============================================================

import { safe } from "../utils/helpers.js";

// ============================================================
// OCR CONFIGURATION
// ============================================================

const OCR_CONFIG = {
  language: "swe+eng", // Svenska och engelska
  fallbackLanguage: "eng",
  tesseractPath: "https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/",
  workerPath: null, // Sätts dynamiskt
  corePath: null, // Sätts dynamiskt
  supportedFormats: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp", "application/pdf"],
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  preprocessing: {
    grayscale: true,
    threshold: true,
    denoise: false,
  },
  confidence: {
    minimum: 0, // Minsta godkända confidence (0-100)
    warning: 70, // Varning under denna nivå
    good: 85, // God kvalitet över denna nivå
  },
};

// ============================================================
// OCR STATE
// ============================================================

let ocrWorker = null;
let isInitialized = false;
let processingQueue = [];
let isProcessing = false;

// ============================================================
// INITIALISERING
// ============================================================

/**
 * Initierar OCR-systemet.
 */
export async function initializeOCR() {
  if (isInitialized) {
    console.log("[OCR] Redan initierad.");
    return true;
  }

  console.log("[OCR] Initierar OCR-system...");

  if (!window.Tesseract) {
    console.error("[OCR] Tesseract.js är inte laddat!");
    throw new Error("Tesseract.js biblioteket saknas. Ladda det via CDN.");
  }

  try {
    // Skapa worker
    ocrWorker = await window.Tesseract.createWorker({
      logger: m => {
        if (m.status === "recognizing text") {
          updateOCRProgress(m.progress * 100);
        }
        console.log("[OCR]", m);
      },
    });

    // Ladda språk
    try {
      await ocrWorker.loadLanguage(OCR_CONFIG.language);
      await ocrWorker.initialize(OCR_CONFIG.language);
      console.log(`[OCR] Språk laddade: ${OCR_CONFIG.language}`);
    } catch (langError) {
      console.warn(`[OCR] Kunde inte ladda ${OCR_CONFIG.language}, försöker med fallback...`);
      await ocrWorker.loadLanguage(OCR_CONFIG.fallbackLanguage);
      await ocrWorker.initialize(OCR_CONFIG.fallbackLanguage);
      console.log(`[OCR] Fallback-språk laddat: ${OCR_CONFIG.fallbackLanguage}`);
    }

    isInitialized = true;
    console.log("[OCR] ✅ OCR-system initierat.");
    return true;
  } catch (error) {
    console.error("[OCR] Fel vid initialisering:", error);
    throw error;
  }
}

/**
 * Avslutar OCR-workern.
 */
export async function terminateOCR() {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
    isInitialized = false;
    console.log("[OCR] Worker terminerad.");
  }
}

// ============================================================
// OCR PROCESSING
// ============================================================

/**
 * Bearbetar en fil med OCR.
 * @param {File|Blob|string} input - Fil, blob eller bild-URL
 * @param {object} options - OCR-options
 * @returns {Promise<object>} - OCR-resultat
 */
export async function processOCR(input, options = {}) {
  console.log("[OCR] Startar OCR-bearbetning...");

  // Initiera om inte redan gjort
  if (!isInitialized) {
    await initializeOCR();
  }

  // Validera input
  if (input instanceof File) {
    validateFile(input);
  }

  try {
    showOCRProgress("Förbereder bild...");

    // Förbearbeta bild om aktiverat
    let imageToProcess = input;
    if (options.preprocess !== false && OCR_CONFIG.preprocessing.grayscale) {
      imageToProcess = await preprocessImage(input);
    }

    // Kör OCR
    showOCRProgress("Läser text...");
    const result = await ocrWorker.recognize(imageToProcess);

    // Analysera resultat
    const analysis = analyzeOCRResult(result);

    hideOCRProgress();

    console.log("[OCR] ✅ OCR klar:", {
      text: result.data.text.substring(0, 100) + "...",
      confidence: result.data.confidence,
      words: result.data.words.length,
    });

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words: result.data.words,
      lines: result.data.lines,
      paragraphs: result.data.paragraphs,
      analysis: analysis,
      raw: result.data,
    };
  } catch (error) {
    hideOCRProgress();
    console.error("[OCR] Fel vid bearbetning:", error);
    throw error;
  }
}

/**
 * Bearbetar flera filer i kö.
 * @param {Array<File>} files - Array med filer
 * @returns {Promise<Array>} - Array med resultat
 */
export async function processBatchOCR(files) {
  console.log(`[OCR] Startar batch-bearbetning av ${files.length} filer...`);

  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    showOCRProgress(`Bearbetar fil ${i + 1} av ${files.length}...`);

    try {
      const result = await processOCR(file);
      results.push({
        filename: file.name,
        success: true,
        data: result,
      });
    } catch (error) {
      console.error(`[OCR] Fel vid bearbetning av ${file.name}:`, error);
      results.push({
        filename: file.name,
        success: false,
        error: error.message,
      });
    }
  }

  hideOCRProgress();
  console.log(`[OCR] ✅ Batch-bearbetning klar: ${results.filter(r => r.success).length}/${files.length} lyckades.`);

  return results;
}

// ============================================================
// BILDFÖRBEARBETNING
// ============================================================

/**
 * Förbearbetar en bild för bättre OCR-resultat.
 * @param {File|Blob|string} input - Input
 * @returns {Promise<string>} - Base64 data URL
 */
async function preprocessImage(input) {
  console.log("[OCR] Förbearbetar bild...");

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Rita original
      ctx.drawImage(img, 0, 0);

      // Hämta imageData
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Grayscale
      if (OCR_CONFIG.preprocessing.grayscale) {
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray; // R
          data[i + 1] = gray; // G
          data[i + 2] = gray; // B
        }
      }

      // Threshold (binarisering)
      if (OCR_CONFIG.preprocessing.threshold) {
        const threshold = 128;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i];
          const binary = gray > threshold ? 255 : 0;
          data[i] = binary;
          data[i + 1] = binary;
          data[i + 2] = binary;
        }
      }

      // Denoise (enkel medianfilter)
      if (OCR_CONFIG.preprocessing.denoise) {
        imageData = applyMedianFilter(imageData, canvas.width, canvas.height);
      }

      // Rita tillbaka
      ctx.putImageData(imageData, 0, 0);

      // Konvertera till data URL
      const dataUrl = canvas.toDataURL("image/png");
      resolve(dataUrl);
    };

    img.onerror = () => {
      reject(new Error("Kunde inte ladda bild för förbearbetning."));
    };

    // Ladda bild
    if (input instanceof File || input instanceof Blob) {
      const reader = new FileReader();
      reader.onload = e => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(input);
    } else if (typeof input === "string") {
      img.src = input;
    } else {
      reject(new Error("Ogiltig input-typ för bildförbearbetning."));
    }
  });
}

/**
 * Applicerar medianfilter för att minska brus.
 * @param {ImageData} imageData - Image data
 * @param {number} width - Bredd
 * @param {number} height - Höjd
 * @returns {ImageData}
 */
function applyMedianFilter(imageData, width, height) {
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const neighbors = [];

      // Samla närliggande pixlar
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          neighbors.push(data[idx]);
        }
      }

      // Sortera och hitta median
      neighbors.sort((a, b) => a - b);
      const median = neighbors[Math.floor(neighbors.length / 2)];

      // Sätt median-värde
      const idx = (y * width + x) * 4;
      newData[idx] = median;
      newData[idx + 1] = median;
      newData[idx + 2] = median;
    }
  }

  return new ImageData(newData, width, height);
}

// ============================================================
// RESULTAT-ANALYS
// ============================================================

/**
 * Analyserar OCR-resultat och extraherar strukturerad data.
 * @param {object} result - Tesseract-resultat
 * @returns {object} - Analyserat resultat
 */
function analyzeOCRResult(result) {
  const text = result.data.text;
  const confidence = result.data.confidence;
  const words = result.data.words;

  const analysis = {
    quality: getQualityLevel(confidence),
    confidence: confidence,
    wordCount: words.length,
    lowConfidenceWords: words.filter(w => w.confidence < OCR_CONFIG.confidence.warning).length,
    detectedPatterns: {},
  };

  // Detektera vanliga mönster
  analysis.detectedPatterns.personnummer = detectPersonnummer(text);
  analysis.detectedPatterns.dates = detectDates(text);
  analysis.detectedPatterns.amounts = detectAmounts(text);
  analysis.detectedPatterns.bankAccount = detectBankAccount(text);
  analysis.detectedPatterns.phoneNumbers = detectPhoneNumbers(text);

  return analysis;
}

/**
 * Bedömer kvalitetsnivå baserat på confidence.
 * @param {number} confidence - Confidence (0-100)
 * @returns {string}
 */
function getQualityLevel(confidence) {
  if (confidence >= OCR_CONFIG.confidence.good) return "Utmärkt";
  if (confidence >= OCR_CONFIG.confidence.warning) return "God";
  if (confidence >= OCR_CONFIG.confidence.minimum) return "Acceptabel";
  return "Låg";
}

/**
 * Detekterar personnummer i text.
 * @param {string} text - Text
 * @returns {Array<string>}
 */
function detectPersonnummer(text) {
  const pnrRegex = /\b(\d{6}[-\s]?\d{4}|\d{8}[-\s]?\d{4})\b/g;
  const matches = text.match(pnrRegex);
  return matches ? matches.map(m => m.replace(/[-\s]/g, "")) : [];
}

/**
 * Detekterar datum i text.
 * @param {string} text - Text
 * @returns {Array<string>}
 */
function detectDates(text) {
  const dateRegex = /\b(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4}|\d{1,2}\s+\w+\s+\d{4})\b/g;
  const matches = text.match(dateRegex);
  return matches || [];
}

/**
 * Detekterar belopp i text.
 * @param {string} text - Text
 * @returns {Array<object>}
 */
function detectAmounts(text) {
  const amountRegex = /\b(\d{1,3}(?:[\s,]\d{3})*(?:[.,]\d{2})?)\s*(?:kr|SEK|kronor)?\b/gi;
  const matches = text.matchAll(amountRegex);
  const amounts = [];

  for (const match of matches) {
    const amountStr = match[1].replace(/[\s,]/g, "").replace(",", ".");
    const amount = parseFloat(amountStr);
    if (!isNaN(amount)) {
      amounts.push({
        original: match[0],
        value: amount,
      });
    }
  }

  return amounts;
}

/**
 * Detekterar bankkontonummer i text.
 * @param {string} text - Text
 * @returns {Array<string>}
 */
function detectBankAccount(text) {
  // Svenskt bankkonto: clearing (4-5 siffror) + konto (7-10 siffror)
  const accountRegex = /\b(\d{4,5})[-\s]?(\d{7,10})\b/g;
  const matches = text.matchAll(accountRegex);
  const accounts = [];

  for (const match of matches) {
    accounts.push(`${match[1]}-${match[2]}`);
  }

  return accounts;
}

/**
 * Detekterar telefonnummer i text.
 * @param {string} text - Text
 * @returns {Array<string>}
 */
function detectPhoneNumbers(text) {
  const phoneRegex = /\b(\+46|0)[\s-]?\d{1,3}[\s-]?\d{5,8}\b/g;
  const matches = text.match(phoneRegex);
  return matches || [];
}

// ============================================================
// VALIDERING
// ============================================================

/**
 * Validerar en fil för OCR.
 * @param {File} file - Fil att validera
 * @throws {Error} - Om filen är ogiltig
 */
function validateFile(file) {
  // Kontrollera filtyp
  if (!OCR_CONFIG.supportedFormats.includes(file.type)) {
    throw new Error(`Filtypen ${file.type} stöds inte. Tillåtna format: ${OCR_CONFIG.supportedFormats.join(", ")}`);
  }

  // Kontrollera filstorlek
  if (file.size > OCR_CONFIG.maxFileSize) {
    const maxSizeMB = OCR_CONFIG.maxFileSize / (1024 * 1024);
    throw new Error(`Filen är för stor (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max storlek: ${maxSizeMB} MB`);
  }
}

// ============================================================
// UI FEEDBACK
// ============================================================

/**
 * Visar OCR-progress.
 * @param {string} message - Meddelande
 */
function showOCRProgress(message) {
  let progressEl = document.getElementById("ocrProgress");

  if (!progressEl) {
    progressEl = document.createElement("div");
    progressEl.id = "ocrProgress";
    progressEl.className = "ocr-progress";
    progressEl.innerHTML = `
      <div class="ocr-progress-content">
        <div class="spinner"></div>
        <p class="ocr-progress-message">${message}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
      </div>
    `;
    document.body.appendChild(progressEl);
  } else {
    progressEl.querySelector(".ocr-progress-message").textContent = message;
  }

  progressEl.style.display = "flex";
}

/**
 * Uppdaterar OCR-progress.
 * @param {number} percent - Procent (0-100)
 */
function updateOCRProgress(percent) {
  const progressEl = document.getElementById("ocrProgress");
  if (!progressEl) return;

  const fillEl = progressEl.querySelector(".progress-fill");
  if (fillEl) {
    fillEl.style.width = `${percent}%`;
  }
}

/**
 * Döljer OCR-progress.
 */
function hideOCRProgress() {
  const progressEl = document.getElementById("ocrProgress");
  if (progressEl) {
    progressEl.style.display = "none";
  }
}

/**
 * Visar OCR-resultat i modal.
 * @param {object} result - OCR-resultat
 */
export function showOCRResult(result) {
  const modal = document.getElementById("ocrResultModal") || createOCRResultModal();

  const qualityClass =
    result.analysis.quality === "Utmärkt"
      ? "success"
      : result.analysis.quality === "God"
      ? "info"
      : result.analysis.quality === "Acceptabel"
      ? "warning"
      : "error";

  modal.querySelector(".modal-body").innerHTML = `
    <div class="ocr-result">
      <div class="ocr-quality ${qualityClass}">
        <strong>Kvalitet:</strong> ${result.analysis.quality} 
        (${result.confidence.toFixed(1)}% säkerhet)
      </div>

      ${
        result.analysis.lowConfidenceWords > 0
          ? `
        <div class="ocr-warning">
          <i class="fas fa-exclamation-triangle"></i>
          ${result.analysis.lowConfidenceWords} ord har låg säkerhet
        </div>
      `
          : ""
      }

      <div class="ocr-stats">
        <p><strong>Antal ord:</strong> ${result.analysis.wordCount}</p>
      </div>

      ${
        Object.keys(result.analysis.detectedPatterns).some(k => result.analysis.detectedPatterns[k].length > 0)
          ? `
        <div class="detected-patterns">
          <h4>Detekterade mönster:</h4>
          ${
            result.analysis.detectedPatterns.personnummer.length > 0
              ? `
            <p><strong>Personnummer:</strong> ${result.analysis.detectedPatterns.personnummer.join(", ")}</p>
          `
              : ""
          }
          ${
            result.analysis.detectedPatterns.dates.length > 0
              ? `
            <p><strong>Datum:</strong> ${result.analysis.detectedPatterns.dates.join(", ")}</p>
          `
              : ""
          }
          ${
            result.analysis.detectedPatterns.amounts.length > 0
              ? `
            <p><strong>Belopp:</strong> ${result.analysis.detectedPatterns.amounts.map(a => a.original).join(", ")}</p>
          `
              : ""
          }
          ${
            result.analysis.detectedPatterns.bankAccount.length > 0
              ? `
            <p><strong>Bankkonton:</strong> ${result.analysis.detectedPatterns.bankAccount.join(", ")}</p>
          `
              : ""
          }
          ${
            result.analysis.detectedPatterns.phoneNumbers.length > 0
              ? `
            <p><strong>Telefonnummer:</strong> ${result.analysis.detectedPatterns.phoneNumbers.join(", ")}</p>
          `
              : ""
          }
        </div>
      `
          : ""
      }

      <div class="ocr-text">
        <h4>Extraherad text:</h4>
        <textarea readonly rows="15" class="form-control">${safe(result.text)}</textarea>
      </div>

      <div class="ocr-actions">
        <button type="button" class="btn btn-primary" onclick="copyOCRText()">
          <i class="fas fa-copy"></i> Kopiera text
        </button>
        <button type="button" class="btn btn-secondary" onclick="downloadOCRText()">
          <i class="fas fa-download"></i> Ladda ner
        </button>
      </div>
    </div>
  `;

  // Spara resultat globalt för knappfunktioner
  window.currentOCRResult = result;

  modal.style.display = "block";
}

/**
 * Skapar OCR-resultat modal om den inte finns.
 * @returns {HTMLElement}
 */
function createOCRResultModal() {
  const modal = document.createElement("div");
  modal.id = "ocrResultModal";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content large">
      <div class="modal-header">
        <h3>OCR-resultat</h3>
        <button type="button" class="modal-close" onclick="closeOCRResultModal()">&times;</button>
      </div>
      <div class="modal-body">
        <!-- Fylls dynamiskt -->
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

/**
 * Stänger OCR-resultat modal.
 */
export function closeOCRResultModal() {
  const modal = document.getElementById("ocrResultModal");
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * Kopierar OCR-text till clipboard.
 */
export function copyOCRText() {
  if (!window.currentOCRResult) return;

  const text = window.currentOCRResult.text;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      if (typeof window.showNotification === "function") {
        window.showNotification("Text kopierad till urklipp!", "success");
      } else {
        alert("Text kopierad!");
      }
    })
    .catch(err => {
      console.error("[OCR] Fel vid kopiering:", err);
      alert("Kunde inte kopiera text.");
    });
}

/**
 * Laddar ner OCR-text som textfil.
 */
export function downloadOCRText() {
  if (!window.currentOCRResult) return;

  const text = window.currentOCRResult.text;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ocr_result_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// FILE UPLOAD HANDLER
// ============================================================

/**
 * Hanterar fil-upload för OCR.
 * @param {Event} event - Change event från file input
 */
export async function handleOCRFileUpload(event) {
  const files = Array.from(event.target.files);

  if (files.length === 0) return;

  try {
    if (files.length === 1) {
      const result = await processOCR(files[0]);
      showOCRResult(result);
    } else {
      const results = await processBatchOCR(files);
      showBatchOCRResults(results);
    }
  } catch (error) {
    console.error("[OCR] Fel vid filuppladdning:", error);
    alert("OCR-fel: " + error.message);
  }
}

/**
 * Visar batch OCR-resultat.
 * @param {Array} results - Array med resultat
 */
function showBatchOCRResults(results) {
  const successCount = results.filter(r => r.success).length;
  const message = `OCR klar: ${successCount}/${results.length} filer bearbetade.`;

  if (typeof window.showNotification === "function") {
    window.showNotification(message, successCount === results.length ? "success" : "warning");
  } else {
    alert(message);
  }

  // Visa första lyckade resultatet
  const firstSuccess = results.find(r => r.success);
  if (firstSuccess) {
    showOCRResult(firstSuccess.data);
  }
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.initializeOCR = initializeOCR;
window.terminateOCR = terminateOCR;
window.processOCR = processOCR;
window.processBatchOCR = processBatchOCR;
window.showOCRResult = showOCRResult;
window.closeOCRResultModal = closeOCRResultModal;
window.copyOCRText = copyOCRText;
window.downloadOCRText = downloadOCRText;
window.handleOCRFileUpload = handleOCRFileUpload;

console.log("[OCR] ocrHandler.js laddad.");
