// ============================================================
// forsorjningsstod.js - Försörjningsstöd-hantering
// Sökväg: js/modules/forsorjningsstod/forsorjningsstod.js
// ============================================================

import { getCaseInsensitive, safe, formatCurrency, formatDate } from "../utils/helpers.js";

import { forsorjningsstodApi } from "../../api.js";

// ============================================================
// NORMER FÖR FÖRSÖRJNINGSSTÖD (2025)
// ============================================================

const NORMER_2025 = {
  // Riksnorm (månadbelopp)
  riksnorm: {
    vuxen_ensamstaende: 4560,
    vuxen_sammanboende: 4080,
    barn_0_3: 2440,
    barn_4_6: 2710,
    barn_7_10: 3270,
    barn_11_14: 3640,
    barn_15_18: 4040,
    barn_19_20: 3700,
  },

  // Boendekostnad - skälig boendekostnad varierar per kommun
  boende: {
    // Dessa är exempel-värden, bör anpassas per kommun
    stockholm: {
      ensamstaende: 6200,
      tva_personer: 7600,
      varje_ytterligare: 1600,
    },
    goteborg: {
      ensamstaende: 5400,
      tva_personer: 6800,
      varje_ytterligare: 1400,
    },
    malmo: {
      ensamstaende: 5000,
      tva_personer: 6400,
      varje_ytterligare: 1300,
    },
    ovriga: {
      ensamstaende: 4200,
      tva_personer: 5600,
      varje_ytterligare: 1200,
    },
  },

  // Hushållsel
  hushallsel: {
    ensamstaende: 350,
    tva_eller_fler: 525,
  },

  // Hemförsäkring
  hemforsakring: 150,

  // Arbetsresor (vid pågående arbete/studier)
  arbetsresor: 700,

  // Fackförening
  fackforening: 250,

  // Dagstidning
  dagstidning: 200,

  // Telefon/Internet
  telefon_internet: 300,

  // TV-licens (blev skattefritt 2019, men finns med för äldre fall)
  tv_licens: 0,
};

// ============================================================
// INITIALISERING
// ============================================================

/**
 * Initierar försörjningsstöd-formuläret.
 */
export function initForsorjningsstod() {
  console.log("[Försörjningsstöd] Initierar...");

  if (!window.currentHuvudmanFullData || !window.currentHuvudmanFullData.huvudmanDetails) {
    console.warn("[Försörjningsstöd] Ingen huvudman vald.");
    return;
  }

  // Sätt aktuell månad och år
  const now = new Date();
  setInputValue("forsorjAr", now.getFullYear());
  setInputValue("forsorjManad", now.getMonth() + 1);

  // Fyll personuppgifter
  displayPersonInfoForForsorj();

  // Sätt upp event listeners
  setupForsorjEventListeners();

  // Ladda befintlig data om den finns
  loadForsorjData();

  console.log("[Försörjningsstöd] Initierad.");
}

/**
 * Visar huvudmannens personuppgifter.
 */
function displayPersonInfoForForsorj() {
  const hm = window.currentHuvudmanFullData?.huvudmanDetails;
  if (!hm) return;

  const container = document.getElementById("forsorjPersonInfo");
  if (!container) return;

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
// EVENT LISTENERS
// ============================================================

/**
 * Sätter upp event listeners för formuläret.
 */
function setupForsorjEventListeners() {
  // Automatisk beräkning vid ändringar
  const autoCalcFields = [
    "forsorjAntalVuxna",
    "forsorjAntalBarn",
    "forsorjBarnAldrar",
    "forsorjSammanboende",
    "forsorjBoendekostnad",
    "forsorjHushallsel",
    "forsorjHemforsakring",
    "forsorjInkomstLon",
    "forsorjInkomstPension",
    "forsorjInkomstBidrag",
    "forsorjInkomstOvrigt",
  ];

  autoCalcFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener("input", () => calculateForsorjningsstod());
      field.addEventListener("change", () => calculateForsorjningsstod());
    }
  });

  // Kommun-val påverkar boendekostnadsnorm
  const kommunSelect = document.getElementById("forsorjKommun");
  if (kommunSelect) {
    kommunSelect.addEventListener("change", () => {
      updateBoendekostnadNorm();
      calculateForsorjningsstod();
    });
  }

  console.log("[Försörjningsstöd] Event listeners konfigurerade.");
}

