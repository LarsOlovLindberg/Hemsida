// ============================================================
// navigation.js - Flik-navigation och routing
// Sökväg: js/modules/ui/navigation.js
// ============================================================

import { setActiveTab, getActiveTab } from "../../state.js";

// ============================================================
// NAVIGATION STATE
// ============================================================

const navigationState = {
  currentTab: null,
  previousTab: null,
  tabHistory: [],
  maxHistoryLength: 10,
};

// ============================================================
// TAB DEFINITIONS
// ============================================================

/**
 * Definitioner för alla flikar i applikationen.
 * Används för validering och routing.
 */
const TABS = {
  huvudman: {
    id: "tab-huvudman",
    name: "Huvudman",
    icon: "fa-user",
    requiredElements: ["huvudmanList"],
  },
  dashboard: {
    id: "tab-dashboard",
    name: "Dashboard",
    icon: "fa-tachometer-alt",
    requiredElements: ["dashboardContainer"],
  },
  arsrakning: {
    id: "tab-arsrakning",
    name: "Årsräkning",
    icon: "fa-calculator",
    requiredElements: ["inbetalningarContainer", "utbetalningarContainer"],
    requiresHuvudman: true,
  },
  redogorelse: {
    id: "tab-redogorelse",
    name: "Redogörelse",
    icon: "fa-file-alt",
    requiredElements: ["redogorelseForm"],
    requiresHuvudman: true,
  },
  godman: {
    id: "tab-godman",
    name: "God Man Profiler",
    icon: "fa-id-card",
    requiredElements: ["godmanProfilesList"],
  },
  overformyndare: {
    id: "tab-overformyndare",
    name: "Överförmyndare",
    icon: "fa-building",
    requiredElements: ["overformyndareList"],
  },
  forsorjningsstod: {
    id: "tab-forsorjningsstod",
    name: "Försörjningsstöd",
    icon: "fa-hand-holding-usd",
    requiredElements: ["forsorjningsstodForm"],
    requiresHuvudman: true,
  },
  documents: {
    id: "tab-documents",
    name: "Dokument",
    icon: "fa-folder-open",
    requiredElements: ["documentsContainer"],
    requiresHuvudman: true,
  },
};

// ============================================================
// SETUP NAVIGATION
// ============================================================

/**
 * Initierar navigationen och sätter upp event listeners.
 */
