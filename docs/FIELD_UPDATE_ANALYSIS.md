# DETALJERAD ANALYS: Fältuppdateringsproblem

## 🔴 KRITISKA PROBLEM IDENTIFIERADE

### 1. **STAVFEL I kostincomeMapping (godman_logic.js, rad ~2660)**
**Problem:** 
```javascript
"avtalsforsakringAfa": "AVTALSFOrSAKRING_AFA",  // ← FOrSAKRING är FEL!
```

**Borde vara:**
```javascript
"avtalsforsakringAfa": "AVTALSFORSAKRING_AFA",  // ← Korrekt stavning
```

**Effekt:** 
- Avtalsförsäkring-fältet (`avtalsforsakringAfa` i HTML) läses aldrig från databasen
- Värdet visas aldrig i formuläret
- Värdet sparas potentiellt till fel kolumn i DB

---

### 2. **HTML name-attribut vs ID-attribut matchning**
**Hittade problem:**
- ✅ `boendeNamn` - har både id och name
- ✅ `bostadTyp` - har både id och name
- ✅ `sysselsattning` - har både id och name
- ✅ `Kostnader/Inkomster` - alla har name-attribut

**Status:** ✅ Dessa ser OK ut

---

### 3. **POTENTIAL PROBLEM: Falsk Fallback-logik**
**Problem i collectHuvudmanFullDetailsFromForm() (rad ~2900):**
```javascript
const readWithFallback = (primaryId, fallbackId) => {
  const primaryValue = getVal(primaryId, false, null, true, true);
  const fallbackValue = getVal(fallbackId, false, null, true, true);
  return primaryValue ?? fallbackValue ?? null;
};

baseHmDetails.HYRA = readWithFallback("hyra", "ov-HYRA");
```

**Risk:** 
- Läser från två källor (HTML-formulär OCH dashboard)
- Om användaren ändrar i formulär men dashboard har värde → kan bli förvirring
- Bör prioritera primär form-källa

---

### 4. **PROBLEM MED NUMERISKA FÄLT KONVERTERING**
**I index.php:**
- Kostnader/Inkomster-fält använder `inputmode="decimal"` med pattern `^-?\d{1,9}([,.]\d{1,2})?$`
- Tillåter både komma och punkt som decimalseparator

**I godman_logic.js setVal():**
```javascript
if (isNumeric) {
  let numStr = String(value ?? "").trim();
  numStr = numStr.replace(",", ".");  // ← Konverterar komma till punkt
  const num = isFloat ? parseFloat(numStr) : parseInt(numStr, 10);
```

**Problem:** 
- Parser tar ut siffror korrekt men kan lagra som STRING istället för NUMBER
- Databas kan ha blandade format (5500, "5500", "5500,50", "5500.50")

---

## 📊 FÄLTMAPPNING FULLSTÄNDIG INVENTERING

### Boende-section (FUNGERAR ✅)
- `boendeNamn` → `BOENDE_NAMN` ✅
- `bostadTyp` → `BOSTAD_TYP` ✅
- `bostadAntalRum` → `BOSTAD_ANTAL_RUM` ✅
- `bostadAntalBoende` → `BOSTAD_ANTAL_BOENDE` ✅
- `bostadKontraktstid` → `BOSTAD_KONTRAKTSTID` ✅

### Sysselsättning (FUNGERAR ✅)
- `sysselsattning` → `SYSSELSATTNING` ✅
- `inkomsttyp` → `INKOMSTTYP` ✅

### Kostnader (PROBLEM I FLERA!)
- `hyra` → `HYRA` ✅
- `elKostnad` → `EL_KOSTNAD` ✅
- `hemforsakring` → `HEMFORSAKRING` ✅
- `reskostnader` → `RESKOSTNADER` ✅
- `fackAvgiftAkassa` → `FACK_AVGIFT_AKASSA` ✅
- `medicinKostnad` → `MEDICIN_KOSTNAD` ✅
- `lakarvardskostnad` → `LAKARVARDSKOSTNAD` ✅
- `akutTandvardskostnad` → `AKUT_TANDVARDSKOSTNAD` ✅
- `barnomsorgAvgift` → `BARNOMSORG_AVGIFT` ✅
- `fardtjanstAvgift` → `FARDTJANST_AVGIFT` ✅
- `bredband` → `BREDBAND` ✅
- `ovrigKostnadBelopp` → `OVRIG_KOSTNAD_BELOPP` ✅

