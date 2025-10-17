// ============================================================
// state.js - Global state-hantering
// Sökväg: js/state.js
// ============================================================

/**
 * Global state för applikationen.
 * Innehåller all data som behöver delas mellan moduler.
 */
const state = {
  // Användarinformation
  user: {
    isLoggedIn: false,
    username: null,
    role: null, // 'admin', 'godman', 'viewer'
  },

  // Aktiv huvudman
  currentHuvudman: {
    personnummer: null,
    fullData: null, // Komplett huvudmandata från servern
    details: null, // huvudmanDetails
    documents: [],
    bankkonton: [],
    arsrakningData: null,
    redogorelseData: null,
  },

  // Aktiv God man-profil
  activeGodManProfile: null,

  // Alla överförmyndare (cachad)
  allOverformyndare: [],

  // Alla huvudmän (cachad för dropdown)
  allHuvudman: [],

  // UI state
  ui: {
    activeTab: "tab-huvudman",
    lastVisitedTab: null,
    sidebarCollapsed: false,
    darkMode: false,
  },

  // Filter och sortering
  filters: {
    overformyndareId: null,
    includeInactive: false,
    searchQuery: "",
  },

  // Loading states
  loading: {
    huvudman: false,
    overformyndare: false,
    arsrakning: false,
    documents: false,
  },

  // Error states
  errors: {
    lastError: null,
    errorLog: [],
  },

  // Applikationsinställningar
  settings: {
    autoSave: true,
    autoSaveInterval: 30000, // 30 sekunder
    confirmOnDelete: true,
    showDebugInfo: false,
    dateFormat: "sv-SE",
    currencyFormat: "sv-SE",
  },

  // Session info
  session: {
    startTime: null,
    lastActivity: null,
    timeoutWarning: false,
  },
};

// ============================================================
// STATE GETTERS
// ============================================================

/**
 * Hämtar hela state-objektet.
 * @returns {object}
 */
export function getState() {
  return state;
}

/**
 * Hämtar aktiv huvudman.
 * @returns {object|null}
 */
export function getCurrentHuvudman() {
  return state.currentHuvudman.fullData;
}

/**
 * Hämtar personnummer för aktiv huvudman.
 * @returns {string|null}
 */
export function getCurrentHuvudmanPnr() {
  return state.currentHuvudman.personnummer;
}

/**
 * Hämtar aktiv God man-profil.
 * @returns {object|null}
 */
export function getActiveGodManProfile() {
  return state.activeGodManProfile;
}

/**
 * Hämtar alla överförmyndare.
 * @returns {array}
 */
export function getAllOverformyndare() {
  return state.allOverformyndare;
}

/**
 * Hämtar aktiv flik.
 * @returns {string}
 */
export function getActiveTab() {
  return state.ui.activeTab;
}

/**
 * Hämtar filter-inställningar.
 * @returns {object}
 */
export function getFilters() {
  return state.filters;
}

/**
 * Hämtar en specifik inställning.
 * @param {string} key - Inställningens nyckel
 * @returns {*}
 */
export function getSetting(key) {
  return state.settings[key];
}

// ============================================================
// STATE SETTERS
// ============================================================

/**
 * Sätter aktiv huvudman.
 * @param {string} personnummer - Personnummer
 * @param {object} data - Komplett huvudmandata
 */
export function setCurrentHuvudman(personnummer, data) {
  state.currentHuvudman.personnummer = personnummer;
  state.currentHuvudman.fullData = data;
  state.currentHuvudman.details = data?.huvudmanDetails || null;
  state.currentHuvudman.documents = data?.documents || [];
  state.currentHuvudman.bankkonton = data?.bankkonton || [];
  state.currentHuvudman.arsrakningData = data?.arsrakningData || null;
  state.currentHuvudman.redogorelseData = data?.redogorelseData || null;

  // Trigga event
  dispatchStateChange("currentHuvudman", state.currentHuvudman);

  console.log("[State] Aktiv huvudman satt:", personnummer);
}

/**
 * Rensar aktiv huvudman.
 */
export function clearCurrentHuvudman() {
  state.currentHuvudman = {
    personnummer: null,
    fullData: null,
    details: null,
    documents: [],
    bankkonton: [],
    arsrakningData: null,
    redogorelseData: null,
  };

  dispatchStateChange("currentHuvudman", null);
  console.log("[State] Aktiv huvudman rensad.");
}

/**
 * Sätter aktiv God man-profil.
 * @param {object} profile - Profilobjekt
 */
export function setActiveGodManProfile(profile) {
  state.activeGodManProfile = profile;
  dispatchStateChange("activeGodManProfile", profile);
  console.log("[State] Aktiv God man-profil satt:", profile?.Fornamn, profile?.Efternamn);
}

/**
 * Sätter alla överförmyndare.
 * @param {array} list - Lista med överförmyndare
 */
