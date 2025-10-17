// ============================================================
// dashboard.js - Dashboard-rendering för huvudman
// Sökväg: js/modules/huvudman/dashboard.js
// ============================================================

import { getCaseInsensitive, safe } from "../utils/helpers.js";
import { DASHBOARD_CONTAINER_ID } from "./huvudman.js";

// ============================================================
// LADDA DASHBOARD-DATA
// ============================================================

/**
 * Laddar och ritar översiktsdashboarden för en huvudman.
 * @param {string} pnr - Personnummer
 */
export async function loadDashboardData(pnr) {
  const contentEl = document.getElementById(DASHBOARD_CONTAINER_ID);
  const loadingEl = document.getElementById("huvudman-dashboard-loading");

  // Visa "laddar..."
  if (contentEl) contentEl.style.display = "none";
  if (loadingEl) loadingEl.style.display = "block";

  try {
    const url = `api/get_huvudman_dashboard.php?pnr=${encodeURIComponent(pnr)}`;
    const res = await fetch(url, { credentials: "include", cache: "no-store" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.success === false) {
      const msg = json.error || json.message || `Serverfel (${res.status})`;
      throw new Error(msg);
    }

    // Spara globalt
    window.currentHuvudmanFullData = {
      huvudmanDetails: json.details || {},
      documents: json.documents || [],
      bankkonton: json.bankkonton || [],
    };

    // Rendera
    renderDashboard(json.details || {}, json.documents || [], json.bankkonton || []);

    // Starta collapsible-funktioner
    if (typeof initializeCollapsibleEventListeners === "function") {
      initializeCollapsibleEventListeners();
    }
  } catch (err) {
    console.error("[Dashboard] Laddningsfel:", err);
    alert("Kunde inte ladda dashboard-data: " + (err.message || err));
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
    if (contentEl) contentEl.style.display = "block";
  }
}

// ============================================================
// RENDERA DASHBOARD
// ============================================================

/**
 * Ritar upp hela dashboard-innehållet, inklusive "Överblick", "Myndigheter" och "Budget".
 * @param {object} details - Huvudmannens detaljer
 * @param {array} documents - Lista med dokument
 * @param {array} bankkonton - Lista med bankkonton
 */
export function renderDashboard(details, documents = [], bankkonton = []) {
  const wrap = document.getElementById(DASHBOARD_CONTAINER_ID);
  if (!wrap) return;

  // Töm & visa
  wrap.style.display = "block";
  wrap.innerHTML = "";

  const $$ = id => document.getElementById(id);

  // --- Skapa och lägg till Översiktsrutan ---
  const overviewBox = document.createElement("div");
  overviewBox.className = "box dashboard-kort";
  overviewBox.id = "huvudman-overview-box";

  const pnr = getCaseInsensitive(details, "PERSONNUMMER");
  const fornamn = getCaseInsensitive(details, "FORNAMN");
  const efternamn = getCaseInsensitive(details, "EFTERNAMN");
  const adress = getCaseInsensitive(details, "ADRESS");
  const postnummer = getCaseInsensitive(details, "POSTNUMMER");
  const ort = getCaseInsensitive(details, "ORT");
  const telefon = getCaseInsensitive(details, "TELEFON");
  const mobil = getCaseInsensitive(details, "MOBIL");
  const epost = getCaseInsensitive(details, "EPOST");

  overviewBox.innerHTML = `
    <h3><i class="fas fa-user-circle"></i> Överblick</h3>
    <div class="overview-grid">
        <div><strong>Namn:</strong> ${safe(fornamn)} ${safe(efternamn)}</div>
        <div><strong>Personnummer:</strong> ${safe(pnr)}</div>
        <div><strong>Adress:</strong> ${safe(adress)}, ${safe(postnummer)} ${safe(ort)}</div>
        <div><strong>Telefon:</strong> ${safe(telefon) || safe(mobil)}</div>
        <div><strong>E-post:</strong> ${safe(epost)}</div>
    </div>
  `;
  wrap.appendChild(overviewBox);

  // --- Skapa och lägg till Myndigheter & Kontakter ---
  const myndigheterBox = document.createElement("div");
  myndigheterBox.id = "ov-myndigheter";
  myndigheterBox.className = "box dashboard-kort";
  myndigheterBox.innerHTML = `
      <h3><i class="fas fa-sitemap"></i> Myndigheter & Kontakter</h3>
      <div class="form-grid three-columns">
        <div class="form-column"><div class="input-group">
          <label>Överförmyndarenhet:</label>
          <input type="text" value="${safe(getCaseInsensitive(details, "OVERFORMYNDAR_NAMN"))}" disabled>
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Telefon (OFN):</label>
          <input type="text" value="${safe(getCaseInsensitive(details, "OVERFORMYNDAR_TELEFON"))}" disabled>
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Telefon (Kommunväxel):</label>
          <input type="text" value="${safe(getCaseInsensitive(details, "OVERFORMYNDAR_KOMMUN_VAXEL"))}" disabled>
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Annan Kontaktperson:</label>
          <input type="text" id="ov-KontaktpersonNamn" value="${safe(
            getCaseInsensitive(details, "KontaktpersonNamn")
          )}">
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Telefon Kontaktperson:</label>
          <input type="text" id="ov-KontaktpersonTel" value="${safe(getCaseInsensitive(details, "KontaktpersonTel"))}">
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Boende Kontaktperson:</label>
          <input type="text" id="ov-BoendeKontaktpersonNamn" value="${safe(
            getCaseInsensitive(details, "BoendeKontaktpersonNamn")
          )}">
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Telefon Boendekontakt:</label>
          <input type="text" id="ov-BoendeKontaktpersonTel" value="${safe(
            getCaseInsensitive(details, "BoendeKontaktpersonTel")
          )}">
        </div></div>
      </div>
    `;
  wrap.appendChild(myndigheterBox);

  // --- Skapa och lägg till Månadsbudget ---
  const budgetBox = document.createElement("div");
  budgetBox.id = "ov-budget";
  budgetBox.className = "box dashboard-kort";

  const row = (label, beloppKey, levKey, placeholder) => `
      <tr>
        <td><label>${label}</label></td>
        <td><input type="text" id="ov-${levKey}" class="budget-leverantor" placeholder="Leverantör..." value="${safe(
    getCaseInsensitive(details, levKey)
  )}"></td>
        <td><input type="number" step="0.01" id="ov-${beloppKey}" class="budget-belopp" placeholder="${placeholder}" value="${safe(
    getCaseInsensitive(details, beloppKey)
  )}"></td>
        <td>SEK / mån</td>
      </tr>
    `;

  const fickpengUnderdel = `
      <tr class="section-subrow">
        <td colspan="4" style="background:#fafafa">
          <details id="fickpengar-vecka" open>
            <summary style="cursor:pointer; font-weight:600">Specifikation per veckodag</summary>
            <div style="margin-top:8px">
              <table class="budget-table">
                <thead><tr><th>Dag</th><th>Belopp</th><th>Enhet</th></tr></thead>
                <tbody>
                  <tr><td>Måndag</td><td><input type="number" step="0.01" id="ov-FickpengMondag"  value="${safe(
                    getCaseInsensitive(details, "FickpengMondag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr><td>Tisdag</td><td><input type="number" step="0.01" id="ov-FickpengTisdag"  value="${safe(
                    getCaseInsensitive(details, "FickpengTisdag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr><td>Onsdag</td><td><input type="number" step="0.01" id="ov-FickpengOnsdag"  value="${safe(
                    getCaseInsensitive(details, "FickpengOnsdag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr><td>Torsdag</td><td><input type="number" step="0.01" id="ov-FickpengTorsdag" value="${safe(
                    getCaseInsensitive(details, "FickpengTorsdag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr><td>Fredag</td><td><input type="number" step="0.01" id="ov-FickpengFredag"  value="${safe(
                    getCaseInsensitive(details, "FickpengFredag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr class="section-header"><td colspan="3">Summering</td></tr>
                  <tr><td><strong>Totalt / vecka</strong></td><td><input type="number" step="0.01" id="ov-FickpengTotalVecka" value="${safe(
                    getCaseInsensitive(details, "FickpengTotalVecka")
                  )}" readonly></td><td>SEK / vecka</td></tr>
                  <tr><td><strong>≈ per månad</strong></td><td><input type="text" id="ov-FICKPENG_PER_MANAD_VIS" value="" readonly></td><td>SEK / mån (≈4,33 × v)</td></tr>
                </tbody>
              </table>
            </div>
          </details>
        </td>
      </tr>
    `;

  budgetBox.innerHTML = `
      <h3><i class="fas fa-chart-pie"></i> Månadsbudget</h3>
      <table class="budget-table">
        <thead><tr><th>Beskrivning</th><th>Leverantör / Notering</th><th>Belopp</th><th>Enhet</th></tr></thead>
        <tbody>
          <tr class="section-header"><td colspan="4">Inkomster</td></tr>
          ${row("Pension/Sjukersättning etc.", "PENSION_LIVRANTA_SJUK_AKTIVIVET", "PensionLeverantor", "Bruttoinkomst")}
          ${row("Bostadsbidrag / BTP", "BOSTADSBIDRAG", "BostadsbidragLeverantor", "Netto per månad")}
          <tr class="section-header"><td colspan="4">Utgifter</td></tr>
          ${row("Hyra", "HYRA", "HyraLeverantor", "Månadshyra")}
          ${row("Omsorgsavgift", "Omsorgsavgift", "OmsorgsavgiftLeverantor", "Avgift till kommun")}
          ${row("El", "EL_KOSTNAD", "ElLeverantor", "Snitt per månad")}
          ${row("Hemförsäkring", "HEMFORSAKRING", "HemforsakringLeverantor", "Månadspremie")}
          ${row("Sjukvård", "LAKARVARDSKOSTNAD", "LakarvardskostnadLeverantor", "Snitt per månad")}
          ${row("Medicin", "MEDICIN_KOSTNAD", "MedicinLeverantor", "Snitt per månad")}
          ${row("Bredband/Telefoni", "BREDBAND", "BredbandLeverantor", "Månadskostnad")}
          ${row("Fickpengar / månad", "FickpengarManad", "FickpengarLeverantor", "Summa till huvudman")}
          ${fickpengUnderdel}
        </tbody>
      </table>
    `;
  wrap.appendChild(budgetBox);

  // --- Autosumma för fickpengar (kopplar lyssnare) ---
  const dayIds = [
    "ov-FickpengMondag",
    "ov-FickpengTisdag",
    "ov-FickpengOnsdag",
    "ov-FickpengTorsdag",
    "ov-FickpengFredag",
  ];
  const recalcFick = () => {
    const sum = dayIds.reduce((acc, id) => {
      const raw = $$(id)?.value ?? "";
      const num = parseFloat(String(raw).replace(",", "."));
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
    const v = $$("ov-FickpengTotalVecka");
    if (v) v.value = sum.toFixed(2);
    const m = $$("ov-FICKPENG_PER_MANAD_VIS");
    if (m) m.value = (sum * 4.3333).toFixed(2);
  };
  dayIds.forEach(id => $$(id)?.addEventListener("input", recalcFick));
  recalcFick(); // Kör en gång direkt

  // --- Skapa och lägg till Dokumentlistan ---
  const docBox = document.createElement("div");
  docBox.className = "box dashboard-kort";
  const docTable = document.createElement("table");
  docTable.id = "ov-dokument-lista-table";
  docTable.className = "budget-table";
  docTable.innerHTML = `
        <thead><tr><th>Dokument</th><th>Åtgärder</th></tr></thead>
        <tbody></tbody>
    `;
  docBox.innerHTML = '<h3><i class="fas fa-folder-open"></i> Dokument</h3>';
  docBox.appendChild(docTable);
  wrap.appendChild(docBox);

  const tbody = docTable.tBodies[0];
  tbody.innerHTML =
    Array.isArray(documents) && documents.length
      ? documents
          .map(
            d => `
            <tr>
              <td><a href="${safe(d.StoredPath)}" target="_blank">${safe(d.DokumentTyp)}</a> (${safe(
              d.OriginalFilnamn || ""
            )})</td>
              <td class="actions">
                <button class="small danger" onclick="deleteArkivDokument(${d.ID}, '${safe(d.DokumentTyp)}', '${safe(
              details.PERSONNUMMER
            )}')"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `
          )
          .join("")
      : `<tr><td colspan="2">Inga dokument.</td></tr>`;
}

// ============================================================
// COLLAPSIBLE SEKTIONER
// ============================================================

/**
 * Kopplar lyssnare på alla .collapsible-header inuti en given container.
 * @param {HTMLElement} container - Container-elementet
 */
export function initializeCollapsibleEventListeners(container) {
  if (!container) {
    // Om ingen container anges, använd hela dashboard-containern
    container = document.getElementById(DASHBOARD_CONTAINER_ID);
  }
  if (!container) return;

  const headers = container.querySelectorAll(".collapsible-header");
  if (!headers.length) return;

  console.log(`[Collapsible] Hittade ${headers.length} rubriker att koppla lyssnare till i containern:`, container.id);

  headers.forEach(header => {
    header.removeEventListener("click", handleCollapsibleClick);
    header.addEventListener("click", handleCollapsibleClick);
  });
}

/**
 * Hanterar klicket från rubriken den är kopplad till.
 */
export function handleCollapsibleClick() {
  const header = this;
  const content = header.nextElementSibling;
  if (content && content.classList.contains("collapsible-content")) {
    header.classList.toggle("active");
    content.classList.toggle("hidden-content");
  } else {
    console.error("Kunde inte hitta '.collapsible-content' direkt efter rubriken:", header);
  }
}

// ============================================================
// HELPER: ENSURE BOX
// ============================================================

/**
 * Skapar en dashboard-box om den inte finns.
 * @param {string} id - Box-ID
 * @param {string} titleHtml - Titel-HTML
 * @returns {HTMLElement|null}
 */
export function ensureBox(id, titleHtml) {
  const wrap = document.getElementById(DASHBOARD_CONTAINER_ID);
  if (!wrap) return null;

  let box = document.getElementById(id);
  if (!box) {
    box = document.createElement("div");
    box.id = id;
    box.className = "box dashboard-kort";
    wrap.appendChild(box);
  }
  if (titleHtml) box.innerHTML = titleHtml;
  return box;
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.loadDashboardData = loadDashboardData;
window.renderDashboard = renderDashboard;
window.initializeCollapsibleEventListeners = initializeCollapsibleEventListeners;
