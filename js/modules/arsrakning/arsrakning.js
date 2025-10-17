// ============================================================
// arsrakning.js - Årsräknings-funktionalitet
// Sökväg: js/modules/arsrakning/arsrakning.js
// ============================================================

import {
  getCaseInsensitive,
  safe,
  formatCurrency,
  formatDate,
  getRadioValue,
  setRadioValue,
} from "../utils/helpers.js";

// ============================================================
// SÄTT PERIOD-DATUM
// ============================================================

/**
 * Sätter start- och slutdatum för årsräkningsperioden.
 * Standard: 1 jan - 31 dec föregående år
 */
export function setPeriodDatesForArsrakningTab() {
  const now = new Date();
  const lastYear = now.getFullYear() - 1;

  const startDateInput = document.getElementById("periodStart_ars");
  const slutDateInput = document.getElementById("periodSlut_ars");

  if (startDateInput && !startDateInput.value) {
    startDateInput.value = `${lastYear}-01-01`;
  }

  if (slutDateInput && !slutDateInput.value) {
    slutDateInput.value = `${lastYear}-12-31`;
  }

  console.log(`[Årsräkning] Period satt: ${lastYear}-01-01 till ${lastYear}-12-31`);
}

// ============================================================
// VISA PERSONINFO
// ============================================================

/**
 * Visar huvudmannens personuppgifter i årsräkningsfliken.
 */
export function displayPersonInfoForArsrakning() {
  const container = document.getElementById("arsPersonInfoDisplay");
  if (!container) return;

  const hm = window.currentHuvudmanFullData?.huvudmanDetails;

  if (!hm) {
    container.innerHTML = '<p class="muted">Ingen huvudman vald. Välj en huvudman från listan ovan.</p>';
    return;
  }

  const fornamn = getCaseInsensitive(hm, "FORNAMN", "Fornamn") || "";
  const efternamn = getCaseInsensitive(hm, "EFTERNAMN", "Efternamn") || "";
  const pnr = getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer") || "";
  const adress = getCaseInsensitive(hm, "ADRESS", "Adress") || "";
  const postnummer = getCaseInsensitive(hm, "POSTNUMMER", "Postnummer") || "";
  const ort = getCaseInsensitive(hm, "ORT", "Ort") || "";

  container.innerHTML = `
    <div class="person-info-card">
      <h4>${safe(fornamn)} ${safe(efternamn)}</h4>
      <p><strong>Personnummer:</strong> ${safe(pnr)}</p>
      <p><strong>Adress:</strong> ${safe(adress)}, ${safe(postnummer)} ${safe(ort)}</p>
    </div>
  `;
}

// ============================================================
// LADDA ÅRSRÄKNINGSDATA
// ============================================================

/**
 * Laddar all årsräkningsdata för en huvudman och ett specifikt år.
 * @param {string} pnr - Personnummer
 * @param {number} year - Årtal
 */
