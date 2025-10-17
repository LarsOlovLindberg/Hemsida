// ============================================================
// overformyndare.js - Överförmyndare-hantering
// Sökväg: js/modules/domain/overformyndare.js
// ============================================================

import { getCaseInsensitive, fetchJSON } from "../utils/helpers.js";

// Global array för att lagra alla överförmyndare
export let allOverformyndare = [];

// ============================================================
// LADDA ÖVERFÖRMYNDARE
// ============================================================

/**
 * Laddar alla överförmyndare från API:et och fyller dropdown-menyn.
 * @param {string} targetId - ID på select-elementet som ska fyllas
 */
export async function loadOverformyndareList(targetId = "huvudmanFilterOF") {
  const sel = document.getElementById(targetId);
  if (!sel) {
    console.warn("[OFN] Saknar select #" + targetId);
    return;
  }

  sel.innerHTML = '<option value="">Laddar...</option>';

  try {
    // STEG 1: Hämta listan från servern FÖRST
    const list = await fetchJSON("/api/get_overformyndare.php");

    // STEG 2: Spara den hämtade listan i den globala variabeln
    allOverformyndare = Array.isArray(list) ? list : [];

    // STEG 3: Fyll i dropdown-menyn i gränssnittet
    sel.innerHTML = '<option value="">Alla överförmyndare</option>';

    allOverformyndare.forEach(row => {
      const id = getCaseInsensitive(row, "ID", "Id", "id");
      const namn = getCaseInsensitive(row, "Namn", "namn", "NAME");

      if (id != null) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = namn || `OFN #${id}`;
        sel.appendChild(opt);
      }
    });

    console.log(`[OFN] Laddad: ${allOverformyndare.length} st`);
  } catch (err) {
    console.error("[OFN] Fel vid laddning:", err);
    sel.innerHTML = '<option value="">(Kunde inte ladda överförmyndare)</option>';
  }
}

/**
 * Laddar överförmyndare-options till flera olika select-element.
 * @param {string[]} targetIds - Array med select-element IDs
 */
export async function loadOverformyndareToMultipleSelects(targetIds = []) {
  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    console.warn("[OFN] Inga target IDs angivna.");
    return;
  }

  try {
    // Hämta bara en gång
    if (allOverformyndare.length === 0) {
      const list = await fetchJSON("/api/get_overformyndare.php");
      allOverformyndare = Array.isArray(list) ? list : [];
    }

    // Fyll alla dropdowns
    targetIds.forEach(targetId => {
      const sel = document.getElementById(targetId);
      if (!sel) {
        console.warn(`[OFN] Select #${targetId} hittades inte.`);
        return;
      }

      sel.innerHTML = '<option value="">-- Välj överförmyndare --</option>';

      allOverformyndare.forEach(row => {
        const id = getCaseInsensitive(row, "ID", "Id", "id");
        const namn = getCaseInsensitive(row, "Namn", "namn", "NAME");

        if (id != null) {
          const opt = document.createElement("option");
          opt.value = id;
          opt.textContent = namn || `OFN #${id}`;
          sel.appendChild(opt);
        }
      });
    });

    console.log(`[OFN] Fyllde ${targetIds.length} dropdowns med ${allOverformyndare.length} överförmyndare.`);
  } catch (err) {
    console.error("[OFN] Fel vid laddning till flera dropdowns:", err);
  }
}

// ============================================================
// HÄMTA SPECIFIK ÖVERFÖRMYNDARE
// ============================================================

/**
 * Hämtar en specifik överförmyndare baserat på ID.
 * @param {string|number} ofnId - Överförmyndare-ID
 * @returns {object|null} - Överförmyndare-objektet eller null
 */
export function getOverformyndareById(ofnId) {
  if (!ofnId) return null;

  return (
    allOverformyndare.find(ofn => {
      const id = getCaseInsensitive(ofn, "ID", "Id", "id");
      return String(id) === String(ofnId);
    }) || null
  );
}

/**
 * Hämtar överförmyndare-namn baserat på ID.
 * @param {string|number} ofnId - Överförmyndare-ID
 * @returns {string} - Namnet eller tom sträng
 */
export function getOverformyndareNamnById(ofnId) {
  const ofn = getOverformyndareById(ofnId);
  if (!ofn) return "";

  return getCaseInsensitive(ofn, "Namn", "namn", "NAME") || "";
}

// ============================================================
// NORMALISERA ÖVERFÖRMYNDARE-DATA
// ============================================================

/**
 * Normaliserar överförmyndare-objekt till enhetligt format.
 * @param {object} o - Överförmyndare-objekt
 * @returns {object} - Normaliserat objekt med {id, namn}
 */
export function normOF(o) {
  if (!o) return { id: null, namn: "" };

  const id = getCaseInsensitive(o, "ID", "Id", "id", "of_id") || null;
  const namn = (getCaseInsensitive(o, "Namn", "namn", "NAME") || "").toString().trim();

  return { id, namn };
}

// ============================================================
// ÖVERFÖRMYNDARE-FILTER HANTERING
// ============================================================

/**
 * Hanterar när överförmyndare-filtret ändras.
 * Uppdaterar huvudmanslistan och KPI baserat på vald överförmyndare.
 */
