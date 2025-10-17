// ============================================================
// redogorelse.js - Redogörelse-hantering
// Sökväg: js/modules/redogorelse/redogorelse.js
// ============================================================

import {
  getCaseInsensitive,
  safe,
  formatDate,
  formatDateForPdf,
  yearForFilename,
  getRadioValue,
  setRadioValue,
  triggerDownload,
} from "../utils/helpers.js";

// ============================================================
// FYLL REDOGÖRELSE-FORMULÄR MED STANDARDVÄRDEN
// ============================================================

/**
 * Fyller redogörelse-fliken med standardvärden från huvudman och God man.
 */
export function populateRedogorelseTabWithDefaults() {
  console.log("[Redogörelse] Fyller formulär med standardvärden...");

  const hm = window.currentHuvudmanFullData?.hovedmanDetails;
  const gm = window.activeGodManProfile;

  if (!hm) {
    console.warn("[Redogörelse] Ingen huvudman vald.");
    return;
  }

  // Sätt kalenderår (föregående år som standard)
  const now = new Date();
  const lastYear = now.getFullYear() - 1;

  setInputValue("redogKalenderarStart", `${lastYear}-01-01`);
  setInputValue("redogKalenderarSlut", `${lastYear}-12-31`);

  // Sätt underskriftsdatum till idag
  setInputValue("redogUnderskriftDatum", now.toISOString().slice(0, 10));

  // Sätt underskriftsort från God man
  if (gm) {
    const postort = getCaseInsensitive(gm, "Postort", "postort") || "";
    setInputValue("redogUnderskriftOrt", postort);
  }

  // Omfattning - sätt standard till alla tre
  setCheckboxValue("redogOmfBevakaRatt", true);
  setCheckboxValue("redogOmfForvaltaEgendom", true);
  setCheckboxValue("redogOmfSorjaForPerson", true);

  // Behov av fortsatt godmanskap - standard "Ja"
  setRadioValue("redogBehovFortsatt", "Ja");

  // Annan omfattning - standard "Nej"
  setRadioValue("redogAnnanOmfattning", "Nej");

  console.log("[Redogörelse] Standardvärden satta.");
}

// ============================================================
// SAMLA DATA FRÅN FORMULÄR
// ============================================================

/**
 * Samlar all redogörelsedata från formuläret.
 * @returns {object} - Objekt med all redogörelsedata
 */