// ============================================================
// BERÄKNING
// ============================================================

/**
 * Beräknar försörjningsstöd baserat på formuläret.
 */
export function calculateForsorjningsstod() {
  console.log("[Försörjningsstöd] Beräknar...");

  // Hämta grunddata
  const antalVuxna = parseInt(getInputValue("forsorjAntalVuxna")) || 1;
  const antalBarn = parseInt(getInputValue("forsorjAntalBarn")) || 0;
  const barnAldrar = getInputValue("forsorjBarnAldrar");
  const sammanboende = getCheckboxValue("forsorjSammanboende");

  // Hämta kostnader
  const boendekostnad = parseFloat(getInputValue("forsorjBoendekostnad")) || 0;
  const hushallsel = parseFloat(getInputValue("forsorjHushallsel")) || 0;
  const hemforsakring = parseFloat(getInputValue("forsorjHemforsakring")) || 0;
  const arbetsresor = parseFloat(getInputValue("forsorjArbetsresor")) || 0;
  const fackforening = parseFloat(getInputValue("forsorjFackforening")) || 0;
  const dagstidning = parseFloat(getInputValue("forsorjDagstidning")) || 0;
  const telefonInternet = parseFloat(getInputValue("forsorjTelefonInternet")) || 0;
  const ovrigaKostnader = parseFloat(getInputValue("forsorjOvrigaKostnader")) || 0;

  // Hämta inkomster
  const inkomstLon = parseFloat(getInputValue("forsorjInkomstLon")) || 0;
  const inkomstPension = parseFloat(getInputValue("forsorjInkomstPension")) || 0;
  const inkomstBidrag = parseFloat(getInputValue("forsorjInkomstBidrag")) || 0;
  const inkomstOvrigt = parseFloat(getInputValue("forsorjInkomstOvrigt")) || 0;

  // Beräkna riksnorm
  let riksnorm = 0;

  // Vuxna
  if (sammanboende && antalVuxna >= 2) {
    riksnorm += NORMER_2025.riksnorm.vuxen_sammanboende * antalVuxna;
  } else {
    riksnorm += NORMER_2025.riksnorm.vuxen_ensamstaende;
    if (antalVuxna > 1) {
      riksnorm += NORMER_2025.riksnorm.vuxen_sammanboende * (antalVuxna - 1);
    }
  }

  // Barn
  if (antalBarn > 0 && barnAldrar) {
    const aldrar = barnAldrar
      .split(",")
      .map(a => parseInt(a.trim()))
      .filter(a => !isNaN(a));
    aldrar.forEach(alder => {
      if (alder >= 0 && alder <= 3) {
        riksnorm += NORMER_2025.riksnorm.barn_0_3;
      } else if (alder >= 4 && alder <= 6) {
        riksnorm += NORMER_2025.riksnorm.barn_4_6;
      } else if (alder >= 7 && alder <= 10) {
        riksnorm += NORMER_2025.riksnorm.barn_7_10;
      } else if (alder >= 11 && alder <= 14) {
        riksnorm += NORMER_2025.riksnorm.barn_11_14;
      } else if (alder >= 15 && alder <= 18) {
        riksnorm += NORMER_2025.riksnorm.barn_15_18;
      } else if (alder >= 19 && alder <= 20) {
        riksnorm += NORMER_2025.riksnorm.barn_19_20;
      }
    });
  }

  // Beräkna skälig boendekostnad
  const skaligBoendekostnad = calculateSkaligBoendekostnad(antalVuxna + antalBarn);

  // Totala godkända kostnader
  const godkandaKostnader =
    riksnorm +
    Math.min(boendekostnad, skaligBoendekostnad) + // Ta det lägsta av faktisk och skälig
    hushallsel +
    hemforsakring +
    arbetsresor +
    fackforening +
    dagstidning +
    telefonInternet +
    ovrigaKostnader;

  // Totala inkomster
  const totalaInkomster = inkomstLon + inkomstPension + inkomstBidrag + inkomstOvrigt;

  // Beräknat försörjningsstöd
  const beraknatStod = Math.max(0, godkandaKostnader - totalaInkomster);

  // Visa resultat
  displayForsorjResult({
    riksnorm,
    skaligBoendekostnad,
    faktiskBoendekostnad: boendekostnad,
    godkandBoendekostnad: Math.min(boendekostnad, skaligBoendekostnad),
    ovrigaGodkandaKostnader:
      hushallsel + hemforsakring + arbetsresor + fackforening + dagstidning + telefonInternet + ovrigaKostnader,
    godkandaKostnader,
    totalaInkomster,
    beraknatStod,
  });

  console.log("[Försörjningsstöd] Beräkning klar:", { beraknatStod });
}

