// ============================================================
// arvoden.js - Arvodes-hantering för god man/förvaltare
// Sökväg: js/modules/godman/arvoden.js
// ============================================================

import { getCaseInsensitive, safe, formatCurrency, getRadioValue, setRadioValue } from "../utils/helpers.js";

// ============================================================
// ÖPPNA ARVODES-MODAL
// ============================================================

/**
 * Öppnar modalen för att beräkna och visa arvode.
 */
export function openArvodesModal() {
  console.log("[Arvode] Öppnar modal...");

  // Kontrollera att huvudman och God man-profil finns
  if (!window.currentHuvudmanFullData || !window.currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman först.");
    return;
  }

  if (!window.activeGodManProfile) {
    alert("Välj en aktiv God Man-profil först.");
    return;
  }

  // Hämta modal
  const modal = document.getElementById("arvodesModal");
  if (!modal) {
    console.error("[Arvode] Modal-element hittades inte.");
    return;
  }

  // Fyll formuläret med befintliga värden eller standardvärden
  fillArvodesForm();

  // Visa modalen
  modal.style.display = "block";

  // Beräkna direkt vid öppning
  calculateArvode();
}

/**
 * Stänger arvodes-modalen.
 */
export function closeArvodesModal() {
  const modal = document.getElementById("arvodesModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// ============================================================
// FYLL FORMULÄR
// ============================================================

/**
 * Fyller arvodes-formuläret med data.
 */
function fillArvodesForm() {
  const hm = window.currentHuvudmanFullData?.huvudmanDetails;
  const gm = window.activeGodManProfile;

  if (!hm || !gm) return;

  // Fyll God man-info
  const gmNamnEl = document.getElementById("arvodeGodmanNamn");
  if (gmNamnEl) {
    const fornamn = getCaseInsensitive(gm, "Fornamn", "fornamn") || "";
    const efternamn = getCaseInsensitive(gm, "Efternamn", "efternamn") || "";
    gmNamnEl.textContent = `${fornamn} ${efternamn}`;
  }

  // Fyll huvudman-info
  const hmNamnEl = document.getElementById("arvodeHuvudmanNamn");
  if (hmNamnEl) {
    const fornamn = getCaseInsensitive(hm, "FORNAMN", "Fornamn") || "";
    const efternamn = getCaseInsensitive(hm, "EFTERNAMN", "Efternamn") || "";
    hmNamnEl.textContent = `${fornamn} ${efternamn}`;
  }

  // Hämta sparade arvodesvärden eller sätt standardvärden
  const savedArvode = hm.ArvodeData ? JSON.parse(hm.ArvodeData) : {};

  // Omfattning
  setCheckboxValue("arvodeBevakaRatt", savedArvode.bevakaRatt !== false);
  setCheckboxValue("arvodeForvaltaEgendom", savedArvode.forvaltaEgendom !== false);
  setCheckboxValue("arvodeSorjaForPerson", savedArvode.sorjaForPerson !== false);

  // Arbetsinsats
  setRadioValue("arvodeArbetsinsats", savedArvode.arbetsinsats || "Normal");

  // Tidsåtgång
  setValue("arvodeTidBevakaRatt", savedArvode.tidBevakaRatt || "");
  setValue("arvodeTidForvaltaEgendom", savedArvode.tidForvaltaEgendom || "");
  setValue("arvodeTidSorjaForPerson", savedArvode.tidSorjaForPerson || "");

  // Särskilda omständigheter
  setValue("arvodeSarskildaOmstandigheter", savedArvode.sarskildaOmstandigheter || "");

  // Kostnadsersättning
  setRadioValue("arvodeKostnadsersattningTyp", savedArvode.kostnadsersattningTyp || "schablon");
  setValue("arvodeReseersattningKm", savedArvode.reseersattningKm || "");
  setValue("arvodeSpecificeradKostnad", savedArvode.specificeradKostnad || "");

  // Prisbasbelopp (uppdatera detta årligen)
  const currentYear = new Date().getFullYear();
  const prisbasbelopp = getPrisbasbelopp(currentYear);
  setValue("arvodePrisbasbelopp", prisbasbelopp);

  console.log("[Arvode] Formulär fyllt med data.");
}

/**
 * Hämtar aktuellt prisbasbelopp för ett år.
 * @param {number} year - Årtal
 * @returns {number} - Prisbasbelopp
 */
function getPrisbasbelopp(year) {
  // Prisbasbelopp uppdateras årligen av regeringen
  // Detta bör idealt hämtas från en databas eller konfigurationsfil
  const prisbasbeloppPerAr = {
    2023: 52500,
    2024: 54400,
    2025: 56700,
    2026: 58800, // Uppskattning
  };

  return prisbasbeloppPerAr[year] || 56700; // Fallback till 2025 års värde
}

// ============================================================
// BERÄKNA ARVODE
// ============================================================

/**
 * Beräknar totalt arvode baserat på formulärdata.
 */
export function calculateArvode() {
  console.log("[Arvode] Beräknar arvode...");

  // Hämta prisbasbelopp
  const prisbasbelopp = parseFloat(getValue("arvodePrisbasbelopp")) || 56700;

  // Grundarvode per del (baserat på prisbasbelopp)
  const grundarvodePerDel = prisbasbelopp * 0.04; // 4% av prisbasbelopp per del

  // Kontrollera vilka delar som är valda
  const bevakaRatt = getCheckboxValue("arvodeBevakaRatt");
  const forvaltaEgendom = getCheckboxValue("arvodeForvaltaEgendom");
  const sorjaForPerson = getCheckboxValue("arvodeSorjaForPerson");

  let antalDelar = 0;
  if (bevakaRatt) antalDelar++;
  if (forvaltaEgendom) antalDelar++;
  if (sorjaForPerson) antalDelar++;

  // Grundarvode
  let grundarvode = grundarvodePerDel * antalDelar;

  // Justering för arbetsinsats
  const arbetsinsats = getRadioValue("arvodeArbetsinsats");
  let arbetsinsatsFaktor = 1.0;

  switch (arbetsinsats) {
    case "Mycket liten":
      arbetsinsatsFaktor = 0.5;
      break;
    case "Liten":
      arbetsinsatsFaktor = 0.75;
      break;
    case "Normal":
      arbetsinsatsFaktor = 1.0;
      break;
    case "Stor":
      arbetsinsatsFaktor = 1.25;
      break;
    case "Mycket stor":
      arbetsinsatsFaktor = 1.5;
      break;
  }

  let justerat = grundarvode * arbetsinsatsFaktor;

  // Lägg till särskilda omständigheter (procentuell ökning)
  const sarskildaText = getValue("arvodeSarskildaOmstandigheter");
  let sarskildTillagg = 0;
  if (sarskildaText && sarskildaText.trim() !== "") {
    // Om särskilda omständigheter anges, lägg till 10% (kan anpassas)
    sarskildTillagg = justerat * 0.1;
    justerat += sarskildTillagg;
  }

  // Kostnadsersättning
  let kostnadsersattning = 0;
  const kostnadsersattningTyp = getRadioValue("arvodeKostnadsersattningTyp");

  if (kostnadsersattningTyp === "schablon") {
    // Schablon: 2% av prisbasbelopp
    kostnadsersattning = prisbasbelopp * 0.02;
  } else if (kostnadsersattningTyp === "specifikation") {
    // Specifikt angivet belopp
    kostnadsersattning = parseFloat(getValue("arvodeSpecificeradKostnad")) || 0;
  }

  // Reseersättning (km * 18.50 kr, enligt Skatteverkets schablon)
  const reseersattningKm = parseFloat(getValue("arvodeReseersattningKm")) || 0;
  const reseersattning = reseersattningKm * 18.5;

  // Totalt arvode
  const totaltArvode = justerat;
  const totaltKostnader = kostnadsersattning + reseersattning;
  const totaltBelopp = totaltArvode + totaltKostnader;

  // Visa resultat
  displayArvodesResult({
    prisbasbelopp,
    antalDelar,
    grundarvodePerDel,
    grundarvode,
    arbetsinsats,
    arbetsinsatsFaktor,
    justerat,
    sarskildTillagg,
    kostnadsersattningTyp,
    kostnadsersattning,
    reseersattningKm,
    reseersattning,
    totaltArvode,
    totaltKostnader,
    totaltBelopp,
  });

  console.log("[Arvode] Beräkning klar:", { totaltArvode, totaltKostnader, totaltBelopp });
}

/**
 * Visar resultat av arvodes-beräkningen.
 * @param {object} result - Resultat-objekt
 */
function displayArvodesResult(result) {
  const container = document.getElementById("arvodesResultContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="arvodes-result">
      <h3>Beräknat Arvode</h3>
      
      <div class="result-section">
        <h4>Grunduppgifter</h4>
        <p><strong>Prisbasbelopp (${new Date().getFullYear()}):</strong> ${formatCurrency(result.prisbasbelopp)}</p>
        <p><strong>Antal valda delar:</strong> ${result.antalDelar}</p>
        <p><strong>Grundarvode per del (4%):</strong> ${formatCurrency(result.grundarvodePerDel)}</p>
      </div>
      
      <div class="result-section">
        <h4>Arvode</h4>
        <p><strong>Grundarvode:</strong> ${formatCurrency(result.grundarvode)}</p>
        <p><strong>Arbetsinsats:</strong> ${result.arbetsinsats} (faktor ${result.arbetsinsatsFaktor})</p>
        <p><strong>Justerat arvode:</strong> ${formatCurrency(result.justerat)}</p>
        ${
          result.sarskildTillagg > 0
            ? `<p><strong>Tillägg för särskilda omständigheter:</strong> ${formatCurrency(result.sarskildTillagg)}</p>`
            : ""
        }
        <p class="highlight"><strong>Totalt arvode:</strong> ${formatCurrency(result.totaltArvode)}</p>
      </div>
      
      <div class="result-section">
        <h4>Kostnadsersättning</h4>
        <p><strong>Typ:</strong> ${result.kostnadsersattningTyp === "schablon" ? "Schablon (2%)" : "Specifikation"}</p>
        <p><strong>Kostnadsersättning:</strong> ${formatCurrency(result.kostnadsersattning)}</p>
        ${
          result.reseersattningKm > 0
            ? `<p><strong>Reseersättning (${result.reseersattningKm} km × 18.50 kr):</strong> ${formatCurrency(
                result.reseersattning
              )}</p>`
            : ""
        }
        <p class="highlight"><strong>Totala kostnader:</strong> ${formatCurrency(result.totaltKostnader)}</p>
      </div>
      
      <div class="result-section total">
        <h4>Totalt att debitera</h4>
        <p class="total-amount"><strong>${formatCurrency(result.totaltBelopp)}</strong></p>
      </div>
      
      <div class="result-actions">
        <button type="button" class="primary" onclick="saveArvodesBerakning()">Spara beräkning</button>
        <button type="button" class="secondary" onclick="exportArvodeToPdf()">Exportera till PDF</button>
      </div>
    </div>
  `;
}

// ============================================================
// SPARA ARVODES-BERÄKNING
// ============================================================

/**
 * Sparar arvodes-beräkningen till huvudmannens data.
 */
export async function saveArvodesBerakning() {
  console.log("[Arvode] Sparar beräkning...");

  const hm = window.currentHuvudmanFullData?.huvudmanDetails;
  if (!hm) {
    alert("Ingen huvudman vald.");
    return;
  }

  // Samla all arvodes-data
  const arvodeData = {
    bevakaRatt: getCheckboxValue("arvodeBevakaRatt"),
    forvaltaEgendom: getCheckboxValue("arvodeForvaltaEgendom"),
    sorjaForPerson: getCheckboxValue("arvodeSorjaForPerson"),
    arbetsinsats: getRadioValue("arvodeArbetsinsats"),
    tidBevakaRatt: getValue("arvodeTidBevakaRatt"),
    tidForvaltaEgendom: getValue("arvodeTidForvaltaEgendom"),
    tidSorjaForPerson: getValue("arvodeTidSorjaForPerson"),
    sarskildaOmstandigheter: getValue("arvodeSarskildaOmstandigheter"),
    kostnadsersattningTyp: getRadioValue("arvodeKostnadsersattningTyp"),
    reseersattningKm: getValue("arvodeReseersattningKm"),
    specificeradKostnad: getValue("arvodeSpecificeradKostnad"),
    prisbasbelopp: getValue("arvodePrisbasbelopp"),
    sparadDatum: new Date().toISOString(),
  };

  try {
    const pnr = getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer");
    const year = new Date().getFullYear();

    const response = await fetch(`/api/save_arvode.php?pnr=${encodeURIComponent(pnr)}&ar=${year}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arvodeData),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Kunde inte spara arvodes-beräkningen.");
    }

    alert("Arvodes-beräkningen har sparats!");
    console.log("[Arvode] Sparat:", result);

    // Uppdatera lokal data
    if (window.currentHuvudmanFullData && window.currentHuvudmanFullData.huvudmanDetails) {
      window.currentHuvudmanFullData.huvudmanDetails.ArvodeData = JSON.stringify(arvodeData);
    }
  } catch (error) {
    console.error("[Arvode] Fel vid sparande:", error);
    alert("Kunde inte spara arvodes-beräkningen: " + error.message);
  }
}

