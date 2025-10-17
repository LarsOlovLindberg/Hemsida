// ============================================================
// helpers.js - Kompletta hjälpfunktioner
// Sökväg: js/modules/utils/helpers.js
// ============================================================

// --- BEFINTLIGA FUNKTIONER (BIBEHÅLLNA) ---

export const val = k => window.details?.[k] ?? "";

export function normalizePnr(raw) {
  if (!raw) return "";
  return String(raw).replace(/\D/g, "");
}

export function pnr10(raw) {
  const d = normalizePnr(raw);
  if (d.length === 12) return d.slice(2);
  return d;
}

export function pnr12(raw) {
  const d = normalizePnr(raw);
  if (d.length === 10) {
    const yy = parseInt(d.slice(0, 2), 10);
    const century = yy <= 19 ? "20" : "19";
    return century + d;
  }
  return d;
}

export function getRadioValue(name) {
  const radio = document.querySelector(`input[name="${name}"]:checked`);
  return radio ? radio.value : null;
}

export function setRadioValue(name, value) {
  if (value === null || value === undefined) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(radio => (radio.checked = false));
    return;
  }
  const radioToSelect = document.querySelector(`input[name="${name}"][value="${String(value)}"]`);
  if (radioToSelect) {
    radioToSelect.checked = true;
  } else {
    document.querySelectorAll(`input[name="${name}"]`).forEach(radio => (radio.checked = false));
    console.warn(`[setRadioValue] Inget radioval för '${name}'='${value}'.`);
  }
}

// Mappning av PDF-fält per kommun, fallback till Default.
export function getPdfFieldName(kommunNamn, generiskNyckel) {
  const mapping = window.pdfFieldMappings?.[kommunNamn] || window.pdfFieldMappings?.Default || {};
  const specifikt = mapping[generiskNyckel];
  if (!specifikt && window.pdfFieldMappings?.[kommunNamn]) {
    console.warn(`[PDF Mappning] '${generiskNyckel}' saknas för '${kommunNamn}', testar Default.`);
    return window.pdfFieldMappings?.Default?.[generiskNyckel] || generiskNyckel;
  }
  return specifikt || generiskNyckel;
}

// ============================================================
// NYA FUNKTIONER
// ============================================================

// --- CASE-INSENSITIVE OBJEKTACCESS (KRITISK!) ---
export function getCaseInsensitive(obj, ...candidates) {
  if (!obj) return undefined;
  const keys = Object.keys(obj);

  // Försök exakt matchning först
  for (const want of candidates) {
    const hit = keys.find(k => k.toLowerCase() === String(want).toLowerCase());
    if (hit !== undefined) return obj[hit];
  }

  // Försök utan underscore/mellanslag
  for (const k of keys) {
    const normK = k.toLowerCase().replace(/[_\s]/g, "");
    for (const want2 of candidates) {
      if (normK === String(want2).toLowerCase().replace(/[_\s]/g, "")) {
        return obj[k];
      }
    }
  }

  return undefined;
}

// --- VALUTAFORMATERING ---
export function formatCurrency(value, decimals = 2) {
  if (value === null || value === undefined || value === "") return "";
  const num = parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
  if (isNaN(num)) return "";

  return (
    num.toLocaleString("sv-SE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + " kr"
  );
}

export function formatCurrencyForPdfNoDecimals(value, addKr = true) {
  if (value === null || value === undefined || value === "") return "";
  const num = parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
  if (isNaN(num)) return "";

  const formatted = Math.round(num).toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return addKr ? formatted + " kr" : formatted;
}

export function formatBeloppForPdf(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "";
  }
  const cleanedString = String(value).replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleanedString);
  if (isNaN(num)) return "";

  return Math.round(num).toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// --- DATUMFORMATERING ---
export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("sv-SE");
}

export function formatDateForPdf(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function yearForFilename(dateString) {
  if (!dateString) return new Date().getFullYear();
  const d = new Date(dateString);
  return isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
}

// --- FILNEDLADDNING ---
export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- FETCH HELPER ---
export async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// --- LUHN-ALGORITM (OCR) ---
export function calculateLuhn(numberString) {
  let sum = 0;
  let alternate = true;
  for (let i = numberString.length - 1; i >= 0; i--) {
    let n = parseInt(numberString.charAt(i), 10);
    if (isNaN(n)) return -1;
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0 ? 0 : 10 - (sum % 10);
}

export function generateSkatteverketOcr(pnr) {
  if (!pnr) return "Pnr saknas";
  let cleanedPnr = String(pnr).replace(/\D/g, "");
  let ocrBase = "";

  if (cleanedPnr.length === 12) {
    ocrBase = cleanedPnr;
  } else if (cleanedPnr.length === 10) {
    const currentYearShort = new Date().getFullYear() % 100;
    const pnrYearShort = parseInt(cleanedPnr.substring(0, 2), 10);
    ocrBase = pnrYearShort <= currentYearShort + 10 ? "20" + cleanedPnr : "19" + cleanedPnr;
  } else {
    return "Ogiltigt Pnr-format";
  }

  if (!/^\d{12}$/.test(ocrBase)) return "Internt Pnr-konverteringsfel";

  const luhnDigit = calculateLuhn(ocrBase);
  return luhnDigit === -1 ? "Fel vid OCR-beräkning" : ocrBase + String(luhnDigit);
}

// --- DIVERSE HELPERS ---
export function safe(value) {
  return value === null || value === undefined ? "" : value;
}

// --- NUMRERING AV DYNAMISKA LISTOR ---
export function renumberDynamicListRows(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const rows = container.querySelectorAll(".dynamic-list-item");
  rows.forEach((row, index) => {
    const label = row.querySelector("label");
    if (label) {
      const isRakningskonto = label.textContent.includes("(Räkning)");
      label.textContent = `Rad ${index + 1}${isRakningskonto ? " (Räkning)" : ""}:`;
    }
  });
}

export function renumberDynamicListRowsVisual(containerId, isBankkontoList = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let currentRadNr = 1;
  const rows = Array.from(container.querySelectorAll(".dynamic-list-item"));

  if (isBankkontoList) {
    rows.sort((a, b) => {
      const aIsRakning = a.dataset.isRakningskonto === "true";
      const bIsRakning = b.dataset.isRakningskonto === "true";
      if (aIsRakning && !bIsRakning) return -1;
      if (!aIsRakning && bIsRakning) return 1;
      return 0;
    });
  }

  rows.forEach(row => {
    const label = row.querySelector("label");
    if (label) {
      if (isBankkontoList && row.dataset.isRakningskonto === "true") {
        label.textContent = `Rad 1 (Räkning):`;
        currentRadNr = 2;
      } else {
        label.textContent = `Rad ${currentRadNr}:`;
        currentRadNr++;
      }
    }
  });
}