export function setupNavigation() {
  console.log("[Navigation] Initierar navigation...");

  // Hitta alla flik-knappar
  const tabButtons = document.querySelectorAll("[data-tab]");

  if (tabButtons.length === 0) {
    console.warn("[Navigation] Inga flik-knappar hittades!");
    return;
  }

  // Lägg till click listeners
  tabButtons.forEach(button => {
    button.addEventListener("click", e => {
      e.preventDefault();
      const tabId = button.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Sätt upp keyboard shortcuts
  setupKeyboardShortcuts();

  // Sätt upp breadcrumbs (om finns)
  setupBreadcrumbs();

  // Hantera browser back/forward
  setupHistoryNavigation();

  console.log(`[Navigation] ${tabButtons.length} flikar initierade.`);
}

// ============================================================
// SWITCH TAB
// ============================================================

/**
 * Byter till en specifik flik.
 * @param {string} tabId - Flik-ID (t.ex. 'tab-huvudman')
 * @returns {boolean} - true om byte lyckades, annars false
 */
export function switchTab(tabId) {
  console.log(`[Navigation] Byter till flik: ${tabId}`);

  // Validera flik-ID
  if (!tabId || !tabId.startsWith("tab-")) {
    console.error(`[Navigation] Ogiltigt flik-ID: ${tabId}`);
    return false;
  }

  // Hitta flik-definition
  const tabDef = Object.values(TABS).find(t => t.id === tabId);

  // Kontrollera om flik kräver huvudman
  if (tabDef?.requiresHuvudman) {
    if (!window.currentHuvudmanFullData && !window.appState?.currentHuvudman?.fullData) {
      showNotification("Välj en huvudman först.", "warning");
      console.warn(`[Navigation] Flik ${tabId} kräver en vald huvudman.`);
      return false;
    }
  }

  // Kontrollera att nödvändiga element finns
  if (tabDef?.requiredElements) {
    const missingElements = tabDef.requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
      console.error(`[Navigation] Element saknas för ${tabId}:`, missingElements);
      showNotification("Det uppstod ett fel vid laddning av sidan.", "error");
      return false;
    }
  }

  // Spara tidigare flik
  const previousTab = navigationState.currentTab;

  // Dölj alla flikar
  const allTabs = document.querySelectorAll(".tab-content");
  allTabs.forEach(tab => {
    tab.classList.remove("active");
    tab.style.display = "none";
  });

  // Ta bort aktiv-klass från alla knappar
  const allButtons = document.querySelectorAll("[data-tab]");
  allButtons.forEach(button => {
    button.classList.remove("active");
  });

  // Visa vald flik
  const targetTab = document.getElementById(tabId);
  const targetButton = document.querySelector(`[data-tab="${tabId}"]`);

  if (!targetTab) {
    console.error(`[Navigation] Flik-element ${tabId} hittades inte i DOM.`);
    return false;
  }

  targetTab.classList.add("active");
  targetTab.style.display = "block";

  if (targetButton) {
    targetButton.classList.add("active");
  }

  // Uppdatera navigation state
  navigationState.previousTab = previousTab;
  navigationState.currentTab = tabId;
  navigationState.tabHistory.push(tabId);

  // Trimma history om den blir för lång
  if (navigationState.tabHistory.length > navigationState.maxHistoryLength) {
    navigationState.tabHistory.shift();
  }

  // Uppdatera global state
  setActiveTab(tabId);

  // Spara till localStorage
  localStorage.setItem("lastActiveTab", tabId);

  // Uppdatera URL (utan att ladda om sidan)
  updateURL(tabId);

  // Trigga tab-change event
  dispatchTabChangeEvent(tabId, previousTab);

  // Kör specifik initialisering för fliken
  initializeTabContent(tabId);

  // Uppdatera breadcrumbs
  updateBreadcrumbs(tabId);

  console.log(`[Navigation] ✅ Bytte till ${tabId}`);
  return true;
}

// ============================================================
// TAB CONTENT INITIALIZATION
// ============================================================

/**
 * Initierar innehållet för en specifik flik när den visas.
 * @param {string} tabId - Flik-ID
 */
function initializeTabContent(tabId) {
  console.log(`[Navigation] Initierar innehåll för ${tabId}...`);

  switch (tabId) {
    case "tab-huvudman":
      // Huvudman-fliken är redan initierad i loadAllHuvudman()
      break;

    case "tab-dashboard":
      // Uppdatera dashboard
      if (typeof window.updateDashboard === "function") {
        window.updateDashboard();
      }
      break;

    case "tab-arsrakning":
      // Sätt perioddatum
      if (typeof window.setPeriodDatesForArsrakningTab === "function") {
        window.setPeriodDatesForArsrakningTab();
      }
      // Visa personinfo
      if (typeof window.displayPersonInfoForArsrakning === "function") {
        window.displayPersonInfoForArsrakning();
      }
      // Ladda årsräkningsdata om huvudman är vald
      if (window.currentHuvudmanFullData?.huvudmanDetails?.Personnummer) {
        const pnr = window.currentHuvudmanFullData.huvudmanDetails.Personnummer;
        const year = new Date().getFullYear() - 1;
        if (typeof window.loadArsrakningData === "function") {
          window.loadArsrakningData(pnr, year);
        }
      }
      break;

    case "tab-redogorelse":
      // Fyll med standardvärden
      if (typeof window.populateRedogorelseTabWithDefaults === "function") {
        window.populateRedogorelseTabWithDefaults();
      }
      break;

    case "tab-godman":
      // Ladda God man-profiler om inte redan gjort
      if (typeof window.loadGodManProfiles === "function") {
        window.loadGodManProfiles();
      }
      break;

    case "tab-overformyndare":
      // Ladda överförmyndare om inte redan gjort
      if (typeof window.loadAllOverformyndare === "function") {
        window.loadAllOverformyndare();
      }
      break;

    case "tab-documents":
      // Ladda dokument för vald huvudman
      if (window.currentHuvudmanFullData?.huvudmanDetails?.Personnummer) {
        if (typeof window.loadDocumentsForHuvudman === "function") {
          const pnr = window.currentHuvudmanFullData.huvudmanDetails.Personnummer;
          window.loadDocumentsForHuvudman(pnr);
        }
      }
      break;

    case "tab-forsorjningsstod":
      // Initiera försörjningsstöd-formulär
      if (typeof window.initForsorjningsstod === "function") {
        window.initForsorjningsstod();
      }
      break;

    default:
      console.log(`[Navigation] Ingen specifik initialisering för ${tabId}.`);
  }
}

// ============================================================
// NAVIGATION HELPERS
// ============================================================

/**
 * Går till föregående flik i historiken.
 */
export function goBack() {
  if (navigationState.tabHistory.length > 1) {
    // Ta bort nuvarande flik från historik
    navigationState.tabHistory.pop();
    // Hämta föregående flik
    const previousTab = navigationState.tabHistory[navigationState.tabHistory.length - 1];
    // Ta bort från historik (annars dupliceras den)
    navigationState.tabHistory.pop();
    // Byt flik
    switchTab(previousTab);
  } else {
    console.log("[Navigation] Ingen tidigare flik i historiken.");
  }
}

/**
 * Kontrollerar om en flik är tillgänglig.
 * @param {string} tabId - Flik-ID
 * @returns {boolean}
 */
export function isTabAvailable(tabId) {
  const tabDef = Object.values(TABS).find(t => t.id === tabId);

  if (!tabDef) return false;

  // Kontrollera om flik kräver huvudman
  if (tabDef.requiresHuvudman) {
    return !!(window.currentHuvudmanFullData || window.appState?.currentHuvudman?.fullData);
  }

  return true;
}

/**
 * Hämtar namnet på en flik.
 * @param {string} tabId - Flik-ID
 * @returns {string}
 */
export function getTabName(tabId) {
  const tabDef = Object.values(TABS).find(t => t.id === tabId);
  return tabDef?.name || tabId;
}

/**
 * Hämtar alla tillgängliga flikar.
 * @returns {array}
 */
export function getAvailableTabs() {
  return Object.values(TABS).filter(tab => isTabAvailable(tab.id));
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

/**
 * Sätter upp tangentbordsgenvägar för navigation.
 */
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", e => {
    // Ignorera om användaren skriver i ett input-fält
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      return;
    }

    // Ctrl/Cmd + 1-9 för att byta flik
    if ((e.ctrlKey || e.metaKey) && e.key >= "1" && e.key <= "9") {
      e.preventDefault();
      const tabIndex = parseInt(e.key) - 1;
      const tabs = Object.values(TABS);
      if (tabs[tabIndex]) {
        switchTab(tabs[tabIndex].id);
      }
    }

    // Alt + Arrow Left för att gå tillbaka
    if (e.altKey && e.key === "ArrowLeft") {
      e.preventDefault();
      goBack();
    }
  });

  console.log("[Navigation] Tangentbordsgenvägar aktiverade.");
}