export async function loadArsrakningData(pnr, year) {
  if (!pnr || !year) {
    console.warn("[Årsräkning] Saknar pnr eller år.");
    return;
  }

  console.log(`[Årsräkning] Laddar data för ${pnr}, år ${year}...`);

  try {
    const url = `/api/get_arsrakning.php?pnr=${encodeURIComponent(pnr)}&ar=${year}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log("[Årsräkning] Data laddad:", data);

    // Spara globalt
    window.currentArsrakningData = data;

    // Fyll alla sektioner
    populateInbetalningar(data.inbetalningar || []);
    populateUtbetalningar(data.utbetalningar || []);
    populateBankkonton(data.bankkonton || []);
    populateSkulder(data.skulder || []);
    populateOvrigaTillgangar(data.ovrigaTillgangar || []);

    // Beräkna sammanfattning
    calculateArsrakningSummary();

    return data;
  } catch (error) {
    console.error("[Årsräkning] Fel vid laddning:", error);
    alert("Kunde inte ladda årsräkningsdata: " + error.message);
  }
}

// ============================================================
// INBETALNINGAR
// ============================================================

/**
 * Fyller inbetalningslistan.
 * @param {array} inbetalningar - Array med inbetalningar
 */
function populateInbetalningar(inbetalningar) {
  const container = document.getElementById("inbetalningarContainer");
  if (!container) return;

  container.innerHTML = "";

  if (inbetalningar.length === 0) {
    container.innerHTML = '<p class="muted">Inga inbetalningar registrerade.</p>';
    return;
  }

  inbetalningar.forEach((inbet, index) => {
    const row = createInbetalningRow(inbet, index + 1);
    container.appendChild(row);
  });

  console.log(`[Årsräkning] ${inbetalningar.length} inbetalningar laddade.`);
}

/**
 * Skapar en rad för en inbetalning.
 * @param {object} data - Inbetalningsdata
 * @param {number} radNr - Radnummer
 * @returns {HTMLElement}
 */
function createInbetalningRow(data = {}, radNr = null) {
  const div = document.createElement("div");
  div.className = "dynamic-list-item inbetalning-rad";

  const belopp = data.Belopp !== null && data.Belopp !== undefined ? parseFloat(data.Belopp).toFixed(2) : "";

  div.innerHTML = `
    <label style="min-width:40px;">Rad ${radNr || "Ny"}:</label>
    <input type="date" class="datum" data-field="Datum" value="${data.Datum || ""}">
    <input type="text" class="beskrivning" data-field="Beskrivning" placeholder="Beskrivning" value="${safe(
      data.Beskrivning
    )}">
    <input type="number" step="0.01" class="belopp" data-field="Belopp" placeholder="Belopp (Kr)" value="${belopp}">
    <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${safe(data.BilagaRef)}">
    <button type="button" class="small danger" onclick="this.parentElement.remove(); calculateArsrakningSummary();">Ta bort</button>
  `;

  // Lägg till event listener för att uppdatera sammanfattning
  const inputs = div.querySelectorAll("input");
  inputs.forEach(input => {
    input.addEventListener("input", () => calculateArsrakningSummary());
  });

  return div;
}

/**
 * Lägger till en ny inbetalningsrad.
 */
export function addInbetalningRow() {
  const container = document.getElementById("inbetalningarContainer");
  if (!container) return;

  const currentRows = container.querySelectorAll(".inbetalning-rad").length;
  const newRow = createInbetalningRow({}, currentRows + 1);
  container.appendChild(newRow);

  // Uppdatera radnummer
  renumberRows(container, ".inbetalning-rad");
}

// ============================================================
// UTBETALNINGAR
// ============================================================

/**
 * Fyller utbetalningslistan.
 * @param {array} utbetalningar - Array med utbetalningar
 */
function populateUtbetalningar(utbetalningar) {
  const container = document.getElementById("utbetalningarContainer");
  if (!container) return;

  container.innerHTML = "";

  if (utbetalningar.length === 0) {
    container.innerHTML = '<p class="muted">Inga utbetalningar registrerade.</p>';
    return;
  }

  utbetalningar.forEach((utbet, index) => {
    const row = createUtbetalningRow(utbet, index + 1);
    container.appendChild(row);
  });

  console.log(`[Årsräkning] ${utbetalningar.length} utbetalningar laddade.`);
}

/**
 * Skapar en rad för en utbetalning.
 * @param {object} data - Utbetalningsdata
 * @param {number} radNr - Radnummer
 * @returns {HTMLElement}
 */
function createUtbetalningRow(data = {}, radNr = null) {
  const div = document.createElement("div");
  div.className = "dynamic-list-item utbetalning-rad";

  const belopp = data.Belopp !== null && data.Belopp !== undefined ? parseFloat(data.Belopp).toFixed(2) : "";

  div.innerHTML = `
    <label style="min-width:40px;">Rad ${radNr || "Ny"}:</label>
    <input type="date" class="datum" data-field="Datum" value="${data.Datum || ""}">
    <select class="kategori" data-field="Kategori">
      <option value="">-- Välj kategori --</option>
      <option value="Boende" ${data.Kategori === "Boende" ? "selected" : ""}>Boende</option>
      <option value="Mat" ${data.Kategori === "Mat" ? "selected" : ""}>Mat</option>
      <option value="Kläder" ${data.Kategori === "Kläder" ? "selected" : ""}>Kläder</option>
      <option value="Hälsa" ${data.Kategori === "Hälsa" ? "selected" : ""}>Hälsa</option>
      <option value="Transport" ${data.Kategori === "Transport" ? "selected" : ""}>Transport</option>
      <option value="Fritid" ${data.Kategori === "Fritid" ? "selected" : ""}>Fritid</option>
      <option value="Övrigt" ${data.Kategori === "Övrigt" ? "selected" : ""}>Övrigt</option>
    </select>
    <input type="text" class="beskrivning" data-field="Beskrivning" placeholder="Beskrivning" value="${safe(
      data.Beskrivning
    )}">
    <input type="number" step="0.01" class="belopp" data-field="Belopp" placeholder="Belopp (Kr)" value="${belopp}">
    <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${safe(data.BilagaRef)}">
    <button type="button" class="small danger" onclick="this.parentElement.remove(); calculateArsrakningSummary();">Ta bort</button>
  `;

  // Lägg till event listener för att uppdatera sammanfattning
  const inputs = div.querySelectorAll("input, select");
  inputs.forEach(input => {
    input.addEventListener("input", () => calculateArsrakningSummary());
    input.addEventListener("change", () => calculateArsrakningSummary());
  });

  return div;
}

/**
 * Lägger till en ny utbetalningsrad.
 */
export function addUtbetalningRow() {
  const container = document.getElementById("utbetalningarContainer");
  if (!container) return;

  const currentRows = container.querySelectorAll(".utbetalning-rad").length;
  const newRow = createUtbetalningRow({}, currentRows + 1);
  container.appendChild(newRow);

  // Uppdatera radnummer
  renumberRows(container, ".utbetalning-rad");
}

// ============================================================
// BANKKONTON
// ============================================================

/**
 * Fyller bankkontolistan.
 * @param {array} bankkonton - Array med bankkonton
 */
function populateBankkonton(bankkonton) {
  const startContainer = document.getElementById("hmBankkontonStartContainer");
  const slutContainer = document.getElementById("hmBankkontonSlutContainer");

  if (!startContainer || !slutContainer) return;

  startContainer.innerHTML = "";
  slutContainer.innerHTML = "";

  if (bankkonton.length === 0) {
    startContainer.innerHTML = '<p class="muted">Inga bankkonton registrerade.</p>';
    slutContainer.innerHTML = '<p class="muted">Inga bankkonton registrerade.</p>';
    return;
  }

  bankkonton.forEach((konto, index) => {
    const startRow = createBankkontoRow(
      "BankkontoStart",
      {
        RadNr: index + 1,
        Beskrivning: konto.Beskrivning || "",
        Kronor: konto.SaldoStart || null,
        BilagaRef: konto.BilagaRef || "",
        OFnot: konto.OFnot || "",
      },
      konto.isRakningskonto,
      konto.pairId
    );

    const slutRow = createBankkontoRow(
      "BankkontoSlut",
      {
        RadNr: index + 1,
        Beskrivning: konto.Beskrivning || "",
        Kronor: konto.SaldoSlut || null,
        BilagaRef: konto.BilagaRef || "",
        OFnot: konto.OFnot || "",
      },
      konto.isRakningskonto,
      konto.pairId
    );

    startContainer.appendChild(startRow);
    slutContainer.appendChild(slutRow);
  });

  console.log(`[Årsräkning] ${bankkonton.length} bankkonton laddade.`);
}

/**
 * Skapar en bankkontorad.
 * @param {string} typePrefix - "BankkontoStart" eller "BankkontoSlut"
 * @param {object} data - Kontodata
 * @param {boolean} isRakningskonto - Om det är räkningskonto
 * @param {string} pairId - Par-ID för synkning
 * @returns {HTMLElement}
 */
export function createBankkontoRow(typePrefix, data = {}, isRakningskonto = false, pairId = null) {
  const div = document.createElement("div");
  div.className = "dynamic-list-item bankkonto-rad";

  if (isRakningskonto) {
    div.dataset.isRakningskonto = "true";
  }

  if (pairId) {
    div.dataset.pairId = pairId;
  }

  const kronorValue = data.Kronor !== null && data.Kronor !== undefined ? parseFloat(data.Kronor).toFixed(2) : "";

  const label = isRakningskonto ? `Rad ${data.RadNr || 1} (Räkning):` : `Rad ${data.RadNr || "Ny"}:`;

  div.innerHTML = `
    <label style="min-width:80px;">${label}</label>
    <input type="text" class="beskrivning" data-field="Beskrivning" placeholder="Konto/Bank" value="${safe(
      data.Beskrivning
    )}" ${isRakningskonto ? "readonly" : ""}>
    <input type="number" step="0.01" class="kronor" data-field="Kronor" placeholder="Saldo (Kr)" value="${kronorValue}">
    <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${safe(data.BilagaRef)}">
    <input type="text" class="ofnot" data-field="OFnot" placeholder="ÖF not." value="${safe(data.OFnot)}">
    ${
      !isRakningskonto
        ? '<button type="button" class="small danger" onclick="removeBankkontoPair(this)">Ta bort</button>'
        : ""
    }
  `;

  // Synka beskrivning mellan start och slut om det är ett par
  if (typePrefix === "BankkontoStart" && pairId && !isRakningskonto) {
    const beskrivningInput = div.querySelector('input[data-field="Beskrivning"]');
    if (beskrivningInput) {
      beskrivningInput.addEventListener("input", e => {
        const slutRow = document.querySelector(
          `#hmBankkontonSlutContainer .dynamic-list-item[data-pair-id="${pairId}"]`
        );
        if (slutRow) {
          const slutInput = slutRow.querySelector('input[data-field="Beskrivning"]');
          if (slutInput) {
            slutInput.value = e.target.value;
          }
        }
      });
    }
  }

  return div;
}

