// ============================================================
// calculations.js - Beräkningar för årsräkning
// Sökväg: js/modules/arsrakning/calculations.js
// ============================================================

import { formatCurrency, getCaseInsensitive } from "../utils/helpers.js";

// ============================================================
// KASSAFLÖDESBERÄKNINGAR
// ============================================================

/**
 * Beräknar totala inbetalningar från formuläret.
 * @returns {number}
 */
export function calculateTotalInbetalningar() {
  let total = 0;
  const container = document.getElementById("inbetalningarContainer");

  if (!container) return total;

  container.querySelectorAll(".inbetalning-rad").forEach(row => {
    const beloppInput = row.querySelector('input[data-field="Belopp"]');
    if (beloppInput && beloppInput.value) {
      const belopp = parseFloat(beloppInput.value);
      if (!isNaN(belopp)) {
        total += belopp;
      }
    }
  });

  return total;
}

/**
 * Beräknar totala utbetalningar från formuläret.
 * @returns {number}
 */
export function calculateTotalUtbetalningar() {
  let total = 0;
  const container = document.getElementById("utbetalningarContainer");

  if (!container) return total;

  container.querySelectorAll(".utbetalning-rad").forEach(row => {
    const beloppInput = row.querySelector('input[data-field="Belopp"]');
    if (beloppInput && beloppInput.value) {
      const belopp = parseFloat(beloppInput.value);
      if (!isNaN(belopp)) {
        total += belopp;
      }
    }
  });

  return total;
}

/**
 * Beräknar nettokassaflöde (inbetalningar - utbetalningar).
 * @returns {number}
 */
export function calculateNettokassaflode() {
  return calculateTotalInbetalningar() - calculateTotalUtbetalningar();
}

// ============================================================
// BANKKONTO-BERÄKNINGAR
// ============================================================

/**
 * Beräknar totalt saldo för bankkonton vid periodens start.
 * @returns {number}
 */
export function calculateTotalBankStart() {
  let total = 0;
  const container = document.getElementById("hmBankkontonStartContainer");

  if (!container) return total;

  container.querySelectorAll(".bankkonto-rad").forEach(row => {
    const kronorInput = row.querySelector('input[data-field="Kronor"]');
    if (kronorInput && kronorInput.value) {
      const kronor = parseFloat(kronorInput.value);
      if (!isNaN(kronor)) {
        total += kronor;
      }
    }
  });

  return total;
}

/**
 * Beräknar totalt saldo för bankkonton vid periodens slut.
 * @returns {number}
 */
export function calculateTotalBankSlut() {
  let total = 0;
  const container = document.getElementById("hmBankkontonSlutContainer");

  if (!container) return total;

  container.querySelectorAll(".bankkonto-rad").forEach(row => {
    const kronorInput = row.querySelector('input[data-field="Kronor"]');
    if (kronorInput && kronorInput.value) {
      const kronor = parseFloat(kronorInput.value);
      if (!isNaN(kronor)) {
        total += kronor;
      }
    }
  });

  return total;
}

/**
 * Beräknar förändring i banksaldo under perioden.
 * @returns {number}
 */
export function calculateBankForandring() {
  return calculateTotalBankSlut() - calculateTotalBankStart();
}

// ============================================================
// SKULD-BERÄKNINGAR
// ============================================================

/**
 * Beräknar totala skulder vid periodens start.
 * @returns {number}
 */
export function calculateTotalSkulderStart() {
  let total = 0;
  const container = document.getElementById("hmSkulderContainer");

  if (!container) return total;

  container.querySelectorAll(".skuld-rad").forEach(row => {
    const startInput = row.querySelector('input[data-field="StartBelopp"]');
    if (startInput && startInput.value) {
      const belopp = parseFloat(startInput.value);
      if (!isNaN(belopp)) {
        total += belopp;
      }
    }
  });

  return total;
}

/**
 * Beräknar totala skulder vid periodens slut.
 * @returns {number}
 */
export function calculateTotalSkulderSlut() {
  let total = 0;
  const container = document.getElementById("hmSkulderContainer");

  if (!container) return total;

  container.querySelectorAll(".skuld-rad").forEach(row => {
    const slutInput = row.querySelector('input[data-field="SlutBelopp"]');
    if (slutInput && slutInput.value) {
      const belopp = parseFloat(slutInput.value);
      if (!isNaN(belopp)) {
        total += belopp;
      }
    }
  });

  return total;
}

/**
 * Beräknar förändring i skulder under perioden.
 * @returns {number}
 */
