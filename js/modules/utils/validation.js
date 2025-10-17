// ============================================================
// validation.js - Utökad formulärvalidering
// Sökväg: js/modules/utils/validation.js
// ============================================================

// ============================================================
// VALIDATION RULES
// ============================================================

const VALIDATION_RULES = {
  personnummer: {
    pattern: /^(\d{6}|\d{8})[-\s]?\d{4}$/,
    message: "Personnummer måste vara i formatet ÅÅMMDD-XXXX eller ÅÅÅÅMMDD-XXXX",
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Ange en giltig e-postadress",
  },
  telefon: {
    pattern: /^(\+46|0)[\s-]?\d{1,3}[\s-]?\d{5,10}$/,
    message: "Ange ett giltigt telefonnummer",
  },
  postnummer: {
    pattern: /^\d{3}\s?\d{2}$/,
    message: "Postnummer måste vara i formatet XXX XX",
  },
  bankkonto: {
    pattern: /^\d{4,5}[-\s]?\d{7,10}$/,
    message: "Bankkonto måste vara i formatet clearing-kontonummer",
  },
  organisationsnummer: {
    pattern: /^\d{6}[-\s]?\d{4}$/,
    message: "Organisationsnummer måste vara i formatet XXXXXX-XXXX",
  },
  amount: {
    pattern: /^\d+([.,]\d{1,2})?$/,
    message: "Ange ett giltigt belopp",
  },
};

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

/**
 * Validerar personnummer enligt Luhn-algoritmen.
 * @param {string} pnr - Personnummer
 * @returns {object} - { valid: boolean, message: string }
 */
export function validatePersonnummer(pnr) {
  if (!pnr) {
    return { valid: false, message: "Personnummer saknas" };
  }

  // Ta bort mellanslag och bindestreck
  const cleaned = pnr.replace(/[-\s]/g, "");

  // Kontrollera längd (10 eller 12 siffror)
  if (!/^\d{10}$/.test(cleaned) && !/^\d{12}$/.test(cleaned)) {
    return { valid: false, message: VALIDATION_RULES.personnummer.message };
  }

  // Använd de sista 10 siffrorna för Luhn
  const digits = cleaned.slice(-10);

  // Kontrollera datum-delen (ÅÅMMDD)
  const year = parseInt(digits.substring(0, 2));
  const month = parseInt(digits.substring(2, 4));
  const day = parseInt(digits.substring(4, 6));

  if (month < 1 || month > 12) {
    return { valid: false, message: "Ogiltigt månadsvärde i personnummer" };
  }

  if (day < 1 || day > 31) {
    return { valid: false, message: "Ogiltigt dagsvärde i personnummer" };
  }

  // Luhn-algoritm
  const luhnValid = validateLuhn(digits);
  if (!luhnValid) {
    return { valid: false, message: "Personnummer har felaktig kontrollsiffra" };
  }

  return { valid: true, message: "Giltigt personnummer" };
}

/**
 * Validerar med Luhn-algoritmen (modulus 10).
 * @param {string} number - Siffersträng
 * @returns {boolean}
 */
function validateLuhn(number) {
  let sum = 0;
  let alternate = false;

  // Gå baklänges genom siffrorna
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i));

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Validerar e-postadress.
 * @param {string} email - E-postadress
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateEmail(email) {
  if (!email) {
    return { valid: false, message: "E-postadress saknas" };
  }

  if (!VALIDATION_RULES.email.pattern.test(email)) {
    return { valid: false, message: VALIDATION_RULES.email.message };
  }

  // Extra validering
  const parts = email.split("@");
  if (parts.length !== 2) {
    return { valid: false, message: "Ogiltig e-postadress" };
  }

  const [local, domain] = parts;

  if (local.length === 0 || local.length > 64) {
    return { valid: false, message: "Ogiltig lokal del av e-postadress" };
  }

  if (domain.length === 0 || domain.length > 255) {
    return { valid: false, message: "Ogiltig domän i e-postadress" };
  }

  if (!domain.includes(".")) {
    return { valid: false, message: "Domän måste innehålla en punkt" };
  }

  return { valid: true, message: "Giltig e-postadress" };
}

/**
 * Validerar telefonnummer.
 * @param {string} phone - Telefonnummer
 * @returns {object} - { valid: boolean, message: string }
 */