export function collectRedogorelseDataFromForm() {
  const data = {};

  // Grunduppgifter & Period
  data.redogKalenderarStart = getInputValue("redogKalenderarStart");
  data.redogKalenderarSlut = getInputValue("redogKalenderarSlut");
  data.redogSlaktskap = getRadioValue("redogSlaktskap");
  data.redogSlaktskapTyp = getInputValue("redogSlaktskapTyp");

  // Boendeform
  data.redogBoendeform = getRadioValue("redogBoendeform");
  data.redogBoendeAnnatText = getInputValue("redogBoendeAnnatText");

  // Omfattning
  data.redogOmfBevakaRatt = getCheckboxValue("redogOmfBevakaRatt");
  data.redogOmfForvaltaEgendom = getCheckboxValue("redogOmfForvaltaEgendom");
  data.redogOmfSorjaForPerson = getCheckboxValue("redogOmfSorjaForPerson");
  data.redogBehovFortsatt = getRadioValue("redogBehovFortsatt");
  data.redogAnnanOmfattning = getRadioValue("redogAnnanOmfattning");

  // Ekonomiska frågor
  const ekonomiskaFragor = [
    "AnkBostadsbidrag",
    "AnkForsorjning",
    "AnkHandikapp",
    "AnkHabilitering",
    "AnkHemtjanst",
    "OmfLSS",
    "PersAssistans",
    "Kontaktperson",
    "Hemforsakring",
    "AvvecklatBostad",
    "KostnadOmsorg",
    "ForbehallBelopp",
    "TecknatHyresavtal",
    "AnsoktNyttBoende",
  ];

  ekonomiskaFragor.forEach(fragKey => {
    data[`redog${fragKey}`] = getRadioValue(`redog${fragKey}`);
    data[`redog${fragKey}Kommentar`] = getInputValue(`redog${fragKey}Kommentar`);
  });

  data.redogEkonomiOvrigtSoktFondmedel_Text = getInputValue("redogEkonomiOvrigtSoktFondmedel_Text");

  // Kontakter och tidsinsats
  data.redogAntalBesokTyp = getRadioValue("redogAntalBesokTyp");
  data.redogVistelseUtanforHemmet = getRadioValue("redogVistelseUtanforHemmet");
  data.redogVistelseUtanforHemmetDetaljer = getInputValue("redogVistelseUtanforHemmetDetaljer");
  data.redogAntalTelefonsamtal = getInputValue("redogAntalTelefonsamtal");
  data.redogAntalKontakterAnhoriga = getInputValue("redogAntalKontakterAnhoriga");
  data.redogOvrigaInsatserText = getInputValue("redogOvrigaInsatserText");

  // Förvalta egendom
  data.redogBetalningInternetbank = getCheckboxValue("redogBetalningInternetbank");
  data.redogBetalningAutogiro = getCheckboxValue("redogBetalningAutogiro");
  data.redogKontooverforingHm = getCheckboxValue("redogKontooverforingHm");
  data.redogKontanterHmKvitto = getCheckboxValue("redogKontanterHmKvitto");
  data.redogKontooverforingBoende = getCheckboxValue("redogKontooverforingBoende");
  data.redogKontanterBoendeKvitto = getCheckboxValue("redogKontanterBoendeKvitto");

  const forvaltningsInsatser = [
    "SaltKoptFastighet",
    "HyrtUtFastighet",
    "SaltKoptAktier",
    "AnnanVardepapper",
    "SoktSkuldsanering",
  ];

  forvaltningsInsatser.forEach(insatsKey => {
    data[`redogForvaltning${insatsKey}`] = getRadioValue(`redogForvaltning${insatsKey}`);
    data[`redogForvaltning${insatsKey}Kommentar`] = getInputValue(`redogForvaltning${insatsKey}Kommentar`);
  });

  // Arvode
  data.redogArvodeBevakaRatt = getCheckboxValue("redogArvodeBevakaRatt");
  data.redogArvodeForvaltaEgendom = getCheckboxValue("redogArvodeForvaltaEgendom");
  data.redogArvodeSorjaForPerson = getCheckboxValue("redogArvodeSorjaForPerson");
  data.redogArbetsinsats = getRadioValue("redogArbetsinsats");
  data.redogOnskarKostnadsersattning = getRadioValue("redogOnskarKostnadsersattning");
  data.redogReseersattningKm = getInputValue("redogReseersattningKm");
  data.redogKorjournalBifogas = getRadioValue("redogKorjournalBifogas");
  data.redogArvodeOvrigt = getInputValue("redogArvodeOvrigt");

  // Underskrift
  data.redogUnderskriftDatum = getInputValue("redogUnderskriftDatum");
  data.redogUnderskriftOrt = getInputValue("redogUnderskriftOrt");

  return data;
}

// ============================================================
// SPARA REDOGÖRELSE
// ============================================================

/**
 * Sparar redogörelsedata till servern.
 */