/**
 * Lägger till ett nytt bankkontopar.
 * @param {string} periodType - "Start" eller "Slut"
 * @param {string} containerId - Container-ID
 */
export function addBankkontoRow(periodType, containerId) {
  console.log(`[addBankkontoRow] Anropad för periodType: '${periodType}', containerId: '${containerId}'`);

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[addBankkontoRow] Container '${containerId}' not found.`);
    return;
  }

  // Räkna befintliga rader
  let nextRadNr = 1;
  container.querySelectorAll(".dynamic-list-item").forEach(item => {
    if (item.dataset.isRakningskonto !== "true") {
      nextRadNr++;
    }
  });

  if (container.querySelector('.dynamic-list-item[data-is-rakningskonto="true"]') && nextRadNr === 1) {
    nextRadNr = 2;
  }

  const rowTypePrefix = containerId.includes("Start") ? "BankkontoStart" : "BankkontoSlut";

  if (rowTypePrefix === "BankkontoStart") {
    const newPairId = `bkpair-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    console.log(`[addBankkontoRow] Nytt pairId: ${newPairId}`);

    // Skapa START-rad
    const startRadData = {
      RadNr: nextRadNr,
      Beskrivning: "",
      Kronor: null,
      BilagaRef: "",
      OFnot: "",
    };
    const newStartRow = createBankkontoRow("BankkontoStart", startRadData, false, newPairId);
    container.appendChild(newStartRow);

    // Skapa SLUT-rad
    const slutContainer = document.getElementById("hmBankkontonSlutContainer");
    if (slutContainer) {
      let slutNextRadNr = 1;
      slutContainer.querySelectorAll(".dynamic-list-item").forEach(item => {
        if (item.dataset.isRakningskonto !== "true") {
          slutNextRadNr++;
        }
      });

      if (slutContainer.querySelector('.dynamic-list-item[data-is-rakningskonto="true"]') && slutNextRadNr === 1) {
        slutNextRadNr = 2;
      }

      const slutRadData = {
        RadNr: slutNextRadNr,
        Beskrivning: "",
        Kronor: null,
        BilagaRef: "",
        OFnot: "",
      };
      const newSlutRow = createBankkontoRow("BankkontoSlut", slutRadData, false, newPairId);
      slutContainer.appendChild(newSlutRow);
    }
  } else {
    // Fristående SLUT-rad
    const slutRadData = {
      RadNr: nextRadNr,
      Beskrivning: "",
      Kronor: null,
      BilagaRef: "",
      OFnot: "",
    };
    const newSlutRow = createBankkontoRow("BankkontoSlut", slutRadData, false, null);
    container.appendChild(newSlutRow);
  }

  // Uppdatera radnummer
  renumberRows(document.getElementById("hmBankkontonStartContainer"), ".bankkonto-rad", true);
  renumberRows(document.getElementById("hmBankkontonSlutContainer"), ".bankkonto-rad", true);
}

