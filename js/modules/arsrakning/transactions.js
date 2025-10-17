// ============================================================
// transactions.js - Hantering av in- och utbetalningar
// Sökväg: js/modules/arsrakning/transactions.js
// ============================================================

import { safe, formatCurrency, formatDate } from "../utils/helpers.js";

// ============================================================
// KATEGORIER FÖR TRANSAKTIONER
// ============================================================

export const INBETALNING_KATEGORIER = [
  "Pension",
  "Sjukersättning",
  "Aktivitetsersättning",
  "Bostadsbidrag",
  "Bostadstillägg",
  "Handikappersättning",
  "Försäljning",
  "Ränteintäkt",
  "Utdelning",
  "Återbetalning",
  "Övrigt",
];

export const UTBETALNING_KATEGORIER = [
  "Boende",
  "Mat",
  "Kläder",
  "Hygien",
  "Hälsa",
  "Medicin",
  "Tandvård",
  "Transport",
  "Fritid",
  "Försäkring",
  "Telefon/Internet",
  "Hemutrustning",
  "Gåva",
  "Övrigt",
];

// ============================================================
// INBETALNINGAR - SKAPA RAD
// ============================================================

/**
 * Skapar en inbetalningsrad med alla fält.
 * @param {object} data - Data för raden
 * @param {number} radNr - Radnummer
 * @returns {HTMLElement}
 */
export function createInbetalningRow(data = {}, radNr = null) {
  const div = document.createElement("div");
  div.className = "dynamic-list-item inbetalning-rad";

  const belopp = data.Belopp !== null && data.Belopp !== undefined ? parseFloat(data.Belopp).toFixed(2) : "";

  // Bygg kategori-options
  const kategoriOptions = INBETALNING_KATEGORIER.map(
    kat => `<option value="${kat}" ${data.Kategori === kat ? "selected" : ""}>${kat}</option>`
  ).join("");

  div.innerHTML = `
    <label style="min-width:40px;">Rad ${radNr || "Ny"}:</label>
    <input type="date" class="datum" data-field="Datum" value="${data.Datum || ""}" required>
    <select class="kategori" data-field="Kategori">
      <option value="">-- Välj kategori --</option>
      ${kategoriOptions}
    </select>
    <input type="text" class="beskrivning" data-field="Beskrivning" placeholder="Beskrivning" value="${safe(
      data.Beskrivning
    )}" required>
    <input type="number" step="0.01" class="belopp" data-field="Belopp" placeholder="Belopp (Kr)" value="${belopp}" required>
    <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${safe(data.BilagaRef)}">
    <button type="button" class="small danger" onclick="removeTransactionRow(this, 'inbetalning')">
      <i class="fas fa-trash"></i>
    </button>
  `;

  // Lägg till event listener för auto-beräkning
  const inputs = div.querySelectorAll("input, select");
  inputs.forEach(input => {
    input.addEventListener("input", () => {
      if (typeof window.calculateArsrakningSummary === "function") {
        window.calculateArsrakningSummary();
      }
    });
    input.addEventListener("change", () => {
      if (typeof window.calculateArsrakningSummary === "function") {
        window.calculateArsrakningSummary();
      }
    });
  });

  return div;
}

/**
 * Lägger till en ny inbetalningsrad.
 */
export function addInbetalningRow() {
  const container = document.getElementById("inbetalningarContainer");
  if (!container) {
    console.error("[Transactions] Container 'inbetalningarContainer' hittades inte.");
    return;
  }

  const currentRows = container.querySelectorAll(".inbetalning-rad").length;
  const newRow = createInbetalningRow({}, currentRows + 1);
  container.appendChild(newRow);

  console.log("[Transactions] Ny inbetalningsrad tillagd.");

  // Fokusera på datumsättet
  const dateInput = newRow.querySelector('input[type="date"]');
  if (dateInput) dateInput.focus();

  // Uppdatera radnummer
  renumberTransactionRows(container, ".inbetalning-rad");
}

// ============================================================
// UTBETALNINGAR - SKAPA RAD
// ============================================================