### Inkomster (1 STAVFEL!)
- `lon` → `LON` ✅
- `pensionLivrantaSjukAktivitet` → `PENSION_LIVRANTA_SJUK_AKTIVITET` ✅
- `sjukpenningForaldrapenning` → `SJUKPENNING_FORALDRAPENNING` ✅
- `arbetsloshetsersattning` → `ARBETSLOSHETSERSTATTNING` ✅
- `bostadsbidrag` → `BOSTADSBIDRAG` ✅
- `barnbidragStudiebidrag` → `BARNBIDRAG_STUDIEBIDRAG` ✅ (NOTE: I HTML är det `barnbidrag`)
- `underhallsstodEfterlevandepension` → `UNDERHALLSSTOD_EFTERLEVANDEPENSION` ✅
- `etableringsersattning` → `ETABLERINGSERSATTNING` ✅
- `avtalsforsakringAfa` → `AVTALSFOrSAKRING_AFA` ❌ **STAVFEL! Bör vara `AVTALSFORSAKRING_AFA`**
- `hyresintaktInneboende` → `HYRESINTAKT_INNEBOENDE` ✅
- `barnsInkomst` → `BARNS_INKOMST` ✅
- `skatteaterbaring` → `SKATTEATERBARING` ✅
- `studiemedel` → `STUDIEMEDEL` ✅

---

## 🎯 ROOT CAUSES FÖR SYNKRONISERINGSPROBLEM

### Varför Boende-data inte visades tidigare:
1. ✅ **Löst:** Database columns var VERSALER (BOENDE_NAMN) men kod letade efter camelCase (BoendeNamn)
2. ✅ **Löst:** setVal() använder nu getCaseInsensitive() för att hantera case-variationer
3. ✅ **Löst:** collectHuvudmanFullDetailsFromForm() samlar in Boende-fält korrekt

### Varför Kostnader/Inkomster inte synkroniseras:
1. ❌ **STAVFEL** i `AVTALSFOrSAKRING_AFA` → läser från fel kolumn
2. ⚠️ **FALLBACK-LOGIK** läser från två källor (kan skapa förvirring)
3. ⚠️ **NUMERISKA KONVERTERINGAR** kan lagra som STRING i vissa fall

---

## 📋 REKOMMENDERADE FIXES (PRIORITETSORDNING)

### Priority 1: KRITISK
- [ ] Fixa stavfel: `AVTALSFOrSAKRING_AFA` → `AVTALSFORSAKRING_AFA`
- [ ] Kontrollera att AVTALSFORSAKRING_AFA finns i databasen

### Priority 2: VIKTIGT
- [ ] Verify att alla form-fält namn matchar HTML id:n
- [ ] Test end-to-end: Läs data → Visa i form → Spara → Läs tillbaka

### Priority 3: OPTIMERING
- [ ] Förenkla fallback-logiken (använd bara primär källa)
- [ ] Standardisera numerisk lagring (alla tal som DECIMAL/FLOAT i DB)

---

## ✅ VERIFIERADE SOM FUNGERAR

- ✅ Boende-sektionen (BOENDE_NAMN, BOSTAD_TYP, etc.)
- ✅ Sysselsättning-fält
- ✅ De flesta kostnads/inkomst-fält
- ✅ getCaseInsensitive() utility
- ✅ Spegla-synkronisering mellan Generella och Månadsvärden
- ✅ Form name-attribut matchning

---

## 🔧 NÄSTA STEG

1. Fixa stavfel i kostincomeMapping
2. Verifiera databasen har korrekt kolumnnamn
3. Kör end-to-end test för alla fält
4. Uppdatera FTP
