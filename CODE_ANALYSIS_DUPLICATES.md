# Kod-analys: Dubbla Funktioner och Event Listeners

## 🔴 KRITISKA PROBLEM HITTADE

### 1. DUBBLA FUNKTIONER

#### A. scrollToSection() - **2 DUPLIKAT**
| Rad | Källa |
|-----|-------|
| 930 | Första definition |
| 2385 | **DUPLIKAT** - Identisk kod |

**Lösning:** Behåll rad 930, ta bort rad 2385

---

#### B. convertExcelDate() - **3 DUPLIKAT**
| Rad | Källa |
|-----|-------|
| 3970 | Första definition |
| 4030 | **DUPLIKAT** - Identisk kod |
| 4085 | **DUPLIKAT** - Identisk kod |

**Lösning:** Behåll rad 3970, ta bort rad 4030 och 4085

---

#### C. formatCurrencyForPdf() - **2-3 DUPLIKAT**
| Rad | Funktion | Status |
|-----|----------|--------|
| 4006 | `formatCurrencyForPdf(amount, useTwoDecimals = true)` | Original |
| 4066 | `formatCurrencyForPdf(amount, useTwoDecimals = true)` | **DUPLIKAT** |
| 5802 | `formatCurrencyForPdfNoDecimals(amount, showZeroAsEmpty = true)` | Variant |
| 6308 | `formatCurrencyForPdf(amount, showZeroAsEmpty = false)` | **DUPLIKAT** (different signature) |
| 6326 | `formatCurrencyForPdfInteger(amount, showZeroAsEmpty = true)` | Variant |

**Problem:** 
- Tre olika versioner av samma funktion med olika signaturer!
- Kan orsaka förvirring och buggar

**Lösning:** 
- Standardisera till EN version
- Eller använda en flexibel funktion med options-objekt

---

### 2. LIKNANDE FUNKTIONER MED OLIKA NAMN

| Funktioner | Problem |
|-----------|---------|
| `formatCurrencyForPdf` (rad 4006) vs `formatCurrencyForPdf` (rad 6308) | Olika signaturer, samma namn |
| `formatCurrencyForPdfNoDecimals` (rad 5802) | Egen funktion istället för parameter |
| `formatCurrencyForPdfInteger` (rad 6326) | Tredje variant |

**Rekommendation:** Konsolidera till en funktion med options

---

### 3. EVENT LISTENERS - POTENTIELLA PROBLEM

Funktioner som sätter upp listeners:
- `setupEventListeners()` (rad 1426)
- `setupLankarTabListeners()` (rad 1498)
- `setupRpaTabListeners()` (rad 1513)
- `setupFormEventListeners()` (js/modules/ui/events.js rad 66)
- `setupButtonEventListeners()` (js/modules/ui/events.js rad 267)
- `setupModalEventListeners()` (js/modules/ui/events.js rad 317)
- `setupSearchEventListeners()` (js/modules/ui/events.js rad 398)
- `setupDropdownEventListeners()` (js/modules/ui/events.js rad 489)
- `setupKeyboardEventListeners()` (js/modules/ui/events.js rad 549)
- `setupWindowEventListeners()` (js/modules/ui/events.js rad 618)
- `setupCustomEventListeners()` (js/modules/ui/events.js rad 687)
- `setupActivityTracking()` (js/modules/ui/events.js rad 713)

**Möjliga Problem:**
1. Listeners kan registreras FLERA GÅNGER om setup-funktionerna kallas mer än en gång
2. Detta leder till event-huggregister och minnesläckor
3. Samma event kan triggas flera gånger

**Rekommendation:** 
- Lägg till "guard"-kod för att förhindra dubbelregistrering
- Använd `once` för one-time events
- Deregistrera innan re-setup

---

## 📋 DETALJERAD LISTA - DUBBLA FUNKTIONER

### scrollToSection (rad 930 vs 2385)
```javascript
// Rad 930
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth" });
  // ... mer kod
}

// Rad 2385 - EXAKT SAMMA
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth" });
  // ... samma kod
}
```

**Status:** ⚠️ JavaScript låter detta - den andra definitionen ÖVERSKRIVER den första

---

### convertExcelDate (rad 3970 vs 4030 vs 4085)
```javascript
// Rad 3970
function convertExcelDate(excelDate) {
  const baseDate = new Date(1900, 0, 0);
  return new Date(baseDate.getTime() + excelDate * 86400000);
}

// Rad 4030 - EXAKT SAMMA
function convertExcelDate(excelDate) {
  const baseDate = new Date(1900, 0, 0);
  return new Date(baseDate.getTime() + excelDate * 86400000);
}

// Rad 4085 - EXAKT SAMMA  
function convertExcelDate(excelDate) {
  const baseDate = new Date(1900, 0, 0);
  return new Date(baseDate.getTime() + excelDate * 86400000);
}
```

**Status:** ⚠️ Tredje definitionen vinner - de två första är död kod

---

### formatCurrencyForPdf (rad 4006 vs 6308)
```javascript
// Rad 4006
function formatCurrencyForPdf(amount, useTwoDecimals = true) {
  if (amount === null || amount === undefined || String(amount).trim() === "") {
    return "";
  }
  const num = parseFloat(String(amount).replace(",", "."));
  if (isNaN(num)) return "";
  return num.toLocaleString("sv-SE", {
    minimumFractionDigits: useTwoDecimals ? 2 : 0,
    maximumFractionDigits: useTwoDecimals ? 2 : 0,
  });
}

// Rad 6308 - DUPLIKAT MED ANNAN SIGNATURE
function formatCurrencyForPdf(amount, showZeroAsEmpty = false) {
  if (
    amount === null ||
    amount === undefined ||
    String(amount).trim() === "" ||
    isNaN(parseFloat(String(amount).replace(",", ".")))
  )
    return "";
  const num = parseFloat(String(amount).replace(",", "."));
  if (isNaN(num)) return "";
  const roundedNum = Math.round(num);
  if (showZeroAsEmpty && roundedNum === 0) return "";
  return roundedNum.toLocaleString("sv-SE", { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
}
```

**Status:** ⚠️ KRITISK - två olika versioner med SAMMA NAMN men olika signaturer!
- Kod som använder version 1: `formatCurrencyForPdf(123, true)` kommer använda version 2
- Version 2 vinner (definierad senare)
- Version 1 är död kod

---

## 🔧 REKOMMENDERADE ÅTGÄRDER

### OMEDELBAR (High Priority)
1. ✅ Ta bort rad 2385: `function scrollToSection(sectionId)` - duplikat
2. ✅ Ta bort rad 4030: `function convertExcelDate(excelDate)` - duplikat
3. ✅ Ta bort rad 4085: `function convertExcelDate(excelDate)` - duplikat
4. ✅ Sammanfoga formatCurrency-funktionerna till EN robust version

### KORT SIKT (Medium Priority)
5. Lägg till "guard" för event listeners (förhindra dubbelregistrering)
6. Testa att inga funktioner kallas flera gånger

### LÅNGSIKT (Low Priority)
7. Refaktorera currency-formatterings-funktionerna
8. Skapa modulär struktur för utility-funktioner
9. Lägg till linter för att detektera dubbla funktioner

---

## VILL DU ATT JAG SKA:
- [ ] Automatiskt ta bort alla duplikat?
- [ ] Konsolidera formatCurrency-funktionerna?
- [ ] Lägga till guard för event listeners?
- [ ] Skapa en rapport över vilka funktioner som borde konsolideras?