// ============================================================
// SKULDER
// ============================================================

/**
 * Fyller skuldlistan.
 * @param {array} skulder - Array med skulder
 */
function populateSkulder(skulder) {
  const container = document.getElementById("hmSkulderContainer");
  if (!container) return;

  container.innerHTML = "";

  if (skulder.length === 0) {
    container.innerHTML = '<p class="muted">Inga skulder registrerade.</p>';
    return;
  }

  skulder.forEach((skuld, index) => {
    const row = createSkuldRow("Skuld", {
      RadNr: index + 1,
      Langivare: skuld.Langivare || "",
      BilagaRef: skuld.BilagaRef || "",
      StartBelopp: skuld.StartBelopp || null,
      SlutBelopp: skuld.SlutBelopp || null,
    });
    container.appendChild(row);
  });

  console.log(`[Årsräkning] ${skulder.length} skulder laddade.`);
}

/**
 * Skapar en skuldrad.
 * @param {string} typePrefix - "Skuld"
 * @param {object} data - Skulddata
 * @returns {HTMLElement}
 */
export function createSkuldRow(typePrefix, data = {}) {
  const div = document.createElement("div");
  div.className = "dynamic-list-item skuld-rad";

  const startBelopp =
    data.StartBelopp !== null && data.StartBelopp !== undefined ? parseFloat(data.StartBelopp).toFixed(2) : "";

  const slutBelopp =
    data.SlutBelopp !== null && data.SlutBelopp !== undefined ? parseFloat(data.SlutBelopp).toFixed(2) : "";

  div.innerHTML = `
    <label style="min-width:40px;">Rad ${data.RadNr || "Ny"}:</label>
    <input type="text" class="langivare" data-field="Langivare" placeholder="Långivare" value="${safe(data.Langivare)}">
    <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${safe(data.BilagaRef)}">
    <input type="number" step="0.01" class="belopp" data-field="StartBelopp" placeholder="Belopp Start (Kr)" value="${startBelopp}">
    <input type="number" step="0.01" class="belopp" data-field="SlutBelopp" placeholder="Belopp Slut (Kr)" value="${slutBelopp}">
    <button type="button" class="small danger" onclick="this.parentElement.remove()">Ta bort</button>
  `;

  return div;
}

/**
 * Lägger till en ny skuldrad.
 * @param {string} containerId - Container-ID
 */