/**
 * Skapar en utbetalningsrad med alla fält.
 * @param {object} data - Data för raden
 * @param {number} radNr - Radnummer
 * @returns {HTMLElement}
 */
export function createUtbetalningRow(data = {}, radNr = null) {
  const div = document.createElement("div");
  div.className = "dynamic-list-item utbetalning-rad";

  const belopp = data.Belopp !== null && data.Belopp !== undefined ? parseFloat(data.Belopp).toFixed(2) : "";

  // Bygg kategori-options
  const kategoriOptions = UTBETALNING_KATEGORIER.map(
    kat => `<option value="${kat}" ${data.Kategori === kat ? "selected" : ""}>${kat}</option>`
  ).join("");

  div.innerHTML = `
    <label style="min-width:40px;">Rad ${radNr || "Ny"}:</label>
    <input type="date" class="datum" data-field="Datum" value="${data.Datum || ""}" required>
    <select class="kategori" data-field="Kategori">
      <option value="">-- Välj kategori --</option>
      ${kategoriOptions}
    </select>
    <input type="text" class="beskrivning" data-field="Beskrivning" placeholder="Beskrivning" value="${safe(
      data.Beskrivning
    )}" required>
    <input type="number" step="0.01" class="belopp" data-field="Belopp" placeholder="Belopp (Kr)" value="${belopp}" required>
    <input type="text" class="mottagare" data-field="Mottagare" placeholder="Mottagare" value="${safe(data.Mottagare)}">
    <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${safe(data.BilagaRef)}">
    <button type="button" class="small danger" onclick="removeTransactionRow(this, 'utbetalning')">
      <i class="fas fa-trash"></i>
    </button>
  `;

  // Lägg till event listener för auto-beräkning
  const inputs = div.querySelectorAll("input, select");
  inputs.forEach(input => {
    input.addEventListener("input", () => {
      if (typeof window.calculateArsrakningSummary === "function") {
        window.calculateArsrakningSummary();
      }
    });
    input.addEventListener("change", () => {
      if (typeof window.calculateArsrakningSummary === "function") {
        window.calculateArsrakningSummary();
      }
    });
  });

  return div;
}

/**
 * Lägger till en ny utbetalningsrad.
 */
export function addUtbetalningRow() {
  const container = document.getElementById("utbetalningarContainer");
  if (!container) {
    console.error("[Transactions] Container 'utbetalningarContainer' hittades inte.");
    return;
  }

  const currentRows = container.querySelectorAll(".utbetalning-rad").length;
  const newRow = createUtbetalningRow({}, currentRows + 1);
  container.appendChild(newRow);

  console.log("[Transactions] Ny utbetalningsrad tillagd.");

  // Fokusera på datumsättet
  const dateInput = newRow.querySelector('input[type="date"]');
  if (dateInput) dateInput.focus();

  // Uppdatera radnummer
  renumberTransactionRows(container, ".utbetalning-rad");
}

// ============================================================
// TA BORT RAD
// ============================================================

/**
 * Tar bort en transaktionsrad.
 * @param {HTMLElement} buttonElement - Knappen som klickades
 * @param {string} type - "inbetalning" eller "utbetalning"
 */
export function removeTransactionRow(buttonElement, type) {
  const row = buttonElement.closest(".dynamic-list-item");
  if (!row) {
    console.warn("[Transactions] Kunde inte hitta raden att ta bort.");
    return;
  }

  // Bekräfta om raden har data
  const hasData = Array.from(row.querySelectorAll("input, select")).some(
    input => input.value && input.value.trim() !== ""
  );

  if (hasData) {
    const confirmed = confirm("Är du säker på att du vill ta bort denna rad?");
    if (!confirmed) return;
  }

  const container = row.parentElement;
  row.remove();

  console.log(`[Transactions] ${type}-rad borttagen.`);

  // Uppdatera radnummer
  if (container) {
    const selector = type === "inbetalning" ? ".inbetalning-rad" : ".utbetalning-rad";
    renumberTransactionRows(container, selector);
  }

  // Uppdatera sammanfattning
  if (typeof window.calculateArsrakningSummary === "function") {
    window.calculateArsrakningSummary();
  }
}