export function calculateSkulderForandring() {
  return calculateTotalSkulderSlut() - calculateTotalSkulderStart();
}

// ============================================================
// ÖVRIGA TILLGÅNGAR - BERÄKNINGAR
// ============================================================

/**
 * Beräknar totalt värde för övriga tillgångar vid periodens start.
 * @returns {number}
 */
export function calculateTotalTillgangarStart() {
  let total = 0;
  const container = document.getElementById("hmOvrigaTillgangarStartContainer");

  if (!container) return total;

  container.querySelectorAll(".ovrig-tillgang-rad").forEach(row => {
    const kronorInput = row.querySelector('input[data-field="Kronor"]');
    if (kronorInput && kronorInput.value) {
      const kronor = parseFloat(kronorInput.value);
      if (!isNaN(kronor)) {
        total += kronor;
      }
    }
  });

  return total;
}

/**
 * Beräknar totalt värde för övriga tillgångar vid periodens slut.
 * @returns {number}
 */
export function calculateTotalTillgangarSlut() {
  let total = 0;
  const container = document.getElementById("hmOvrigaTillgangarSlutContainer");

  if (!container) return total;

  container.querySelectorAll(".ovrig-tillgang-rad").forEach(row => {
    const kronorInput = row.querySelector('input[data-field="Kronor"]');
    if (kronorInput && kronorInput.value) {
      const kronor = parseFloat(kronorInput.value);
      if (!isNaN(kronor)) {
        total += kronor;
      }
    }
  });

  return total;
}

/**
 * Beräknar förändring i övriga tillgångar under perioden.
 * @returns {number}
 */
export function calculateTillgangarForandring() {
  return calculateTotalTillgangarSlut() - calculateTotalTillgangarStart();
}

// ============================================================
// FÖRMÖGENHETSBERÄKNINGAR
// ============================================================

/**
 * Beräknar total förmögenhet vid periodens start.
 * Förmögenhet = Bankkonton + Övriga tillgångar - Skulder
 * @returns {number}
 */
export function calculateFormogenhetStart() {
  const bankkonton = calculateTotalBankStart();
  const tillgangar = calculateTotalTillgangarStart();
  const skulder = calculateTotalSkulderStart();

  return bankkonton + tillgangar - skulder;
}

/**
 * Beräknar total förmögenhet vid periodens slut.
 * Förmögenhet = Bankkonton + Övriga tillgångar - Skulder
 * @returns {number}
 */
export function calculateFormogenhetSlut() {
  const bankkonton = calculateTotalBankSlut();
  const tillgangar = calculateTotalTillgangarSlut();
  const skulder = calculateTotalSkulderSlut();

  return bankkonton + tillgangar - skulder;
}

/**
 * Beräknar förändring i förmögenhet under perioden.
 * @returns {number}
 */
export function calculateFormogenhetForandring() {
  return calculateFormogenhetSlut() - calculateFormogenhetStart();
}

// ============================================================
// AVSTÄMNING OCH KONTROLL
// ============================================================

/**
 * Kontrollerar om kassaflödet stämmer med förändringen i banksaldo.
 * I en perfekt bokföring bör nettokassaflöde = förändring i banksaldo.
 * @returns {object} - { match: boolean, difference: number, message: string }
 */
export function avstamKassaflode() {
  const nettokassaflode = calculateNettokassaflode();
  const bankForandring = calculateBankForandring();
  const difference = Math.abs(nettokassaflode - bankForandring);

  const match = difference < 0.01; // Tolerans på 1 öre för avrundningar

  let message = "";
  if (match) {
    message = "Kassaflödet stämmer med förändringen i banksaldo. ✓";
  } else {
    message = `Avvikelse upptäckt: Kassaflödet skiljer sig från bankförändringen med ${formatCurrency(difference)}.`;
  }

  return {
    match,
    difference,
    nettokassaflode,
    bankForandring,
    message,
  };
}

/**
 * Kontrollerar om förmögenhetsförändringen är logisk.
 * Förmögenhetsförändring bör ungefär motsvara nettokassaflödet (med justering för värdeförändringar).
 * @returns {object} - { reasonable: boolean, difference: number, message: string }
 */