export function addSkuldRow(containerId = "hmSkulderContainer") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found for addSkuldRow`);
    return;
  }

  const nextRadNr = container.querySelectorAll(".skuld-rad").length + 1;
  const newRow = createSkuldRow("Skuld", { RadNr: nextRadNr });
  container.appendChild(newRow);
}

// ============================================================
// ÖVRIGA TILLGÅNGAR
// ============================================================

/**
 * Fyller listan med övriga tillgångar.
 * @param {array} tillgangar - Array med tillgångar
 */
function populateOvrigaTillgangar(tillgangar) {
  const startContainer = document.getElementById("hmOvrigaTillgangarStartContainer");
  const slutContainer = document.getElementById("hmOvrigaTillgangarSlutContainer");

  if (!startContainer || !slutContainer) return;

  startContainer.innerHTML = "";
  slutContainer.innerHTML = "";

  if (tillgangar.length === 0) {
    startContainer.innerHTML = '<p class="muted">Inga övriga tillgångar registrerade.</p>';
    slutContainer.innerHTML = '<p class="muted">Inga övriga tillgångar registrerade.</p>';
    return;
  }

  tillgangar.forEach((tillgang, index) => {
    const startRow = createOvrigTillgangRow(
      "TillgangStart",
      {
        RadNr: index + 1,
        Beskrivning: tillgang.Beskrivning || "",
        Andelar: tillgang.Andelar || "",
        Kronor: tillgang.VardeStart || null,
        BilagaRef: tillgang.BilagaRef || "",
        OFnot: tillgang.OFnot || "",
      },
      tillgang.pairId
    );

    const slutRow = createOvrigTillgangRow(
      "TillgangSlut",
      {
        RadNr: index + 1,
        Beskrivning: tillgang.Beskrivning || "",
        Andelar: tillgang.Andelar || "",
        Kronor: tillgang.VardeSlut || null,
        BilagaRef: tillgang.BilagaRef || "",
        OFnot: tillgang.OFnot || "",
      },
      tillgang.pairId
    );

    startContainer.appendChild(startRow);
    slutContainer.appendChild(slutRow);
  });

  console.log(`[Årsräkning] ${tillgangar.length} övriga tillgångar laddade.`);
}

/**
 * Skapar en rad för övrig tillgång.
 * @param {string} typePrefix - "TillgangStart" eller "TillgangSlut"
 * @param {object} data - Tillgångsdata
 * @param {string} pairId - Par-ID
 * @returns {HTMLElement}
 */
export function createOvrigTillgangRow(typePrefix, data = {}, pairId = null) {
  const div = document.createElement("div");
  div.className = "dynamic-list-item ovrig-tillgang-rad";

  if (pairId) {
    div.dataset.pairId = pairId;
  }

  const kronorValue = data.Kronor !== null && data.Kronor !== undefined ? parseFloat(data.Kronor).toFixed(2) : "";

  div.innerHTML = `
    <label style="min-width:40px;">Rad ${data.RadNr || "Ny"}:</label>
    <input type="text" class="beskrivning" data-field="Beskrivning" placeholder="Typ av tillgång" value="${safe(
      data.Beskrivning
    )}">
    <input type="text" class="andelar" data-field="Andelar" placeholder="Andelar/Antal" value="${safe(data.Andelar)}">
    <input type="number" step="0.01" class="kronor" data-field="Kronor" placeholder="Värde (Kr)" value="${kronorValue}">
    <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${safe(data.BilagaRef)}">
    <input type="text" class="ofnot" data-field="OFnot" placeholder="ÖF not." value="${safe(data.OFnot)}">
    <button type="button" class="small danger" onclick="removeOvrigTillgangPair(this)">Ta bort</button>
  `;

  // Synka vissa fält mellan start och slut
  if (typePrefix === "TillgangStart" && pairId) {
    const fieldsToSync = ["Beskrivning", "Andelar", "BilagaRef", "OFnot"];
    fieldsToSync.forEach(fieldName => {
      const inputElement = div.querySelector(`input[data-field="${fieldName}"]`);
      if (inputElement) {
        inputElement.addEventListener("input", event => {
          const sourceValue = event.target.value;
          const slutRadElement = document.querySelector(
            `#hmOvrigaTillgangarSlutContainer .dynamic-list-item[data-pair-id="${pairId}"]`
          );
          if (slutRadElement) {
            const targetSlutInput = slutRadElement.querySelector(`input[data-field="${fieldName}"]`);
            if (targetSlutInput) {
              targetSlutInput.value = sourceValue;
            }
          }
        });
      }
    });
  }

  return div;
}

/**
 * Lägger till ett nytt tillgångspar.
 * @param {string} periodType - "Start" eller "Slut"
 * @param {string} containerId - Container-ID
 */
export function addOvrigTillgangRow(periodType, containerId) {
  console.log(`[addOvrigTillgangRow] Anropad för periodType: '${periodType}', containerId: '${containerId}'`);

  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[addOvrigTillgangRow] Container '${containerId}' not found.`);
    return;
  }

  const nextRadNr = container.querySelectorAll(".dynamic-list-item").length + 1;
  const rowTypePrefix = containerId.includes("Start") ? "TillgangStart" : "TillgangSlut";

  if (rowTypePrefix === "TillgangStart") {
    const newPairId = `pair-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    console.log(`[addOvrigTillgangRow] Nytt pairId: ${newPairId}`);
    // Skapa START-rad
    const startRadData = {
      RadNr: nextRadNr,
      Beskrivning: "",
      Andelar: "",
      Kronor: null,
      BilagaRef: "",
      OFnot: "",
    };
    const newStartRow = createOvrigTillgangRow("TillgangStart", startRadData, newPairId);
    container.appendChild(newStartRow);

    // Skapa SLUT-rad
    const slutContainer = document.getElementById("hmOvrigaTillgangarSlutContainer");
    if (slutContainer) {
      const nextRadNrInSlutContainer = slutContainer.querySelectorAll(".dynamic-list-item").length + 1;
      const slutRadData = {
        RadNr: nextRadNrInSlutContainer,
        Beskrivning: "",
        Andelar: "",
        Kronor: null,
        BilagaRef: "",
        OFnot: "",
      };
      const newSlutRow = createOvrigTillgangRow("TillgangSlut", slutRadData, newPairId);
      slutContainer.appendChild(newSlutRow);
      console.log(`[addOvrigTillgangRow] Motsvarande SLUT-rad tillagd med pairId: ${newPairId}.`);
    }
  } else {
    // Fristående SLUT-rad
    const slutRadData = {
      RadNr: nextRadNr,
      Beskrivning: "",
      Andelar: "",
      Kronor: null,
      BilagaRef: "",
      OFnot: "",
    };
    const newSlutRow = createOvrigTillgangRow("TillgangSlut", slutRadData, null);
    container.appendChild(newSlutRow);
  }

  // Uppdatera radnummer
  renumberRows(document.getElementById("hmOvrigaTillgangarStartContainer"), ".ovrig-tillgang-rad");
  renumberRows(document.getElementById("hmOvrigaTillgangarSlutContainer"), ".ovrig-tillgang-rad");
}

// ============================================================
// TA BORT PAR-RADER
// ============================================================