// ============================================================
// EXPORTERA ARVODE TILL PDF
// ============================================================

/**
 * Exporterar arvodes-beräkningen till PDF.
 */
export async function exportArvodeToPdf() {
  console.log("[Arvode] Exporterar till PDF...");

  const hm = window.currentHuvudmanFullData?.huvudmanDetails;
  const gm = window.activeGodManProfile;

  if (!hm || !gm) {
    alert("Saknar huvudman eller God man-profil.");
    return;
  }

  if (!window.PDFLib) {
    alert("PDF-biblioteket är inte laddat.");
    return;
  }

  try {
    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

    // Skapa PDF
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 11;
    const margin = 50;
    let y = height - margin;

    // Hjälpfunktion för att rita text
    const drawText = (text, size = fontSize, isBold = false, xOffset = 0) => {
      if (y < margin + size) {
        page = pdfDoc.addPage();
        y = height - margin;
      }
      page.drawText(text, {
        x: margin + xOffset,
        y: y,
        font: isBold ? boldFont : font,
        size: size,
        color: rgb(0, 0, 0),
      });
      y -= size * 1.5;
    };

    // Rubrik
    drawText("ARVODESBERÄKNING", 16, true);
    y -= 10;

    // Huvudman
    const hmFornamn = getCaseInsensitive(hm, "FORNAMN", "Fornamn") || "";
    const hmEfternamn = getCaseInsensitive(hm, "EFTERNAMN", "Efternamn") || "";
    const hmPnr = getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer") || "";
    drawText(`Huvudman: ${hmFornamn} ${hmEfternamn} (${hmPnr})`, 12, true);

    // God man
    const gmFornamn = getCaseInsensitive(gm, "Fornamn", "fornamn") || "";
    const gmEfternamn = getCaseInsensitive(gm, "Efternamn", "efternamn") || "";
    const gmPnr = getCaseInsensitive(gm, "Personnummer", "personnummer") || "";
    drawText(`God man/Förvaltare: ${gmFornamn} ${gmEfternamn} (${gmPnr})`, 12, true);

    y -= 10;
    drawText(`Datum: ${new Date().toLocaleDateString("sv-SE")}`, 10);
    y -= 20;

    // Hämta beräkningsresultat från DOM
    const resultContainer = document.getElementById("arvodesResultContainer");
    if (resultContainer) {
      const resultText = resultContainer.textContent.replace(/\s+/g, " ").trim();
      // Detta är en förenklad version - i en riktig implementation skulle du
      // återskapa beräkningen här
      drawText("Beräkning baserad på aktuella värden i formuläret.", 10);
    }

    // Spara PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `Arvode_${hmPnr.replace(/\D/g, "")}_${new Date().toISOString().slice(0, 10)}.pdf`;

    // Ladda ner
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("[Arvode] PDF exporterad:", filename);
  } catch (error) {
    console.error("[Arvode] Fel vid PDF-export:", error);
    alert("Kunde inte exportera till PDF: " + error.message);
  }
}