export function validatePhone(phone) {
  if (!phone) {
    return { valid: false, message: "Telefonnummer saknas" };
  }

  if (!VALIDATION_RULES.telefon.pattern.test(phone)) {
    return { valid: false, message: VALIDATION_RULES.telefon.message };
  }

  return { valid: true, message: "Giltigt telefonnummer" };
}

/**
 * Validerar postnummer.
 * @param {string} postnummer - Postnummer
 * @returns {object} - { valid: boolean, message: string }
 */
export function validatePostnummer(postnummer) {
  if (!postnummer) {
    return { valid: false, message: "Postnummer saknas" };
  }

  if (!VALIDATION_RULES.postnummer.pattern.test(postnummer)) {
    return { valid: false, message: VALIDATION_RULES.postnummer.message };
  }

  return { valid: true, message: "Giltigt postnummer" };
}

/**
 * Validerar bankkonto.
 * @param {string} account - Bankkonto
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateBankAccount(account) {
  if (!account) {
    return { valid: false, message: "Bankkonto saknas" };
  }

  if (!VALIDATION_RULES.bankkonto.pattern.test(account)) {
    return { valid: false, message: VALIDATION_RULES.bankkonto.message };
  }

  // Ta bort mellanslag och bindestreck
  const cleaned = account.replace(/[-\s]/g, "");

  // Clearingnummer ska vara 4-5 siffror
  const clearing = cleaned.substring(0, account.includes("-") ? account.indexOf("-") : 4);
  if (clearing.length < 4 || clearing.length > 5) {
    return { valid: false, message: "Ogiltigt clearingnummer" };
  }

  return { valid: true, message: "Giltigt bankkonto" };
}

/**
 * Validerar organisationsnummer.
 * @param {string} orgNr - Organisationsnummer
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateOrganisationsnummer(orgNr) {
  if (!orgNr) {
    return { valid: false, message: "Organisationsnummer saknas" };
  }

  // Ta bort mellanslag och bindestreck
  const cleaned = orgNr.replace(/[-\s]/g, "");

  if (!/^\d{10}$/.test(cleaned)) {
    return { valid: false, message: VALIDATION_RULES.organisationsnummer.message };
  }

  // Luhn-algoritm för organisationsnummer
  const luhnValid = validateLuhn(cleaned);
  if (!luhnValid) {
    return { valid: false, message: "Organisationsnummer har felaktig kontrollsiffra" };
  }

  return { valid: true, message: "Giltigt organisationsnummer" };
}

/**
 * Validerar belopp.
 * @param {string|number} amount - Belopp
 * @param {object} options - Valideringsalternativ
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateAmount(amount, options = {}) {
  const { min = null, max = null, allowNegative = false, required = true } = options;

  if (!amount && amount !== 0) {
    if (required) {
      return { valid: false, message: "Belopp saknas" };
    }
    return { valid: true, message: "" };
  }

  const amountStr = String(amount).replace(/\s/g, "").replace(",", ".");
  const amountNum = parseFloat(amountStr);

  if (isNaN(amountNum)) {
    return { valid: false, message: "Ogiltigt belopp" };
  }

  if (!allowNegative && amountNum < 0) {
    return { valid: false, message: "Belopp kan inte vara negativt" };
  }

  if (min !== null && amountNum < min) {
    return { valid: false, message: `Belopp måste vara minst ${min}` };
  }

  if (max !== null && amountNum > max) {
    return { valid: false, message: `Belopp får inte överstiga ${max}` };
  }

  return { valid: true, message: "Giltigt belopp" };
}

/**
 * Validerar datum.
 * @param {string} date - Datum (YYYY-MM-DD)
 * @param {object} options - Valideringsalternativ
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateDate(date, options = {}) {
  const { min = null, max = null, required = true } = options;

  if (!date) {
    if (required) {
      return { valid: false, message: "Datum saknas" };
    }
    return { valid: true, message: "" };
  }

  // Kontrollera format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { valid: false, message: "Datum måste vara i formatet ÅÅÅÅ-MM-DD" };
  }

  // Skapa Date-objekt
  const dateObj = new Date(date);

  // Kontrollera om datum är giltigt
  if (isNaN(dateObj.getTime())) {
    return { valid: false, message: "Ogiltigt datum" };
  }

  // Kontrollera min
  if (min) {
    const minDate = new Date(min);
    if (dateObj < minDate) {
      return { valid: false, message: `Datum måste vara efter ${min}` };
    }
  }

  // Kontrollera max
  if (max) {
    const maxDate = new Date(max);
    if (dateObj > maxDate) {
      return { valid: false, message: `Datum måste vara före ${max}` };
    }
  }

  return { valid: true, message: "Giltigt datum" };
}

/**
 * Validerar att datum inte är i framtiden.
 * @param {string} date - Datum (YYYY-MM-DD)
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateDateNotFuture(date) {
  const validation = validateDate(date);
  if (!validation.valid) return validation;

  const dateObj = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateObj > today) {
    return { valid: false, message: "Datum kan inte vara i framtiden" };
  }

  return { valid: true, message: "Giltigt datum" };
}

/**
 * Validerar textlängd.
 * @param {string} text - Text
 * @param {object} options - Valideringsalternativ
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateTextLength(text, options = {}) {
  const { min = 0, max = null, required = true } = options;

  if (!text || text.trim() === "") {
    if (required) {
      return { valid: false, message: "Fältet är obligatoriskt" };
    }
    return { valid: true, message: "" };
  }

  const length = text.trim().length;

  if (length < min) {
    return { valid: false, message: `Minst ${min} tecken krävs` };
  }

  if (max !== null && length > max) {
    return { valid: false, message: `Högst ${max} tecken tillåtet` };
  }

  return { valid: true, message: "Giltig text" };
}

// ============================================================
// FORM VALIDATION
// ============================================================

/**
 * Validerar ett helt formulär.
 * @param {HTMLFormElement} form - Formulär
 * @returns {object} - { valid: boolean, errors: array }
 */
