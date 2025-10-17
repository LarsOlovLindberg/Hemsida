// ============================================================
// export.js - Excel-export av huvudmän
// Sökväg: js/modules/huvudman/export.js
// ============================================================

/**
 * Hämtar alla huvudmän från servern och exporterar dem till en Excel-fil.
 * Kräver att SheetJS (XLSX) är laddat globalt.
 */
export async function exportHuvudmanToExcel() {
  const exportButton = document.getElementById("export-huvudman-excel-btn");

  // Visa laddningsindikator
  if (exportButton) {
    exportButton.disabled = true;
    exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Laddar...';
  }

  try {
    // Kontrollera att XLSX-biblioteket är laddat
    if (typeof XLSX === "undefined") {
      throw new Error("SheetJS (XLSX) biblioteket är inte laddat. Lägg till det i HTML-filen.");
    }

    // Anropa API:et för att hämta exportdata
    const response = await fetch("api/get_all_huvudman_for_export.php", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Kunde inte hämta data från servern för export.");
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      alert("Inga huvudmän att exportera.");
      return;
    }

    console.log(`[Excel Export] Exporterar ${data.length} huvudmän...`);

    // Skapa ett nytt kalkylblad från datan
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Skapa en ny arbetsbok
    const workbook = XLSX.utils.book_new();

    // Lägg till kalkylbladet i arbetsboken
    XLSX.utils.book_append_sheet(workbook, worksheet, "Huvudmän");

    // Generera filnamn med dagens datum
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `Huvudman_Export_${dateStr}.xlsx`;

    // Generera och ladda ner Excel-filen
    XLSX.writeFile(workbook, filename);

    console.log(`[Excel Export] Fil '${filename}' har laddats ner.`);
  } catch (error) {
    console.error("[Excel Export] Fel vid export:", error);
    alert("Ett fel uppstod vid exporten: " + error.message);
  } finally {
    // Återställ knappen
    if (exportButton) {
      exportButton.disabled = false;
      exportButton.innerHTML = '<i class="fas fa-file-excel"></i> Exportera till Excel';
    }
  }
}

/**
 * Exporterar specifika huvudmän baserat på filter.
 * @param {string|null} ofnId - Överförmyndare-ID för filtrering
 * @param {boolean} includeInactive - Om inaktiva ska inkluderas
 */
export async function exportFilteredHuvudmanToExcel(ofnId = null, includeInactive = false) {
  try {
    // Kontrollera att XLSX-biblioteket är laddat
    if (typeof XLSX === "undefined") {
      throw new Error("SheetJS (XLSX) biblioteket är inte laddat.");
    }

    // Bygg URL med query parameters
    const params = new URLSearchParams();
    if (ofnId) params.set("overformyndareId", ofnId);
    if (includeInactive) params.set("includeInactive", "1");

    const url = "api/get_all_huvudman_for_export.php" + (params.toString() ? "?" + params.toString() : "");

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Kunde inte hämta filtrerad data från servern.");
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      alert("Inga huvudmän matchade filtret.");
      return;
    }

    // Skapa kalkylblad
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Huvudmän (Filtrerad)");

    // Generera filnamn
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const filterSuffix = ofnId ? `_OFN${ofnId}` : "";
    const filename = `Huvudman_Export${filterSuffix}_${dateStr}.xlsx`;

    // Ladda ner
    XLSX.writeFile(workbook, filename);

    console.log(`[Excel Export] Filtrerad fil '${filename}' har laddats ner (${data.length} rader).`);
  } catch (error) {
    console.error("[Excel Export] Fel vid filtrerad export:", error);
    alert("Ett fel uppstod vid exporten: " + error.message);
  }
}

/**
 * Exporterar detaljerad huvudman-data med alla fält.
 * @param {string} pnr - Personnummer för specifik huvudman
 */