export function avstamFormogenhet() {
  const formogenhetForandring = calculateFormogenhetForandring();
  const nettokassaflode = calculateNettokassaflode();
  const vardeforandringar =
    calculateTillgangarForandring() - (calculateTotalTillgangarSlut() - calculateTotalTillgangarStart() - 0); // Placeholder för faktiska värdeförändringar

  // I en enkel modell: Förmögenhetsförändring ≈ Nettokassaflöde + Värdeförändringar
  const forvantatForandring = nettokassaflode;
  const difference = Math.abs(formogenhetForandring - forvantatForandring);

  const reasonable = difference < 1000; // Tolerans på 1000 kr

  let message = "";
  if (reasonable) {
    message = "Förmögenhetsförändringen verkar rimlig. ✓";
  } else {
    message = `Möjlig avvikelse: Förmögenhetsförändringen skiljer sig från förväntat värde med ${formatCurrency(
      difference
    )}.`;
  }

  return {
    reasonable,
    difference,
    formogenhetForandring,
    forvantatForandring,
    message,
  };
}

// ============================================================
// NYCKELTAL OCH ANALYS
// ============================================================

/**
 * Beräknar sparkvot (hur stor andel av inkomsterna som sparas).
 * Sparkvot = (Nettokassaflöde / Totala inbetalningar) * 100
 * @returns {number} - Procent
 */
export function calculateSparkvot() {
  const nettokassaflode = calculateNettokassaflode();
  const totalInbetalningar = calculateTotalInbetalningar();

  if (totalInbetalningar === 0) return 0;

  return (nettokassaflode / totalInbetalningar) * 100;
}

/**
 * Beräknar skuldkvot (skulder i förhållande till tillgångar).
 * Skuldkvot = (Skulder / Tillgångar) * 100
 * @returns {number} - Procent
 */
export function calculateSkuldkvot() {
  const skulder = calculateTotalSkulderSlut();
  const tillgangar = calculateTotalBankSlut() + calculateTotalTillgangarSlut();

  if (tillgangar === 0) return 0;

  return (skulder / tillgangar) * 100;
}

/**
 * Beräknar likviditet (banktillgångar i förhållande till skulder).
 * Likviditet = Bankkonton / Skulder
 * @returns {number} - Kvot (t.ex. 2.5 = 250% täckning)
 */
export function calculateLikviditet() {
  const bankkonton = calculateTotalBankSlut();
  const skulder = calculateTotalSkulderSlut();

  if (skulder === 0) return bankkonton > 0 ? Infinity : 0;

  return bankkonton / skulder;
}

/**
 * Analyserar ekonomisk hälsa baserat på nyckeltal.
 * @returns {object} - { status: string, warnings: array, recommendations: array }
 */
export function analyzeEconomicHealth() {
  const analysis = {
    status: "God",
    warnings: [],
    recommendations: [],
  };

  const nettokassaflode = calculateNettokassaflode();
  const sparkvot = calculateSparkvot();
  const skuldkvot = calculateSkuldkvot();
  const likviditet = calculateLikviditet();
  const formogenhet = calculateFormogenhetSlut();

  // Analysera nettokassaflöde
  if (nettokassaflode < 0) {
    analysis.warnings.push("Negativt kassaflöde: Utgifterna överstiger inkomsterna.");
    analysis.recommendations.push("Granska utbetalningar och identifiera potentiella besparingar.");
    analysis.status = "Varning";
  }

  // Analysera sparkvot
  if (sparkvot < 0) {
    analysis.warnings.push(`Negativ sparkvot: ${sparkvot.toFixed(1)}%`);
  } else if (sparkvot > 20) {
    analysis.recommendations.push(
      `Bra sparkvot: ${sparkvot.toFixed(1)}%. Överväg att avsätta medel för framtida behov.`
    );
  }

  // Analysera skuldkvot
  if (skuldkvot > 50) {
    analysis.warnings.push(`Hög skuldkvot: ${skuldkvot.toFixed(1)}%`);
    analysis.recommendations.push("Överväg att minska skulderna eller öka tillgångarna.");
    if (analysis.status === "God") analysis.status = "Varning";
  }

  // Analysera likviditet
  if (likviditet < 1) {
    analysis.warnings.push(`Låg likviditet: ${likviditet.toFixed(2)}. Banktillgångarna täcker inte skulderna.`);
    analysis.recommendations.push("Se till att det finns tillräckligt med likvida medel för att täcka skulder.");
    analysis.status = "Kritisk";
  } else if (likviditet > 3) {
    analysis.recommendations.push(`Hög likviditet: ${likviditet.toFixed(2)}. Överväg att investera överskottsmedel.`);
  }

  // Analysera förmögenhet
  if (formogenhet < 0) {
    analysis.warnings.push("Negativ förmögenhet: Skulderna överstiger tillgångarna.");
    analysis.status = "Kritisk";
  }

  return analysis;
}