/**
 * Tar bort ett bankkontopar.
 * @param {HTMLElement} buttonElement - Knappen som klickades
 */
export function removeBankkontoPair(buttonElement) {
  const rowToRemove = buttonElement.parentElement;
  if (!rowToRemove) return;

  // Räkningskonto ska aldrig kunna tas bort
  if (rowToRemove.dataset.isRakningskonto === "true") {
    console.warn("[removeBankkontoPair] Försök att ta bort räkningskonto. Ignoreras.");
    return;
  }

  const pairId = rowToRemove.dataset.pairId;
  console.log(`[removeBankkontoPair] Tar bort pairId: ${pairId}`);

  rowToRemove.remove();

  if (pairId) {
    const otherRowStart = document.querySelector(
      `#hmBankkontonStartContainer .dynamic-list-item[data-pair-id="${pairId}"]`
    );
    const otherRowSlut = document.querySelector(
      `#hmBankkontonSlutContainer .dynamic-list-item[data-pair-id="${pairId}"]`
    );

    if (otherRowStart) otherRowStart.remove();
    if (otherRowSlut) otherRowSlut.remove();
  }

  // Uppdatera radnummer
  renumberRows(document.getElementById("hmBankkontonStartContainer"), ".bankkonto-rad", true);
  renumberRows(document.getElementById("hmBankkontonSlutContainer"), ".bankkonto-rad", true);

  // Uppdatera sammanfattning
  calculateArsrakningSummary();
}

/**
 * Tar bort ett tillgångspar.
 * @param {HTMLElement} buttonElement - Knappen som klickades
 */
export function removeOvrigTillgangPair(buttonElement) {
  const rowToRemove = buttonElement.closest(".dynamic-list-item");
  if (!rowToRemove) {
    console.warn("[removeOvrigTillgangPair] Kunde inte hitta raden att ta bort.");
    return;
  }

  const pairId = rowToRemove.dataset.pairId;
  console.log(`[removeOvrigTillgangPair] Tar bort pairId: ${pairId}`);

  rowToRemove.remove();

  if (pairId) {
    const otherRowStart = document.querySelector(
      `#hmOvrigaTillgangarStartContainer .dynamic-list-item[data-pair-id="${pairId}"]`
    );
    const otherRowSlut = document.querySelector(
      `#hmOvrigaTillgangarSlutContainer .dynamic-list-item[data-pair-id="${pairId}"]`
    );

    if (otherRowStart) otherRowStart.remove();
    if (otherRowSlut) otherRowSlut.remove();
  }

  // Uppdatera radnummer
  renumberRows(document.getElementById("hmOvrigaTillgangarStartContainer"), ".ovrig-tillgang-rad");
  renumberRows(document.getElementById("hmOvrigaTillgangarSlutContainer"), ".ovrig-tillgang-rad");

  // Uppdatera sammanfattning
  calculateArsrakningSummary();
}

// ============================================================
// HJÄLPFUNKTIONER
// ============================================================

/**
 * Numrerar om rader i en container.
 * @param {HTMLElement} container - Container-element
 * @param {string} selector - CSS-selector för rader
 * @param {boolean} isBankkontoList - Om det är bankkontolista
 */
