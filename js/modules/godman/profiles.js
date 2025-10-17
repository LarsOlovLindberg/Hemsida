// ============================================================
// profiles.js - God man-profiler hantering
// Sökväg: js/modules/godman/profiles.js
// ============================================================

import { getCaseInsensitive, safe, normalizePnr, pnr12 } from "../utils/helpers.js";

// Global variabel för aktiv God Man-profil
export let activeGodManProfile = null;

import { setActiveGodManProfile } from "../../state.js";

/**
 * Laddar alla God man-profiler.
 */
export async function loadGodManProfiles() {
  console.log("[Profiles] Laddar God man-profiler...");

  try {
    // Placeholder - ersätt med riktig API-call senare
    const mockProfiles = [
      {
        ProfilID: 1,
        Fornamn: "Test",
        Efternamn: "Testsson",
        Personnummer: "19700101-1234",
        Adress: "Testgatan 1",
        Postnummer: "12345",
        Postort: "Teststad",
        Telefon: "070-1234567",
        Email: "test@example.com",
      },
    ];

    displayGodManProfiles(mockProfiles);

    // Sätt första profilen som aktiv om ingen är vald
    if (mockProfiles.length > 0 && !window.appState?.activeGodManProfile) {
      setActiveGodManProfileById(mockProfiles[0].ProfilID);
    }

    console.log(`[Profiles] ${mockProfiles.length} profiler laddade.`);
    return mockProfiles;
  } catch (error) {
    console.error("[Profiles] Fel vid laddning:", error);
    return [];
  }
}

/**
 * Visar profiler i UI.
 */
function displayGodManProfiles(profiles) {
  const container = document.getElementById("godmanProfilesList");
  if (!container) return;

  if (profiles.length === 0) {
    container.innerHTML = "<p>Inga profiler skapade än.</p>";
    return;
  }

  container.innerHTML = profiles
    .map(
      profile => `
    <div class="profile-card" data-profile-id="${profile.ProfilID}">
      <h4>${profile.Fornamn} ${profile.Efternamn}</h4>
      <p>${profile.Personnummer}</p>
      <button onclick="setActiveGodManProfileById(${profile.ProfilID})">
        Välj profil
      </button>
    </div>
  `
    )
    .join("");
}

// Exportera globalt
window.loadGodManProfiles = loadGodManProfiles;
window.setActiveGodManProfileById = setActiveGodManProfileById;

console.log("[Profiles] profiles.js laddad.");
// ============================================================
// LADDA ALLA GOD MAN-PROFILER
// ============================================================

/**
 * Laddar alla God Man-profiler från servern och fyller listan.
 */
