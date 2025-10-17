// ============================================================
// events.js - Global event-hantering
// Sökväg: js/modules/ui/events.js
// ============================================================

import { updateSessionActivity } from "../../state.js";

// ============================================================
// EVENT CONFIGURATION
// ============================================================

const EVENT_CONFIG = {
  debounceDelay: 300, // Millisekunder för debounce
  throttleDelay: 100, // Millisekunder för throttle
  longPressDelay: 500, // Millisekunder för long-press
  doubleClickDelay: 300, // Millisekunder mellan klick för double-click
};

// ============================================================
// SETUP GLOBAL EVENT LISTENERS
// ============================================================

/**
 * Sätter upp alla globala event listeners.
 */
export function setupGlobalEventListeners() {
  console.log("[Events] Sätter upp globala event listeners...");

  // Form events
  setupFormEventListeners();

  // Button events
  setupButtonEventListeners();

  // Modal events
  setupModalEventListeners();

  // Search events
  setupSearchEventListeners();

  // Dropdown events
  setupDropdownEventListeners();

  // Keyboard events
  setupKeyboardEventListeners();

  // Window events
  setupWindowEventListeners();

  // Custom events
  setupCustomEventListeners();

  // Activity tracking
  setupActivityTracking();

  console.log("[Events] ✅ Globala event listeners konfigurerade.");
}

// ============================================================
// FORM EVENTS
// ============================================================

/**
 * Sätter upp event listeners för formulär.
 */
function setupFormEventListeners() {
  // Auto-save vid formulärändringar
  document.addEventListener(
    "input",
    debounce(e => {
      if (e.target.matches("input, textarea, select")) {
        handleFormInput(e);
      }
    }, EVENT_CONFIG.debounceDelay)
  );

  // Validering vid blur
  document.addEventListener(
    "blur",
    e => {
      if (e.target.matches("input[required], textarea[required], select[required]")) {
        validateField(e.target);
      }
    },
    true
  );

  // Förhindra submit om invalid
  document.addEventListener("submit", e => {
    const form = e.target;
    if (form.matches("form")) {
      if (!validateForm(form)) {
        e.preventDefault();
        showNotification("Vänligen fyll i alla obligatoriska fält korrekt.", "warning");
      }
    }
  });

  // Number input - förhindra negativa värden där ej tillåtet
  document.addEventListener("input", e => {
    if (e.target.matches('input[type="number"][min="0"]')) {
      if (parseFloat(e.target.value) < 0) {
        e.target.value = 0;
      }
    }
  });

  // Date input - sätt max till idag om data-max-today attribut finns
  document.addEventListener(
    "focus",
    e => {
      if (e.target.matches('input[type="date"][data-max-today]')) {
        const today = new Date().toISOString().split("T")[0];
        e.target.setAttribute("max", today);
      }
    },
    true
  );

  console.log("[Events] Formulär-events konfigurerade.");
}

/**
 * Hanterar input-händelser i formulär.
 * @param {Event} e - Event-objekt
 */
function handleFormInput(e) {
  const input = e.target;

  // Markera som ändrad
  if (!input.classList.contains("modified")) {
    input.classList.add("modified");
  }

  // Trigga custom event för auto-save
  const event = new CustomEvent("formModified", {
    detail: {
      input: input,
      value: input.value,
      form: input.closest("form"),
    },
  });
  window.dispatchEvent(event);
}

/**
 * Validerar ett enskilt fält.
 * @param {HTMLElement} field - Fält-element
 * @returns {boolean}
 */
function validateField(field) {
  let isValid = true;
  let errorMessage = "";

  // Kontrollera required
  if (field.hasAttribute("required") && !field.value.trim()) {
    isValid = false;
    errorMessage = "Detta fält är obligatoriskt.";
  }

  // Kontrollera email
  if (field.type === "email" && field.value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(field.value)) {
      isValid = false;
      errorMessage = "Ange en giltig e-postadress.";
    }
  }

  // Kontrollera personnummer (12 siffror)
  if (field.hasAttribute("data-validate-pnr") && field.value) {
    const pnrRegex = /^\d{12}$/;
    if (!pnrRegex.test(field.value.replace(/\D/g, ""))) {
      isValid = false;
      errorMessage = "Personnummer måste vara 12 siffror (YYYYMMDDXXXX).";
    }
  }

  // Kontrollera telefonnummer
  if (field.type === "tel" && field.value) {
    const telRegex = /^[\d\s\-\+\(\)]+$/;
    if (!telRegex.test(field.value)) {
      isValid = false;
      errorMessage = "Ange ett giltigt telefonnummer.";
    }
  }

  // Kontrollera min/max för number
  if (field.type === "number" && field.value) {
    const value = parseFloat(field.value);
    if (field.hasAttribute("min") && value < parseFloat(field.getAttribute("min"))) {
      isValid = false;
      errorMessage = `Värdet måste vara minst ${field.getAttribute("min")}.`;
    }
    if (field.hasAttribute("max") && value > parseFloat(field.getAttribute("max"))) {
      isValid = false;
      errorMessage = `Värdet får inte överstiga ${field.getAttribute("max")}.`;
    }
  }

  // Uppdatera UI
  if (isValid) {
    field.classList.remove("invalid");
    field.classList.add("valid");
    removeFieldError(field);
  } else {
    field.classList.remove("valid");
    field.classList.add("invalid");
    showFieldError(field, errorMessage);
  }

  return isValid;
}