/**
 * Beräknar skälig boendekostnad baserat på kommun och antal personer.
 * @param {number} antalPersoner - Antal personer i hushållet
 * @returns {number}
 */
function calculateSkaligBoendekostnad(antalPersoner) {
  const kommun = getInputValue("forsorjKommun") || "ovriga";
  const boendekostnadNorm = NORMER_2025.boende[kommun] || NORMER_2025.boende.ovriga;

  if (antalPersoner === 1) {
    return boendekostnadNorm.ensamstaende;
  } else if (antalPersoner === 2) {
    return boendekostnadNorm.tva_personer;
  } else {
    return boendekostnadNorm.tva_personer + boendekostnadNorm.varje_ytterligare * (antalPersoner - 2);
  }
}

/**
 * Uppdaterar boendekostnadsnorm-förslag när kommun ändras.
 */
function updateBoendekostnadNorm() {
  const antalPersoner =
    (parseInt(getInputValue("forsorjAntalVuxna")) || 1) + (parseInt(getInputValue("forsorjAntalBarn")) || 0);

  const skaligBoendekostnad = calculateSkaligBoendekostnad(antalPersoner);

  const normDisplay = document.getElementById("boendekostnadNormDisplay");
  if (normDisplay) {
    normDisplay.textContent = `Skälig boendekostnad: ${formatCurrency(skaligBoendekostnad)}`;
  }
}

/**
 * Visar beräkningsresultat.
 * @param {object} result - Resultatobjekt
 */
