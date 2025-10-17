# PDF-ifyllning felsökning - Försörjningsstöd

## Problem
Inte alla PDF-fält fylls in när man väljer en huvudman och sedan kommun under "Försörjningsstöd"-fliken.
Endast några få fält (som namn) fylls in, medan kostnader och andra fält lämnas tomma.

## Utförda Fixes

### 1. ✅ FIXAD - Undefined templateId bug (rad 7651)
**Problem:** `window.currentFsTemplateId = templateId;` skulle använda variabeln `templateId` som är undefined
**Lösning:** Ändrat till `window.currentFsTemplateId = tid;` som är den korrekta variabeln
**Fil:** `godman_logic.js` linje 7651
**Status:** FIXAD

## Återstående Problem & Lösningar

### 2. Saknade databaskolomner för FS-specifika flaggor

Koden refererar till dessa fält som inte finns i `huvudman`-tabellen:
- `FS_Inkomster_SaknasHelt`
- `FS_Tillgangar_SaknasHelt` 
- `FS_AnsokanAvserAr_Sparad`
- `FS_AnsokanAvserManad_Sparad`
- `FS_Medgivande_Huvudkryss`
- `FS_Ansokan_Checkbox_Riksnorm`
- `FS_KommunHandlaggare`
- `FS_UtbetalningOnskasTill`

**Lösning:** 
Antingen:
a) Lägg till dessa kolumner i huvudman-tabellen
b) Använd en separat tabell `HuvudmanForsorjningsstod` för att lagra FS-specifika data
c) Uppdatera modalen för att inte förvänta dessa värden från DB

### 3. Potentiella PDF-fältnamn mismatch

Se till att PDF-mallarna för varje kommun har exakt matchande fältnamn som kod förväntar:
- `hyra`, `elKostnad`, `fackAvgiftAkassa`, `reskostnader`, `hemforsakring`, etc.

**Debug-tips:**
```javascript
// I browser-console kan du kolla vilka fält som finns:
const pdfDoc = await PDFDocument.load(...);
const form = pdfDoc.getForm();
form.getFields().forEach(field => console.log(field.getName()));
```

### 4. Kontrollera datakällor

**Frontend (genereraOchLaddaNerForsorjningsstodPdf):**
- Använder `currentHuvudmanFullData.huvudmanDetails` objektet
- Förväntar fälten att vara PascalCase (Ex: `Hyra`, `ElKostnad`)

**Backend (generate_pdf.php):**
- Hämtar data från `huvudman` tabell
- Konverterar underscored column names till PascalCase automatiskt

**Konvertering:** `HYRA` → `Hyra`, `EL_KOSTNAD` → `ElKostnad` ✓

### 5. Debugging-steg

1. Öppna Developer Tools (F12) → Console
2. Försök skapa PDF och leta efter errors
3. Kontrollera att `currentHuvudmanFullData.huvudmanDetails` innehåller alla kostnader:
   ```javascript
   console.log(window.currentHuvudmanFullData.huvudmanDetails);
   ```

4. Kontrollera om PDF-mallarna har rätt fältnamn
5. Se om `form.getField(fieldName)` returnerar `null` för vissa fält

## Rekommenderade Åtgärder

1. **Omedelbar:** Testa om fixet för templateId löser problemet
2. **Kort sikt:** Lägg till debugging för att se vilka fält som faktiskt finns i PDFen
3. **Medium sikt:** Skapa migration för att lägga till FS-specifika kolumner eller tabell
4. **Långsikt:** Standardisera PDF-fältnamn och skapa en mapping-konfiguration