/**
 * Validerar ett helt formulär.
 * @param {HTMLFormElement} form - Formulär-element
 * @returns {boolean}
 */
function validateForm(form) {
  const fields = form.querySelectorAll("input[required], textarea[required], select[required]");
  let isValid = true;

  fields.forEach(field => {
    if (!validateField(field)) {
      isValid = false;
    }
  });

  return isValid;
}

/**
 * Visar felmeddelande för ett fält.
 * @param {HTMLElement} field - Fält-element
 * @param {string} message - Felmeddelande
 */
function showFieldError(field, message) {
  removeFieldError(field);

  const errorDiv = document.createElement("div");
  errorDiv.className = "field-error";
  errorDiv.textContent = message;
  errorDiv.setAttribute("data-error-for", field.id || field.name);

  field.parentNode.insertBefore(errorDiv, field.nextSibling);
}

/**
 * Tar bort felmeddelande för ett fält.
 * @param {HTMLElement} field - Fält-element
 */
function removeFieldError(field) {
  const existingError = field.parentNode.querySelector(".field-error");
  if (existingError) {
    existingError.remove();
  }
}

// ============================================================
// BUTTON EVENTS
// ============================================================

/**
 * Sätter upp event listeners för knappar.
 */
function setupButtonEventListeners() {
  // Disable button vid submit för att förhindra dubbelklick
  document.addEventListener("click", e => {
    const button = e.target.closest('button[type="submit"]');
    if (button && !button.disabled) {
      const form = button.closest("form");
      if (form && validateForm(form)) {
        button.disabled = true;
        button.classList.add("loading");

        // Återaktivera efter 3 sekunder (fallback)
        setTimeout(() => {
          button.disabled = false;
          button.classList.remove("loading");
        }, 3000);
      }
    }
  });

  // Bekräftelse för farliga åtgärder
  document.addEventListener("click", e => {
    const button = e.target.closest("[data-confirm]");
    if (button) {
      const message = button.getAttribute("data-confirm");
      if (!confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

  // Loading state för async-knappar
  document.addEventListener("click", e => {
    const button = e.target.closest("[data-async]");
    if (button) {
      button.classList.add("loading");
      button.disabled = true;
    }
  });

  console.log("[Events] Knapp-events konfigurerade.");
}

// ============================================================
// MODAL EVENTS
// ============================================================

/**
 * Sätter upp event listeners för modaler.
 */
function setupModalEventListeners() {
  // Stäng modal med ESC
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const openModal = document.querySelector('.modal[style*="display: block"]');
      if (openModal) {
        closeModal(openModal);
      }
    }
  });

  // Stäng modal vid klick på backdrop
  document.addEventListener("click", e => {
    if (e.target.classList.contains("modal")) {
      closeModal(e.target);
    }
  });

  // Stäng-knappar
  document.addEventListener("click", e => {
    if (e.target.matches(".modal-close, [data-modal-close]")) {
      const modal = e.target.closest(".modal");
      if (modal) {
        closeModal(modal);
      }
    }
  });

  // Öppna modal
  document.addEventListener("click", e => {
    const trigger = e.target.closest("[data-modal-open]");
    if (trigger) {
      e.preventDefault();
      const modalId = trigger.getAttribute("data-modal-open");
      const modal = document.getElementById(modalId);
      if (modal) {
        openModal(modal);
      }
    }
  });

  console.log("[Events] Modal-events konfigurerade.");
}

/**
 * Öppnar en modal.
 * @param {HTMLElement} modal - Modal-element
 */
function openModal(modal) {
  modal.style.display = "block";
  document.body.classList.add("modal-open");

  // Focus på första input
  const firstInput = modal.querySelector("input, textarea, select");
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }

  // Trigga event
  modal.dispatchEvent(new CustomEvent("modalOpen"));
}