export async function onOverformyndareChange() {
  const sel = document.getElementById("huvudmanFilterOF");
  const ofId = sel ? sel.value || null : null;

  console.log(`[OFN] Filter ändrat till: ${ofId || "Alla"}`);

  // Ladda om huvudmän med filter
  if (typeof window.loadHuvudmanOptions === "function") {
    await window.loadHuvudmanOptions(ofId, true);
  }

  // Uppdatera KPI
  if (typeof window.loadDashboardStats === "function") {
    await window.loadDashboardStats(ofId, true);
  }
}

/**
 * Binder överförmyndare-filtret till change-event.
 * @param {string} selectId - ID på select-elementet
 */
export function bindOverformyndareFilter(selectId = "huvudmanFilterOF") {
  const sel = document.getElementById(selectId);
  if (!sel) {
    console.warn(`[OFN] Kunde inte hitta select #${selectId} för att binda filter.`);
    return;
  }

  // Ta bort gamla lyssnare och lägg till ny
  sel.removeEventListener("change", onOverformyndareChange);
  sel.addEventListener("change", onOverformyndareChange);

  console.log(`[OFN] Filter bundet till #${selectId}`);
}

// ============================================================
// LADDA ÖVERFÖRMYNDARE-OPTIONS (ALTERNATIV METOD)
// ============================================================

/**
 * Laddar överförmyndare-options med mer kontroll.
 * Används för specifika formulär/modaler.
 * @param {string} targetId - ID på select-elementet
 * @param {boolean} includeAllOption - Om "Alla"-alternativet ska inkluderas
 * @param {string|null} selectedId - ID som ska vara förvalt
 */
export async function loadOverformyndareOptions(
  targetId = "huvudmanFilterOF",
  includeAllOption = true,
  selectedId = null
) {
  const sel = document.getElementById(targetId);
  if (!sel) {
    console.warn("[OFN] Saknar select #" + targetId);
    return;
  }

  try {
    // Hämta data om vi inte har den
    if (allOverformyndare.length === 0) {
      const list = await fetchJSON("/api/get_overformyndare.php");
      allOverformyndare = Array.isArray(list) ? list : [];
    }

    // Rensa och fyll
    sel.innerHTML = "";

    if (includeAllOption) {
      const optAll = document.createElement("option");
      optAll.value = "";
      optAll.textContent = "Alla överförmyndare";
      sel.appendChild(optAll);
    }

    allOverformyndare.forEach(row => {
      const id = getCaseInsensitive(row, "ID", "Id", "id");
      const namn = getCaseInsensitive(row, "Namn", "namn", "NAME");

      if (id != null) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = namn || `OFN #${id}`;

        // Förvälj om det matchar selectedId
        if (selectedId && String(id) === String(selectedId)) {
          opt.selected = true;
        }

        sel.appendChild(opt);
      }
    });

    console.log(`[OFN] Options laddade till #${targetId}`);
  } catch (err) {
    console.error("[OFN] Fel vid laddning av options:", err);
    sel.innerHTML = '<option value="">(Fel vid laddning)</option>';
  }
}

// ============================================================
// SKAPA NY ÖVERFÖRMYNDARE
// ============================================================

/**
 * Skapar en ny överförmyndare (om API:et stödjer det).
 * @param {object} data - Data för den nya överförmyndaren
 * @returns {Promise<object>} - Resultat från servern
 */
export async function createOverformyndare(data) {
  if (!data || !data.Namn) {
    throw new Error("Namn krävs för att skapa en överförmyndare.");
  }

  try {
    const response = await fetch("/api/create_overformyndare.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Kunde inte skapa överförmyndare.");
    }

    console.log("[OFN] Ny överförmyndare skapad:", result);

    // Ladda om listan
    allOverformyndare = [];
    await loadOverformyndareList();

    return result;
  } catch (err) {
    console.error("[OFN] Fel vid skapande av överförmyndare:", err);
    throw err;
  }
}

// ============================================================
// UPPDATERA ÖVERFÖRMYNDARE
// ============================================================

/**
 * Uppdaterar en befintlig överförmyndare.
 * @param {string|number} ofnId - Överförmyndare-ID
 * @param {object} data - Uppdaterad data
 * @returns {Promise<object>} - Resultat från servern
 */
export async function updateOverformyndare(ofnId, data) {
  if (!ofnId) {
    throw new Error("Överförmyndare-ID krävs för uppdatering.");
  }

  try {
    const response = await fetch(`/api/update_overformyndare.php?id=${ofnId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Kunde inte uppdatera överförmyndare.");
    }

    console.log("[OFN] Överförmyndare uppdaterad:", result);

    // Ladda om listan
    allOverformyndare = [];
    await loadOverformyndareList();

    return result;
  } catch (err) {
    console.error("[OFN] Fel vid uppdatering av överförmyndare:", err);
    throw err;
  }
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.loadOverformyndareList = loadOverformyndareList;
window.loadOverformyndareOptions = loadOverformyndareOptions;
window.getOverformyndareById = getOverformyndareById;
window.getOverformyndareNamnById = getOverformyndareNamnById;
window.onOverformyndareChange = onOverformyndareChange;
window.bindOverformyndareFilter = bindOverformyndareFilter;