// ============================================================
// BREADCRUMBS
// ============================================================

/**
 * Sätter upp breadcrumbs-navigation.
 */
function setupBreadcrumbs() {
  const breadcrumbContainer = document.getElementById("breadcrumbs");
  if (!breadcrumbContainer) return;

  console.log("[Navigation] Breadcrumbs konfigurerade.");
}

/**
 * Uppdaterar breadcrumbs baserat på aktiv flik.
 * @param {string} tabId - Flik-ID
 */
function updateBreadcrumbs(tabId) {
  const breadcrumbContainer = document.getElementById("breadcrumbs");
  if (!breadcrumbContainer) return;

  const tabName = getTabName(tabId);
  const huvudmanName = window.currentHuvudmanFullData?.huvudmanDetails?.FORNAMN
    ? `${window.currentHuvudmanFullData.huvudmanDetails.FORNAMN} ${window.currentHuvudmanFullData.huvudmanDetails.EFTERNAMN}`
    : null;

  let breadcrumbHTML = `<a href="#" onclick="switchTab('tab-huvudman'); return false;">Hem</a>`;

  if (huvudmanName && tabId !== "tab-huvudman") {
    breadcrumbHTML += ` <i class="fas fa-chevron-right"></i> <span>${huvudmanName}</span>`;
  }

  if (tabId !== "tab-huvudman") {
    breadcrumbHTML += ` <i class="fas fa-chevron-right"></i> <span>${tabName}</span>`;
  }

  breadcrumbContainer.innerHTML = breadcrumbHTML;
}