export function setAllOverformyndare(list) {
  state.allOverformyndare = list || [];
  dispatchStateChange("allOverformyndare", state.allOverformyndare);
  console.log(`[State] ${state.allOverformyndare.length} överförmyndare cachade.`);
}

/**
 * Sätter alla huvudmän.
 * @param {array} list - Lista med huvudmän
 */
export function setAllHuvudman(list) {
  state.allHuvudman = list || [];
  dispatchStateChange("allHuvudman", state.allHuvudman);
  console.log(`[State] ${state.allHuvudman.length} huvudmän cachade.`);
}

/**
 * Sätter aktiv flik.
 * @param {string} tabId - Flik-ID
 */
export function setActiveTab(tabId) {
  state.ui.lastVisitedTab = state.ui.activeTab;
  state.ui.activeTab = tabId;
  dispatchStateChange("activeTab", tabId);
  console.log("[State] Aktiv flik:", tabId);
}

/**
 * Sätter filter för överförmyndare.
 * @param {string|null} overformyndareId - Överförmyndare-ID
 */
export function setOverformyndareFilter(overformyndareId) {
  state.filters.overformyndareId = overformyndareId;
  dispatchStateChange("filters", state.filters);
}

/**
 * Sätter om inaktiva huvudmän ska inkluderas.
 * @param {boolean} include - true/false
 */
export function setIncludeInactive(include) {
  state.filters.includeInactive = include;
  dispatchStateChange("filters", state.filters);
}

/**
 * Sätter sökfråga.
 * @param {string} query - Sökfråga
 */
export function setSearchQuery(query) {
  state.filters.searchQuery = query;
  dispatchStateChange("filters", state.filters);
}

/**
 * Sätter loading state.
 * @param {string} key - Nyckel (t.ex. 'huvudman', 'arsrakning')
 * @param {boolean} isLoading - true/false
 */
export function setLoading(key, isLoading) {
  state.loading[key] = isLoading;
  dispatchStateChange("loading", state.loading);
}

/**
 * Sätter ett fel.
 * @param {Error|string} error - Felobjekt eller felmeddelande
 */
export function setError(error) {
  const errorObj = {
    message: error?.message || String(error),
    timestamp: new Date().toISOString(),
    stack: error?.stack || null,
  };

  state.errors.lastError = errorObj;
  state.errors.errorLog.push(errorObj);

  // Behåll bara de senaste 50 felen
  if (state.errors.errorLog.length > 50) {
    state.errors.errorLog.shift();
  }

  dispatchStateChange("error", errorObj);
  console.error("[State] Fel registrerat:", errorObj);
}

/**
 * Rensar senaste felet.
 */
export function clearLastError() {
  state.errors.lastError = null;
  dispatchStateChange("error", null);
}

/**
 * Sätter en inställning.
 * @param {string} key - Inställningens nyckel
 * @param {*} value - Värde
 */
export function setSetting(key, value) {
  if (key in state.settings) {
    state.settings[key] = value;
    saveSettingsToLocalStorage();
    dispatchStateChange("settings", state.settings);
    console.log(`[State] Inställning '${key}' satt till:`, value);
  } else {
    console.warn(`[State] Okänd inställning: ${key}`);
  }
}

/**
 * Uppdaterar session-aktivitet.
 */
export function updateSessionActivity() {
  state.session.lastActivity = new Date().toISOString();
}

// ============================================================
// EVENT SYSTEM
// ============================================================

const stateListeners = {};

/**
 * Lyssnar på state-ändringar.
 * @param {string} key - State-nyckel att lyssna på
 * @param {function} callback - Callback-funktion
 * @returns {function} - Unsubscribe-funktion
 */
export function onStateChange(key, callback) {
  if (!stateListeners[key]) {
    stateListeners[key] = [];
  }

  stateListeners[key].push(callback);

  // Returnera unsubscribe-funktion
  return () => {
    const index = stateListeners[key].indexOf(callback);
    if (index > -1) {
      stateListeners[key].splice(index, 1);
    }
  };
}

/**
 * Triggar state-change event.
 * @param {string} key - State-nyckel
 * @param {*} value - Nytt värde
 */
function dispatchStateChange(key, value) {
  if (stateListeners[key]) {
    stateListeners[key].forEach(callback => {
      try {
        callback(value);
      } catch (error) {
        console.error(`[State] Fel i state listener för '${key}':`, error);
      }
    });
  }

  // Trigga också ett globalt event
  if (stateListeners["*"]) {
    stateListeners["*"].forEach(callback => {
      try {
        callback(key, value);
      } catch (error) {
        console.error("[State] Fel i global state listener:", error);
      }
    });
  }
}

// ============================================================
// PERSISTENCE (LocalStorage)
// ============================================================

