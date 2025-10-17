# PDF-ifyllning - Debugging Guide

## Vad jag har fixat ✅

### 1. Undefined templateId bug
**Problem:** Vid klick på kommun-knapp (t.ex. "Upplands Väsby"), ställdes `window.currentFsTemplateId` till `undefined`
**Lösning:** Ändrat rad 7651 från `window.currentFsTemplateId = templateId;` till `window.currentFsTemplateId = tid;`
**Effekt:** Nu skickas korrekt template-ID till PDF-genereringen

### 2. Förbättrad felsökning
Added enhanced logging to:
- `trySetTextField()` - visar vilka PDF-fält som hittades/inte hittades
- `genereraOchLaddaNerForsorjningsstodPdf()` - visar alla tillgängliga data från huvudman-objektet
- Kostnader-loop - visar vilka kostnadsvärden som processeras

## Hur du debuggar vidare

### Steg 1: Öppna Developer Tools
Tryck **F12** i webbläsaren när du är på försörjningsstöd-sidan

### Steg 2: Gå till Console-fliken
Du ska se alla [PDF Gen FS]-meddelanden här

### Steg 3: Skapa en test-PDF
1. Välj en huvudman på huvudman-fliken
2. Gå till "Försörjningsstöd"-fliken
3. Klicka på t.ex. "Upplands Väsby"
4. Klicka "Generera PDF"-knappen
5. I Console bör du nu se detaljerade loggar

### Steg 4: Analysera loggarna
Letar efter dessa meddelanden:

**Bra tecken:**
```
[PDF Gen FS] Startar generering av Försörjningsstöd PDF...
[PDF Gen FS] Kostnadsfält - Hyra: 5000 ElKostnad: 350 Bredband: 300
[PDF Gen FS] ✓ Fältet 'hyra' fyllt med: "5000"
[PDF Gen FS] ✓ Fältet 'elKostnad' fyllt med: "350"
```

**Varning-tecken:**
```
[PDF TextFält] Fältet 'hyra' hittades INTE i PDF-mallen
[PDF Gen FS] Kostnad Hyra: Värde från HM = undefined
```

### Steg 5: Tolka resultaten

#### Problem A: Fältet finns inte i PDF-mallen
```
[PDF TextFält] Fältet 'hyra' hittades INTE i PDF-mallen
```
**Lösning:** PDF-mallen för kommunen har inte ett fält med det namnet. Kontrollera PDF:ens formulärfält.

#### Problem B: Värdet finns inte i databasen
```
[PDF Gen FS] Kostnad Hyra: Värde från HM = undefined
```
**Lösning:** Hyra-värdet är inte sparat för denna huvudman. Gå till huvudman-editorn och fyll i "Hyra" under kostnader.

#### Problem C: Båda fungerar
```
[PDF Gen FS] Kostnad Hyra: Värde från HM = 5000
[PDF Gen FS] ✓ Fältet 'hyra' fyllt med: "5000"
```
**Men värdet syns inte i PDF:** PDF-mallen hade redan detta värde fylt in, eller så behöver den regenereras.

## Nästa steg baserat på vad du hittar

### Om problem A (fält saknas i PDF)
Du behöver:
1. Öppna PDF-mallen i Adobe Acrobat eller liknande
2. Kontrollera vilka fältnamn som faktiskt finns i mallen
3. Uppdatera koden för att använda rätt fältnamn

Tillgängliga fält borde visas i Console:
```javascript
// Kör detta i Console:
console.log(form.getFields().map(f => f.getName()));
```

### Om problem B (data saknas i DB)
1. Gå till huvudman-redigeringen
2. Fyll i kostnadsfälten
3. Spara
4. Försök igen

### Om inget av ovanstående är problemet
Det kan finnas ett annat problem i:
- Datakvaliteten från DB
- PDF-biblioteket (PDFLib/fontkit)
- PDF-mallens format/kryptering

Kontakta mig med:
1. Bildskärm på Console-loggarna
2. Vilken kommun du testar med
3. Vilka fält som inte fylls in

## Extra debugging-kod du kan köra i Console

Klistra in detta för att se All data för den aktuella huvudmannen:
```javascript
console.log("=== DEBUGGING INFO ===");
console.log("Template ID:", window.currentFsTemplateId);
console.log("Kommun:", window.currentFsKommunNamn);
console.log("Huvudman data:", window.currentHuvudmanFullData?.huvudmanDetails);
console.log("God Man profil:", window.activeGodManProfile);
```

