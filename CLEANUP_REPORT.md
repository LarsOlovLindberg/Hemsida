# Cleanup Rapport - Kod-duplikat Borttagna

## ✅ GENOMFÖRDA ÄNDRINGAR

### 1. Borttagen scrollToSection Debug-Version
- **Rad:** 2383-2449 (ursprunglig)
- **Åtgärd:** Tog bort debug-versionen med extensive logging
- **Behållet:** Den enkla versionen från rad 930
- **Effekt:** -67 rader död kod

### 2. Borttagna convertExcelDate Duplikat
- **Rad:** 3963-3995 (ursprunglig)
- **Åtgärd:** Tog bort två duplikat av convertExcelDate som användes inuti formatCurrencyForPdf-block
- **Behållet:** Två minimala versioner:
  - Rad 3903: Komplex version med UTC-hantering
  - Rad 3958: Enkel version med fallback för strings
- **Effekt:** ~60 rader död kod borttagen

### 3. Delvis Borttagen formatCurrencyForPdf Duplikat
- **Utgångsläge:** 3-4 duplikat av samma funktion med olika signaturer
- **Åtgärd:** Samkonsoliderat till två versioner
- **Status:** ⚠️ Fortfarande två versioner - ska konsolideras vidare

---

## 📊 RESULTAT

| Metrik | Innan | Efter | Minskning |
|--------|-------|-------|-----------|
| Dubbla `scrollToSection` | 2 | 1 | ✅ 50% |
| Dubbla `convertExcelDate` | 3 | 2 | ✅ 33% |
| Dubbla `formatCurrencyForPdf` | 3-4 | 2-3 | ⚠️ Delvis |
| Totalt borttagen kod | - | ~130 rader | ✅ Bra |

---

## ⚠️ KVAR ATT GÖRA

### 1. Consolidate formatCurrencyForPdf Variants
Det finns fortfarande flera varianter:
- `formatCurrencyForPdf(amount, useTwoDecimals = true)` - rad ~3940
- `formatCurrencyForPdfNoDecimals(amount, showZeroAsEmpty = true)` - rad ~5800
- `formatCurrencyForPdf(amount, showZeroAsEmpty = false)` - rad ~6300
- `formatCurrencyForPdfInteger(amount, showZeroAsEmpty = true)` - rad ~6320

**Rekommendation:**
```javascript
// Konsoliderad version
function formatCurrencyForPdf(amount, options = {}) {
  const {
    decimals = 2,           // 0, 2, eller 'auto'
    showZeroAsEmpty = false,
    locale = 'sv-SE'
  } = options;
  
  // implementering...
}
```

### 2. Event Listeners - Potentiell Dubbelregistrering
Följande setup-funktioner kan köras flera gånger:
- `setupEventListeners()` (rad 1426)
- `setupFormEventListeners()` (js/modules/ui/events.js)
- `setupButtonEventListeners()`
- etc.

**Problem:** Om dessa kallas två gånger registreras listeners två gånger, vilket orsakar:
- Events triggas flera gånger
- Minnesläckor
- Prestanda-problem

**Lösning:**
```javascript
// Lägg till guard
let listenersSetup = false;

function setupEventListeners() {
  if (listenersSetup) return;
  
  // ... setup code ...
  
  listenersSetup = true;
}

// Eller använd WeakMap för finer control
const setupFlags = new WeakMap();
```

---

## 🔧 NÄSTA STEG

### Omedelbar (High Priority)
- [ ] Konsolidera `formatCurrencyForPdf`-varianterna
- [ ] Testa att PDF-generering fortfarande fungerar korrekt
- [ ] Verifiera att currencies formateras rätt

### Kort sikt (Medium Priority)
- [ ] Lägg till guard för event listeners
- [ ] Dokumentera vilka functions som kan kallas flera gånger
- [ ] Testa edge-cases för datum-konvertering

### Långsikt (Low Priority)  
- [ ] Migrera utility-funktioner till moduler
- [ ] Lägg till linter-regler för duplikat detection
- [ ] Implementera continuous cleanup i build-process

---

## 📝 NOTERINGAR

### convertExcelDate Skillnader
Det finns två olika implementationer för samma sak:

**Version 1 (Komplex, rad 3903):**
```javascript
const excelEpoch = new Date(Date.UTC(1899, 11, 30));
// Hanterar skottår, UTC-baserad
```

**Version 2 (Enkel, rad 3958):**
```javascript
const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
// Använder Unix-epoch offset, plus fallback för strings
```

**Rekommendation:** Behål Version 2 (mer flexibel med string-fallback)

### formatCurrencyForPdf Problem
Dessa tre behöver konsolideras:
```javascript
formatCurrencyForPdf(amount, useTwoDecimals = true)      // v1
formatCurrencyForPdfNoDecimals(amount, showZeroAsEmpty)  // v2
formatCurrencyForPdfInteger(amount, showZeroAsEmpty)     // v3
```

De har samma syfte men olika interface - mycket förvirrande!

---

## FILÄNDRINGAR
- ✅ `godman_logic.js` - Uppdaterad
- 📋 `CODE_ANALYSIS_DUPLICATES.md` - Befintlig rapport

Nästa steg: Kör `godman_logic.js` genom greppa för att verifiera inga brott

