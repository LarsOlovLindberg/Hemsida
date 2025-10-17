// ============================================================
// huvudman.js - Huvudman-hantering
// Sökväg: js/modules/huvudman/huvudman.js
// ============================================================

import { getCaseInsensitive, safe, formatDate } from "../utils/helpers.js";
import { setCurrentHuvudman, setAllHuvudman } from "../../state.js";
import { huvudmanApi } from "../../api.js";

// ============================================================
// LADDA ALLA HUVUDMÄN
// ============================================================

/**
 * Laddar alla huvudmän från API.
 * @param {object} filters - Filter (overformyndareId, includeInactive)
 * @returns {Promise<array>}
 */
export async function loadAllHuvudman(filters = {}) {
  console.log("[Huvudman] Laddar alla huvudmän...");

  try {
    const data = await huvudmanApi.getAll(filters);

    if (data && data.success && Array.isArray(data.data)) {
      setAllHuvudman(data.data);
      populateHuvudmanList(data.data);
      console.log(`[Huvudman] ${data.data.length} huvudmän laddade.`);
      return data.data;
    } else {
      console.warn("[Huvudman] Ingen data returnerad från API.");
      setAllHuvudman([]);
      return [];
    }
  } catch (error) {
    console.error("[Huvudman] Fel vid laddning:", error);
    setAllHuvudman([]);
    return [];
  }
}

/**
 * Väljer en huvudman och laddar all data.
 * @param {string} pnr - Personnummer
 * @returns {Promise<object>}
 */
export async function selectHuvudman(pnr) {
  console.log(`[Huvudman] Väljer huvudman: ${pnr}`);

  try {
    const data = await huvudmanApi.getOne(pnr);

    if (data && data.success) {
      setCurrentHuvudman(pnr, data);
      displayHuvudmanDetails(data);

      // Spara i localStorage
      localStorage.setItem("lastSelectedHuvudman", pnr);

      console.log("[Huvudman] ✅ Huvudman vald:", data);
      return data;
    } else {
      throw new Error(data.error || "Kunde inte ladda huvudman");
    }
  } catch (error) {
    console.error("[Huvudman] Fel vid val av huvudman:", error);
    throw error;
  }
}

// Globala konstanter
export const HUVUDMAN_SELECT_ID = "huvudmanSelect";
export const HUVUDMAN_FILTER_OF_ID = "huvudmanFilterOF";
export const DASHBOARD_CONTAINER_ID = "huvudman-dashboard-content";

// ============================================================
// LADDA HUVUDMÄN
// ============================================================

/**
 * Laddar alla huvudmän från servern och fyller dropdown-menyn.
 * @param {boolean|null} includeInactive - Om inaktiva huvudmän ska inkluderas
 * @param {boolean} reset - Om listan ska nollställas först
 * @param {string} targetId - ID på select-elementet
 * @param {string|null} ofnId - Överförmyndare-ID för filtrering
 */