function displayForsorjResult(result) {
  const container = document.getElementById("forsorjResultContainer");
  if (!container) return;

  const boendekostnadInfo =
    result.faktiskBoendekostnad > result.skaligBoendekostnad
      ? `<p class="warning-text"><i class="fas fa-exclamation-triangle"></i> 
       Faktisk boendekostnad (${formatCurrency(result.faktiskBoendekostnad)}) 
       överstiger skälig kostnad (${formatCurrency(result.skaligBoendekostnad)}). 
       Endast den skäliga kostnaden godkänns.</p>`
      : "";

  container.innerHTML = `
    <div class="forsorj-result">
      <h3>Beräknat Försörjningsstöd</h3>
      
      <div class="result-section">
        <h4>Godkända kostnader</h4>
        <div class="result-grid">
          <div class="result-item">
            <span class="label">Riksnorm:</span>
            <span class="value">${formatCurrency(result.riksnorm)}</span>
          </div>
          <div class="result-item">
            <span class="label">Boendekostnad (godkänd):</span>
            <span class="value">${formatCurrency(result.godkandBoendekostnad)}</span>
          </div>
          <div class="result-item">
            <span class="label">Övriga kostnader:</span>
            <span class="value">${formatCurrency(result.ovrigaGodkandaKostnader)}</span>
          </div>
          <div class="result-item highlight">
            <span class="label"><strong>Totala godkända kostnader:</strong></span>
            <span class="value"><strong>${formatCurrency(result.godkandaKostnader)}</strong></span>
          </div>
        </div>
        ${boendekostnadInfo}
      </div>
      
      <div class="result-section">
        <h4>Inkomster</h4>
        <div class="result-grid">
          <div class="result-item">
            <span class="label">Totala inkomster:</span>
            <span class="value">${formatCurrency(result.totalaInkomster)}</span>
          </div>
        </div>
      </div>
      
      <div class="result-section total ${result.beraknatStod > 0 ? "positive" : "neutral"}">
        <h4>Beräknat försörjningsstöd</h4>
        <p class="total-amount"><strong>${formatCurrency(result.beraknatStod)}</strong> per månad</p>
        ${result.beraknatStod === 0 ? '<p class="info-text">Inkomsterna täcker de godkända kostnaderna.</p>' : ""}
      </div>
      
      <div class="result-actions">
        <button type="button" class="primary" onclick="saveForsorjningsstod()">
          <i class="fas fa-save"></i> Spara beräkning
        </button>
        <button type="button" class="secondary" onclick="exportForsorjToPdf()">
          <i class="fas fa-file-pdf"></i> Exportera till PDF
        </button>
      </div>
    </div>
  `;
}

// ============================================================
// SPARA OCH LADDA DATA
// ============================================================

/**
 * Sparar försörjningsstöd-beräkningen.
 */
export async function saveForsorjningsstod() {
  console.log("[Försörjningsstöd] Sparar...");

  const hm = window.currentHuvudmanFullData?.huvudmanDetails;
  if (!hm) {
    alert("Ingen huvudman vald.");
    return;
  }

  const pnr = getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer");
  const year = parseInt(getInputValue("forsorjAr")) || new Date().getFullYear();
  const month = parseInt(getInputValue("forsorjManad")) || new Date().getMonth() + 1;

  // Samla all data
  const data = {
    antalVuxna: parseInt(getInputValue("forsorjAntalVuxna")) || 1,
    antalBarn: parseInt(getInputValue("forsorjAntalBarn")) || 0,
    barnAldrar: getInputValue("forsorjBarnAldrar"),
    sammanboende: getCheckboxValue("forsorjSammanboende"),
    kommun: getInputValue("forsorjKommun"),

    // Kostnader
    boendekostnad: parseFloat(getInputValue("forsorjBoendekostnad")) || 0,
    hushallsel: parseFloat(getInputValue("forsorjHushallsel")) || 0,
    hemforsakring: parseFloat(getInputValue("forsorjHemforsakring")) || 0,
    arbetsresor: parseFloat(getInputValue("forsorjArbetsresor")) || 0,
    fackforening: parseFloat(getInputValue("forsorjFackforening")) || 0,
    dagstidning: parseFloat(getInputValue("forsorjDagstidning")) || 0,
    telefonInternet: parseFloat(getInputValue("forsorjTelefonInternet")) || 0,
    ovrigaKostnader: parseFloat(getInputValue("forsorjOvrigaKostnader")) || 0,

    // Inkomster
    inkomstLon: parseFloat(getInputValue("forsorjInkomstLon")) || 0,
    inkomstPension: parseFloat(getInputValue("forsorjInkomstPension")) || 0,
    inkomstBidrag: parseFloat(getInputValue("forsorjInkomstBidrag")) || 0,
    inkomstOvrigt: parseFloat(getInputValue("forsorjInkomstOvrigt")) || 0,

    // Kommentarer
    kommentar: getInputValue("forsorjKommentar"),

    sparadDatum: new Date().toISOString(),
  };

  try {
    const result = await forsorjningsstodApi.save(pnr, year, month, data);

    if (result.success) {
      alert("Försörjningsstöd-beräkningen har sparats!");
      console.log("[Försörjningsstöd] Sparat:", result);
    } else {
      throw new Error(result.error || "Kunde inte spara.");
    }
  } catch (error) {
    console.error("[Försörjningsstöd] Fel vid sparande:", error);
    alert("Kunde inte spara försörjningsstöd-beräkningen: " + error.message);
  }
}

