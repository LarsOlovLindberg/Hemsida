// ============================================================
// main.js - Entry point för applikationen
// Sökväg: js/main.js
// ============================================================

import { initState } from "./state.js";
import { loadAllHuvudman, selectHuvudman } from "./modules/huvudman/huvudman.js";
import { loadAllOverformyndare } from "./modules/overformyndare/overformyndare.js";
import { initDashboard } from "./modules/dashboard/dashboard.js";
import { loadGodManProfiles, setActiveGodManProfileById } from "./modules/godman/profiles.js";
import { initializeArvodesListeners } from "./modules/godman/arvoden.js";
import { initializeRedogorelseListeners } from "./modules/redogorelse/redogorelse.js";
import { setupNavigation, switchTab } from "./modules/ui/navigation.js";
import { setupGlobalEventListeners } from "./modules/ui/events.js";

// ============================================================
// APPLIKATIONSKONFIGURATION
// ============================================================

const APP_CONFIG = {
  name: "God Man System",
  version: "1.0.0",
  environment: "production", // 'development' eller 'production'
  api: {
    baseUrl: "/api",
    timeout: 30000,
  },
  features: {
    autoSave: true,
    autoSaveInterval: 30000,
    ocr: true,
    pdf: true,
    exports: true,
  },
  debug: false,
};

// ============================================================
// INITIALISERING
// ============================================================

/**
 * Huvudinitialiseringsfunktion.
 * Anropas när DOM är färdigladdad.
 */