// ============================================================
// URL MANAGEMENT
// ============================================================

/**
 * Uppdaterar URL utan att ladda om sidan.
 * @param {string} tabId - Flik-ID
 */
function updateURL(tabId) {
  const url = new URL(window.location);
  const tabName = tabId.replace("tab-", "");
  url.searchParams.set("page", tabName);

  // Lägg till huvudman i URL om vald
  const pnr = window.currentHuvudmanFullData?.huvudmanDetails?.Personnummer;
  if (pnr) {
    url.searchParams.set("pnr", pnr);
  } else {
    url.searchParams.delete("pnr");
  }

  window.history.pushState({}, "", url);
}

/**
 * Sätter upp hantering av browser back/forward.
 */
function setupHistoryNavigation() {
  window.addEventListener("popstate", event => {
    const url = new URL(window.location);
    const page = url.searchParams.get("page");

    if (page) {
      const tabId = `tab-${page}`;
      // Kolla om fliken finns
      if (document.getElementById(tabId)) {
        switchTab(tabId);
      }
    }
  });

  // Initiera från URL vid load
  const url = new URL(window.location);
  const page = url.searchParams.get("page");
  const pnr = url.searchParams.get("pnr");

  if (page) {
    const tabId = `tab-${page}`;
    if (document.getElementById(tabId)) {
      // Om pnr finns, ladda huvudman först
      if (pnr && typeof window.selectHuvudman === "function") {
        window.selectHuvudman(pnr).then(() => {
          switchTab(tabId);
        });
      } else {
        switchTab(tabId);
      }
    }
  }
}

// ============================================================
// EVENTS
// ============================================================

/**
 * Triggar ett custom event när flik byts.
 * @param {string} newTab - Ny flik-ID
 * @param {string} oldTab - Gammal flik-ID
 */
function dispatchTabChangeEvent(newTab, oldTab) {
  const event = new CustomEvent("tabchange", {
    detail: {
      newTab,
      oldTab,
      timestamp: new Date().toISOString(),
    },
  });

  window.dispatchEvent(event);
}

/**
 * Lyssnar på tab-change events.
 * @param {function} callback - Callback-funktion
 */
export function onTabChange(callback) {
  window.addEventListener("tabchange", e => {
    callback(e.detail);
  });
}

// ============================================================
// NOTIFICATIONS
// ============================================================

/**
 * Visar en notifikation (används internt).
 * @param {string} message - Meddelande
 * @param {string} type - Typ ('success', 'error', 'warning', 'info')
 */
function showNotification(message, type = "info") {
  if (typeof window.showNotification === "function") {
    window.showNotification(message, type);
  } else {
    console.log(`[Notification ${type}] ${message}`);
  }
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.switchTab = switchTab;
window.goBack = goBack;
window.isTabAvailable = isTabAvailable;
window.getTabName = getTabName;
window.getAvailableTabs = getAvailableTabs;
window.onTabChange = onTabChange;

console.log("[Navigation] navigation.js laddad.");
