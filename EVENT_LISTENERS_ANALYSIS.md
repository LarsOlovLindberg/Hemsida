# Event Listeners Analys

## ✅ GODA NYHETER

Systemet är **väl organiserat** - alla event listeners är centraliserade i tre setup-funktioner som anropas endast EN GÅNG från `initializeApp()` vid `DOMContentLoaded`.

### Anropningsväg
```
DOMContentLoaded (rad 10677)
  ↓
initializeApp() (rad 10678)
  ↓
├─ initializeNewNavigation() (rad 10682) - En gång
├─ setupEventListeners() (rad 10683) - En gång
├─ setupLankarTabListeners() (rad 10684) - En gång
└─ setupRpaTabListeners() (rad 10685) - En gång
```

**Slutsats:** Ingen dubbelregistrering eftersom `DOMContentLoaded` bara utlöses en gång.

---

## 📋 INVENTERING AV EVENT LISTENERS

### Funktion 1: `initializeNewNavigation()` (rad 810)

**Syfte:** Hantera alla navigerings-event

**Event registrerade:**
- `.nav-item` click events (side-nav menu) - `event.preventDefault()` + `openTabDirect()`
- `window` scroll event - Toggle CSS class "scrolled" på body
- Desktop toggle button click - Expandera/fälla ihop sidomenyn
- Mobile toggle button click - Visa/dölja mobil-meny
- `document` click event - Close dropdown/modals on outside click

**Antal listeners: 5 stora (nav items loop),  + flera globala**

### Funktion 2: `setupEventListeners()` (rad 1426)

**Syfte:** Centraliserad hantering av alla formulär- och knappevent

**Event registrerade:**

| Element ID | Event | Handler | Anteckning |
|------------|-------|---------|-----------|
| periodStart_ars, periodSlut_ars | change | handleArsrakningPeriodChange | Två element |
| input[name="rakningTyp_ars"] | change | setPeriodDatesForArsrakningTab | Loop over radios |
| fileInput | change | handleFileSelect | File upload |
| adjustmentTax, etc (4 st) | input | calculateAdjustedGrossIncome | Tax calculation |
| arvForvalta, etc (5 st) | input | beraknaArvode | Fee calculation |
| templateFileInput | change | handleTemplateFileSelect | PDF template |
| saveMappingButton | click | savePdfMappings | Save PDF mappings |
| generatorHuvudmanSelect | change | populateTemplateSelect + checkGeneratorSelections | Document generator |
| generatorTemplateSelect | change | checkGeneratorSelections | Template select |
| loadDataForPdfButton | click | loadDataForPdf | Load data |
| generateFinalPdfButton | click | generateFinalPdf | Generate PDF |
| arkivHuvudmanSelect | change | handleArkivHuvudmanSelect | Archive |
| uploadArkivButton | click | uploadArkivDokument | Upload |
| arkivFilInput | change | checkArkivUploadButton | File |
| arkivDokumentTyp | input | checkArkivUploadButton | Type |
| ocrFakturaInput | change | handleOcrFakturaUpload | OCR |
| body | click (delegated) | Multiple handlers (switch statement) | Global button click handler |

**Antal listeners: ~35 individuella + 1 delegerad**

### Funktion 3: `setupLankarTabListeners()` (rad 1498)

**Syfte:** Länk-management tab events

**Event registrerade:**
- `#saveLinkButton` click → `handleSaveLink()`
- `#clearLinkFormButton` click → `clearLinkForm()`

**Antal listeners: 2**

### Funktion 4: `setupRpaTabListeners()` (rad 1513)

**Syfte:** RPA (Betala Fakturor) tab events

**Event registrerade:**
- `#startRpaButton` click → `startRpaPaymentProcess()`

**Antal listeners: 1**

---

## 🎯 RESULTAT: DUBBELREGISTRERING STATUS

| Setup-funktion | Anropas | Ställen | Dubbelregistrering? | Rekommendation |
|---|---|---|---|---|
| `initializeNewNavigation()` | 1 gång | rad 10682 | ❌ NEJ | OK |
| `setupEventListeners()` | 1 gång | rad 10683 | ❌ NEJ | OK |
| `setupLankarTabListeners()` | 1 gång | rad 10684 | ❌ NEJ | OK |
| `setupRpaTabListeners()` | 1 gång | rad 10685 | ❌ NEJ | OK |

---

## ⚠️ POTENTIELLA PROBLEM (Låg risk)

### Problem 1: Global Event Listeners kan inte removas senare
**Plats:** `initializeNewNavigation()` rad 843, rad 909

```javascript
window.addEventListener("scroll", () => { ... });  // Rad 843
document.addEventListener("click", function(event) { ... });  // Rad 909
```

**Risk:** Låg - listeners är enkla och inte datakrävande
**Lösning:** Om du någonsin behöver ta bort dem senare, spara referensen:

```javascript
window.scrollListener = () => { ... };
window.addEventListener("scroll", window.scrollListener);
// Later:
window.removeEventListener("scroll", window.scrollListener);
```

### Problem 2: `?.addEventListener()` utan null-check av returnvärde
**Plats:** Flera ställen i `setupEventListeners()`, tex rad 1428-1445

```javascript
document.getElementById("periodStart_ars")?.addEventListener("change", ...);
```

**Risk:** Låg - optional chaining (`?.`) förhindrar fel om element saknas
**Notering:** Är redan väl hantererat ✅

### Problem 3: Loop-addEventListener kan få closure-problem
**Plats:** `initializeNewNavigation()` rad 816-819

```javascript
navItems.forEach(item => {
  item.addEventListener("click", event => { ... });
});
```

**Risk:** Låg - closure är korrekt här (forEach ger ny scope per iteration)
**Status:** OK ✅

---

## 🚀 REKOMMENDERADE FÖRBÄTTRINGAR (Optional, låg prioritet)

### 1. Lägg till Initialization Guard (om setupFunktioner kan anropas flera gånger senare)

```javascript
// Lägg till i toppen av godman_logic.js efter andra globala variabler
let appInitialized = false;

// Ändra initializeApp():
async function initializeApp() {
  if (appInitialized) {
    console.warn("[App Init] Försökt initiera app igen - ignoreras");
    return;
  }
  appInitialized = true;
  
  // ... resten av kod ...
}
```

### 2. Lagra listener-funktioner för möjlig senare borttagning

```javascript
// Globalt objekt för lagring av listener-funktioner
window.appListeners = {
  scroll: null,
  click: null,
  navItems: []
};

// I initializeNewNavigation():
window.appListeners.scroll = () => { 
  document.body.classList.toggle("scrolled", window.scrollY > 30);
};
window.addEventListener("scroll", window.appListeners.scroll);

// Om behov senare:
// window.removeEventListener("scroll", window.appListeners.scroll);
```

### 3. Konsolidera delegerad event-hantering

Redan implementerat väl! ✅ `document.body.addEventListener("click", ...)` 
med switch-statement är effektivt.

---

## ✅ SLUT RESULTAT

**Event listeners är VÄLL organiserade och INTE dubbelregistrerade.**

- ✅ Alla setup-funktioner anropas endast EN gång
- ✅ Centraliserad initialisering via `DOMContentLoaded`
- ✅ Ingen risk för dubbelregistrering idag
- ⚠️ Potentiell framtida risk om nya funktioner anropar setupFunktionerna återigen
- 💡 Rekommendation: Lägg till initialization guard för säkerhet

**Åtgärd rekommenderad:** Lägg till `appInitialized`-flag för att förhindra framtida problem.

