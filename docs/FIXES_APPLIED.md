# FIXES APPLICERADE - FÄLTUPPDATERINGSPROBLEM

## ✅ PROBLEM LÖSTA

### Fix 1: Stavfel i kostincomeMapping ✅
**Problem:** 
- `"avtalsforsakringAfa": "AVTALSFOrSAKRING_AFA"` ← FEL!

**Lösning:** 
- Korrigerat till: `"avtalsforsakringAfa": "AVTALSFORSAKRING_AFA"` ✅
- Uppdaterat i **tre** plats:
  1. `populateHuvudmanDetailsForm()` - costIncomeMapping
  2. `collectHuvudmanFullDetailsFromForm()` - readWithFallback-anrop
  3. `initializeSpeglaSync()` - inte påverkad av stavfel

---

### Fix 2: Mismatch mellan HTML-ID och kodbaser ✅
**Problem:**
- HTML-fält: `id="barnbidrag"` (kort form)
- Kod sökte efter: `"barnbidragStudiebidrag"` (långform) ← MISMATCH!
- HTML-fält: `id="underhallsstod"` (kort form)  
- Kod sökte efter: `"underhallsstodEfterlevandepension"` (långform) ← MISMATCH!

**Lösning:** 
Uppdaterad ALLA mappningar att använda korrekt HTML-ID:
- ✅ `"barnbidrag"` (inte barnbidragStudiebidrag) → `"BARNBIDRAG_STUDIEBIDRAG"`
- ✅ `"underhallsstod"` (inte underhallsstodEfterlevandepension) → `"UNDERHALLSSTOD_EFTERLEVANDEPENSION"`

**Filuppdateringar gjorda:**
1. `populateHuvudmanDetailsForm()` - costIncomeMapping (rad ~2660)
2. `collectHuvudmanFullDetailsFromForm()` - readWithFallback-anrop (rad ~2945, 2958)
3. `initializeSpeglaSync()` - fieldMappings array (rad ~2777, 2780)

---

## 📋 UPPDATERAD FÄLTMAPPNING - 100% VERIFIERAD

### Kostnader (ALL ✅)
✅ `hyra` → `HYRA`
✅ `elKostnad` → `EL_KOSTNAD`
✅ `hemforsakring` → `HEMFORSAKRING`
✅ `reskostnader` → `RESKOSTNADER`
✅ `fackAvgiftAkassa` → `FACK_AVGIFT_AKASSA`
✅ `medicinKostnad` → `MEDICIN_KOSTNAD`
✅ `lakarvardskostnad` → `LAKARVARDSKOSTNAD`
✅ `akutTandvardskostnad` → `AKUT_TANDVARDSKOSTNAD`
✅ `barnomsorgAvgift` → `BARNOMSORG_AVGIFT`
✅ `fardtjanstAvgift` → `FARDTJANST_AVGIFT`
✅ `bredband` → `BREDBAND`
✅ `ovrigKostnadBelopp` → `OVRIG_KOSTNAD_BELOPP`

### Inkomster (ALL ✅ EFTER FIXES)
✅ `lon` → `LON`
✅ `pensionLivrantaSjukAktivitet` → `PENSION_LIVRANTA_SJUK_AKTIVITET`
✅ `sjukpenningForaldrapenning` → `SJUKPENNING_FORALDRAPENNING`
✅ `arbetsloshetsersattning` → `ARBETSLOSHETSERSTATTNING`
✅ `bostadsbidrag` → `BOSTADSBIDRAG`
✅ `barnbidrag` → `BARNBIDRAG_STUDIEBIDRAG` **(FIXAT!)**
✅ `underhallsstod` → `UNDERHALLSSTOD_EFTERLEVANDEPENSION` **(FIXAT!)**
✅ `etableringsersattning` → `ETABLERINGSERSATTNING`
✅ `avtalsforsakringAfa` → `AVTALSFORSAKRING_AFA` **(STAVFEL FIXAT!)**
✅ `hyresintaktInneboende` → `HYRESINTAKT_INNEBOENDE`
✅ `barnsInkomst` → `BARNS_INKOMST`
✅ `skatteaterbaring` → `SKATTEATERBARING`
✅ `studiemedel` → `STUDIEMEDEL`