async function initializeApp() {
  console.log("=".repeat(60));
  console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version}`);
  console.log("=".repeat(60));
  console.log("[Main] Startar applikation...");

  try {
    // 1. Visa laddningsskärm
    showLoadingScreen("Initierar applikation...");

    // 2. Initiera state
    console.log("[Main] Initierar state-system...");
    initState();

    // 3. Verifiera kritiska bibliotek
    console.log("[Main] Verifierar bibliotek...");
    await verifyLibraries();

    // 4. Konfigurera applikationen
    console.log("[Main] Konfigurerar applikation...");
    configureApp();

    // 5. Initiera UI-komponenter
    console.log("[Main] Initierar UI-komponenter...");
    initializeUI();

    // 6. Ladda initial data
    console.log("[Main] Laddar initial data...");
    await loadInitialData();

    // 7. Sätt upp event listeners
    console.log("[Main] Sätter upp event listeners...");
    setupEventListeners();

    // 8. Återställ tidigare session (om tillämpligt)
    console.log("[Main] Återställer session...");
    restoreSession();

    // 9. Initiera specifika moduler
    console.log("[Main] Initierar moduler...");
    await initializeModules();

    // 10. Dölj laddningsskärm
    hideLoadingScreen();

    // 11. Visa välkomstmeddelande
    showWelcomeMessage();

    console.log("[Main] ✅ Applikation initierad och redo!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("[Main] ❌ Kritiskt fel vid initialisering:", error);
    hideLoadingScreen();
    showErrorScreen("Kunde inte starta applikationen", error);
  }
}

// ============================================================
// VERIFIERING
// ============================================================

/**
 * Verifierar att alla nödvändiga bibliotek är laddade.
 */
async function verifyLibraries() {
  const required = [
    { name: "PDFLib", obj: window.PDFLib, critical: false },
    { name: "fontkit", obj: window.fontkit, critical: false },
    { name: "Tesseract", obj: window.Tesseract, critical: false },
  ];

  const missing = [];
  const warnings = [];

  required.forEach(lib => {
    if (!lib.obj) {
      if (lib.critical) {
        missing.push(lib.name);
      } else {
        warnings.push(lib.name);
      }
    }
  });

  if (missing.length > 0) {
    throw new Error(`Kritiska bibliotek saknas: ${missing.join(", ")}`);
  }

  if (warnings.length > 0) {
    console.warn(`[Main] ⚠️ Valfria bibliotek saknas (funktionalitet begränsad): ${warnings.join(", ")}`);
  }

  console.log("[Main] ✅ Alla kritiska bibliotek verifierade.");
}

// ============================================================
// KONFIGURATION
// ============================================================

/**
 * Konfigurerar applikationen baserat på miljö och inställningar.
 */
function configureApp() {
  // Sätt debug-läge
  if (APP_CONFIG.debug || APP_CONFIG.environment === "development") {
    console.log("[Main] Debug-läge aktiverat.");
    window.APP_DEBUG = true;
  }

  // Konfigurera API-anrop
  window.API_BASE_URL = APP_CONFIG.api.baseUrl;
  window.API_TIMEOUT = APP_CONFIG.api.timeout;

  // Sätt app-version i DOM
  const versionEl = document.getElementById("appVersion");
  if (versionEl) {
    versionEl.textContent = `v${APP_CONFIG.version}`;
  }

  console.log("[Main] ✅ Applikation konfigurerad.");
}

// ============================================================
// UI-INITIALISERING
// ============================================================

/**
 * Initierar UI-komponenter.
 */
function initializeUI() {
  // Sätt upp navigation
  setupNavigation();

  // Sätt standard-flik
  const defaultTab = localStorage.getItem("lastActiveTab") || "tab-huvudman";
  switchTab(defaultTab);

  // Initiera tooltips (om Bootstrap används)
  if (typeof window.bootstrap !== "undefined") {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(el => new window.bootstrap.Tooltip(el));
  }

  // Initiera modaler
  initializeModals();

  // Sätt upp sidebar toggle
  setupSidebarToggle();

  // Dark mode toggle
  setupDarkModeToggle();

  console.log("[Main] ✅ UI-komponenter initierade.");
}

/**
 * Initierar modaler.
 */
function initializeModals() {
  // Stäng modal vid klick på backdrop
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  });

  // Stäng modal med ESC
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal").forEach(modal => {
        if (modal.style.display === "block") {
          modal.style.display = "none";
        }
      });
    }
  });
}

/**
 * Sätter upp sidebar toggle.
 */
function setupSidebarToggle() {
  const toggleBtn = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      localStorage.setItem("sidebarCollapsed", sidebar.classList.contains("collapsed"));
    });

    // Återställ tidigare state
    const wasCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    if (wasCollapsed) {
      sidebar.classList.add("collapsed");
    }
  }
}

/**
 * Sätter upp dark mode toggle.
 */
function setupDarkModeToggle() {
  const toggleBtn = document.getElementById("darkModeToggle");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      const isDark = document.body.classList.contains("dark-mode");
      localStorage.setItem("darkMode", isDark);

      // Uppdatera ikon
      const icon = toggleBtn.querySelector("i");
      if (icon) {
        icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
      }
    });

    // Återställ tidigare state
    const wasDark = localStorage.getItem("darkMode") === "true";
    if (wasDark) {
      document.body.classList.add("dark-mode");
      const icon = toggleBtn.querySelector("i");
      if (icon) icon.className = "fas fa-sun";
    }
  }
}

// ============================================================
// DATA-LADDNING
// ============================================================

/**
 * Laddar initial data från servern.
 */
async function loadInitialData() {
  const tasks = [];

  // Ladda överförmyndare
  tasks.push(
    loadAllOverformyndare()
      .then(() => console.log("[Main] ✅ Överförmyndare laddade."))
      .catch(err => console.error("[Main] ❌ Kunde inte ladda överförmyndare:", err))
  );

  // Ladda huvudmän
  tasks.push(
    loadAllHuvudman()
      .then(() => console.log("[Main] ✅ Huvudmän laddade."))
      .catch(err => console.error("[Main] ❌ Kunde inte ladda huvudmän:", err))
  );

  // Ladda God man-profiler
  tasks.push(
    loadGodManProfiles()
      .then(() => console.log("[Main] ✅ God man-profiler laddade."))
      .catch(err => console.error("[Main] ❌ Kunde inte ladda God man-profiler:", err))
  );

  // Vänta på alla tasks
  await Promise.allSettled(tasks);

  console.log("[Main] ✅ Initial data laddad.");
}

// ============================================================
// EVENT LISTENERS
// ============================================================

/**
 * Sätter upp alla globala event listeners.
 */
function setupEventListeners() {
  // Global event handlers
  setupGlobalEventListeners();

  // Specifika modul-listeners
  initializeArvodesListeners();
  initializeRedogorelseListeners();

  // Auto-save
  if (APP_CONFIG.features.autoSave) {
    setupAutoSave();
  }

  // Session timeout warning
  setupSessionTimeout();

  // Online/offline detection
  setupOnlineOfflineDetection();

  // Före-lämna-sidan varning
  setupBeforeUnloadWarning();

  console.log("[Main] ✅ Event listeners konfigurerade.");
}

/**
 * Sätter upp auto-save funktionalitet.
 */
function setupAutoSave() {
  let autoSaveTimer;

  const startAutoSave = () => {
    if (autoSaveTimer) clearInterval(autoSaveTimer);

    autoSaveTimer = setInterval(() => {
      const hasUnsavedChanges = checkForUnsavedChanges();
      if (hasUnsavedChanges) {
        console.log("[Main] Auto-save triggad...");
        // Anropa relevant save-funktion beroende på aktiv flik
        // Detta kan implementeras mer specifikt senare
      }
    }, APP_CONFIG.features.autoSaveInterval);
  };

  if (APP_CONFIG.features.autoSave) {
    startAutoSave();
    console.log(`[Main] Auto-save aktiverad (${APP_CONFIG.features.autoSaveInterval / 1000}s intervall).`);
  }
}

/**
 * Kontrollerar om det finns osparade ändringar.
 * @returns {boolean}
 */
function checkForUnsavedChanges() {
  // Implementera logik för att detektera osparade ändringar
  // T.ex. jämför formulärdata med sparad data
  return false; // Placeholder
}

/**
 * Sätter upp session timeout varning.
 */
function setupSessionTimeout() {
  const TIMEOUT_WARNING = 25 * 60 * 1000; // 25 minuter
  const TIMEOUT_LOGOUT = 30 * 60 * 1000; // 30 minuter

  let warningTimer;
  let logoutTimer;

  const resetTimers = () => {
    if (warningTimer) clearTimeout(warningTimer);
    if (logoutTimer) clearTimeout(logoutTimer);

    warningTimer = setTimeout(() => {
      showNotification("Din session löper snart ut. Spara ditt arbete.", "warning");
    }, TIMEOUT_WARNING);

    logoutTimer = setTimeout(() => {
      showNotification("Session har löpt ut på grund av inaktivitet.", "error");
      // Här kan man logga ut användaren om det finns autentisering
    }, TIMEOUT_LOGOUT);
  };

  // Återställ timers vid aktivitet
  ["click", "keypress", "scroll", "mousemove"].forEach(event => {
    document.addEventListener(event, resetTimers, { passive: true });
  });

  resetTimers();
}

/**
 * Sätter upp online/offline detection.
 */
function setupOnlineOfflineDetection() {
  window.addEventListener("online", () => {
    showNotification("Anslutning återställd.", "success");
    console.log("[Main] Online");
  });

  window.addEventListener("offline", () => {
    showNotification("Ingen internetanslutning. Vissa funktioner kan vara begränsade.", "warning");
    console.log("[Main] Offline");
  });
}

/**
 * Sätter upp varning vid försök att lämna sidan med osparade ändringar.
 */
function setupBeforeUnloadWarning() {
  window.addEventListener("beforeunload", e => {
    if (checkForUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = "Du har osparade ändringar. Är du säker på att du vill lämna sidan?";
      return e.returnValue;
    }
  });
}

// ============================================================
// SESSION-HANTERING
// ============================================================

/**
 * Återställer tidigare session om möjligt.
 */
function restoreSession() {
  // Återställ senast vald huvudman
  const lastHuvudmanPnr = localStorage.getItem("lastSelectedHuvudman");
  if (lastHuvudmanPnr) {
    console.log(`[Main] Återställer huvudman: ${lastHuvudmanPnr}`);
    selectHuvudman(lastHuvudmanPnr).catch(err => {
      console.warn("[Main] Kunde inte återställa huvudman:", err);
    });
  }

  // Återställ senast vald God man-profil
  const lastProfileId = localStorage.getItem("lastSelectedGodManProfile");
  if (lastProfileId) {
    console.log(`[Main] Återställer God man-profil: ${lastProfileId}`);
    setActiveGodManProfileById(parseInt(lastProfileId)).catch(err => {
      console.warn("[Main] Kunde inte återställa God man-profil:", err);
    });
  }

  // Återställ filter
  const savedFilters = localStorage.getItem("filters");
  if (savedFilters) {
    try {
      const filters = JSON.parse(savedFilters);
      // Applicera filter här
      console.log("[Main] Filter återställda:", filters);
    } catch (err) {
      console.warn("[Main] Kunde inte återställa filter:", err);
    }
  }

  console.log("[Main] ✅ Session återställd.");
}

// ============================================================
// MODUL-INITIALISERING
// ============================================================

/**
 * Initierar specifika moduler som kräver särskild setup.
 */
async function initializeModules() {
  // Initiera dashboard
  if (typeof initDashboard === "function") {
    try {
      await initDashboard();
      console.log("[Main] ✅ Dashboard initierad.");
    } catch (err) {
      console.error("[Main] ❌ Kunde inte initiera dashboard:", err);
    }
  }

  // Lägg till fler modul-initialiseringar här vid behov
}

// ============================================================
// UI FEEDBACK
// ============================================================

/**
 * Visar laddningsskärm.
 * @param {string} message - Meddelande att visa
 */
function showLoadingScreen(message = "Laddar...") {
  let loader = document.getElementById("appLoader");

  if (!loader) {
    loader = document.createElement("div");
    loader.id = "appLoader";
    loader.className = "app-loader";
    loader.innerHTML = `
      <div class="loader-content">
        <div class="spinner"></div>
        <p class="loader-message">${message}</p>
      </div>
    `;
    document.body.appendChild(loader);
  } else {
    const msg = loader.querySelector(".loader-message");
    if (msg) msg.textContent = message;
  }

  loader.style.display = "flex";
}

/**
 * Döljer laddningsskärm.
 */
function hideLoadingScreen() {
  const loader = document.getElementById("appLoader");
  if (loader) {
    loader.style.display = "none";
  }
}

/**
 * Visar felskärm.
 * @param {string} message - Felmeddelande
 * @param {Error} error - Felobjekt
 */
function showErrorScreen(message, error) {
  const errorScreen = document.createElement("div");
  errorScreen.className = "error-screen";
  errorScreen.innerHTML = `
    <div class="error-content">
      <i class="fas fa-exclamation-triangle"></i>
      <h2>${message}</h2>
      <p>${error?.message || "Ett okänt fel uppstod"}</p>
      <button onclick="location.reload()" class="btn btn-primary">
        Ladda om sidan
      </button>
      ${APP_CONFIG.debug ? `<pre class="error-stack">${error?.stack || ""}</pre>` : ""}
    </div>
  `;
  document.body.innerHTML = "";
  document.body.appendChild(errorScreen);
}

/**
 * Visar välkomstmeddelande.
 */
function showWelcomeMessage() {
  const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");

  if (!hasSeenWelcome) {
    showNotification(`Välkommen till ${APP_CONFIG.name}! Välj en huvudman för att komma igång.`, "info", 5000);
    localStorage.setItem("hasSeenWelcome", "true");
  }
}

/**
 * Visar en notifikation/toast.
 * @param {string} message - Meddelande
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Varaktighet i ms
 */
function showNotification(message, type = "info", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fas fa-${getIconForType(type)}"></i>
    <span>${message}</span>
  `;

  const container = document.getElementById("toastContainer") || createToastContainer();
  container.appendChild(toast);

  // Animera in
  setTimeout(() => toast.classList.add("show"), 10);

  // Ta bort efter duration
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Skapar toast-container om den inte finns.
 * @returns {HTMLElement}
 */