// ============================================================
// HJÄLPFUNKTIONER
// ============================================================

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

function getValue(id) {
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

/**
 * Togglar synlighet av kostnadsspecifikation-fält.
 */
export function toggleKostnadsersattningFields() {
  const typ = getRadioValue("arvodeKostnadsersattningTyp");
  const specField = document.getElementById("arvodeSpecificeradKostnadContainer");

  if (specField) {
    specField.style.display = typ === "specifikation" ? "block" : "none";
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================

/**
 * Initierar event listeners för arvodes-formuläret.
 */
export function initializeArvodesListeners() {
  // Checkboxar för omfattning
  ["arvodeBevakaRatt", "arvodeForvaltaEgendom", "arvodeSorjaForPerson"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", calculateArvode);
    }
  });

  // Radios för arbetsinsats
  document.querySelectorAll('input[name="arvodeArbetsinsats"]').forEach(radio => {
    radio.addEventListener("change", calculateArvode);
  });

  // Radios för kostnadsersättning
  document.querySelectorAll('input[name="arvodeKostnadsersattningTyp"]').forEach(radio => {
    radio.addEventListener("change", () => {
      toggleKostnadsersattningFields();
      calculateArvode();
    });
  });

  // Inputs för kostnader
  ["arvodeReseersattningKm", "arvodeSpecificeradKostnad"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", calculateArvode);
    }
  });

  // Textarea för särskilda omständigheter
  const sarskildaEl = document.getElementById("arvodeSarskildaOmstandigheter");
  if (sarskildaEl) {
    sarskildaEl.addEventListener("input", calculateArvode);
  }

  console.log("[Arvode] Event listeners initierade.");
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.openArvodesModal = openArvodesModal;
window.closeArvodesModal = closeArvodesModal;
window.calculateArvode = calculateArvode;
window.saveArvodesBerakning = saveArvodesBerakning;
window.exportArvodeToPdf = exportArvodeToPdf;
window.toggleKostnadsersattningFields = toggleKostnadsersattningFields;
window.initializeArvodesListeners = initializeArvodesListeners;