export async function loadHuvudmanOptions(
  includeInactive = null,
  reset = true,
  targetId = HUVUDMAN_SELECT_ID,
  ofnId = null
) {
  const sel = document.getElementById(targetId) || document.getElementById(HUVUDMAN_SELECT_ID);
  if (!sel) {
    console.warn("[HUV] Saknar select #" + targetId);
    return;
  }

  if (reset) {
    sel.innerHTML = '<option value="">-- Välj en huvudman --</option>';
  } else if (!sel.options.length) {
    sel.innerHTML = '<option value="">-- Välj en huvudman --</option>';
  }

  try {
    const qs = new URLSearchParams();
    if (includeInactive != null) qs.set("includeInactive", includeInactive ? "1" : "0");
    if (ofnId) qs.set("overformyndareId", ofnId);

    const url = "/api/get_all_huvudman.php" + (qs.toString() ? "?" + qs.toString() : "");
    const list = await fetchJSON(url);

    // Klientside-filtrering om backend inte gör det
    const filtered = (Array.isArray(list) ? list : []).filter(hm => {
      if (!ofnId) return true;
      const v = getCaseInsensitive(
        hm,
        "OVERFORMYNDARE_ID",
        "Overformyndare_ID",
        "overformyndare_id",
        "overformyndareId"
      );
      return String(v ?? "") === String(ofnId);
    });

    // Bygg options
    const frag = document.createDocumentFragment();
    filtered.forEach(hm => {
      const pnr = getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer", "personnummer") || "";
      const fn = getCaseInsensitive(hm, "FORNAMN", "Fornamn", "fornamn") || "";
      const en = getCaseInsensitive(hm, "EFTERNAMN", "Efternamn", "efternamn") || "";
      const opt = document.createElement("option");
      opt.value = pnr;
      opt.textContent = getCaseInsensitive(hm, "HELT_NAMN") || (fn || en ? `${fn} ${en}`.trim() : pnr) || "(saknas)";
      frag.appendChild(opt);
    });

    // Skriv in
    sel.innerHTML = '<option value="">-- Välj en huvudman --</option>';
    sel.appendChild(frag);

    console.log(`[HUV] Laddad: ${filtered.length} st (total ${Array.isArray(list) ? list.length : 0})`);
    updateHuvudmanCountDisplay(filtered.length);
  } catch (err) {
    console.error("[HUV] Fel vid laddning:", err);
    sel.innerHTML = '<option value="">(Kunde inte ladda huvudmän)</option>';
  }
}

/**
 * Uppdaterar KPI-räknaren för antalet huvudmän som visas.
 */
export function updateHuvudmanCountDisplay(count) {
  const countElement = document.getElementById("huvudman-count-display");
  if (countElement) {
    countElement.textContent = count;
  }
}

// ============================================================
// HUVUDMAN-DETALJER
// ============================================================

/**
 * Laddar fullständiga detaljer för en huvudman.
 * @param {boolean|string} forceReload - true eller personnummer
 */
export async function loadHuvudmanFullDetails(forceReload = false) {
  const selectedPnr = document.getElementById(HUVUDMAN_SELECT_ID)?.value;

  if (!selectedPnr) {
    console.log("[Huvudman] Ingen huvudman vald.");
    return;
  }

  const pnr = typeof forceReload === "string" ? forceReload : selectedPnr;
  console.log(`[Huvudman] Laddar detaljer för ${pnr}...`);

  try {
    const yearForEndpoint = document.getElementById("periodStart_ars")?.value
      ? new Date(document.getElementById("periodStart_ars").value).getFullYear()
      : new Date().getFullYear();

    const url = `/api/get_huvudman_details.php?pnr=${encodeURIComponent(pnr)}&ar=${yearForEndpoint}`;
    const data = await fetchJSON(url);

    // Spara globalt
    window.currentHuvudmanFullData = data;

    console.log("[Huvudman] Data laddad:", data);

    // Fyll i formulär om funktionen finns
    if (typeof window.fillGrunduppgifterForm === "function") {
      window.fillGrunduppgifterForm(data.huvudmanDetails || {});
    }

    // Uppdatera andra flikar
    if (typeof window.displayPersonInfoForArsrakning === "function") {
      window.displayPersonInfoForArsrakning();
    }

    if (typeof window.populateRedogorelseTabWithDefaults === "function") {
      window.populateRedogorelseTabWithDefaults();
    }

    return data;
  } catch (error) {
    console.error(`[Huvudman] Fel vid laddning av detaljer för ${pnr}:`, error);
    alert("Kunde inte ladda huvudmannens uppgifter. Se konsolen för mer info.");
    throw error;
  }
}

/**
 * Sparar huvudmannens fullständiga detaljer.
 */