// ============================================================
// SAMLA TRANSAKTIONSDATA
// ============================================================

/**
 * Samlar all inbetalningsdata från formuläret.
 * @returns {array}
 */
export function collectInbetalningarData() {
  const inbetalningar = [];
  const container = document.getElementById("inbetalningarContainer");

  if (!container) return inbetalningar;

  container.querySelectorAll(".inbetalning-rad").forEach((row, index) => {
    const data = {
      RadNr: index + 1,
      Datum: row.querySelector('[data-field="Datum"]')?.value || null,
      Kategori: row.querySelector('[data-field="Kategori"]')?.value || null,
      Beskrivning: row.querySelector('[data-field="Beskrivning"]')?.value || null,
      Belopp: parseFloat(row.querySelector('[data-field="Belopp"]')?.value) || null,
      BilagaRef: row.querySelector('[data-field="BilagaRef"]')?.value || null,
    };

    // Lägg bara till om minst datum och belopp finns
    if (data.Datum && data.Belopp !== null) {
      inbetalningar.push(data);
    }
  });

  return inbetalningar;
}

/**
 * Samlar all utbetalningsdata från formuläret.
 * @returns {array}
 */
export function collectUtbetalningarData() {
  const utbetalningar = [];
  const container = document.getElementById("utbetalningarContainer");

  if (!container) return utbetalningar;

  container.querySelectorAll(".utbetalning-rad").forEach((row, index) => {
    const data = {
      RadNr: index + 1,
      Datum: row.querySelector('[data-field="Datum"]')?.value || null,
      Kategori: row.querySelector('[data-field="Kategori"]')?.value || null,
      Beskrivning: row.querySelector('[data-field="Beskrivning"]')?.value || null,
      Belopp: parseFloat(row.querySelector('[data-field="Belopp"]')?.value) || null,
      Mottagare: row.querySelector('[data-field="Mottagare"]')?.value || null,
      BilagaRef: row.querySelector('[data-field="BilagaRef"]')?.value || null,
    };

    // Lägg bara till om minst datum och belopp finns
    if (data.Datum && data.Belopp !== null) {
      utbetalningar.push(data);
    }
  });

  return utbetalningar;
}

// ============================================================
// VALIDERING
// ============================================================

/**
 * Validerar transaktionsdata innan sparande.
 * @returns {object} - { valid: boolean, errors: array }
 */