export async function exportDetailedHuvudmanToExcel(pnr) {
  if (!pnr) {
    alert("Inget personnummer angivet.");
    return;
  }

  try {
    if (typeof XLSX === "undefined") {
      throw new Error("SheetJS (XLSX) biblioteket är inte laddat.");
    }

    // Hämta detaljerad data från API
    const year = new Date().getFullYear();
    const url = `/api/get_huvudman_details.php?pnr=${encodeURIComponent(pnr)}&ar=${year}`;

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Kunde inte hämta detaljerad data för huvudmannen.");
    }

    const data = await response.json();
    const details = data.huvudmanDetails || {};

    // Konvertera objekt till array av key-value pairs för Excel
    const rows = Object.entries(details).map(([key, value]) => ({
      Fält: key,
      Värde: value === null || value === undefined ? "" : String(value),
    }));

    if (rows.length === 0) {
      alert("Ingen data att exportera för denna huvudman.");
      return;
    }

    // Skapa arbetsbok med flera ark
    const workbook = XLSX.utils.book_new();

    // Ark 1: Grunduppgifter
    const wsDetails = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, wsDetails, "Grunduppgifter");

    // Ark 2: Dokument (om det finns)
    if (data.documents && data.documents.length > 0) {
      const wsDocuments = XLSX.utils.json_to_sheet(data.documents);
      XLSX.utils.book_append_sheet(workbook, wsDocuments, "Dokument");
    }

    // Ark 3: Bankkonton (om det finns)
    if (data.bankkonton && data.bankkonton.length > 0) {
      const wsBankkonton = XLSX.utils.json_to_sheet(data.bankkonton);
      XLSX.utils.book_append_sheet(workbook, wsBankkonton, "Bankkonton");
    }

    // Generera filnamn
    const cleanPnr = pnr.replace(/\D/g, "");
    const today = new Date().toISOString().split("T")[0];
    const filename = `Huvudman_${cleanPnr}_Detaljerad_${today}.xlsx`;

    // Ladda ner
    XLSX.writeFile(workbook, filename);

    console.log(`[Excel Export] Detaljerad fil '${filename}' har laddats ner.`);
  } catch (error) {
    console.error("[Excel Export] Fel vid detaljerad export:", error);
    alert("Ett fel uppstod vid exporten: " + error.message);
  }
}

/**
 * Exporterar årsräkningsdata för en huvudman.
 * @param {string} pnr - Personnummer
 * @param {number} year - Årtal
 */
export async function exportArsrakningToExcel(pnr, year) {
  if (!pnr || !year) {
    alert("Personnummer och år krävs för export.");
    return;
  }

  try {
    if (typeof XLSX === "undefined") {
      throw new Error("SheetJS (XLSX) biblioteket är inte laddat.");
    }

    // Hämta årsräkningsdata
    const url = `/api/get_arsrakning.php?pnr=${encodeURIComponent(pnr)}&ar=${year}`;
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Kunde inte hämta årsräkningsdata.");
    }

    const data = await response.json();

    // Skapa arbetsbok med flera ark
    const workbook = XLSX.utils.book_new();

    // Ark: Inbetalningar
    if (data.inbetalningar && data.inbetalningar.length > 0) {
      const wsInbetalningar = XLSX.utils.json_to_sheet(data.inbetalningar);
      XLSX.utils.book_append_sheet(workbook, wsInbetalningar, "Inbetalningar");
    }

    // Ark: Utbetalningar
    if (data.utbetalningar && data.utbetalningar.length > 0) {
      const wsUtbetalningar = XLSX.utils.json_to_sheet(data.utbetalningar);
      XLSX.utils.book_append_sheet(workbook, wsUtbetalningar, "Utbetalningar");
    }

    // Ark: Bankkonton
    if (data.bankkonton && data.bankkonton.length > 0) {
      const wsBankkonton = XLSX.utils.json_to_sheet(data.bankkonton);
      XLSX.utils.book_append_sheet(workbook, wsBankkonton, "Bankkonton");
    }

    // Ark: Skulder
    if (data.skulder && data.skulder.length > 0) {
      const wsSkulder = XLSX.utils.json_to_sheet(data.skulder);
      XLSX.utils.book_append_sheet(workbook, wsSkulder, "Skulder");
    }

    // Ark: Övriga tillgångar
    if (data.ovrigaTillgangar && data.ovrigaTillgangar.length > 0) {
      const wsTillgangar = XLSX.utils.json_to_sheet(data.ovrigaTillgangar);
      XLSX.utils.book_append_sheet(workbook, wsTillgangar, "Övriga Tillgångar");
    }

    // Generera filnamn
    const cleanPnr = pnr.replace(/\D/g, "");
    const filename = `Arsrakning_${cleanPnr}_${year}.xlsx`;

    // Ladda ner
    XLSX.writeFile(workbook, filename);

    console.log(`[Excel Export] Årsräkningsfil '${filename}' har laddats ner.`);
  } catch (error) {
    console.error("[Excel Export] Fel vid årsräkningsexport:", error);
    alert("Ett fel uppstod vid exporten: " + error.message);
  }
}

// ============================================================
// EXPORTERA GLOBALT
// ============================================================

window.exportHuvudmanToExcel = exportHuvudmanToExcel;
window.exportFilteredHuvudmanToExcel = exportFilteredHuvudmanToExcel;
window.exportDetailedHuvudmanToExcel = exportDetailedHuvudmanToExcel;
window.exportArsrakningToExcel = exportArsrakningToExcel;