// ============================================================
// SAMMANFATTNING OCH RAPPORTERING
// ============================================================

/**
 * Skapar en komplett finansiell sammanfattning.
 * @returns {object} - Objekt med all finansiell data
 */
export function createFinancialSummary() {
  return {
    kassaflode: {
      inbetalningar: calculateTotalInbetalningar(),
      utbetalningar: calculateTotalUtbetalningar(),
      netto: calculateNettokassaflode(),
    },
    bankkonton: {
      start: calculateTotalBankStart(),
      slut: calculateTotalBankSlut(),
      forandring: calculateBankForandring(),
    },
    skulder: {
      start: calculateTotalSkulderStart(),
      slut: calculateTotalSkulderSlut(),
      forandring: calculateSkulderForandring(),
    },
    ovrigaTillgangar: {
      start: calculateTotalTillgangarStart(),
      slut: calculateTotalTillgangarSlut(),
      forandring: calculateTillgangarForandring(),
    },
    formogenhet: {
      start: calculateFormogenhetStart(),
      slut: calculateFormogenhetSlut(),
      forandring: calculateFormogenhetForandring(),
    },
    nyckeltal: {
      sparkvot: calculateSparkvot(),
      skuldkvot: calculateSkuldkvot(),
      likviditet: calculateLikviditet(),
    },
    avstamning: {
      kassaflode: avstamKassaflode(),
      formogenhet: avstamFormogenhet(),
    },
    analys: analyzeEconomicHealth(),
  };
}

/**
 * Visar den finansiella sammanfattningen i gränssnittet.
 * @param {string} containerId - ID på container-elementet
 */