/**
 * Stänger en modal.
 * @param {HTMLElement} modal - Modal-element
 */
function closeModal(modal) {
  modal.style.display = "none";
  document.body.classList.remove("modal-open");

  // Trigga event
  modal.dispatchEvent(new CustomEvent("modalClose"));
}

// ============================================================
// SEARCH EVENTS
// ============================================================

/**
 * Sätter upp event listeners för sökfält.
 */
function setupSearchEventListeners() {
  // Debounced search
  document.addEventListener(
    "input",
    debounce(e => {
      if (e.target.matches("[data-search]")) {
        handleSearch(e.target);
      }
    }, EVENT_CONFIG.debounceDelay)
  );

  // Clear search button
  document.addEventListener("click", e => {
    if (e.target.matches("[data-search-clear]")) {
      const searchInput = document.querySelector(e.target.getAttribute("data-search-clear"));
      if (searchInput) {
        searchInput.value = "";
        handleSearch(searchInput);
        searchInput.focus();
      }
    }
  });

  console.log("[Events] Sök-events konfigurerade.");
}

/**
 * Hanterar sökning.
 * @param {HTMLInputElement} input - Sök-input
 */
function handleSearch(input) {
  const query = input.value.toLowerCase().trim();
  const targetId = input.getAttribute("data-search");
  const target = document.getElementById(targetId);

  if (!target) return;

  const items = target.querySelectorAll("[data-searchable]");
  let visibleCount = 0;

  items.forEach(item => {
    const searchText = item.getAttribute("data-searchable").toLowerCase();
    const matches = searchText.includes(query);

    if (matches || query === "") {
      item.style.display = "";
      visibleCount++;
    } else {
      item.style.display = "none";
    }
  });

  // Visa "inga resultat" meddelande om behövs
  updateSearchResultsMessage(target, visibleCount, query);

  // Trigga custom event
  const event = new CustomEvent("searchComplete", {
    detail: { query, visibleCount, totalCount: items.length },
  });
  input.dispatchEvent(event);
}

/**
 * Uppdaterar "inga resultat" meddelande.
 * @param {HTMLElement} container - Container-element
 * @param {number} visibleCount - Antal synliga resultat
 * @param {string} query - Sökfråga
 */
function updateSearchResultsMessage(container, visibleCount, query) {
  let message = container.querySelector(".search-no-results");

  if (visibleCount === 0 && query !== "") {
    if (!message) {
      message = document.createElement("div");
      message.className = "search-no-results";
      container.appendChild(message);
    }
    message.textContent = `Inga resultat för "${query}"`;
    message.style.display = "block";
  } else if (message) {
    message.style.display = "none";
  }
}

// ============================================================
// DROPDOWN EVENTS
// ============================================================

/**
 * Sätter upp event listeners för dropdowns.
 */
function setupDropdownEventListeners() {
  // Toggle dropdown
  document.addEventListener("click", e => {
    const trigger = e.target.closest("[data-dropdown-toggle]");
    if (trigger) {
      e.stopPropagation();
      const dropdownId = trigger.getAttribute("data-dropdown-toggle");
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        toggleDropdown(dropdown);
      }
    }
  });

  // Stäng alla dropdowns vid klick utanför
  document.addEventListener("click", e => {
    if (!e.target.closest(".dropdown")) {
      closeAllDropdowns();
    }
  });

  // Stäng dropdown vid ESC
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeAllDropdowns();
    }
  });

  console.log("[Events] Dropdown-events konfigurerade.");
}

/**
 * Togglar en dropdown.
 * @param {HTMLElement} dropdown - Dropdown-element
 */
function toggleDropdown(dropdown) {
  const isOpen = dropdown.classList.contains("open");
  closeAllDropdowns();

  if (!isOpen) {
    dropdown.classList.add("open");
  }
}

/**
 * Stänger alla dropdowns.
 */
function closeAllDropdowns() {
  document.querySelectorAll(".dropdown.open").forEach(dropdown => {
    dropdown.classList.remove("open");
  });
}

// ============================================================
// KEYBOARD EVENTS
// ============================================================

/**
 * Sätter upp globala keyboard shortcuts.
 */
