// ============================================================
// overformyndare.js - Överförmyndare (minimal version)
// Sökväg: js/modules/overformyndare/overformyndare.js
// ============================================================

import { setAllOverformyndare } from "../../state.js";
import { overformyndareApi } from "../../api.js";

/**
 * Laddar alla överförmyndare.
 */
export async function loadAllOverformyndare() {
  console.log("[Överförmyndare] Laddar alla överförmyndare...");

  try {
    const data = await overformyndareApi.getAll();

    if (data && data.success && Array.isArray(data.data)) {
      setAllOverformyndare(data.data);
      populateOverformyndareDropdown(data.data);
      console.log(`[Överförmyndare] ${data.data.length} överförmyndare laddade.`);
    } else {
      console.warn("[Överförmyndare] Ingen data returnerad från API.");
      setAllOverformyndare([]);
    }
  } catch (error) {
    console.error("[Överförmyndare] Fel vid laddning:", error);
    setAllOverformyndare([]);
  }
}

/**
 * Fyller dropdown med överförmyndare.
 */
function populateOverformyndareDropdown(overformyndare) {
  const dropdown = document.getElementById("filterOverformyndare");
  if (!dropdown) return;

  dropdown.innerHTML = '<option value="">Alla överförmyndare</option>';

  overformyndare.forEach(of => {
    const option = document.createElement("option");
    option.value = of.OverformyndareID || of.OVERFORMYNDAREID;
    option.textContent = of.Namn || of.NAMN || "Okänd";
    dropdown.appendChild(option);
  });
}

// Exportera globalt
window.loadAllOverformyndare = loadAllOverformyndare;

console.log("[Överförmyndare] overformyndare.js laddad.");