function renumberRows(container, selector, isBankkontoList = false) {
  if (!container) return;

  let currentRadNr = 1;
  const rows = Array.from(container.querySelectorAll(selector));

  if (isBankkontoList) {
    // Sortera så räkningskonto kommer först
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

// ============================================================
// BERÄKNA SAMMANFATTNING
// ============================================================

/**
 * Beräknar och visar sammanfattning av årsräkningen.
 */
export function calculateArsrakningSummary() {
  // Samla alla inbetalningar
  let totalInbetalningar = 0;
  document.querySelectorAll("#inbetalningarContainer .inbetalning-rad").forEach(row => {
    const beloppInput = row.querySelector('input[data-field="Belopp"]');
    if (beloppInput && beloppInput.value) {
      const belopp = parseFloat(beloppInput.value);
      if (!isNaN(belopp)) {
        totalInbetalningar += belopp;
      }
    }
  });

  // Samla alla utbetalningar
  let totalUtbetalningar = 0;
  document.querySelectorAll("#utbetalningarContainer .utbetalning-rad").forEach(row => {
    const beloppInput = row.querySelector('input[data-field="Belopp"]');
    if (beloppInput && beloppInput.value) {
      const belopp = parseFloat(beloppInput.value);
      if (!isNaN(belopp)) {
        totalUtbetalningar += belopp;
      }
    }
  });

  // Samla bankkonton start
  let totalBankStart = 0;
  document.querySelectorAll("#hmBankkontonStartContainer .bankkonto-rad").forEach(row => {
    const kronorInput = row.querySelector('input[data-field="Kronor"]');
    if (kronorInput && kronorInput.value) {
      const kronor = parseFloat(kronorInput.value);
      if (!isNaN(kronor)) {
        totalBankStart += kronor;
      }
    }
  });

  // Samla bankkonton slut
  let totalBankSlut = 0;
  document.querySelectorAll("#hmBankkontonSlutContainer .bankkonto-rad").forEach(row => {
    const kronorInput = row.querySelector('input[data-field="Kronor"]');
    if (kronorInput && kronorInput.value) {
      const kronor = parseFloat(kronorInput.value);
      if (!isNaN(kronor)) {
        totalBankSlut += kronor;
      }
    }
  });

  // Samla skulder start
  let totalSkulderStart = 0;
  document.querySelectorAll("#hmSkulderContainer .skuld-rad").forEach(row => {
    const startInput = row.querySelector('input[data-field="StartBelopp"]');
    if (startInput && startInput.value) {
      const belopp = parseFloat(startInput.value);
      if (!isNaN(belopp)) {
        totalSkulderStart += belopp;
      }
    }
  });

  // Samla skulder slut
  let totalSkulderSlut = 0;
  document.querySelectorAll("#hmSkulderContainer .skuld-rad").forEach(row => {
    const slutInput = row.querySelector('input[data-field="SlutBelopp"]');
    if (slutInput && slutInput.value) {
      const belopp = parseFloat(slutInput.value);
      if (!isNaN(belopp)) {
        totalSkulderSlut += belopp;
      }
    }
  });

  // Samla övriga tillgångar start
  let totalTillgangarStart = 0;
  document.querySelectorAll("#hmOvrigaTillgangarStartContainer .ovrig-tillgang-rad").forEach(row => {
    const kronorInput = row.querySelector('input[data-field="Kronor"]');
    if (kronorInput && kronorInput.value) {
      const kronor = parseFloat(kronorInput.value);
      if (!isNaN(kronor)) {
        totalTillgangarStart += kronor;
      }
    }
  });

  // Samla övriga tillgångar slut
  let totalTillgangarSlut = 0;
  document.querySelectorAll("#hmOvrigaTillgangarSlutContainer .ovrig-tillgang-rad").forEach(row => {
    const kronorInput = row.querySelector('input[data-field="Kronor"]');
    if (kronorInput && kronorInput.value) {
      const kronor = parseFloat(kronorInput.value);
      if (!isNaN(kronor)) {
        totalTillgangarSlut += kronor;
      }
    }
  });

  // Beräkna nettoresultat
  const nettoResultat = totalInbetalningar - totalUtbetalningar;

  // Beräkna förmögenhet start
  const formogenhetStart = totalBankStart + totalTillgangarStart - totalSkulderStart;

  // Beräkna förmögenhet slut
  const formogenhetSlut = totalBankSlut + totalTillgangarSlut - totalSkulderSlut;

  // Beräkna förändring
  const formogenhetForandring = formogenhetSlut - formogenhetStart;

  // Visa resultat
  const summaryContainer = document.getElementById("arsrakningSummary");
  if (summaryContainer) {
    summaryContainer.innerHTML = `
      <div class="summary-box">
        <h3>Sammanfattning</h3>
        <div class="summary-grid">
          <div class="summary-section">
            <h4>Kassaflöde</h4>
            <p><strong>Totala inbetalningar:</strong> ${formatCurrency(totalInbetalningar)}</p>
            <p><strong>Totala utbetalningar:</strong> ${formatCurrency(totalUtbetalningar)}</p>
            <p class="${nettoResultat >= 0 ? "positive" : "negative"}">
              <strong>Nettoresultat:</strong> ${formatCurrency(nettoResultat)}
            </p>
          </div>
          
          <div class="summary-section">
            <h4>Tillgångar</h4>
            <p><strong>Bankkonton start:</strong> ${formatCurrency(totalBankStart)}</p>
            <p><strong>Bankkonton slut:</strong> ${formatCurrency(totalBankSlut)}</p>
            <p><strong>Övriga tillgångar start:</strong> ${formatCurrency(totalTillgangarStart)}</p>
            <p><strong>Övriga tillgångar slut:</strong> ${formatCurrency(totalTillgangarSlut)}</p>
          </div>
          
          <div class="summary-section">
            <h4>Skulder</h4>
            <p><strong>Skulder start:</strong> ${formatCurrency(totalSkulderStart)}</p>
            <p><strong>Skulder slut:</strong> ${formatCurrency(totalSkulderSlut)}</p>
          </div>
          
          <div class="summary-section highlight">
            <h4>Förmögenhet</h4>
            <p><strong>Vid periodens start:</strong> ${formatCurrency(formogenhetStart)}</p>
            <p><strong>Vid periodens slut:</strong> ${formatCurrency(formogenhetSlut)}</p>
            <p class="${formogenhetForandring >= 0 ? "positive" : "negative"}">
              <strong>Förändring:</strong> ${formatCurrency(formogenhetForandring)}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  console.log("[Årsräkning] Sammanfattning uppdaterad");
}

// ============================================================
// SPARA ÅRSRÄKNING
// ============================================================

/**
 * Sparar all årsräkningsdata.
 */
export async function saveArsrakningData() {
  const pnr = window.currentHuvudmanFullData?.huvudmanDetails?.Personnummer;
  if (!pnr) {
    alert("Ingen huvudman vald.");
    return;
  }

  const yearInput = document.getElementById("periodStart_ars");
  const year = yearInput?.value ? new Date(yearInput.value).getFullYear() : new Date().getFullYear();

  // Samla all data
  const data = {
    inbetalningar: collectRowData("#inbetalningarContainer", ".inbetalning-rad"),
    utbetalningar: collectRowData("#utbetalningarContainer", ".utbetalning-rad"),
    bankkonton: collectBankkontoData(),
    skulder: collectRowData("#hmSkulderContainer", ".skuld-rad"),
    ovrigaTillgangar: collectOvrigTillgangData(),
  };

  console.log("[Årsräkning] Sparar data:", data);

  try {
    const response = await fetch(`/api/save_arsrakning.php?pnr=${encodeURIComponent(pnr)}&ar=${year}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Kunde inte spara årsräkningen.");
    }

    alert("Årsräkningen har sparats!");
    console.log("[Årsräkning] Sparat:", result);
  } catch (error) {
    console.error("[Årsräkning] Fel vid sparande:", error);
    alert("Kunde inte spara årsräkningen: " + error.message);
  }
}

/**
 * Samlar raddata från en container.
 * @param {string} containerSelector - Container-selector
 * @param {string} rowSelector - Rad-selector
 * @returns {array}
 */
function collectRowData(containerSelector, rowSelector) {
  const rows = [];
  const container = document.querySelector(containerSelector);
  if (!container) return rows;

  container.querySelectorAll(rowSelector).forEach(row => {
    const rowData = {};
    row.querySelectorAll("[data-field]").forEach(input => {
      const field = input.dataset.field;
      rowData[field] = input.value || null;
    });
    rows.push(rowData);
  });

  return rows;
}

/**
 * Samlar bankkontodata (både start och slut).
 * @returns {array}
 */
function collectBankkontoData() {
  const bankkonton = [];
  const startRows = document.querySelectorAll("#hmBankkontonStartContainer .bankkonto-rad");

  startRows.forEach((startRow, index) => {
    const pairId = startRow.dataset.pairId;
    const isRakningskonto = startRow.dataset.isRakningskonto === "true";

    const beskrivning = startRow.querySelector('[data-field="Beskrivning"]')?.value || "";
    const saldoStart = parseFloat(startRow.querySelector('[data-field="Kronor"]')?.value) || null;
    const bilagaRef = startRow.querySelector('[data-field="BilagaRef"]')?.value || "";
    const ofnot = startRow.querySelector('[data-field="OFnot"]')?.value || "";

    // Hitta motsvarande slutrad
    const slutRow = pairId
      ? document.querySelector(`#hmBankkontonSlutContainer .bankkonto-rad[data-pair-id="${pairId}"]`)
      : document.querySelectorAll("#hmBankkontonSlutContainer .bankkonto-rad")[index];

    const saldoSlut = slutRow ? parseFloat(slutRow.querySelector('[data-field="Kronor"]')?.value) || null : null;

    bankkonton.push({
      Beskrivning: beskrivning,
      SaldoStart: saldoStart,
      SaldoSlut: saldoSlut,
      BilagaRef: bilagaRef,
      OFnot: ofnot,
      isRakningskonto: isRakningskonto,
      pairId: pairId,
    });
  });

  return bankkonton;
}

/**
 * Samlar övrig tillgångsdata (både start och slut).
 * @returns {array}
 */
function collectOvrigTillgangData() {
  const tillgangar = [];
  const startRows = document.querySelectorAll("#hmOvrigaTillgangarStartContainer .ovrig-tillgang-rad");

  startRows.forEach((startRow, index) => {
    const pairId = startRow.dataset.pairId;

    const beskrivning = startRow.querySelector('[data-field="Beskrivning"]')?.value || "";
    const andelar = startRow.querySelector('[data-field="Andelar"]')?.value || "";
    const vardeStart = parseFloat(startRow.querySelector('[data-field="Kronor"]')?.value) || null;
    const bilagaRef = startRow.querySelector('[data-field="BilagaRef"]')?.value || "";
    const ofnot = startRow.querySelector('[data-field="OFnot"]')?.value || "";

    // Hitta motsvarande slutrad
    const slutRow = pairId
      ? document.querySelector(`#hmOvrigaTillgangarSlutContainer .ovrig-tillgang-rad[data-pair-id="${pairId}"]`)
      : document.querySelectorAll("#hmOvrigaTillgangarSlutContainer .ovrig-tillgang-rad")[index];

    const vardeSlut = slutRow ? parseFloat(slutRow.querySelector('[data-field="Kronor"]')?.value) || null : null;

    tillgangar.push({
      Beskrivning: beskrivning,
      Andelar: andelar,
      VardeStart: vardeStart,
      VardeSlut: vardeSlut,
      BilagaRef: bilagaRef,
      OFnot: ofnot,
      pairId: pairId,
    });
  });

  return tillgangar;
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.setPeriodDatesForArsrakningTab = setPeriodDatesForArsrakningTab;
window.displayPersonInfoForArsrakning = displayPersonInfoForArsrakning;
window.loadArsrakningData = loadArsrakningData;
window.addInbetalningRow = addInbetalningRow;
window.addUtbetalningRow = addUtbetalningRow;
window.addBankkontoRow = addBankkontoRow;
window.createBankkontoRow = createBankkontoRow;
window.removeBankkontoPair = removeBankkontoPair;
window.addSkuldRow = addSkuldRow;
window.createSkuldRow = createSkuldRow;
window.addOvrigTillgangRow = addOvrigTillgangRow;
window.createOvrigTillgangRow = createOvrigTillgangRow;
window.removeOvrigTillgangPair = removeOvrigTillgangPair;
window.calculateArsrakningSummary = calculateArsrakningSummary;
window.saveArsrakningData = saveArsrakningData;