export function displayFinancialSummary(containerId = "arsrakningSummary") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[Calculations] Container '${containerId}' hittades inte.`);
    return;
  }

  const summary = createFinancialSummary();

  container.innerHTML = `
    <div class="financial-summary">
      <h3>Finansiell Sammanfattning</h3>
      
      <!-- Kassaflöde -->
      <div class="summary-section">
        <h4><i class="fas fa-exchange-alt"></i> Kassaflöde</h4>
        <div class="summary-grid">
          <div class="summary-item positive">
            <span class="label">Inbetalningar:</span>
            <span class="value">${formatCurrency(summary.kassaflode.inbetalningar)}</span>
          </div>
          <div class="summary-item negative">
            <span class="label">Utbetalningar:</span>
            <span class="value">${formatCurrency(summary.kassaflode.utbetalningar)}</span>
          </div>
          <div class="summary-item ${summary.kassaflode.netto >= 0 ? "positive" : "negative"}">
            <span class="label">Nettokassaflöde:</span>
            <span class="value">${formatCurrency(summary.kassaflode.netto)}</span>
          </div>
        </div>
      </div>
      
      <!-- Bankkonton -->
      <div class="summary-section">
        <h4><i class="fas fa-university"></i> Bankkonton</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Saldo vid periodens start:</span>
            <span class="value">${formatCurrency(summary.bankkonton.start)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Saldo vid periodens slut:</span>
            <span class="value">${formatCurrency(summary.bankkonton.slut)}</span>
          </div>
          <div class="summary-item ${summary.bankkonton.forandring >= 0 ? "positive" : "negative"}">
            <span class="label">Förändring:</span>
            <span class="value">${formatCurrency(summary.bankkonton.forandring)}</span>
          </div>
        </div>
      </div>
      
      <!-- Skulder -->
      <div class="summary-section">
        <h4><i class="fas fa-credit-card"></i> Skulder</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Skulder vid start:</span>
            <span class="value">${formatCurrency(summary.skulder.start)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Skulder vid slut:</span>
            <span class="value">${formatCurrency(summary.skulder.slut)}</span>
          </div>
          <div class="summary-item ${summary.skulder.forandring <= 0 ? "positive" : "negative"}">
            <span class="label">Förändring:</span>
            <span class="value">${formatCurrency(summary.skulder.forandring)}</span>
          </div>
        </div>
      </div>
      
      <!-- Övriga tillgångar -->
      <div class="summary-section">
        <h4><i class="fas fa-coins"></i> Övriga Tillgångar</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Värde vid start:</span>
            <span class="value">${formatCurrency(summary.ovrigaTillgangar.start)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Värde vid slut:</span>
            <span class="value">${formatCurrency(summary.ovrigaTillgangar.slut)}</span>
          </div>
          <div class="summary-item ${summary.ovrigaTillgangar.forandring >= 0 ? "positive" : "negative"}">
            <span class="label">Förändring:</span>
            <span class="value">${formatCurrency(summary.ovrigaTillgangar.forandring)}</span>
          </div>
        </div>
      </div>
      
      <!-- Förmögenhet -->
      <div class="summary-section highlight">
        <h4><i class="fas fa-chart-line"></i> Förmögenhet</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Vid periodens start:</span>
            <span class="value">${formatCurrency(summary.formogenhet.start)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Vid periodens slut:</span>
            <span class="value">${formatCurrency(summary.formogenhet.slut)}</span>
          </div>
          <div class="summary-item ${summary.formogenhet.forandring >= 0 ? "positive" : "negative"}">
            <span class="label">Förändring:</span>
            <span class="value">${formatCurrency(summary.formogenhet.forandring)}</span>
          </div>
        </div>
      </div>
      
      <!-- Nyckeltal -->
      <div class="summary-section">
        <h4><i class="fas fa-chart-pie"></i> Nyckeltal</h4>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Sparkvot:</span>
            <span class="value">${summary.nyckeltal.sparkvot.toFixed(1)}%</span>
          </div>
          <div class="summary-item">
            <span class="label">Skuldkvot:</span>
            <span class="value">${summary.nyckeltal.skuldkvot.toFixed(1)}%</span>
          </div>
          <div class="summary-item">
            <span class="label">Likviditet:</span>
            <span class="value">${
              summary.nyckeltal.likviditet === Infinity ? "∞" : summary.nyckeltal.likviditet.toFixed(2)
            }</span>
          </div>
        </div>
      </div>
      
      <!-- Avstämning -->
      <div class="summary-section ${summary.avstamning.kassaflode.match ? "success" : "warning"}">
        <h4><i class="fas fa-check-circle"></i> Avstämning</h4>
        <p>${summary.avstamning.kassaflode.message}</p>
        ${
          !summary.avstamning.kassaflode.match
            ? `
          <p class="detail">Nettokassaflöde: ${formatCurrency(summary.avstamning.kassaflode.nettokassaflode)}</p>
          <p class="detail">Bankförändring: ${formatCurrency(summary.avstamning.kassaflode.bankForandring)}</p>
        `
            : ""
        }
      </div>
      
      <!-- Analys -->
      <div class="summary-section ${
        summary.analys.status === "God" ? "success" : summary.analys.status === "Varning" ? "warning" : "error"
      }">
        <h4><i class="fas fa-heartbeat"></i> Ekonomisk Hälsa: ${summary.analys.status}</h4>
        ${
          summary.analys.warnings.length > 0
            ? `
          <div class="warnings">
            <strong>Varningar:</strong>
            <ul>
              ${summary.analys.warnings.map(w => `<li>${w}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }
        ${
          summary.analys.recommendations.length > 0
            ? `
          <div class="recommendations">
            <strong>Rekommendationer:</strong>
            <ul>
              ${summary.analys.recommendations.map(r => `<li>${r}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.calculateTotalInbetalningar = calculateTotalInbetalningar;
window.calculateTotalUtbetalningar = calculateTotalUtbetalningar;
window.calculateNettokassaflode = calculateNettokassaflode;
window.calculateTotalBankStart = calculateTotalBankStart;
window.calculateTotalBankSlut = calculateTotalBankSlut;
window.calculateBankForandring = calculateBankForandring;
window.calculateTotalSkulderStart = calculateTotalSkulderStart;
window.calculateTotalSkulderSlut = calculateTotalSkulderSlut;
window.calculateSkulderForandring = calculateSkulderForandring;
window.calculateTotalTillgangarStart = calculateTotalTillgangarStart;
window.calculateTotalTillgangarSlut = calculateTotalTillgangarSlut;
window.calculateTillgangarForandring = calculateTillgangarForandring;
window.calculateFormogenhetStart = calculateFormogenhetStart;
window.calculateFormogenhetSlut = calculateFormogenhetSlut;
window.calculateFormogenhetForandring = calculateFormogenhetForandring;
window.avstamKassaflode = avstamKassaflode;
window.avstamFormogenhet = avstamFormogenhet;
window.calculateSparkvot = calculateSparkvot;
window.calculateSkuldkvot = calculateSkuldkvot;
window.calculateLikviditet = calculateLikviditet;
window.analyzeEconomicHealth = analyzeEconomicHealth;
window.createFinancialSummary = createFinancialSummary;
window.displayFinancialSummary = displayFinancialSummary;