export async function collectAndSaveRedogorelseData() {
  if (!window.currentHuvudmanFullData || !window.currentHuvudmanFullData.huvudmanDetails) {
    alert("Ingen huvudman vald, kan inte spara redogörelsedata.");
    return;
  }

  // Samla in all data från formuläret
  const redogorelseData = collectRedogorelseDataFromForm();
  if (!redogorelseData) {
    alert("Kunde inte samla in data från redogörelseformuläret.");
    return;
  }

  const pnr = window.currentHuvudmanFullData.huvudmanDetails.Personnummer;
  const year = new Date(redogorelseData.redogKalenderarStart).getFullYear();

  if (!pnr || !year) {
    alert("Kunde inte fastställa huvudman eller år för redogörelsen.");
    return;
  }

  const url = `/api/save_redogorelse.php?pnr=${pnr}&ar=${year}`;
  console.log(`[Redogörelse Spara] Skickar POST till: ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(redogorelseData),
    });

    const result = await response.json();

    if (response.ok) {
      alert(result.message || "Redogörelse har sparats!");
      // Spara även datan lokalt
      if (window.currentHuvudmanFullData) {
        window.currentHuvudmanFullData.redogorelseData = redogorelseData;
      }
    } else {
      alert(`Fel vid sparande av redogörelse: ${result.error || "Okänt serverfel"}`);
    }
  } catch (error) {
    console.error("Nätverksfel vid sparande av redogörelse:", error);
    alert("Ett nätverksfel uppstod vid sparande av redogörelse.");
  }
}

// ============================================================
// GENERERA REDOGÖRELSE-PDF
// ============================================================

/**
 * Genererar en komplett redogörelse-PDF från grunden.
 */
export async function sparaRedogorelsePDF_FranGrund() {
  console.log("[Redogörelse PDF från Grund] Startar generering...");

  if (
    !window.currentHuvudmanFullData ||
    !window.currentHuvudmanFullData.huvudmanDetails ||
    !window.activeGodManProfile
  ) {
    alert("Välj huvudman och se till att en God Man-profil är aktiv.");
    return;
  }

  const data = collectRedogorelseDataFromForm();
  if (!data) {
    alert("Kunde inte samla in data från redogörelseformuläret.");
    return;
  }

  if (!window.PDFLib || !window.fontkit) {
    alert("PDF-bibliotek saknas.");
    return;
  }

  const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
  const fontkit = window.fontkit;
  const fontUrl = "/fonts/LiberationSans-Regular.ttf";
  const boldFontUrl = "/fonts/LiberationSans-Bold.ttf";

  try {
    const pdfDoc = await PDFDocument.create();

    let regularFont;
    let boldVersionFont;

    // Försök ladda anpassade fonter
    try {
      const fontBytes = await fetch(fontUrl).then(res => {
        if (!res.ok) throw new Error(`Fontfel: ${res.statusText}`);
        return res.arrayBuffer();
      });

      if (!fontBytes) throw new Error("Kunde inte ladda REGULAR font.");

      pdfDoc.registerFontkit(fontkit);
      regularFont = await pdfDoc.embedFont(fontBytes);

      // Försök ladda fet font
      if (boldFontUrl) {
        try {
          const boldFontBytes = await fetch(boldFontUrl).then(res => {
            if (!res.ok) {
              console.warn(`Kunde inte ladda fet font, använder vanlig.`);
              return null;
            }
            return res.arrayBuffer();
          });

          if (boldFontBytes) {
            boldVersionFont = await pdfDoc.embedFont(boldFontBytes);
          } else {
            boldVersionFont = regularFont;
          }
        } catch (boldFontError) {
          console.warn("Fel vid laddning av fet font, återfaller till vanlig:", boldFontError);
          boldVersionFont = regularFont;
        }
      } else {
        boldVersionFont = regularFont;
      }
    } catch (fontError) {
      console.warn("Kunde inte ladda anpassad font, återfaller till Helvetica:", fontError);
      regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      boldVersionFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;
    const contentWidth = width - 2 * margin;
    let y = height - margin;
    const lineSpacing = 5;
    const sectionSpacing = 12;
    const mainFontSize = 10;
    const headerFontSize = 14;
    const subHeaderFontSize = 11;

    const hm = window.currentHuvudmanFullData.huvudmanDetails;
    const gm = window.activeGodManProfile;

    // Kontrollera ny sida
    const checkNewPage = neededSpace => {
      if (y - neededSpace < margin) {
        page = pdfDoc.addPage();
        y = height - margin;
        return true;
      }
      return false;
    };

    // Rita textrad
    const drawTextLine = (
      text,
      xOffset = 0,
      size = mainFontSize,
      fontToUse = regularFont,
      color = rgb(0, 0, 0),
      forceY
    ) => {
      let currentDrawY;
      if (forceY !== undefined) {
        currentDrawY = forceY;
      } else {
        if (y < margin + size) {
          checkNewPage(size * 1.2 + lineSpacing);
        }
        currentDrawY = y;
        y -= size * 1.2 + lineSpacing;
      }

      page.drawText(text, {
        x: margin + xOffset,
        y: currentDrawY,
        font: fontToUse,
        size: size,
        color: color,
        lineHeight: size * 1.2,
      });
    };

    // Rita flerradigt text
    const drawMultiLineText = (text, startX, startY, maxWidth, fontToUse, size, lineHeightMultiplier = 1.2) => {
      let currentY = startY;
      const lines = [];
      const paragraphs = String(text || "").split("\n");

      for (const paragraph of paragraphs) {
        const words = paragraph.split(" ");
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine + (currentLine ? " " : "") + word;
          if (fontToUse.widthOfTextAtSize(testLine, size) > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        lines.push(currentLine);
      }

      for (const line of lines) {
        if (currentY < margin + size) {
          page = pdfDoc.addPage();
          currentY = height - margin;
        }

        page.drawText(line, {
          x: startX,
          y: currentY,
          font: fontToUse,
          size: size,
          color: rgb(0, 0, 0),
          lineHeight: size * lineHeightMultiplier,
        });
        currentY -= size * lineHeightMultiplier + lineSpacing;
      }

      y = currentY;
      return y;
    };

    // --- Börja rita innehållet ---

    // Rubrik
    drawTextLine(
      "REDOGÖRELSE",
      (contentWidth - boldVersionFont.widthOfTextAtSize("REDOGÖRELSE", headerFontSize)) / 2,
      headerFontSize,
      boldVersionFont
    );
    y -= sectionSpacing / 1.5;

    drawTextLine(
      `Period: ${formatDateForPdf(data.redogKalenderarStart) || "YYYY-MM-DD"} – ${
        formatDateForPdf(data.redogKalenderarSlut) || "YYYY-MM-DD"
      }`,
      0,
      mainFontSize
    );
    y -= sectionSpacing;

    // 1. Parter
    drawTextLine("1. Parter", 0, subHeaderFontSize, boldVersionFont);
    drawTextLine(
      `Huvudman: ${safe(getCaseInsensitive(hm, "FORNAMN", "Fornamn"))} ${safe(
        getCaseInsensitive(hm, "EFTERNAMN", "Efternamn")
      )} (${safe(getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer"))})`,
      10
    );
    drawTextLine(
      `God man/Förvaltare: ${safe(getCaseInsensitive(gm, "Fornamn"))} ${safe(
        getCaseInsensitive(gm, "Efternamn")
      )} (${safe(getCaseInsensitive(gm, "Personnummer"))})`,
      10
    );
    drawTextLine(
      `Släktskap med huvudmannen: ${data.redogSlaktskap || "Nej"}${
        data.redogSlaktskap === "Ja" && data.redogSlaktskapTyp ? ` (${data.redogSlaktskapTyp})` : ""
      }`,
      10
    );
    y -= sectionSpacing;

    // 2. Huvudmannens boendeform
    checkNewPage(mainFontSize * 1.2 + lineSpacing + sectionSpacing);
    drawTextLine("2. Huvudmannens boendeform", 0, subHeaderFontSize, boldVersionFont);
    let boendeText = data.redogBoendeform || "Ej angivet";
    if (data.redogBoendeform === "Annat" && data.redogBoendeAnnatText) {
      boendeText = data.redogBoendeAnnatText;
    }
    drawTextLine(boendeText, 10);
    y -= sectionSpacing;

    // 3. Uppdragets omfattning
    checkNewPage(3 * (mainFontSize * 1.2 + lineSpacing) + sectionSpacing);
    drawTextLine("3. Uppdragets omfattning", 0, subHeaderFontSize, boldVersionFont);
    let omfattning = [];
    if (data.redogOmfBevakaRatt) omfattning.push("Bevaka rätt");
    if (data.redogOmfForvaltaEgendom) omfattning.push("Förvalta egendom");
    if (data.redogOmfSorjaForPerson) omfattning.push("Sörja för person");
    drawTextLine(`Uppdraget omfattar: ${omfattning.join(", ") || "Ej specificerat"}`, 10);
    drawTextLine(`Behov av fortsatt godmanskap: ${data.redogBehovFortsatt || "Ej angivet"}`, 10);
    drawTextLine(`Godmanskapet bör ha annan omfattning: ${data.redogAnnanOmfattning || "Ej angivet"}`, 10);
    y -= sectionSpacing;

    // 4. Åtgärder inom uppdraget
    checkNewPage(mainFontSize * 1.2 + lineSpacing + sectionSpacing);
    drawTextLine("4. Åtgärder inom uppdraget (Bevaka rätt / Sörja för person)", 0, subHeaderFontSize, boldVersionFont);

    const fragor = [
      { label: "Ansökan om bostadsbidrag / -tillägg", key: "AnkBostadsbidrag" },
      { label: "Ansökan om försörjningsstöd", key: "AnkForsorjning" },
      { label: "Ansökan om handikappersättning", key: "AnkHandikapp" },
      { label: "Ansökan om habiliteringsersättning", key: "AnkHabilitering" },
      { label: "Ansökan om hemtjänst", key: "AnkHemtjanst" },
      { label: "Omfattas huvudmannen av LSS", key: "OmfLSS" },
      { label: "Har huvudmannen personlig assistans", key: "PersAssistans" },
      { label: "Har huvudmannen kontaktperson", key: "Kontaktperson" },
      { label: "Har huvudmannen hemförsäkring", key: "Hemforsakring" },
      { label: "Avveckling av huvudmannens bostad", key: "AvvecklatBostad" },
      { label: "Har huvudmannen kostnader för omsorg", key: "KostnadOmsorg" },
      { label: "Hänsyn till förbehållsbelopp", key: "ForbehallBelopp" },
      { label: "Tecknande av hyresavtal", key: "TecknatHyresavtal" },
      { label: "Ansökan om nytt boende", key: "AnsoktNyttBoende" },
    ];

    fragor.forEach(f => {
      checkNewPage(3 * (mainFontSize * 1.2 + lineSpacing));
      drawTextLine(f.label, 10);
      let svarText = `Svar: ${data[`redog${f.key}`] || "Ej besvarat"}`;
      drawTextLine(svarText, 20, mainFontSize, regularFont, rgb(0.1, 0.1, 0.1));

      let kommentarText = data[`redog${f.key}Kommentar`];
      if (kommentarText) {
        y = drawMultiLineText(
          `Kommentar: ${kommentarText}`,
          margin + 20,
          y,
          contentWidth - 20,
          regularFont,
          mainFontSize
        );
      }
    });

    if (data.redogEkonomiOvrigtSoktFondmedel_Text) {
      checkNewPage(2 * (mainFontSize * 1.2 + lineSpacing));
      drawTextLine("Övrigt: Sökt fondmedel", 10);
      y = drawMultiLineText(
        `Kommentar: ${data.redogEkonomiOvrigtSoktFondmedel_Text}`,
        margin + 20,
        y,
        contentWidth - 20,
        regularFont,
        mainFontSize
      );
    }
    y -= sectionSpacing;

    // 5. Kontakter och tidsinsats
    checkNewPage(6 * (mainFontSize * 1.2 + lineSpacing) + sectionSpacing);
    drawTextLine("5. Kontakter och tidsinsats", 0, subHeaderFontSize, boldVersionFont);
    drawTextLine(`Antal besök hos huvudmannen: ${data.redogAntalBesokTyp || "Ej specificerat"}`, 10);
    drawTextLine(
      `Vistelse utanför hemmet/boendet: ${data.redogVistelseUtanforHemmet || "Nej"}${
        data.redogVistelseUtanforHemmet === "Ja" && data.redogVistelseUtanforHemmetDetaljer
          ? ` (${data.redogVistelseUtanforHemmetDetaljer})`
          : ""
      }`,
      10
    );
    drawTextLine(`Antal telefonsamtal med huvudmannen: ${data.redogAntalTelefonsamtal || "0"}`, 10);
    drawTextLine(`Antal kontakter (anhöriga/vård): ${data.redogAntalKontakterAnhoriga || "0"}`, 10);
    drawTextLine("Övriga insatser:", 10);
    y = drawMultiLineText(
      data.redogOvrigaInsatserText || "Inga särskilda övriga insatser rapporterade.",
      margin + 10,
      y,
      contentWidth - 10,
      regularFont,
      mainFontSize
    );
    y -= sectionSpacing;

    // 6. Förvalta egendom
    checkNewPage(12 * (mainFontSize * 1.2 + lineSpacing) + sectionSpacing);
    drawTextLine("6. Förvalta egendom", 0, subHeaderFontSize, boldVersionFont);
    drawTextLine("6.1 Löpande betalningar", 10, mainFontSize, boldVersionFont);
    let betalningsSatt = [];
    if (data.redogBetalningInternetbank) betalningsSatt.push("Internetbank");
    if (data.redogBetalningAutogiro) betalningsSatt.push("Autogiro");
    drawTextLine(betalningsSatt.join(", ") || "Ej specificerat", 20);
    y -= lineSpacing;

    drawTextLine("6.2 Kontanthantering / Egna medel", 10, mainFontSize, boldVersionFont);
    let kontantSatt = [];
    if (data.redogKontooverforingHm) kontantSatt.push("Kontoöverföring till huvudman");
    if (data.redogKontanterHmKvitto) kontantSatt.push("Kontanter till huvudman mot kvittens");
    if (data.redogKontooverforingBoende) kontantSatt.push("Kontoöverföring boende/hemtjänst");
    if (data.redogKontanterBoendeKvitto) kontantSatt.push("Kontanter till boende/hemtjänst mot kvittens");
    drawTextLine(kontantSatt.join(", ") || "Ej specificerat", 20);
    y -= lineSpacing;

    drawTextLine("6.3 Förvaltningsinsatser under perioden", 10, mainFontSize, boldVersionFont);
    const forvaltningsFragor = [
      { label: "Sålt/köpt fastighet/bostadsrätt", key: "SaltKoptFastighet" },
      { label: "Hyrt/hyrt ut fastighet/bostadsrätt", key: "HyrtUtFastighet" },
      { label: "Sålt/köpt aktier", key: "SaltKoptAktier" },
      { label: "Annan värdespappersförvaltning förekommit", key: "AnnanVardepapper" },
      { label: "Sökt skuldsanering", key: "SoktSkuldsanering" },
    ];

    forvaltningsFragor.forEach(f => {
      checkNewPage(3 * (mainFontSize * 1.2 + lineSpacing));
      drawTextLine(f.label, 20);
      let svar = `Svar: ${data[`redogForvaltning${f.key}`] || "Nej"}`;
      drawTextLine(svar, 30, mainFontSize, regularFont, rgb(0.1, 0.1, 0.1));

      if (data[`redogForvaltning${f.key}Kommentar`]) {
        y = drawMultiLineText(
          `Kommentar: ${data[`redogForvaltning${f.key}Kommentar`]}`,
          margin + 30,
          y,
          contentWidth - 30,
          regularFont,
          mainFontSize
        );
      }
    });
    y -= sectionSpacing;

    // 7. Arvode
    checkNewPage(8 * (mainFontSize * 1.2 + lineSpacing) + sectionSpacing);
    drawTextLine("7. Arvode", 0, subHeaderFontSize, boldVersionFont);
    let arvodesDelar = [];
    if (data.redogArvodeBevakaRatt) arvodesDelar.push("Bevaka rätt");
    if (data.redogArvodeForvaltaEgendom) arvodesDelar.push("Förvalta egendom");
    if (data.redogArvodeSorjaForPerson) arvodesDelar.push("Sörja för person");
    drawTextLine(`Önskar arvode för: ${arvodesDelar.join(", ") || "Inga delar valda"}`, 10);
    drawTextLine(`Arbetsinsatsen har varit: ${data.redogArbetsinsats || "Ej specificerat"}`, 10);

    let kostnadsersText = "Ej specificerat";
    if (data.redogOnskarKostnadsersattning === "schablon") {
      kostnadsersText = "Enligt schablon (2% av prisbasbelopp)";
    } else if (data.redogOnskarKostnadsersattning === "specifikation") {
      kostnadsersText = "Enligt specifikation (verifieras)";
    }
    drawTextLine(`Önskar kostnadsersättning: ${kostnadsersText}`, 10);

    if (data.redogReseersattningKm) {
      drawTextLine(`Reseersättning antal km: ${data.redogReseersattningKm}`, 10);
    }
    drawTextLine(`Körjournal bifogas: ${data.redogKorjournalBifogas || "Nej"}`, 10);

    if (data.redogArvodeOvrigt) {
      drawTextLine("Övrigt (ang. arvode):", 10);
      y = drawMultiLineText(data.redogArvodeOvrigt, margin + 10, y, contentWidth - 10, regularFont, mainFontSize);
    }
    y -= sectionSpacing;

    // 8. Intygande och Underskrift
    checkNewPage(6 * (mainFontSize * 1.2 + lineSpacing) + sectionSpacing);
    drawTextLine("8. Intygande och Underskrift", 0, subHeaderFontSize, boldVersionFont);
    y = drawMultiLineText(
      "Härmed intygas på heder och samvete att de uppgifter som lämnats i denna redogörelse är riktiga.",
      margin,
      y,
      contentWidth,
      regularFont,
      mainFontSize
    );
    y -= sectionSpacing * 1.5;

    const ortDatumText = `${
      data.redogUnderskriftOrt || safe(getCaseInsensitive(gm, "Postort")) || "___________________"
    }, den ${formatDateForPdf(data.redogUnderskriftDatum) || formatDateForPdf(new Date().toISOString().slice(0, 10))}`;
    drawTextLine(ortDatumText, 0, mainFontSize);
    y -= sectionSpacing * 2.5;
    drawTextLine("________________________________________", 0, mainFontSize);
    drawTextLine(
      `${safe(getCaseInsensitive(gm, "Fornamn"))} ${safe(getCaseInsensitive(gm, "Efternamn"))}`.trim(),
      0,
      mainFontSize
    );
    drawTextLine(
      "(Ställföreträdarens underskrift och namnförtydligande)",
      0,
      mainFontSize * 0.8,
      regularFont,
      rgb(0.3, 0.3, 0.3)
    );

    // Sidnumrering
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const pageNum = i + 1;
      pages[i].drawText(`Sida ${pageNum}`, {
        x: width - margin - regularFont.widthOfTextAtSize(`Sida ${pageNum}`, mainFontSize * 0.8),
        y: margin / 2,
        font: regularFont,
        size: mainFontSize * 0.8,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `Redogorelse_${(safe(getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer")) || "hm").replace(
      /\W/g,
      "_"
    )}_${yearForFilename(data.redogKalenderarStart)}.pdf`;

    triggerDownload(blob, filename);
    alert("Redogörelse-PDF genererad från grunden!");
  } catch (error) {
    console.error("Fel vid generering av Redogörelse PDF från grunden:", error);
    alert(`Kunde inte skapa Redogörelse PDF: ${error.message}\nSe konsolen för mer detaljer.`);
  }
}

// ============================================================
// ENKEL REDOGÖRELSE-PDF (ALTERNATIV METOD)
// ============================================================

/**
 * Skapar en enklare redogörelse-PDF (används om fullständig version inte behövs).
 */
export async function sparaRedogorelsePDF() {
  if (!window.currentHuvudmanFullData || !window.currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman på 'Huvudman'-fliken först.");
    return;
  }

  if (!window.activeGodManProfile) {
    alert("Välj en aktiv God Man-profil på 'God Man Profiler'-fliken.");
    return;
  }

  if (!window.PDFLib) {
    alert("PDF-biblioteket är inte laddat.");
    return;
  }

  const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

  const createPdf = async () => {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 11;
    const margin = 50;
    let y = height - margin;

    const hm = window.currentHuvudmanFullData.huvudmanDetails;
    const gm = window.activeGodManProfile;

    const periodStart = getInputValue("periodStart_ars");
    const periodSlut = getInputValue("periodSlut_ars");

    const drawTextLine = async (text, size = fontSize, isBold = false) => {
      if (y < margin + size) {
        page = pdfDoc.addPage();
        y = height - margin;
      }
      page.drawText(text, {
        x: margin,
        y: y,
        font: isBold ? boldFont : font,
        size: size,
        color: rgb(0, 0, 0),
        lineHeight: size * 1.3,
      });
      y -= size * 1.3;
    };

    const drawParagraph = async text => {
      const lines = text.split("\n");
      for (const line of lines) {
        let currentLine = "";
        const words = line.split(" ");
        for (const word of words) {
          const testLine = currentLine + (currentLine ? " " : "") + word;
          if (font.widthOfTextAtSize(testLine, fontSize) > width - 2 * margin) {
            await drawTextLine(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          await drawTextLine(currentLine);
        }
      }
      y -= fontSize * 0.5;
    };

    await drawTextLine(`Redogörelse för Godmanskap/Förvaltarskap`, 16, true);
    y -= fontSize;
    await drawTextLine(`Period: ${formatDateForPdf(periodStart)} - ${formatDateForPdf(periodSlut)}`, 12);
    y -= fontSize;

    await drawTextLine(
      `Huvudman: ${safe(getCaseInsensitive(hm, "FORNAMN", "Fornamn"))} ${safe(
        getCaseInsensitive(hm, "EFTERNAMN", "Efternamn")
      )} (${safe(getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer"))})`,
      12,
      true
    );
    await drawTextLine(
      `Adress: ${safe(getCaseInsensitive(hm, "ADRESS", "Adress"))}, ${safe(
        getCaseInsensitive(hm, "POSTNUMMER", "Postnummer")
      )} ${safe(getCaseInsensitive(hm, "ORT", "Ort"))}}`
    );

    const vistelseadress = getCaseInsensitive(hm, "Vistelseadress", "VISTELSEADRESS");
    const hmAdress = getCaseInsensitive(hm, "ADRESS", "Adress");

    if (vistelseadress && vistelseadress !== hmAdress) {
      await drawTextLine(
        `Vistelseadress: ${vistelseadress}, ${safe(
          getCaseInsensitive(hm, "Vistelsepostnr", "VISTELSEPOSTNUMMER")
        )} ${safe(getCaseInsensitive(hm, "Vistelseort", "VISTELSEORT"))}`
      );
    }
    y -= fontSize * 0.5;

    await drawTextLine(
      `God Man/Förvaltare: ${safe(getCaseInsensitive(gm, "Fornamn"))} ${safe(
        getCaseInsensitive(gm, "Efternamn")
      )} (${safe(getCaseInsensitive(gm, "Personnummer"))})`,
      12,
      true
    );
    await drawTextLine(
      `Adress: ${safe(getCaseInsensitive(gm, "Adress"))}, ${safe(getCaseInsensitive(gm, "Postnummer"))} ${safe(
        getCaseInsensitive(gm, "Postort")
      )}`
    );
    await drawTextLine(
      `Telefon: ${safe(getCaseInsensitive(gm, "Telefon")) || safe(getCaseInsensitive(gm, "Mobil"))}  E-post: ${safe(
        getCaseInsensitive(gm, "Epost")
      )}`
    );
    y -= fontSize;

    await drawTextLine(`Uppdragets omfattning: Bevaka rätt, Förvalta egendom, Sörja för person`, 11, true);
    y -= fontSize * 0.5;

    await drawTextLine(`Antal besök hos huvudmannen: ${getInputValue("redogAntalBesok") || "Ej specificerat"}`, 11);
    await drawTextLine(
      `Antal telefonsamtal med huvudmannen: ${getInputValue("redogAntalTelefon") || "Ej specificerat"}`,
      11
    );
    await drawTextLine(
      `Antal kontakter med anhöriga/vårdgivare etc.: ${getInputValue("redogAntalAnhorigKontakt") || "Ej specificerat"}`,
      11
    );
    y -= fontSize * 0.5;

    await drawTextLine(`Övriga insatser och viktiga händelser under perioden:`, 11, true);
    const ovrigaInsatser = getInputValue("redogOvrigaInsatserText");
    await drawParagraph(ovrigaInsatser || "Inga särskilda övriga insatser att rapportera för perioden.");
    y -= fontSize;

    await drawTextLine(
      `Ort och datum: ${
        safe(getCaseInsensitive(gm, "Postort")) || "___________________"
      }, ${new Date().toLocaleDateString("sv-SE")}`,
      11
    );
    y -= fontSize * 2;
    await drawTextLine(`Underskrift God Man/Förvaltare:`, 11);
    y -= fontSize * 2.5;
    await drawTextLine(`_________________________________________`, 11);
    await drawTextLine(`${safe(getCaseInsensitive(gm, "Fornamn"))} ${safe(getCaseInsensitive(gm, "Efternamn"))}`, 10);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `Redogorelse_${(safe(getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer")) || "hm").replace(
      /\W/g,
      "_"
    )}_${yearForFilename(periodStart)}.pdf`;

    triggerDownload(blob, filename);
    alert("Redogörelse-PDF genererad!");
  };

  createPdf().catch(err => {
    console.error("Fel vid skapande av redogörelse-PDF:", err);
    alert("Kunde inte skapa redogörelse-PDF: " + err.message);
  });
}

// ============================================================
// HJÄLPFUNKTIONER
// ============================================================

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || "";
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

function setCheckboxValue(id, checked) {
  const el = document.getElementById(id);
  if (el) el.checked = !!checked;
}

function getCheckboxValue(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

/**
 * Togglar synlighet av släktskapsfält.
 */
export function toggleSlaktskapField() {
  const slaktskap = getRadioValue("redogSlaktskap");
  const slaktskapTypContainer = document.getElementById("redogSlaktskapTypContainer");

  if (slaktskapTypContainer) {
    slaktskapTypContainer.style.display = slaktskap === "Ja" ? "block" : "none";
  }
}

/**
 * Togglar synlighet av boendeform "annat"-fält.
 */
export function toggleBoendeformAnnat() {
  const boendeform = getRadioValue("redogBoendeform");
  const annatContainer = document.getElementById("redogBoendeAnnatContainer");

  if (annatContainer) {
    annatContainer.style.display = boendeform === "Annat" ? "block" : "none";
  }
}

/**
 * Togglar synlighet av vistelse utanför hemmet-detaljer.
 */
export function toggleVistelseDetaljer() {
  const vistelse = getRadioValue("redogVistelseUtanforHemmet");
  const detaljerContainer = document.getElementById("redogVistelseDetaljerContainer");

  if (detaljerContainer) {
    detaljerContainer.style.display = vistelse === "Ja" ? "block" : "none";
  }
}

// ============================================================
// INITIALISERA EVENT LISTENERS
// ============================================================

/**
 * Initierar event listeners för redogörelse-formuläret.
 */
export function initializeRedogorelseListeners() {
  // Släktskap toggle
  document.querySelectorAll('input[name="redogSlaktskap"]').forEach(radio => {
    radio.addEventListener("change", toggleSlaktskapField);
  });

  // Boendeform toggle
  document.querySelectorAll('input[name="redogBoendeform"]').forEach(radio => {
    radio.addEventListener("change", toggleBoendeformAnnat);
  });

  // Vistelse toggle
  document.querySelectorAll('input[name="redogVistelseUtanforHemmet"]').forEach(radio => {
    radio.addEventListener("change", toggleVistelseDetaljer);
  });

  // Kör initial toggle för att sätta rätt startvärden
  toggleSlaktskapField();
  toggleBoendeformAnnat();
  toggleVistelseDetaljer();

  console.log("[Redogörelse] Event listeners initierade.");
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.populateRedogorelseTabWithDefaults = populateRedogorelseTabWithDefaults;
window.collectRedogorelseDataFromForm = collectRedogorelseDataFromForm;
window.collectAndSaveRedogorelseData = collectAndSaveRedogorelseData;
window.sparaRedogorelsePDF_FranGrund = sparaRedogorelsePDF_FranGrund;
window.sparaRedogorelsePDF = sparaRedogorelsePDF;
window.toggleSlaktskapField = toggleSlaktskapField;
window.toggleBoendeformAnnat = toggleBoendeformAnnat;
window.toggleVistelseDetaljer = toggleVistelseDetaljer;
window.initializeRedogorelseListeners = initializeRedogorelseListeners;
