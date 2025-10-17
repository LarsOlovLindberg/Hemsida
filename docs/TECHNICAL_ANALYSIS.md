# Teknisk Analys - PDF-ifyllning Försörjningsstöd

## Problem Beskrivning
När användare väljer en huvudman och sedan en kommun (t.ex. "Upplands Väsby") under "Försörjningsstöd"-fliken, fylls endast några fält in PDFen (t.ex. namn), medan övriga fält (kostnader, adress, etc.) förblir tomma.

## Root Cause Analysis

### 1. PRIMARY BUG (FIXAD) ✅
**Plats:** `godman_logic.js` rad 7651
**Kod:** `window.currentFsTemplateId = templateId;`
**Problem:** Variabeln `templateId` existerar inte i scope
**Rätt variabel:** `tid` (definierad rad 7630)
**Effekt:** `currentFsTemplateId` ställdes till `undefined`, vilket orsakade:
- API-anrop utan templateId
- Ingen data mappning
- Tomt PDF-svar

**Fix:** 
```javascript
window.currentFsTemplateId = tid;  // Korrekt
```

### 2. Data Flow Analysis
```
User väljer kommun
    ↓
openForsorjningsstodModal() 
    ↓
Hämtar template ID från FS_TEMPLATE_IDS_BY_NAME
    ↓
Sätter window.currentFsTemplateId = tid  ← FIXAD HÄR
    ↓
Modalen visas med data (display-only)
    ↓
User klickar "Generera PDF"
    ↓
genereraOchLaddaNerForsorjningsstodPdf()
    ↓
Läser hm-objektet och försöker fylla PDF
    ↓
trySetTextField() för varje fält
    ↓
PDF genereras och laddas ned
```

### 3. Data Mapping Chain

#### Frontend → Backend
```
hm.Hyra (PascalCase)
    ↓ (undefined → pga bug)
window.currentFsTemplateId = undefined
    ↓ (API-anrop misslyckas?)
generate_pdf.php?templateId=undefined
```

#### Backend → PDF
```
database: HYRA (UPPERCASE_UNDERSCORE)
    ↓
get_hovedman_details.php konverterar
    ↓
PascalCase: Hyra
    ↓
generate_pdf.php hämtar från DB
    ↓
pdftk fyller PDF-fält
```

### 4. PDF Field Name Expectations

**Vad koden förväntar (PDF-fältnamn):**
- `hyra`, `elKostnad`, `fackAvgiftAkassa`, `reskostnader`
- `hemforsakring`, `medicinkostnad`, `lakarvardskostnad`
- `barnomsorgAvgift`, `fardtjanstAvgift`, `akutTandvardskostnad`
- `bredband`, `ovrigKostnadBeskrivning`, `ovrigKostnadBelopp`

**Vad databasen har (huvudman.kolumn):**
- `HYRA`, `EL_KOSTNAD`, `FACK_AVGIFT_AKASSA`, `RESKOSTNADER`
- `HEMFORSAKRING`, `MEDICIN_KOSTNAD`, `LAKARVARDSKOSTNAD`
- `BARNOMSORG_AVGIFT`, `FARDTJANST_AVGIFT`, `AKUT_TANDVARDSKOSTNAD`
- `BREDBAND`, `OVRIG_KOSTNAD_BESKRIVNING`, `OVRIG_KOSTNAD_BELOPP`

**Konvertering (funkar ✓):**
```php
// get_hovedman_details.php
$pascalKey = str_replace(' ', '', ucwords(str_replace('_', ' ', strtolower($key))));
// HYRA → hyra → Hyra ✓
// EL_KOSTNAD → el_kostnad → El Kostnad → ElKostnad ✓
```

### 5. Potential Remaining Issues

#### Issue A: PDF Template Field Names Don't Match
**Symptom:** Field shows filled in console but not in PDF
**Cause:** PDF template has different field names than expected
**Example:** Code tries to fill "hyra" but PDF has "RentAmount"

**Solution:** 
1. Open PDF template in Adobe Acrobat
2. Check field names: Forms → List Fields
3. Update mapping in code

#### Issue B: Missing Database Columns
**Symptom:** Code references fields that don't exist in DB
**Fields:**
- `FS_Inkomster_SaknasHelt`
- `FS_Tillgangar_SaknasHelt`
- `FS_AnsokanAvserAr_Sparad`
- `FS_AnsokanAvserManad_Sparad`
- `FS_Medgivande_Huvudkryss`

**Impact:** These show as "undefined" in modal, but modal display handles this gracefully

**Solution Options:**
a) Add these columns to `huvudman` table
b) Use separate `HuvudmanForsorjningsstod` table
c) Store in HTML form/session instead

#### Issue C: Font/Encoding Issues
**Symptom:** Special characters (å, ä, ö) not appearing correctly
**Solution:** Already handled via fontkit + LiberationSans-Regular.ttf

### 6. Testing Scenario

**Input Data:**
- Huvudman: Lars Test (PNR: 1234567890)
- Hyra: 8000
- ElKostnad: 400
- Kommune: Upplands Väsby (TemplateId: 2)

**Expected Flow:**
1. `openForsorjningsstodModal('Upplands Väsby')` sets `currentFsTemplateId = 2` ✓ FIXED
2. `genereraOchLaddaNerForsorjningsstodPdf()` called
3. Loads PDF from `/pdf_templates/...` 
4. Fills form with data from hm object
5. PDFLib.save() creates final PDF
6. Browser downloads file

**Debugging Output Expected:**
```
[PDF Gen FS] Startar generering av Försörjningsstöd PDF...
[PDF Gen FS] Alla keys i hm-objekt: [..., "Hyra", "ElKostnad", ...]
[PDF Gen FS] Kostnadsfält - Hyra: 8000 ElKostnad: 400
[PDF Gen FS] Försöker fylla kostnader. Kostnad-mappning: Hyra→hyra, ElKostnad→elKostnad, ...
[PDF Gen FS] Kostnad Hyra: Värde från HM = 8000
[PDF Gen FS] ✓ Fältet 'hyra' fyllt med: "8000"
[PDF Gen FS] Kostnad ElKostnad: Värde från HM = 400
[PDF Gen FS] ✓ Fältet 'elKostnad' fyllt med: "400"
```

## Recommended Actions

### Immediate (After Fix)
1. Test with the templateId fix
2. Check browser console for errors
3. Compare PDF output with expected fields

### If Still Not Working
1. Enable full logging (already done)
2. Check which fields are missing in Console
3. Identify if it's a PDF template issue or data issue

### Long Term
1. Create PDF field validator
2. Document expected field names per template
3. Add database schema for FS-specific data
4. Implement field mapping configuration

## Code Files Affected

- `godman_logic.js` - Main logic for PDF generation and modal handling
- `get_hovedman_details.php` - Backend data retrieval with PascalCase conversion
- `generate_pdf.php` - PDF form filling via pdftk
- PDF templates - Various .pdf files with embedded forms

## Related Test Case
Template to test with: `Ansokan_FS_UpplandsVasby_mall.pdf` (TemplateId: 2)

