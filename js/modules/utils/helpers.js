// "C:\Users\lars-\gman-web\js\modules\utils\helpers.js"
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
// Lägg in din egen pdfFieldMappings på window om du redan har den i HTML.
export function getPdfFieldName(kommunNamn, generiskNyckel) {
  const mapping = window.pdfFieldMappings?.[kommunNamn] || window.pdfFieldMappings?.Default || {};
  const specifikt = mapping[generiskNyckel];
  if (!specifikt && window.pdfFieldMappings?.[kommunNamn]) {
    console.warn(`[PDF Mappning] '${generiskNyckel}' saknas för '${kommunNamn}', testar Default.`);
    return window.pdfFieldMappings?.Default?.[generiskNyckel] || generiskNyckel;
  }
  return specifikt || generiskNyckel;
}