function setupKeyboardEventListeners() {
  document.addEventListener("keydown", e => {
    // Ignorera om vi är i ett input-fält
    if (e.target.matches("input, textarea, select")) {
      return;
    }

    // Ctrl/Cmd + S = Spara
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      triggerSave();
    }

    // Ctrl/Cmd + F = Sök
    if ((e.ctrlKey || e.metaKey) && e.key === "f") {
      e.preventDefault();
      focusSearchField();
    }

    // Ctrl/Cmd + K = Quick actions
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      openQuickActions();
    }
  });

  console.log("[Events] Keyboard-events konfigurerade.");
}

/**
 * Triggar sparfunktion för aktiv flik.
 */
function triggerSave() {
  const activeTab = document.querySelector(".tab-content.active");
  if (!activeTab) return;

  const saveButton = activeTab.querySelector('[data-save], button[type="submit"]');
  if (saveButton) {
    saveButton.click();
    showNotification("Sparar...", "info");
  }
}

/**
 * Fokuserar på sökfältet.
 */
function focusSearchField() {
  const searchField = document.querySelector('[data-search], input[type="search"]');
  if (searchField) {
    searchField.focus();
    searchField.select();
  }
}

/**
 * Öppnar quick actions (kan implementeras senare).
 */
function openQuickActions() {
  console.log("[Events] Quick actions - ej implementerat än.");
  // Placeholder för framtida funktionalitet
}

// ============================================================
// WINDOW EVENTS
// ============================================================

/**
 * Sätter upp window-events.
 */
function setupWindowEventListeners() {
  // Resize med throttle
  window.addEventListener(
    "resize",
    throttle(() => {
      handleWindowResize();
    }, EVENT_CONFIG.throttleDelay)
  );

  // Scroll med throttle
  window.addEventListener(
    "scroll",
    throttle(() => {
      handleWindowScroll();
    }, EVENT_CONFIG.throttleDelay)
  );

  // Focus/Blur för tab visibility
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      console.log("[Events] Tab hidden");
    } else {
      console.log("[Events] Tab visible");
      // Uppdatera data om behövs
    }
  });

  console.log("[Events] Window-events konfigurerade.");
}

/**
 * Hanterar window resize.
 */
function handleWindowResize() {
  // Uppdatera layout om behövs
  const event = new CustomEvent("windowResize", {
    detail: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  });
  window.dispatchEvent(event);
}

/**
 * Hanterar window scroll.
 */
function handleWindowScroll() {
  // Hantera scroll-beteende
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Visa "scroll to top" knapp om scrollat ner
  const scrollToTopBtn = document.getElementById("scrollToTop");
  if (scrollToTopBtn) {
    if (scrollTop > 300) {
      scrollToTopBtn.classList.add("visible");
    } else {
      scrollToTopBtn.classList.remove("visible");
    }
  }
}

// ============================================================
// CUSTOM EVENTS
// ============================================================

/**
 * Sätter upp custom event listeners.
 */
function setupCustomEventListeners() {
  // Lyssna på huvudman-ändringar
  window.addEventListener("huvudmanSelected", e => {
    console.log("[Events] Huvudman vald:", e.detail);
  });

  // Lyssna på flik-ändringar
  window.addEventListener("tabchange", e => {
    console.log("[Events] Flik ändrad:", e.detail);
  });

  // Lyssna på formulär-ändringar
  window.addEventListener("formModified", e => {
    console.log("[Events] Formulär ändrat:", e.detail);
  });

  console.log("[Events] Custom events konfigurerade.");
}

// ============================================================
// ACTIVITY TRACKING
// ============================================================

/**
 * Sätter upp activity tracking.
 */
function setupActivityTracking() {
  const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];

  activityEvents.forEach(eventType => {
    document.addEventListener(
      eventType,
      throttle(() => {
        updateSessionActivity();
      }, 5000),
      { passive: true }
    );
  });

  console.log("[Events] Activity tracking konfigurerat.");
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Debounce-funktion - fördröjer exekvering tills användaren slutar.
 * @param {function} func - Funktion att debounce:a
 * @param {number} wait - Väntetid i millisekunder
 * @returns {function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle-funktion - begränsar hur ofta en funktion kan köras.
 * @param {function} func - Funktion att throttle:a
 * @param {number} limit - Minsta tid mellan körningar i millisekunder
 * @returns {function}
 */
function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Visar notifikation (fallback om global funktion saknas).
 * @param {string} message - Meddelande
 * @param {string} type - Typ
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

window.validateField = validateField;
window.validateForm = validateForm;
window.openModal = openModal;
window.closeModal = closeModal;
window.debounce = debounce;
window.throttle = throttle;

console.log("[Events] events.js laddad.");