export function validateForm(form) {
  if (!form) {
    return { valid: false, errors: ["Formulär saknas"] };
  }

  const errors = [];
  const fields = form.querySelectorAll("input, textarea, select");

  fields.forEach(field => {
    const result = validateField(field);
    if (!result.valid) {
      errors.push({
        field: field.name || field.id,
        message: result.message,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Validerar ett enskilt fält.
 * @param {HTMLElement} field - Fält
 * @returns {object} - { valid: boolean, message: string }
 */
export function validateField(field) {
  // Required
  if (field.hasAttribute("required") && !field.value.trim()) {
    return { valid: false, message: "Detta fält är obligatoriskt" };
  }

  // Skip om tomt och ej required
  if (!field.value.trim() && !field.hasAttribute("required")) {
    return { valid: true, message: "" };
  }

  // Type-specifik validering
  switch (field.type) {
    case "email":
      return validateEmail(field.value);

    case "tel":
      return validatePhone(field.value);

    case "number":
      return validateAmount(field.value, {
        min: field.hasAttribute("min") ? parseFloat(field.getAttribute("min")) : null,
        max: field.hasAttribute("max") ? parseFloat(field.getAttribute("max")) : null,
        required: field.hasAttribute("required"),
      });

    case "date":
      return validateDate(field.value, {
        min: field.hasAttribute("min") ? field.getAttribute("min") : null,
        max: field.hasAttribute("max") ? field.getAttribute("max") : null,
        required: field.hasAttribute("required"),
      });

    default:
      break;
  }

  // Custom validering baserat på attribut
  if (field.hasAttribute("data-validate-pnr")) {
    return validatePersonnummer(field.value);
  }

  if (field.hasAttribute("data-validate-orgnr")) {
    return validateOrganisationsnummer(field.value);
  }

  if (field.hasAttribute("data-validate-postnr")) {
    return validatePostnummer(field.value);
  }

  if (field.hasAttribute("data-validate-bankkonto")) {
    return validateBankAccount(field.value);
  }

  // Minlength / Maxlength
  if (field.hasAttribute("minlength") || field.hasAttribute("maxlength")) {
    return validateTextLength(field.value, {
      min: field.hasAttribute("minlength") ? parseInt(field.getAttribute("minlength")) : 0,
      max: field.hasAttribute("maxlength") ? parseInt(field.getAttribute("maxlength")) : null,
      required: field.hasAttribute("required"),
    });
  }

  return { valid: true, message: "" };
}

/**
 * Visar felmeddelande för ett fält.
 * @param {HTMLElement} field - Fält
 * @param {string} message - Felmeddelande
 */
export function showFieldError(field, message) {
  // Ta bort befintligt fel
  removeFieldError(field);

  // Markera fält som invalid
  field.classList.add("invalid");
  field.classList.remove("valid");

  // Skapa felmeddelande
  const errorDiv = document.createElement("div");
  errorDiv.className = "field-error";
  errorDiv.textContent = message;
  errorDiv.setAttribute("data-error-for", field.id || field.name);

  // Lägg till efter fältet
  field.parentNode.insertBefore(errorDiv, field.nextSibling);

  // Fokusera på fältet vid submit
  if (field.form && !field.form.hasAttribute("data-error-focused")) {
    field.focus();
    field.form.setAttribute("data-error-focused", "true");
    setTimeout(() => field.form.removeAttribute("data-error-focused"), 100);
  }
}

/**
 * Tar bort felmeddelande för ett fält.
 * @param {HTMLElement} field - Fält
 */
export function removeFieldError(field) {
  field.classList.remove("invalid");

  const existingError = field.parentNode.querySelector(`.field-error[data-error-for="${field.id || field.name}"]`);
  if (existingError) {
    existingError.remove();
  }
}

/**
 * Markerar fält som giltigt.
 * @param {HTMLElement} field - Fält
 */
export function markFieldValid(field) {
  removeFieldError(field);
  field.classList.add("valid");
  field.classList.remove("invalid");
}

// ============================================================
// REAL-TIME VALIDATION
// ============================================================

/**
 * Aktiverar realtidsvalidering för ett formulär.
 * @param {HTMLFormElement} form - Formulär
 */
export function enableRealtimeValidation(form) {
  if (!form) return;

  const fields = form.querySelectorAll("input, textarea, select");

  fields.forEach(field => {
    // Validera vid blur
    field.addEventListener("blur", () => {
      const result = validateField(field);
      if (!result.valid) {
        showFieldError(field, result.message);
      } else {
        markFieldValid(field);
      }
    });

    // Ta bort fel vid input
    field.addEventListener("input", () => {
      if (field.classList.contains("invalid")) {
        const result = validateField(field);
        if (result.valid) {
          markFieldValid(field);
        }
      }
    });
  });

  console.log("[Validation] Realtidsvalidering aktiverad för formulär.");
}

/**
 * Inaktiverar realtidsvalidering för ett formulär.
 * @param {HTMLFormElement} form - Formulär
 */
export function disableRealtimeValidation(form) {
  if (!form) return;

  const fields = form.querySelectorAll("input, textarea, select");
  fields.forEach(field => {
    field.replaceWith(field.cloneNode(true));
  });

  console.log("[Validation] Realtidsvalidering inaktiverad för formulär.");
}

// ============================================================
// SANITIZATION
// ============================================================

/**
 * Saniterar text (tar bort farliga tecken).
 * @param {string} text - Text
 * @returns {string} - Saniterad text
 */
export function sanitizeText(text) {
  if (!text) return "";

  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Normaliserar personnummer till standardformat.
 * @param {string} pnr - Personnummer
 * @returns {string} - Normaliserat personnummer (ÅÅÅÅMMDDXXXX)
 */
export function normalizePersonnummer(pnr) {
  if (!pnr) return "";

  const cleaned = pnr.replace(/[-\s]/g, "");

  if (cleaned.length === 10) {
    // Lägg till sekel
    const year = parseInt(cleaned.substring(0, 2));
    const century = year > 30 ? "19" : "20";
    return century + cleaned;
  }

  return cleaned;
}

/**
 * Formaterar personnummer för visning.
 * @param {string} pnr - Personnummer
 * @returns {string} - Formaterat personnummer (ÅÅÅÅMMDD-XXXX)
 */
export function formatPersonnummer(pnr) {
  const normalized = normalizePersonnummer(pnr);
  if (normalized.length !== 12) return pnr;

  return `${normalized.substring(0, 8)}-${normalized.substring(8)}`;
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.validatePersonnummer = validatePersonnummer;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.validatePostnummer = validatePostnummer;
window.validateBankAccount = validateBankAccount;
window.validateOrganisationsnummer = validateOrganisationsnummer;
window.validateAmount = validateAmount;
window.validateDate = validateDate;
window.validateDateNotFuture = validateDateNotFuture;
window.validateTextLength = validateTextLength;
window.validateForm = validateForm;
window.validateField = validateField;
window.showFieldError = showFieldError;
window.removeFieldError = removeFieldError;
window.markFieldValid = markFieldValid;
window.enableRealtimeValidation = enableRealtimeValidation;
window.disableRealtimeValidation = disableRealtimeValidation;
window.sanitizeText = sanitizeText;
window.normalizePersonnummer = normalizePersonnummer;
window.formatPersonnummer = formatPersonnummer;

console.log("[Validation] validation.js laddad.");