function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toastContainer";
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

/**
 * Hämtar ikon baserat på notifikationstyp.
 * @param {string} type - Notifikationstyp
 * @returns {string}
 */
function getIconForType(type) {
  const icons = {
    success: "check-circle",
    error: "exclamation-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };
  return icons[type] || "info-circle";
}

// ============================================================
// ERROR HANDLING
// ============================================================

/**
 * Global error handler.
 */
window.addEventListener("error", event => {
  console.error("[Main] Global error:", event.error);

  if (APP_CONFIG.debug) {
    showNotification(`Fel: ${event.error?.message || "Okänt fel"}`, "error", 5000);
  }
});

/**
 * Global unhandled rejection handler.
 */
window.addEventListener("unhandledrejection", event => {
  console.error("[Main] Unhandled rejection:", event.reason);

  if (APP_CONFIG.debug) {
    showNotification(`Promise-fel: ${event.reason?.message || "Okänt fel"}`, "error", 5000);
  }
});

// ============================================================
// EXPORTERA FUNKTIONER GLOBALT
// ============================================================

window.showNotification = showNotification;
window.showLoadingScreen = showLoadingScreen;
window.hideLoadingScreen = hideLoadingScreen;
window.APP_CONFIG = APP_CONFIG;

// ============================================================
// STARTA APPLIKATIONEN
// ============================================================

// Vänta på att DOM ska vara färdigladdat
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  // DOM är redan laddad
  initializeApp();
}

console.log("[Main] main.js laddad och redo.");