const STORAGE_KEY = "godman_app_state";

/**
 * Sparar settings till localStorage.
 */
function saveSettingsToLocalStorage() {
  try {
    const dataToSave = {
      settings: state.settings,
      ui: {
        darkMode: state.ui.darkMode,
        sidebarCollapsed: state.ui.sidebarCollapsed,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.warn("[State] Kunde inte spara till localStorage:", error);
  }
}

/**
 * Laddar settings från localStorage.
 */
export function loadSettingsFromLocalStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);

      if (data.settings) {
        Object.assign(state.settings, data.settings);
      }

      if (data.ui) {
        Object.assign(state.ui, data.ui);
      }

      console.log("[State] Inställningar laddade från localStorage.");
    }
  } catch (error) {
    console.warn("[State] Kunde inte ladda från localStorage:", error);
  }
}

/**
 * Rensar all sparad data från localStorage.
 */
export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[State] localStorage rensad.");
  } catch (error) {
    console.warn("[State] Kunde inte rensa localStorage:", error);
  }
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

/**
 * Initierar session.
 */
export function initSession() {
  state.session.startTime = new Date().toISOString();
  state.session.lastActivity = new Date().toISOString();
  console.log("[State] Session initierad.");
}

/**
 * Kontrollerar om sessionen är aktiv.
 * @param {number} timeoutMinutes - Timeout i minuter (default 30)
 * @returns {boolean}
 */
export function isSessionActive(timeoutMinutes = 30) {
  if (!state.session.lastActivity) return false;

  const lastActivity = new Date(state.session.lastActivity);
  const now = new Date();
  const diffMinutes = (now - lastActivity) / 1000 / 60;

  return diffMinutes < timeoutMinutes;
}

/**
 * Avslutar session.
 */
export function endSession() {
  clearCurrentHuvudman();
  state.activeGodManProfile = null;
  state.session.startTime = null;
  state.session.lastActivity = null;
  console.log("[State] Session avslutad.");
}

// ============================================================
// DEBUG & UTILITIES
// ============================================================

/**
 * Loggar hela state till konsolen (för debugging).
 */
export function debugState() {
  console.log("[State Debug] Aktuellt state:", JSON.parse(JSON.stringify(state)));
}

/**
 * Exporterar state som JSON (för debugging/backup).
 * @returns {string}
 */
export function exportState() {
  return JSON.stringify(state, null, 2);
}

/**
 * Återställer state till standardvärden.
 */
export function resetState() {
  clearCurrentHuvudman();
  state.activeGodManProfile = null;
  state.allOverformyndare = [];
  state.allHuvudman = [];
  state.filters = {
    overformyndareId: null,
    includeInactive: false,
    searchQuery: "",
  };
  state.errors = {
    lastError: null,
    errorLog: [],
  };

  console.log("[State] State återställd till standardvärden.");
  dispatchStateChange("reset", true);
}

// ============================================================
// INITIALISERING
// ============================================================

/**
 * Initierar state-systemet.
 */
export function initState() {
  console.log("[State] Initierar state-system...");

  // Ladda sparade inställningar
  loadSettingsFromLocalStorage();

  // Initiera session
  initSession();

  // Sätt upp activity tracking
  if (typeof window !== "undefined") {
    ["click", "keypress", "scroll", "mousemove"].forEach(event => {
      window.addEventListener(event, updateSessionActivity, { passive: true });
    });
  }

  console.log("[State] State-system initierat.");
}

// ============================================================
// EXPORTERA GLOBALT (för bakåtkompatibilitet)
// ============================================================

if (typeof window !== "undefined") {
  // Gör tillgängligt globalt
  window.appState = state;
  window.getState = getState;
  window.getCurrentHuvudman = getCurrentHuvudman;
  window.setCurrentHuvudman = setCurrentHuvudman;
  window.clearCurrentHuvudman = clearCurrentHuvudman;
  window.getActiveGodManProfile = getActiveGodManProfile;
  window.setActiveGodManProfile = setActiveGodManProfile;
  window.debugState = debugState;

  // Bakåtkompatibilitet med gamla variabelnamn
  Object.defineProperty(window, "currentHuvudmanFullData", {
    get() {
      return state.currentHuvudman.fullData;
    },
    set(value) {
      if (value) {
        const pnr = value.huvudmanDetails?.Personnummer || value.details?.Personnummer;
        setCurrentHuvudman(pnr, value);
      } else {
        clearCurrentHuvudman();
      }
    },
  });

  Object.defineProperty(window, "activeGodManProfile", {
    get() {
      return state.activeGodManProfile;
    },
    set(value) {
      setActiveGodManProfile(value);
    },
  });
}

// Auto-initialisering om vi är i browser
if (typeof window !== "undefined" && document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initState);
} else if (typeof window !== "undefined") {
  initState();
}