export async function saveHuvudmanFullDetails() {
  console.log("[SAVE] Startar spara-processen...");

  const selectedPnr = document.getElementById(HUVUDMAN_SELECT_ID)?.value;
  if (!selectedPnr) {
    alert("Ingen huvudman är vald. Kan inte spara.");
    return;
  }

  const dataToSave = collectHuvudmanFullDetailsFromForm();
  if (!dataToSave) {
    alert("Kunde inte samla in data från formuläret.");
    return;
  }

  console.log("[SAVE] Data som kommer att skickas till PHP:", JSON.stringify(dataToSave, null, 2));

  const yearForEndpoint = document.getElementById("periodStart_ars")?.value
    ? new Date(document.getElementById("periodStart_ars").value).getFullYear()
    : new Date().getFullYear();

  const url = `/api/save_huvudman_details.php?pnr=${selectedPnr}&ar=${yearForEndpoint}`;

  console.log(`[SAVE] Skickar PUT-request till URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSave),
    });

    const responseText = await response.text();
    let result;

    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Kunde inte tolka JSON-svar från servern. Råtext:", responseText);
      alert("Servern gav ett oväntat svar som inte var JSON. Se konsolen för detaljer.");
      return;
    }

    if (response.ok) {
      alert(result.message || "Ändringar sparade!");
      console.log("[SAVE] Servern svarade OK.", result);
      await loadHuvudmanFullDetails(true); // Tvinga omladdning från server
    } else {
      alert(`Fel vid sparande: ${result.error || `Okänt fel (Status: ${response.status})`}`);
      console.error("[SAVE] Servern svarade med ett fel:", result);
    }
  } catch (error) {
    alert("Ett nätverksfel uppstod. Kontrollera anslutningen och försök igen.");
    console.error("[SAVE] Nätverksfel:", error);
  }
}

/**
 * Samlar in alla data från huvudman-formuläret.
 * DENNA FUNKTION MÅSTE ANPASSAS TILL DITT FORMULÄR!
 */
function collectHuvudmanFullDetailsFromForm() {
  // TODO: Implementera baserat på ditt faktiska formulär
  // Detta är en placeholder som du måste fylla i
  const data = {
    huvudmanDetails: {},
    // Lägg till fler sektioner här
  };

  // Exempel på hur man samlar data:
  // data.huvudmanDetails.Fornamn = document.getElementById("fornamn")?.value || "";

  console.warn("[collectHuvudmanFullDetailsFromForm] Denna funktion behöver implementeras!");
  return data;
}

// ============================================================
// HUVUDMAN-HANTERING (SELECT)
// ============================================================

/**
 * Central funktion som hanterar när en huvudman väljs.
 * @param {Event} event - Change-eventet från select
 */
export async function handleHuvudmanSelection(event) {
  const pnr = event.target.value;
  const detailsContainer = document.getElementById("huvudmanDetailsContainer");
  const dashboardContainer = document.getElementById(DASHBOARD_CONTAINER_ID);
  const actionSubHeader = document.getElementById("huvudmanActionSubHeader");

  // Om användaren väljer "-- Välj en huvudman --"
  if (!pnr) {
    console.log("[Selection] Ingen huvudman vald. Rensar vyer.");
    if (detailsContainer) detailsContainer.style.display = "none";
    if (dashboardContainer) {
      dashboardContainer.innerHTML =
        '<div class="box muted">Välj en huvudman från listan ovan för att se översikt.</div>';
    }
    if (actionSubHeader) actionSubHeader.style.display = "none";
    window.currentHuvudmanFullData = null;

    // Nollställ även andra flikar
    if (typeof window.displayPersonInfoForArsrakning === "function") {
      window.displayPersonInfoForArsrakning();
    }
    if (typeof window.populateRedogorelseTabWithDefaults === "function") {
      window.populateRedogorelseTabWithDefaults();
    }
    return;
  }

  console.log(`[Selection] Huvudman med pnr ${pnr} vald. Laddar all data...`);

  // Uppdatera sub-header
  const selectedOption = event.target.options[event.target.selectedIndex];
  const namn = selectedOption ? selectedOption.text : "";

  const subHeaderName = document.getElementById("subHeaderHuvudmanName");
  const subHeaderPnr = document.getElementById("subHeaderHuvudmanPnr");

  if (subHeaderName) {
    subHeaderName.textContent = namn.split(" (")[0];
  }
  if (subHeaderPnr) {
    subHeaderPnr.textContent = pnr;
  }

  // Visa laddningsindikator
  if (dashboardContainer) {
    dashboardContainer.innerHTML = '<div class="box muted">Laddar data, vänligen vänta...</div>';
  }
  if (detailsContainer) detailsContainer.style.display = "none";
  if (actionSubHeader) actionSubHeader.style.display = "none";

  try {
    // Ladda både dashboard och detaljer parallellt
    await Promise.all([
      window.loadDashboardData ? window.loadDashboardData(pnr) : Promise.resolve(),
      loadHuvudmanFullDetails(true),
    ]);

    console.log(`[Selection] All data för ${pnr} har laddats och renderats.`);
  } catch (error) {
    console.error(`[Selection] Ett fel uppstod vid laddning av data för ${pnr}:`, error);
    if (dashboardContainer) {
      dashboardContainer.innerHTML = `<div class="box error-message">Kunde inte ladda data för vald huvudman. Försök igen.</div>`;
    }
  }
}

// ============================================================
// GRUNDUPPGIFTER-FORMULÄR
// ============================================================

/**
 * Fyller i grunduppgifter-formuläret med data.
 * @param {object} details - Huvudmannens detaljer
 */
export function fillGrunduppgifterForm(details = {}) {
  const set = (id, ...keys) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = getCaseInsensitive(details, ...keys, id) || "";
  };

  // Person-id
  set("personnummer", "Personnummer");

  // Namn & ordinarie adress
  set("fornamn", "Fornamn");
  set("efternamn", "Efternamn");
  set("adress", "Adress");
  set("postnummer", "Postnummer");
  set("ort", "Ort");

  // Kontakt
  set("telefon", "Telefon");
  set("mobil", "Mobil");
  set("epost", "Epost");

  // Övrigt
  set("medborgarskap", "Medborgarskap");
  set("civilstand", "Civilstand");
  set("sammanboende", "Sammanboende");
  set("forordnandeDatum", "ForordnandeDatum");
  set("saldoRakningskontoForordnande", "SaldoRakningskontoForordnande");

  // Vistelseadress
  set("vistelseadress", "Vistelseadress");
  set("vistelsepostnr", "VistelsePostnummer");
  set("vistelseort", "VistelseOrt");

  // Bank (räkningskonto)
  set("banknamn", "Banknamn");
  set("clearingnummer", "Clearingnummer");
  set("kontonummer", "Kontonummer");

  // Subheader namnruta
  const nameSpan = document.getElementById("huvudmanNameDisplay");
  const pnrSpan = document.getElementById("huvudmanPnrDisplay");

  if (nameSpan) {
    nameSpan.textContent = [getCaseInsensitive(details, "Fornamn", ""), getCaseInsensitive(details, "Efternamn", "")]
      .filter(Boolean)
      .join(" ");
  }

  if (pnrSpan) {
    pnrSpan.textContent = getCaseInsensitive(details, "Personnummer", "");
  }
}

// ============================================================
// KOPPLA FILTER TILL LISTA
// ============================================================

/**
 * Binder överförmyndare-filtret till huvudmanslistan.
 */
export function bindHuvudmanFilterToList(ofnSelectId = HUVUDMAN_FILTER_OF_ID, hmSelectId = HUVUDMAN_SELECT_ID) {
  const ofnSel = document.getElementById(ofnSelectId);
  if (!ofnSel) return;

  ofnSel.addEventListener("change", () => {
    const ofnId = ofnSel.value || null;
    loadHuvudmanOptions(null, true, hmSelectId, ofnId);
  });
}

// ============================================================
// EXPORTERA GLOBALT (för onclick etc)
// ============================================================

window.loadHuvudmanOptions = loadHuvudmanOptions;
window.loadHuvudmanFullDetails = loadHuvudmanFullDetails;
window.saveHuvudmanFullDetails = saveHuvudmanFullDetails;
window.handleHuvudmanSelection = handleHuvudmanSelection;
window.fillGrunduppgifterForm = fillGrunduppgifterForm;