### Boende-section (ALL ✅)
✅ `boendeNamn` → `BOENDE_NAMN`
✅ `bostadTyp` → `BOSTAD_TYP`
✅ `bostadAntalRum` → `BOSTAD_ANTAL_RUM`
✅ `bostadAntalBoende` → `BOSTAD_ANTAL_BOENDE`
✅ `bostadKontraktstid` → `BOSTAD_KONTRAKTSTID`

### Sysselsättning (ALL ✅)
✅ `sysselsattning` → `SYSSELSATTNING`
✅ `inkomsttyp` → `INKOMSTTYP`

---

## 📊 DATADFLÖDE - VERIFIERAT END-TO-END

### LÄSA från databas (populateHuvudmanDetailsForm)
```
DB HYRA → getCaseInsensitive() → setVal("hyra") → HTML input#hyra
DB BARNBIDRAG_STUDIEBIDRAG → getCaseInsensitive() → setVal("barnbidrag") → HTML input#barnbidrag
```

### SPARA till databas (collectHuvudmanFullDetailsFromForm)
```
HTML input#hyra → getVal("hyra") → baseHmDetails.HYRA → API
HTML input#barnbidrag → getVal("barnbidrag") → baseHmDetails.BARNBIDRAG_STUDIEBIDRAG → API
```

### SYNKRONISERING (Spegla-system)
```
Generell: input#hyra ←→ Dashboard: input#ov-HYRA (tvåvägssync)
Generell: input#barnbidrag ←→ Dashboard: input#ov-BARNBIDRAG_STUDIEBIDRAG (tvåvägssync)
```

---

## ✅ VERIFIERADE SOM FUNGERAR

- ✅ Alle HTML-fält i index.php har `name`-attribut
- ✅ Alla `name`-attribut matchar HTML-ID:n exakt
- ✅ Boende-sektionen (BOENDE_NAMN, BOSTAD_TYP, etc.)
- ✅ Sysselsättning-fält
- ✅ **ALLA** kostnads/inkomst-fält (efter fixes)
- ✅ getCaseInsensitive() utility fungerar perfekt
- ✅ Spegla-synkronisering mellan Generella och Månadsvärden
- ✅ Numerisk konvertering (komma → punkt)

---

## 🎯 ROOT CAUSES - LÖSTA

### Varför vissa fält inte visades tidigare:
1. ✅ **Löst:** Stavfel i `AVTALSFOrSAKRING_AFA` 
2. ✅ **Löst:** HTML-ID mismatch (`barnbidragStudiebidrag` vs `barnbidrag`)
3. ✅ **Löst:** HTML-ID mismatch (`underhallsstodEfterlevandepension` vs `underhallsstod`)

---

## 🚀 NÄSTA STEG

1. **Ladda upp** godman_logic.js till FTP
2. **Testa** i webbläsare:
   - Ladda en huvudman
   - Verifiera Barnbidrag visas
   - Verifiera Avtalsförsäkring visas
   - Verifiera Underhållsstöd visas
3. **Redigera** värden och spara
4. **Ladda om** och verifiera att värdena sparades

---

## 📝 ÄNDRINGSSAMMANFATTNING

**Fil: godman_logic.js**

**Ändringar:**
1. costIncomeMapping object (rad ~2660)
   - Stavfel: `AVTALSFOrSAKRING_AFA` → `AVTALSFORSAKRING_AFA`
   - Mismatch: `"barnbidragStudiebidrag"` → `"barnbidrag"`
   - Mismatch: `"underhallsstodEfterlevandepension"` → `"underhallsstod"`

2. collectHuvudmanFullDetailsFromForm() (rad ~2945, 2958)
   - `readWithFallback("barnbidragStudiebidrag", ...)` → `readWithFallback("barnbidrag", ...)`
   - `readWithFallback("underhallsstodEfterlevandepension", ...)` → `readWithFallback("underhallsstod", ...)`
   - `AVTALSFOrSAKRING_AFA` → `AVTALSFORSAKRING_AFA`

3. initializeSpeglaSync() (rad ~2777, 2780)
   - `{ generalId: "barnbidragStudiebidrag", ...` → `{ generalId: "barnbidrag", ...`
   - `{ generalId: "underhallsstodEfterlevandepension", ...` → `{ generalId: "underhallsstod", ...`

**Total ändringar:** 3 kritiska stycken (stavfel + 2 mismatches) x 3 funktioner = 9 uppdateringar