export function validateTransactions() {
  const errors = [];

  // Validera inbetalningar
  const inbetalningar = collectInbetalningarData();
  inbetalningar.forEach((inbet, index) => {
    if (!inbet.Datum) {
      errors.push(`Inbetalning rad ${index + 1}: Datum saknas`);
    }
    if (!inbet.Belopp || inbet.Belopp <= 0) {
      errors.push(`Inbetalning rad ${index + 1}: Ogiltigt belopp`);
    }
    if (!inbet.Beskrivning || inbet.Beskrivning.trim() === "") {
      errors.push(`Inbetalning rad ${index + 1}: Beskrivning saknas`);
    }
  });

  // Validera utbetalningar
  const utbetalningar = collectUtbetalningarData();
  utbetalningar.forEach((utbet, index) => {
    if (!utbet.Datum) {
      errors.push(`Utbetalning rad ${index + 1}: Datum saknas`);
    }
    if (!utbet.Belopp || utbet.Belopp <= 0) {
      errors.push(`Utbetalning rad ${index + 1}: Ogiltigt belopp`);
    }
    if (!utbet.Beskrivning || utbet.Beskrivning.trim() === "") {
      errors.push(`Utbetalning rad ${index + 1}: Beskrivning saknas`);
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

// ============================================================
// BERÄKNINGAR
// ============================================================

/**
 * Beräknar total summa för inbetalningar.
 * @returns {number}
 */
export function calculateTotalInbetalningar() {
  const inbetalningar = collectInbetalningarData();
  return inbetalningar.reduce((sum, inbet) => sum + (inbet.Belopp || 0), 0);
}

/**
 * Beräknar total summa för utbetalningar.
 * @returns {number}
 */
export function calculateTotalUtbetalningar() {
  const utbetalningar = collectUtbetalningarData();
  return utbetalningar.reduce((sum, utbet) => sum + (utbet.Belopp || 0), 0);
}

/**
 * Beräknar nettoresultat (inbetalningar - utbetalningar).
 * @returns {number}
 */
export function calculateNettoResultat() {
  return calculateTotalInbetalningar() - calculateTotalUtbetalningar();
}

/**
 * Beräknar summa per kategori för inbetalningar.
 * @returns {object} - { kategori: summa }
 */
export function calculateInbetalningarPerKategori() {
  const inbetalningar = collectInbetalningarData();
  const perKategori = {};

  inbetalningar.forEach(inbet => {
    const kategori = inbet.Kategori || "Okategoriserad";
    perKategori[kategori] = (perKategori[kategori] || 0) + (inbet.Belopp || 0);
  });

  return perKategori;
}

/**
 * Beräknar summa per kategori för utbetalningar.
 * @returns {object} - { kategori: summa }
 */
export function calculateUtbetalningarPerKategori() {
  const utbetalningar = collectUtbetalningarData();
  const perKategori = {};

  utbetalningar.forEach(utbet => {
    const kategori = utbet.Kategori || "Okategoriserad";
    perKategori[kategori] = (perKategori[kategori] || 0) + (utbet.Belopp || 0);
  });

  return perKategori;
}

// ============================================================
// SORTERING
// ============================================================

/**
 * Sorterar transaktioner efter datum.
 * @param {string} containerId - Container-ID
 * @param {string} selector - Rad-selector
 * @param {boolean} ascending - true för stigande, false för fallande
 */
export function sortTransactionsByDate(containerId, selector, ascending = true) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rows = Array.from(container.querySelectorAll(selector));

  rows.sort((a, b) => {
    const dateA = new Date(a.querySelector('[data-field="Datum"]')?.value || "1900-01-01");
    const dateB = new Date(b.querySelector('[data-field="Datum"]')?.value || "1900-01-01");

    return ascending ? dateA - dateB : dateB - dateA;
  });

  // Ta bort alla rader och lägg till i sorterad ordning
  rows.forEach(row => container.removeChild(row));
  rows.forEach(row => container.appendChild(row));

  // Uppdatera radnummer
  renumberTransactionRows(container, selector);

  console.log(`[Transactions] Sorterade ${selector} efter datum (${ascending ? "stigande" : "fallande"}).`);
}

/**
 * Sorterar transaktioner efter belopp.
 * @param {string} containerId - Container-ID
 * @param {string} selector - Rad-selector
 * @param {boolean} ascending - true för stigande, false för fallande
 */
export function sortTransactionsByAmount(containerId, selector, ascending = true) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rows = Array.from(container.querySelectorAll(selector));

  rows.sort((a, b) => {
    const amountA = parseFloat(a.querySelector('[data-field="Belopp"]')?.value || 0);
    const amountB = parseFloat(b.querySelector('[data-field="Belopp"]')?.value || 0);

    return ascending ? amountA - amountB : amountB - amountA;
  });

  // Ta bort alla rader och lägg till i sorterad ordning
  rows.forEach(row => container.removeChild(row));
  rows.forEach(row => container.appendChild(row));

  // Uppdatera radnummer
  renumberTransactionRows(container, selector);

  console.log(`[Transactions] Sorterade ${selector} efter belopp (${ascending ? "stigande" : "fallande"}).`);
}

// ============================================================
// FILTRERING
// ============================================================

/**
 * Filtrerar transaktioner baserat på kategori.
 * @param {string} containerId - Container-ID
 * @param {string} selector - Rad-selector
 * @param {string} kategori - Kategori att filtrera på (tom sträng = visa alla)
 */
export function filterTransactionsByCategory(containerId, selector, kategori) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rows = container.querySelectorAll(selector);
  let visibleCount = 0;

  rows.forEach(row => {
    const rowKategori = row.querySelector('[data-field="Kategori"]')?.value || "";

    if (!kategori || rowKategori === kategori) {
      row.style.display = "";
      visibleCount++;
    } else {
      row.style.display = "none";
    }
  });

  console.log(`[Transactions] Filtrerade ${selector} på kategori '${kategori}'. Visar ${visibleCount} rader.`);
}

/**
 * Filtrerar transaktioner baserat på datumintervall.
 * @param {string} containerId - Container-ID
 * @param {string} selector - Rad-selector
 * @param {string} startDate - Startdatum (YYYY-MM-DD)
 * @param {string} endDate - Slutdatum (YYYY-MM-DD)
 */
export function filterTransactionsByDateRange(containerId, selector, startDate, endDate) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const rows = container.querySelectorAll(selector);
  let visibleCount = 0;

  rows.forEach(row => {
    const rowDate = new Date(row.querySelector('[data-field="Datum"]')?.value || "1900-01-01");

    let isVisible = true;
    if (start && rowDate < start) isVisible = false;
    if (end && rowDate > end) isVisible = false;

    if (isVisible) {
      row.style.display = "";
      visibleCount++;
    } else {
      row.style.display = "none";
    }
  });

  console.log(`[Transactions] Filtrerade ${selector} på datum ${startDate} - ${endDate}. Visar ${visibleCount} rader.`);
}