export async function loadAllGodManProfiles() {
  console.log("[God Man] Laddar alla profiler...");

  try {
    const response = await fetch("/api/get_godman_profiles.php", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const profiles = await response.json();

    if (!Array.isArray(profiles)) {
      throw new Error("Servern returnerade inte en array av profiler.");
    }

    console.log(`[God Man] ${profiles.length} profiler laddade.`);

    // Rendera profillistan
    renderGodManProfileList(profiles);

    // Sätt första profilen som aktiv om ingen är vald
    if (profiles.length > 0 && !activeGodManProfile) {
      setActiveGodManProfile(profiles[0]);
    }

    return profiles;
  } catch (error) {
    console.error("[God Man] Fel vid laddning av profiler:", error);
    alert("Kunde inte ladda God Man-profiler: " + error.message);
    return [];
  }
}

// ============================================================
// RENDERA PROFILLISTA
// ============================================================

/**
 * Renderar listan över God Man-profiler i gränssnittet.
 * @param {array} profiles - Array med profiler
 */
function renderGodManProfileList(profiles) {
  const container = document.getElementById("godManProfilesList");
  if (!container) {
    console.warn("[God Man] Container 'godManProfilesList' hittades inte.");
    return;
  }

  container.innerHTML = "";

  if (profiles.length === 0) {
    container.innerHTML = '<p class="muted">Inga God Man-profiler finns ännu. Skapa en ny profil nedan.</p>';
    return;
  }

  profiles.forEach(profile => {
    const profileCard = createGodManProfileCard(profile);
    container.appendChild(profileCard);
  });
}

/**
 * Skapar ett kort för en God Man-profil.
 * @param {object} profile - Profilobjekt
 * @returns {HTMLElement}
 */
function createGodManProfileCard(profile) {
  const div = document.createElement("div");
  div.className = "godman-profile-card";

  const id = getCaseInsensitive(profile, "ID", "Id", "id");
  const fornamn = getCaseInsensitive(profile, "Fornamn", "fornamn") || "";
  const efternamn = getCaseInsensitive(profile, "Efternamn", "efternamn") || "";
  const personnummer = getCaseInsensitive(profile, "Personnummer", "personnummer") || "";
  const telefon = getCaseInsensitive(profile, "Telefon", "telefon") || "";
  const epost = getCaseInsensitive(profile, "Epost", "epost", "Email", "email") || "";
  const isActive = activeGodManProfile && getCaseInsensitive(activeGodManProfile, "ID") === id;

  div.innerHTML = `
    <div class="profile-header">
      <h4>${safe(fornamn)} ${safe(efternamn)}</h4>
      ${isActive ? '<span class="badge success">Aktiv</span>' : ""}
    </div>
    <div class="profile-details">
      <p><strong>Personnummer:</strong> ${safe(personnummer)}</p>
      <p><strong>Telefon:</strong> ${safe(telefon)}</p>
      <p><strong>E-post:</strong> ${safe(epost)}</p>
    </div>
    <div class="profile-actions">
      ${
        !isActive ? `<button class="small primary" onclick="setActiveGodManProfile(${id})">Välj som aktiv</button>` : ""
      }
      <button class="small secondary" onclick="editGodManProfile(${id})">Redigera</button>
      <button class="small danger" onclick="deleteGodManProfile(${id})">Ta bort</button>
    </div>
  `;

  if (isActive) {
    div.classList.add("active-profile");
  }

  return div;
}

// ============================================================
// REDIGERA PROFIL
// ============================================================

/**
 * Öppnar formulär för att redigera en God Man-profil.
 * @param {number} profileId - Profil-ID
 */
export async function editGodManProfile(profileId) {
  console.log(`[God Man] Redigerar profil ${profileId}...`);

  try {
    const response = await fetch(`/api/get_godman_profile.php?id=${profileId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Kunde inte hämta profilen.");
    }

    const profile = await response.json();

    // Fyll formuläret
    fillGodManProfileForm(profile);

    // Visa modalen
    const modal = document.getElementById("godManProfileModal");
    if (modal) {
      modal.style.display = "block";
    }

    // Sätt formuläret i redigeringsläge
    const form = document.getElementById("godManProfileForm");
    if (form) {
      form.dataset.mode = "edit";
      form.dataset.profileId = profileId;
    }

    // Uppdatera modal-titeln
    const modalTitle = document.getElementById("godManProfileModalTitle");
    if (modalTitle) {
      modalTitle.textContent = "Redigera God Man-profil";
    }
  } catch (error) {
    console.error("[God Man] Fel vid redigering:", error);
    alert("Kunde inte ladda profilen för redigering: " + error.message);
  }
}

/**
 * Fyller formuläret med profildata.
 * @param {object} profile - Profilobjekt
 */
function fillGodManProfileForm(profile) {
  const fields = [
    "Fornamn",
    "Efternamn",
    "Personnummer",
    "Adress",
    "Postnummer",
    "Postort",
    "Telefon",
    "Mobil",
    "Epost",
    "Bankgiro",
    "Plusgiro",
    "Banknamn",
    "Clearingnummer",
    "Kontonummer",
  ];

  fields.forEach(field => {
    const input = document.getElementById(`gm${field}`);
    if (input) {
      const value = getCaseInsensitive(profile, field, field.toLowerCase());
      input.value = value || "";
    }
  });
}

// ============================================================
// TA BORT PROFIL
// ============================================================

/**
 * Tar bort en God Man-profil efter bekräftelse.
 * @param {number} profileId - Profil-ID
 */
export async function deleteGodManProfile(profileId) {
  const confirmed = confirm("Är du säker på att du vill ta bort denna God Man-profil?\n\nDetta går inte att ångra.");

  if (!confirmed) return;

  try {
    const response = await fetch(`/api/delete_godman_profile.php?id=${profileId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Kunde inte ta bort profilen.");
    }

    console.log("[God Man] Profil borttagen:", profileId);

    // Om det var den aktiva profilen, nollställ
    if (activeGodManProfile && getCaseInsensitive(activeGodManProfile, "ID") === profileId) {
      activeGodManProfile = null;
      window.activeGodManProfile = null;
    }

    // Ladda om listan
    await loadAllGodManProfiles();

    showNotification("God Man-profilen har tagits bort.", "success");
  } catch (error) {
    console.error("[God Man] Fel vid borttagning:", error);
    alert("Kunde inte ta bort profilen: " + error.message);
  }
}

// ============================================================
// SPARA PROFIL (NY ELLER UPPDATERA)
// ============================================================

/**
 * Sparar en God Man-profil (ny eller uppdaterad).
 * @param {Event} event - Submit-event från formuläret
 */
export async function saveGodManProfile(event) {
  if (event) event.preventDefault();

  const form = document.getElementById("godManProfileForm");
  if (!form) {
    console.error("[God Man] Formulär hittades inte.");
    return;
  }

  const mode = form.dataset.mode || "create";
  const profileId = form.dataset.profileId || null;

  // Samla data från formuläret
  const data = {};
  const fields = [
    "Fornamn",
    "Efternamn",
    "Personnummer",
    "Adress",
    "Postnummer",
    "Postort",
    "Telefon",
    "Mobil",
    "Epost",
    "Bankgiro",
    "Plusgiro",
    "Banknamn",
    "Clearingnummer",
    "Kontonummer",
  ];

  fields.forEach(field => {
    const input = document.getElementById(`gm${field}`);
    if (input) {
      data[field] = input.value.trim() || null;
    }
  });

  // Validering
  if (!data.Fornamn || !data.Efternamn) {
    alert("Förnamn och efternamn krävs.");
    return;
  }

  if (data.Personnummer) {
    data.Personnummer = pnr12(data.Personnummer);
  }

  try {
    let response;

    if (mode === "edit" && profileId) {
      // Uppdatera befintlig profil
      response = await fetch(`/api/update_godman_profile.php?id=${profileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      // Skapa ny profil
      response = await fetch("/api/create_godman_profile.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Kunde inte spara profilen.");
    }

    console.log("[God Man] Profil sparad:", result);

    // Stäng modalen
    closeGodManProfileModal();

    // Ladda om listan
    await loadAllGodManProfiles();

    const message = mode === "edit" ? "God Man-profilen har uppdaterats." : "Ny God Man-profil har skapats.";

    showNotification(message, "success");
  } catch (error) {
    console.error("[God Man] Fel vid sparande:", error);
    alert("Kunde inte spara profilen: " + error.message);
  }
}

// ============================================================
// MODAL-HANTERING
// ============================================================

/**
 * Öppnar modal för att skapa ny profil.
 */
export function openNewGodManProfileModal() {
  const modal = document.getElementById("godManProfileModal");
  const form = document.getElementById("godManProfileForm");
  const modalTitle = document.getElementById("godManProfileModalTitle");

  if (form) {
    form.reset();
    form.dataset.mode = "create";
    delete form.dataset.profileId;
  }

  if (modalTitle) {
    modalTitle.textContent = "Skapa ny God Man-profil";
  }

  if (modal) {
    modal.style.display = "block";
  }
}

/**
 * Stänger God Man-profil modalen.
 */
export function closeGodManProfileModal() {
  const modal = document.getElementById("godManProfileModal");
  if (modal) {
    modal.style.display = "none";
  }

  const form = document.getElementById("godManProfileForm");
  if (form) {
    form.reset();
    delete form.dataset.mode;
    delete form.dataset.profileId;
  }
}

// ============================================================
// NOTIFIKATIONER
// ============================================================

/**
 * Visar en notifikation till användaren.
 * @param {string} message - Meddelande
 * @param {string} type - Typ: "success", "error", "info"
 */
function showNotification(message, type = "info") {
  // Enkel implementation - kan förbättras med toast-bibliotek
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3"};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.loadAllGodManProfiles = loadAllGodManProfiles;
window.setActiveGodManProfile = setActiveGodManProfile;
window.editGodManProfile = editGodManProfile;
window.deleteGodManProfile = deleteGodManProfile;
window.saveGodManProfile = saveGodManProfile;
window.openNewGodManProfileModal = openNewGodManProfileModal;
window.closeGodManProfileModal = closeGodManProfileModal;
window.activeGodManProfile = activeGodManProfile;