/**
 * Laddar försörjningsstöd-data för vald månad.
 */
export async function loadForsorjData() {
  console.log("[Försörjningsstöd] Laddar data...");

  const hm = window.currentHuvudmanFullData?.huvudmanDetails;
  if (!hm) return;

  const pnr = getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer");
  const year = parseInt(getInputValue("forsorjAr")) || new Date().getFullYear();
  const month = parseInt(getInputValue("forsorjManad")) || new Date().getMonth() + 1;

  try {
    const data = await forsorjningsstodApi.get(pnr, year, month);

    if (data && data.success && data.data) {
      populateForsorjForm(data.data);
      calculateForsorjningsstod();
      console.log("[Försörjningsstöd] Data laddad:", data.data);
    } else {
      console.log("[Försörjningsstöd] Ingen sparad data för denna period.");
    }
  } catch (error) {
    console.error("[Försörjningsstöd] Fel vid laddning:", error);
  }
}

/**
 * Fyller formuläret med sparad data.
 * @param {object} data - Försörjningsstöd-data
 */
function populateForsorjForm(data) {
  setInputValue("forsorjAntalVuxna", data.antalVuxna);
  setInputValue("forsorjAntalBarn", data.antalBarn);
  setInputValue("forsorjBarnAldrar", data.barnAldrar);
  setCheckboxValue("forsorjSammanboende", data.sammanboende);
  setInputValue("forsorjKommun", data.kommun);

  setInputValue("forsorjBoendekostnad", data.boendekostnad);
  setInputValue("forsorjHushallsel", data.hushallsel);
  setInputValue("forsorjHemforsakring", data.hemforsakring);
  setInputValue("forsorjArbetsresor", data.arbetsresor);
  setInputValue("forsorjFackforening", data.fackforening);
  setInputValue("forsorjDagstidning", data.dagstidning);
  setInputValue("forsorjTelefonInternet", data.telefonInternet);
  setInputValue("forsorjOvrigaKostnader", data.ovrigaKostnader);

  setInputValue("forsorjInkomstLon", data.inkomstLon);
  setInputValue("forsorjInkomstPension", data.inkomstPension);
  setInputValue("forsorjInkomstBidrag", data.inkomstBidrag);
  setInputValue("forsorjInkomstOvrigt", data.inkomstOvrigt);

  setInputValue("forsorjKommentar", data.kommentar);
}

// ============================================================
// PDF-EXPORT
// ============================================================

/**
 * Exporterar försörjningsstöd-beräkningen till PDF.
 */
export async function exportForsorjToPdf() {
  console.log("[Försörjningsstöd] Exporterar till PDF...");

  const hm = window.currentHuvudmanFullData?.huvudmanDetails;
  if (!hm) {
    alert("Ingen huvudman vald.");
    return;
  }

  if (!window.PDFLib) {
    alert("PDF-biblioteket är inte laddat.");
    return;
  }

  // Implementera PDF-generering här (liknar andra PDF-funktioner)
  alert("PDF-export för försörjningsstöd - kommer snart!");
  // TODO: Implementera komplett PDF-generering
}

// ============================================================
// HJÄLPFUNKTIONER
// ============================================================

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value !== null && value !== undefined ? value : "";
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function setCheckboxValue(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = !!checked;
}

function getCheckboxValue(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.initForsorjningsstod = initForsorjningsstod;
window.calculateForsorjningsstod = calculateForsorjningsstod;
window.saveForsorjningsstod = saveForsorjningsstod;
window.loadForsorjData = loadForsorjData;
window.exportForsorjToPdf = exportForsorjToPdf;
window.NORMER_2025 = NORMER_2025;

console.log("[Försörjningsstöd] forsorjningsstod.js laddad.");