// ============================================================
// HJÄLPFUNKTIONER
// ============================================================

/**
 * Numrerar om transaktionsrader.
 * @param {HTMLElement} container - Container-element
 * @param {string} selector - CSS-selector för rader
 */
function renumberTransactionRows(container, selector) {
  if (!container) return;

  const rows = container.querySelectorAll(selector);
  rows.forEach((row, index) => {
    const label = row.querySelector("label");
    if (label) {
      label.textContent = `Rad ${index + 1}:`;
    }
  });
}

/**
 * Visar sammanfattning av transaktioner i gränssnittet.
 */
export function displayTransactionSummary() {
  const totalInbet = calculateTotalInbetalningar();
  const totalUtbet = calculateTotalUtbetalningar();
  const netto = calculateNettoResultat();

  const summaryContainer = document.getElementById("transactionSummaryContainer");
  if (!summaryContainer) return;

  summaryContainer.innerHTML = `
    <div class="transaction-summary">
      <div class="summary-item positive">
        <span class="label">Totala inbetalningar:</span>
        <span class="value">${formatCurrency(totalInbet)}</span>
      </div>
      <div class="summary-item negative">
        <span class="label">Totala utbetalningar:</span>
        <span class="value">${formatCurrency(totalUtbet)}</span>
      </div>
      <div class="summary-item ${netto >= 0 ? "positive" : "negative"}">
        <span class="label">Nettoresultat:</span>
        <span class="value">${formatCurrency(netto)}</span>
      </div>
    </div>
  `;
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.createInbetalningRow = createInbetalningRow;
window.addInbetalningRow = addInbetalningRow;
window.createUtbetalningRow = createUtbetalningRow;
window.addUtbetalningRow = addUtbetalningRow;
window.removeTransactionRow = removeTransactionRow;
window.collectInbetalningarData = collectInbetalningarData;
window.collectUtbetalningarData = collectUtbetalningarData;
window.validateTransactions = validateTransactions;
window.calculateTotalInbetalningar = calculateTotalInbetalningar;
window.calculateTotalUtbetalningar = calculateTotalUtbetalningar;
window.calculateNettoResultat = calculateNettoResultat;
window.sortTransactionsByDate = sortTransactionsByDate;
window.sortTransactionsByAmount = sortTransactionsByAmount;
window.filterTransactionsByCategory = filterTransactionsByCategory;
window.filterTransactionsByDateRange = filterTransactionsByDateRange;
window.displayTransactionSummary = displayTransactionSummary;
