document.addEventListener("DOMContentLoaded", function () {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach(item => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      // Ta bort active från alla nav-items
      navItems.forEach(nav => nav.classList.remove("active"));

      // Ta bort active från alla flikar
      document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.remove("active");
      });

      // Lägg till active på klickad nav-item
      this.classList.add("active");

      // Visa motsvarande flik
      const tabId = this.getAttribute("data-tab");
      const tabToShow = document.getElementById(tabId);
      if (tabToShow) {
        tabToShow.classList.add("active");
      }
    });
  });
});// Definiera bara en gång (idempotent) för att undvika "already been declared"
window.FS_TEMPLATE_IDS_BY_NAME = window.FS_TEMPLATE_IDS_BY_NAME || {
  "Upplands Väsby":  2,
  "Järfälla Kommun": 3,
  "Sigtuna Kommun":  4,
  "Solna Stad":      5,
  "Stockholm Stad":  6
};


// Din befintliga kod börjar här...
// ⚠️ INITIALIZATION GUARD - förhindrar dubbelregistrering av event listeners
let appInitialized = false;

let currentHuvudmanFullData = null;
let allGodManProfiler = [];
let activeGodManProfile = null;
let allOverformyndare = [];
let processedTransactions = [];
let learnedCategories = {};
let currentFileStartSaldo = 0;
let currentFileSlutSaldo = 0;
let huvudmanChoicesInstance = null;
let godmanProfileChoicesInstance = null;
let currentFsPdfMallFilnamn = ""; // För Försörjningsstöd-PDF
let currentFsKommunNamn = ""; // För Försörjningsstöd-PDF
let isSideNavCollapsed = false;
let isMobileNavOpen = false;
let balanceChartInstance = null; // Global variabel för att hålla reda på diagrammet
let incomeChartInstance = null; // Globala variabler för att hålla reda på diagrammen
let expenseChartInstance = null;
let currentTemplateId = null; // Håller ID för mallen som redigeras
let mappableDbColumns = []; // Cachad lista med databaskolumner
let currentGeneratorData = null; // Håller all data för den PDF som ska genereras
let allAutogiroForetag = []; // Cache för företag

const PDF_FIELD_MAP = {
  Personnummer: "personnummer",
  Fornamn: "fornamn",
  Efternamn: "efternamn",
  HeltNamn: "heltNamn",
  MedsokandePersonnummer: "medsokandePersonnummer",
  MedsokandeFornamn: "medsokandeFornamn",
  MedsokandeEfternamn: "medsokandeEfternamn",
  Adress: "adress",
  Postnummer: "postnummer",
  Ort: "ort",
  BoendeNamn: "boendeNamn",
  BostadAntalRum: "bostadAntalrum",
  BostadAntalBoende: "bostadAntalBoende",
  Sysselsattning: "sysselsattning",
  ArsrOvrigaUpplysningar: "ovrigaUpplysningar",
  Hyra: "hyra",
  Bredband: "bredband",
  FackAvgiftAkassa: "fackAvgiftAkassa",
  Hemforsakring: "hemforsakring",
  Reskostnader: "reskostnader",
  ElKostnad: "elKostnad",
  MedicinKostnad: "medicinkostnad",
  Lakarvardskostnad: "lakarvardkostnad",
  BarnomsorgAvgift: "barnomsorgAvgift",
  FardtjanstAvgift: "fardtjanstAvgift",
  OvrigKostnadBeskrivning: "ovrigKostnadBeskrivning",
  OvrigKostnadBelopp: "ovrigKostnadBelopp",
};

const val = k => details?.[k] ?? ""; // helper
// --- KONSTANTER FÖR ÅRSRÄKNING ---
const ALL_KATEGORIER = {
  // Inkomster
  LönerPensioner: {
    namn: "Brutto inkomst som löner, pensioner m.m.",
    typ: "inkomst",
    postKod: "LONERPENSIONER",
    justerbar: true,
  },
  BostadstilläggBidrag: { namn: "Bostadstillägg/Bostadsbidrag", typ: "inkomst", postKod: "BOSTADSTILLAGG" },
  HABErsättning: { namn: "HAB ersättning", typ: "inkomst", postKod: "HAB" },
  RäntaBankkonto: { namn: "Ränta bankkonto", typ: "inkomst", postKod: "RANTA" },
  Utdelning: { namn: "Utdelning", typ: "inkomst", postKod: "UTDELNING" },
  UttagFonderFörsäljAktier: { namn: "Uttag fonder Försäljning aktier", typ: "inkomst", postKod: "UTTAGFONDER" },
  ÅterbetalningarInkomst: { namn: "Återbetalningar", typ: "inkomst", postKod: "ATERBETALNING" },
  ArvInkomst: { namn: "Arv", typ: "inkomst", postKod: "ARV" },
  InsättningAnhörig: { namn: "Insättning anhörig", typ: "inkomst", postKod: "INSATTANHORIG" },
  Hyresinkomst: { namn: "Hyres inkomst", typ: "inkomst", postKod: "HYRES" },
  Skatteåterbäring: { namn: "Skatteåterbäring", typ: "inkomst", postKod: "SKATTATER" },
  ÖverföringEgetKontoIn: {
    namn: "Överföring Till Räkningskontot(inkomst)",
    typ: "inkomst",
    postKod: "OVERFORINGEGET_IN",
  },
  ÖvrigInkomst: { namn: "Övrig inkomst", typ: "inkomst", postKod: "OVRIG_INKOMST" },

  // Utgifter
  PreliminärSkattInk: { namn: "Preliminär skatt beskattningsbar ink. m.m.", typ: "utgift", postKod: "PRELSKATTINK" },
  PreliminärSkattRänta: { namn: "Preliminär skatt ränta utdelning", typ: "utgift", postKod: "PRELSKATTRANTA" },
  HyraBoendeMat: { namn: "Hyra/boende/mat", typ: "utgift", postKod: "HYRABOENDEMAT" },
  Försäkringar: { namn: "Försäkringar", typ: "utgift", postKod: "FORSAKRING" },
  TVTeleEl: { namn: "TV/Tele/El", typ: "utgift", postKod: "TVTELEEL" },
  SjukvårdLäkarbesökApotek: { namn: "Sjukhusvård, läkarbesök, apotek", typ: "utgift", postKod: "SJUKVARD" },
  KöpAktierFonder: { namn: "Köp av aktier, fonder", typ: "utgift", postKod: "KOPAKTIER" },
  AmorteringSkuldAvgift: {
    namn: "Amortering skuld, skuldräntor & avgifter, KFM",
    typ: "utgift",
    postKod: "AMORTERING",
  },
  MedelEgetBrukUttag: { namn: "Medel för eget bruk/Eget uttag", typ: "utgift", postKod: "EGETBRUK" },
  ArvodeStällföreträdare: {
    namn: "Arvode ställföreträdare inkl. soc. avg. och utlägg",
    typ: "utgift",
    postKod: "ARVODE",
  },
  Färdtjänst: { namn: "Färdtjänst", typ: "utgift", postKod: "FARDTJANST" },
  FackAvgAKassa: { namn: "Fack avg/A-kassan", typ: "utgift", postKod: "FACKAKASSA" },
  Föreningsavgifter: { namn: "Föreningsavgifter", typ: "utgift", postKod: "FORENING" },
  CSNUtgift: { namn: "CSN", typ: "utgift", postKod: "CSN_UTGIFT" },
  Tidningar: { namn: "Tidningar", typ: "utgift", postKod: "TIDNING" },
  Bankavgifter: { namn: "Bankavgifter", typ: "utgift", postKod: "BANKAVGIFT" },
  Kvarskatt: { namn: "Kvarskatt", typ: "utgift", postKod: "KVARSKATT" },
  ÖverföringEgetKontoUt: {
    namn: "Överföring Från Räkningskontot(utgift)",
    typ: "utgift",
    postKod: "OVERFORINGEGET_UT",
  },
  ÖvrigUtgift: { namn: "Övriga utgifter", typ: "utgift", postKod: "OVRIG_UTGIFT" },
  Okategoriserat: { namn: "Okategoriserat", typ: "okänd" },
};

const KATEGORI_POSTKOD_MAP = {
  LONERPENSIONER: { namn: "Brutto inkomst som löner, pensioner m.m.", pdfBase: "Inkomst_LonerPensioner" },
  BOSTADSTILLAGG: { namn: "Bostadstillägg/Bostadsbidrag", pdfBase: "Inkomst_Bostadsbidrag" },
  HAB: { namn: "HAB ersättning", pdfBase: "Inkomst_HAB" },
  RANTA: { namn: "Ränta bankkonto", pdfBase: "Inkomst_Ranta" },
  UTDELNING: { namn: "Utdelning", pdfBase: "Inkomst_Utdelning" },
  UTTAGFONDER: { namn: "Uttag fonder Försäljning aktier", pdfBase: "Inkomst_UttagFonder" },
  ATERBETALNING: { namn: "Återbetalningar", pdfBase: "Inkomst_Aterbetalning" },
  ARV: { namn: "Arv", pdfBase: "Inkomst_Arv" },
  INSATTANHORIG: { namn: "Insättning anhörig", pdfBase: "Inkomst_Anhorig" },
  HYRES: { namn: "Hyres inkomst", pdfBase: "Inkomst_Hyres" },
  SKATTATER: { namn: "Skatteåterbäring", pdfBase: "Inkomst_Skatt" },
  OVERFORINGEGET_IN: { namn: "Överföringar eget konto", pdfBase: "Inkomst_Overforing" },
  OVRIG_INKOMST: { namn: "Övrig inkomst", pdfBase: "Inkomst_Ovrig" },
  PRELSKATTINK: { namn: "Preliminär skatt beskattningsbar ink. m.m.", pdfBase: "Utgift_PrelSkattInk" },
  PRELSKATTRANTA: { namn: "Preliminär skatt ränta utdelning", pdfBase: "Utgift_PrelSkattRanta" },
  HYRABOENDEMAT: { namn: "Hyra/boende/mat", pdfBase: "Utgift_HyraBoendeMat" },
  FORSAKRING: { namn: "Försäkringar", pdfBase: "Utgift_Forsakring" },
  TVTELEEL: { namn: "TV/Tele/El", pdfBase: "Utgift_TVTeleEl" },
  SJUKVARD: { namn: "Sjukhusvård, läkarbesök, apotek", pdfBase: "Utgift_Sjukvard" },
  KOPAKTIER: { namn: "Köp av aktier, fonder", pdfBase: "Utgift_KopAktier" },
  AMORTERING: { namn: "Amortering skuld, skuldräntor & avgifter, KFM", pdfBase: "Utgift_Amortering" },
  EGETBRUK: { namn: "Medel för eget bruk/Eget uttag", pdfBase: "Utgift_EgetBruk" },
  ARVODE: { namn: "Arvode ställföreträdare inkl. soc. avg. och utlägg", pdfBase: "Utgift_Arvode" },
  FARDTJANST: { namn: "Färdtjänst", pdfBase: "Utgift_Fardtjanst" },
  FACKAKASSA: { namn: "Fack avg/A-kassan", pdfBase: "Utgift_FackAvgKassa" },
  FORENING: { namn: "Föreningsavgifter", pdfBase: "Utgift_Foreningsavgifter" },
  CSN_UTGIFT: { namn: "CSN", pdfBase: "Utgift_CSN" },
  TIDNING: { namn: "Tidningar", pdfBase: "Utgift_Tidning" },
  BANKAVGIFT: { namn: "Bankavgifter", pdfBase: "Utgift_Bankavgift" },
  KVARSKATT: { namn: "Kvarskatt", pdfBase: "Utgift_Kvarskatt" },
  OVERFORINGEGET_UT: { namn: "Överföringar eget konto", pdfBase: "Utgift_Overforing" },
  OVRIG_UTGIFT: { namn: "Övriga utgifter", pdfBase: "Utgift_Ovrig" },
};

// (Valfri fallback) Mallfilnamn -> templateId
window.FS_TEMPLATE_IDS_BY_FILE = window.FS_TEMPLATE_IDS_BY_FILE || {
  "Ansokan_Upplands_Vasby.pdf": 2,
  "Ansokan_Jarfalla.pdf":       3,
  "Ansokan_Sigtuna.pdf":        4,
  "Ansokan_Solna.pdf":          5,
  "Ansokan_Stockholm.pdf":      6,
};


// Global state (som dina övriga currentFs* variabler)
let currentFsTemplateId = null;

// --- API endpoints (matchar dina faktiska PHP-filer) ---
const API = {
  OF_LIST: "api/get_overformyndare.php", // justera om din fil heter annorlunda
  HM_LIST: "api/get_all_huvudman.php",
  HM_STATS: "api/get_dashboard_stats.php",
  PROFILES: "api/get_godman_profiles.php",
  HM_DASH: "api/get_huvudman_dashboard.php",
  HM_DETAILS: "api/get_huvudman_details.php",
};
// ========================================================================
// KONSTANTER FÖR HTML-ELEMENT ID:n
// ========================================================================
const HUVUDMAN_FILTER_OF_ID = "huvudmanFilterOF";
const HUVUDMAN_SELECT_ID = "huvudmanSelect";
const DASHBOARD_CONTAINER_ID = "huvudman-dashboard-content"; // <-- SE TILL ATT DENNA RAD FINNS

function normalizePnr(raw) {
  if (!raw) return "";
  return String(raw).replace(/\D/g, ""); // bara siffror
}
function pnr10(raw) {
  const d = normalizePnr(raw);
  if (d.length === 12) return d.slice(2); // 196709288283 -> 6709288283
  return d; // redan 10 eller annat
}
function pnr12(raw) {
  const d = normalizePnr(raw);
  if (d.length === 10) {
    // grov-regel: tolka 00–19 => 20xx, annars 19xx (justera om du vill)
    const yy = parseInt(d.slice(0, 2), 10);
    const century = yy <= 19 ? "20" : "19";
    return century + d;
  }
  return d; // redan 12 eller annat
}

// ===== Utilities =====
window.allOverformyndare = window.allOverformyndare || [];
window.allHuvudman = window.allHuvudman || [];

// Fyll en select med OFN-lista
function populateOverformyndareSelect(list, selectedId, targetId) {
  const sel = document.getElementById(targetId);
  if (!sel) return;

  sel.innerHTML = ""; // töm

  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Alla överförmyndare";
  sel.appendChild(optAll);

  list.forEach(ofn => {
    const id = getCaseInsensitive(ofn, "ID", getCaseInsensitive(ofn, "Id", ""));
    const namn = getCaseInsensitive(ofn, "Namn", getCaseInsensitive(ofn, "OverformyndareNamn", ""));
    const o = document.createElement("option");
    o.value = id;
    o.textContent = namn || "#" + id;
    if (selectedId && String(selectedId) === String(id)) o.selected = true;
    sel.appendChild(o);
  });
}

window.loadDashboardData = loadDashboardData;

async function generateAndDownloadPdf() {
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj först en huvudman.");
    return;
  }
  const extraFields = {
    manad: new Date().toLocaleString("sv-SE", { month: "long" }),
    datum: new Date().toLocaleDateString("sv-SE"),
    kommunHandlaggare: currentFsKommunNamn || "",
    gm: activeGodManProfile?.heltNamn || "",
    heltNamn:
      currentHuvudmanFullData.huvudmanDetails.HeltNamn ||
      (currentHuvudmanFullData.huvudmanDetails.Fornamn || "") +
        " " +
        (currentHuvudmanFullData.huvudmanDetails.Efternamn || ""),
  };
  const pdfFieldValues = buildPdfFieldValues(currentHuvudmanFullData.huvudmanDetails, extraFields);
  await fillAndDownloadPdf("Ansokan_Upplands_Vasby.pdf", pdfFieldValues, "ifylld_ansokan.pdf");
}

async function fillAndDownloadPdf(pdfUrl, fieldValues, outputFilename = "ifylld_ansokan.pdf") {
  const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  Object.entries(fieldValues).forEach(([fieldName, value]) => {
    try {
      const field = form.getTextField(fieldName);
      field.setText(String(value ?? ""));
    } catch (err) {
      //console.warn(`Fält ${fieldName} kunde inte fyllas:`, err);
    }
  });

  form.flatten();

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = outputFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderCategoryChart(canvasId, title, categoryData) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.warn(`Canvas-element med id '${canvasId}' hittades inte.`);
    return;
  }

  const filteredData = Object.entries(categoryData)
    .filter(([key, value]) => value > 0)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  // Skapa två versioner av etiketterna: en kort och en lång
  const shortLabels = Object.keys(filteredData).map(key => {
    const name = ALL_KATEGORIER[key].namn;
    return name.length > 25 ? name.substring(0, 22) + "..." : name; // Korta ner långa namn
  });
  const fullLabels = Object.keys(filteredData).map(key => ALL_KATEGORIER[key].namn);
  const data = Object.values(filteredData);

  if (data.length === 0) {
    ctx.style.display = "none";
    if (canvasId === "incomeChart" && incomeChartInstance) incomeChartInstance.destroy();
    if (canvasId === "expenseChart" && expenseChartInstance) expenseChartInstance.destroy();
    return;
  }
  ctx.style.display = "block";

  if (canvasId === "incomeChart" && incomeChartInstance) incomeChartInstance.destroy();
  if (canvasId === "expenseChart" && expenseChartInstance) expenseChartInstance.destroy();

  const colors = data.map((_, i) => `hsl(${((i * 360) / data.length) * 0.7 + 120}, 70%, 60%)`);

  const chartConfig = {
    type: "doughnut",
    data: {
      labels: shortLabels, // Använd de korta etiketterna för förklaringen
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2,
          fullLabels: fullLabels, // Spara de fullständiga etiketterna här
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, padding: 15 },
        },
        title: { display: true, text: title },
        tooltip: {
          callbacks: {
            label: function (context) {
              // Använd den fullständiga etiketten i tooltipen
              let label = context.dataset.fullLabels[context.dataIndex] || "";
              if (label) label += ": ";
              if (context.parsed !== null) {
                label += new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(context.parsed);
              }
              return label;
            },
          },
        },
      },
    },
  };

  if (canvasId === "incomeChart") {
    incomeChartInstance = new Chart(ctx, chartConfig);
  } else if (canvasId === "expenseChart") {
    expenseChartInstance = new Chart(ctx, chartConfig);
  }
}

// Denna funktion anropar de två diagram-funktionerna
function renderAllCharts(totals) {
  const chartContainer = document.getElementById("balanceChartContainer");
  if (!chartContainer) return;

  const hasIncome = Object.values(totals.inkomster).some(val => val > 0);
  const hasExpense = Object.values(totals.utgifter).some(val => val > 0);

  if (hasIncome || hasExpense) {
    chartContainer.style.display = "block";
    renderCategoryChart("incomeChart", "Periodens Inkomster", totals.inkomster);
    renderCategoryChart("expenseChart", "Periodens Utgifter", totals.utgifter);
  } else {
    chartContainer.style.display = "none";
  }
}

function renderBalanceChart(totalIn, totalOut) {
  const ctx = document.getElementById("balanceChart");
  const container = document.getElementById("balanceChartContainer");

  if (!ctx || !container) {
    console.warn("Canvas-element för balansdiagram hittades inte.");
    return;
  }

  // Visa containern om den var dold
  container.style.display = "block";

  // Förstör ett eventuellt gammalt diagram för att undvika buggar
  if (balanceChartInstance) {
    balanceChartInstance.destroy();
  }

  const diff = totalIn - totalOut;
  const labels = [];
  const data = [];
  const colors = [];

  if (diff > 0) {
    // Det finns ett överskott
    labels.push("Utgifter & Tillgångar Slut", "Överskott (Diff)");
    data.push(totalOut, diff);
    colors.push("hsl(340, 82%, 56%)", "hsl(210, 36%, 96%)"); // Rödaktig, Ljusgrå
  } else if (diff < 0) {
    // Det finns ett underskott
    labels.push("Inkomster & Tillgångar Start", "Underskott (Diff)");
    data.push(totalIn, Math.abs(diff));
    colors.push("hsl(145, 63%, 42%)", "hsl(210, 36%, 96%)"); // Grönaktig, Ljusgrå
  } else {
    // Perfekt balans
    labels.push("Inkomster & Tillgångar Start", "Utgifter & Tillgångar Slut");
    data.push(totalIn, totalOut);
    colors.push("hsl(145, 63%, 42%)", "hsl(340, 82%, 56%)"); // Grön, Röd
  }

  balanceChartInstance = new Chart(ctx, {
    type: "pie", // Cirkeldiagram
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ekonomisk Balans",
          data: data,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed !== null) {
                label += new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(context.parsed);
              }
              return label;
            },
          },
        },
        title: {
          display: true,
          text: "Inkomster vs. Utgifter",
        },
      },
    },
  });
}

function generateHuvudmanSectionLinks() {
  const linksContainer = document.getElementById("huvudmanSectionLinksDropdown");
  const sectionsSource = document.getElementById("huvudmanDetailsContainer");
  if (!linksContainer || !sectionsSource) return;
  linksContainer.innerHTML = "";

  const sections = sectionsSource.querySelectorAll(".collapsible-section");
  sections.forEach(section => {
    const sectionId = section.id;
    const header = section.querySelector(".collapsible-header");
    if (!sectionId || !header) return;

    const button = document.createElement("button");
    button.textContent = header.textContent.replace("▼", "").trim();
    button.dataset.targetSectionId = sectionId;

    // ← Här lägger vi till lyssnaren, precis som du föreslog
    button.addEventListener("click", () => {
      // Hitta och öppna sektionen (om den inte redan är öppen)
      const headerToOpen = section.querySelector(".collapsible-header");
      const contentToOpen = section.querySelector(".collapsible-content");
      if (headerToOpen && contentToOpen) {
        // Använd befintliga klasser för att visa sektionen
        headerToOpen.classList.add("active");
        contentToOpen.classList.remove("hidden-content");
      }

      // Scrolla till sektionen
      scrollToSection(sectionId);

      // Dölj dropdown-menyn
      linksContainer.classList.remove("visible");
      document.getElementById("toggleSectionLinksDropdownBtn")?.setAttribute("aria-expanded", "false");
    });

    linksContainer.appendChild(button);
  });
}

// ========================================================================
// HELA DEN KORREKTA funktionen att klistra in
// ========================================================================
function openTabDirect(tabId) {
  console.log(`[TabSwitch] Försöker öppna flik med ID: ${tabId}`);

  // STEG 1: Ta bort 'active'-klassen från ALLA flikinnehåll.
  // CSS-regeln .tab-content { display: none; } kommer nu att dölja dem.
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.remove("active");
  });

  // STEG 2: Ta bort 'active'-klassen från ALLA menyval i sidomenyn.
  document.querySelectorAll(".side-nav .nav-item").forEach(item => {
    item.classList.remove("active");
  });

  // STEG 3: Hitta och lägg till 'active'-klassen på den önskade fliken.
  // CSS-regeln .tab-content.active { display: block; } kommer nu att visa den.
  const tabEl = document.getElementById(tabId);
  if (tabEl) {
    tabEl.classList.add("active");
  } else {
    console.warn(`[TabSwitch] Flik med ID '${tabId}' hittades inte. Återgår till Huvudmän.`);
    // Fallback om den begärda fliken inte finns: visa huvudman-fliken
    const fallbackTab = document.getElementById("tab-huvudman");
    if (fallbackTab) {
      fallbackTab.classList.add("active");
    }
  }

  // STEG 4: Hitta och markera rätt menyval i sidomenyn som aktivt.
  const menuItem = document.querySelector(`.side-nav .nav-item[data-tab="${tabId}"]`);
  if (menuItem) {
    menuItem.classList.add("active");
  }

  console.log(`[TabSwitch] Flik ${tabId} är nu aktiv och visas.`);

  // 4) Scrolla innehållsytan till toppen (oförändrat)
  const contentArea = document.querySelector(".content-area");
  if (contentArea) contentArea.scrollTop = 0;

  // ----- All din flikspecifika logik nedan är bevarad och oförändrad -----

  const safe = (fn, ...args) => {
    try {
      if (typeof fn === "function") fn(...args);
    } catch (e) {
      console.warn(`[Safe Call] Fel vid anrop av ${fn?.name || "anonym funktion"}:`, e);
    }
  };

  const actionSubHeader = document.getElementById("huvudmanActionSubHeader");
  const hasHuvudmanData = !!(
    window.currentHuvudmanFullData &&
    window.currentHuvudmanFullData.huvudmanDetails &&
    window.currentHuvudmanFullData.huvudmanDetails.Personnummer
  );

  /* ---------- Flikspecifik logik ---------- */
  if (tabId === "tab-huvudman") {
    if (actionSubHeader) actionSubHeader.style.display = hasHuvudmanData ? "flex" : "none";

    const huvSel = document.getElementById("huvudmanSelect");
    const pnr = huvSel?.value || null;

    if (!hasHuvudmanData && pnr && typeof window.loadHuvudmanFullDetails === "function") {
      window.loadHuvudmanFullDetails(true).finally(() => {
        const detailsContainer = document.getElementById("huvudmanDetailsContainer");
        if (detailsContainer) detailsContainer.style.display = "block";
        if (actionSubHeader) actionSubHeader.style.display = "flex";
        safe(window.generateHuvudmanSectionLinks);
        setTimeout(() => initializeCollapsibleEventListeners(detailsContainer), 0);
      });
    } else if (hasHuvudmanData) {
      const detailsContainer = document.getElementById("huvudmanDetailsContainer");
      if (detailsContainer) detailsContainer.style.display = "block";
      safe(window.generateHuvudmanSectionLinks);
      setTimeout(() => initializeCollapsibleEventListeners(detailsContainer), 0);
    }
    safe(window.setupHuvudmanActionButtons);
  } else if (tabId === "tab-lankar") {
    renderLinks();
    setTimeout(() => {
      const linksContainer = document.getElementById("linkCategoriesContainer");
      initializeCollapsibleEventListeners(linksContainer);
    }, 0);
  } else if (tabId === "tab-arsrakning") {
    safe(window.displayPersonInfoForArsrakning);
    safe(window.calculateAndDisplayBalance);
    safe(window.loadRules);
  } else if (tabId === "tab-redogorelse") {
    safe(window.populateRedogorelseTabWithDefaults);
  } else if (tabId === "tab-arvode") {
    // Logiken för att fylla i arvodesmodalen är nu en del av openArvodesModal()
    // och behöver inte anropas här.
  } else if (tabId === "tab-godman-profiler") {
    const sel = document.getElementById("godmanProfileSelect");
    if (!sel || !sel.value) safe(window.clearGodManEditForm);
  } else if (tabId === "tab-pdf-templates") {
    safe(window.loadAndDisplaySavedTemplates);
  } else if (tabId === "tab-generator") {
    safe(window.populateGeneratorHuvudmanSelect);
    const genSel = document.getElementById("generatorHuvudmanSelect");
    const genPnr = genSel?.value || "";
    safe(window.populateTemplateSelect, genPnr);
    safe(window.checkGeneratorSelections);
    const prev = document.getElementById("pdfPreviewSection");
    if (prev) prev.style.display = "none";
  } else if (tabId === "tab-arkiv") {
    safe(window.populateArkivHuvudmanSelect);
    const sec = document.getElementById("arkivContentSection");
    if (sec) sec.style.display = "none";
  }
  /* ---------- / Flikspecifik logik ---------- */
}
async function setupPdfDocument(templateUrl, fontUrl = "/fonts/LiberationSans-Regular.ttf") {
  try {
    const [existingPdfBytes, fontBytes] = await Promise.all([
      fetch(templateUrl).then(res => {
        if (!res.ok) throw new Error(`Mallfel (${res.status}): ${res.statusText} för ${templateUrl}`);
        return res.arrayBuffer();
      }),
      fetch(fontUrl).then(res => {
        if (!res.ok) throw new Error(`Fontfel (${res.status}): ${res.statusText} för ${fontUrl}`);
        return res.arrayBuffer();
      }),
    ]);

    if (!existingPdfBytes || existingPdfBytes.byteLength === 0) {
      throw new Error(`PDF-mallen från '${templateUrl}' är tom eller kunde inte laddas.`);
    }

    const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(window.fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const form = pdfDoc.getForm();

    return { pdfDoc, form, customFont };
  } catch (error) {
    console.error(`[setupPdfDocument] Misslyckades att initiera PDF från mall ${templateUrl}:`, error);
    alert(`Kunde inte förbereda PDF-dokument: ${error.message}`);
    return null; // Returnera null för att visa att något gick fel
  }
}

function populateRedogorelseTabWithDefaults() {
  console.log("[Redogörelse] populateRedogorelseTabWithDefaults anropad.");
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails || !activeGodManProfile) {
    console.log("[Redogörelse] Nödvändig data (huvudman/godman) saknas, avbryter ifyllnad.");
    return;
  }
  const hm = currentHuvudmanFullData.huvudmanDetails;
  const gm = activeGodManProfile;
  const redogData = currentHuvudmanFullData.redogorelseData; // Kan vara null

  // Sätt period
  const periodStartFromArsrakning = document.getElementById("periodStart_ars").value;
  const periodSlutFromArsrakning = document.getElementById("periodSlut_ars").value;
  document.getElementById("redogKalenderarStart").value = redogData?.redogKalenderarStart || periodStartFromArsrakning;
  document.getElementById("redogKalenderarSlut").value = redogData?.redogKalenderarSlut || periodSlutFromArsrakning;

  // Fyll i grundinfo
  document.getElementById("redogHuvudmanNamnDisplay").value = `${hm.Fornamn || ""} ${hm.Efternamn || ""}`.trim();
  document.getElementById("redogHuvudmanPnrDisplay").value = hm.Personnummer || "";
  document.getElementById("redogGodManNamnDisplay").value = `${gm.Fornamn || ""} ${gm.Efternamn || ""}`.trim();
  document.getElementById("redogGodManPnrDisplay").value = gm.Personnummer || "";

  // Om det finns sparad data, fyll i formuläret med den.
  if (redogData) {
    console.log("[Redogörelse] Fyller i formulär med sparad data.");
    for (const key in redogData) {
      if (redogData.hasOwnProperty(key)) {
        const element = document.getElementById(key);
        if (element) {
          if (element.type === "checkbox") {
            element.checked = !!redogData[key];
          } else if (element.type === "radio") {
            setRadioValue(element.name, redogData[key]);
          } else {
            element.value = redogData[key] || "";
          }
        } else {
          const radioGroup = document.querySelectorAll(`input[name="${key}"]`);
          if (radioGroup.length > 0) {
            setRadioValue(key, redogData[key]);
          }
        }
      }
    }
  } else {
    // === Sätt förinställda standardvärden om ingen data finns ===
    console.log("[Redogörelse] Ingen sparad data, sätter standardvärden.");

    // Grunduppgifter
    setRadioValue("redogSlaktskap", "Nej");

    // Omfattning
    document.getElementById("redogOmfBevakaRatt").checked = true;
    document.getElementById("redogOmfForvaltaEgendom").checked = true;
    document.getElementById("redogOmfSorjaForPerson").checked = true;
    setRadioValue("redogBehovFortsatt", "Ja");
    setRadioValue("redogAnnanOmfattning", "Nej");

    // Ekonomiska frågor
    setRadioValue("redogAnkBostadsbidrag", "Ej aktuellt");
    setRadioValue("redogAnkForsorjning", "Ej aktuellt");
    setRadioValue("redogAnkHandikapp", "Ej aktuellt");
    setRadioValue("redogAnkHabilitering", "Ej aktuellt");
    setRadioValue("redogAnkHemtjanst", "Ja");
    setRadioValue("redogOmfLSS", "Nej");
    setRadioValue("redogPersAssistans", "Nej");
    setRadioValue("redogKontaktperson", "Nej");
    setRadioValue("redogHemforsakring", "Ja");
    setRadioValue("redogAvvecklatBostad", "Nej");
    setRadioValue("redogKostnadOmsorg", "Ja");
    setRadioValue("redogForbehallBelopp", "Ja");
    setRadioValue("redogTecknatHyresavtal", "Nej");
    setRadioValue("redogAnsoktNyttBoende", "Nej");

    // Kontakter och tidsinsats
    setRadioValue("redogAntalBesokTyp", "1 - 2 gånger/månad"); // **NYTT**
    setRadioValue("redogVistelseUtanforHemmet", "Ja"); // **NYTT**

    // Förvalta egendom
    document.getElementById("redogBetalningInternetbank").checked = true;
    document.getElementById("redogBetalningAutogiro").checked = true;
    document.getElementById("redogKontooverforingHm").checked = true; // **NYTT**
    document.getElementById("redogKontanterHmKvitto").checked = false; // **NYTT**
    document.getElementById("redogKontooverforingBoende").checked = true; // **NYTT**
    document.getElementById("redogKontanterBoendeKvitto").checked = false; // **NYTT**
    setRadioValue("redogForvaltningSaltKoptFastighet", "Nej");
    setRadioValue("redogForvaltningHyrtUtFastighet", "Nej");
    setRadioValue("redogForvaltningSaltKoptAktier", "Nej");
    setRadioValue("redogForvaltningAnnanVardepapper", "Nej");
    setRadioValue("redogForvaltningSoktSkuldsanering", "Nej");

    // Arvode
    document.getElementById("redogArvodeBevakaRatt").checked = true;
    document.getElementById("redogArvodeForvaltaEgendom").checked = true;
    document.getElementById("redogArvodeSorjaForPerson").checked = true;
    setRadioValue("redogArbetsinsats", "Normal");
    setRadioValue("redogOnskarKostnadsersattning", "schablon");
    setRadioValue("redogKorjournalBifogas", "Nej");
  }
}
function getRadioValue(name) {
  const radio = document.querySelector(`input[name="${name}"]:checked`);
  return radio ? radio.value : null;
}
function setRadioValue(name, value) {
  if (value === null || value === undefined) {
    // Avmarkera alla om värdet är null/undefined
    document.querySelectorAll(`input[name="${name}"]`).forEach(radio => (radio.checked = false));
    return;
  }
  const radioToSelect = document.querySelector(`input[name="${name}"][value="${String(value)}"]`);
  if (radioToSelect) {
    radioToSelect.checked = true;
  } else {
    // Om värdet inte matchar någon radio, avmarkera alla
    document.querySelectorAll(`input[name="${name}"]`).forEach(radio => (radio.checked = false));
    console.warn(`[setRadioValue] Inget radioknappsalternativ hittades för namn '${name}' med värde '${value}'.`);
  }
}

function buildPdfFieldValues(huvudmanDetails, extraFields = {}) {
  let result = {};
  for (const [jsonKey, pdfKey] of Object.entries(PDF_FIELD_MAP)) {
    result[pdfKey] = huvudmanDetails?.[jsonKey] ?? "";
  }
  for (const [pdfKey, value] of Object.entries(extraFields)) {
    result[pdfKey] = value ?? "";
  }
  return result;
}

// HELA DEN KORREKTA funktionen att klistra in
function initializeNewNavigation() {
  console.log("[NavInit] Initialiserar ny navigering (med try...catch för localStorage)...");

  // --- FÖRENKLAD OCH FÖRBÄTTRAD DEL FÖR MENYKLICK ---
  const navItems = document.querySelectorAll(".side-nav .nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", event => {
      // Förhindrar att sidan laddas om ifall man klickar på <a>-taggen inuti <li>
      event.preventDefault();

      // Hämta ID för fliken direkt från li-elementet (mycket enklare och säkrare)
      const tabId = item.dataset.tab;

      if (tabId) {
        // Anropa den centrala funktionen för att byta flik
        openTabDirect(tabId);

        // Om mobilmenyn är öppen och vi är i mobilläge, stäng den
        if (isMobileNavOpen && window.innerWidth <= 768) {
          toggleMobileNav();
        }
      } else {
        console.warn("[NavInit] Klickat menyalternativ saknar data-tab:", item);
      }
    });
  });
  // --- SLUT PÅ FÖRENKLAD DEL ---

  // === ALL KOD NEDAN ÄR BEVARAD FRÅN DIN GAMLA FUNKTION ===

  // Logik för scroll-effekt på toppmenyn
  const topNav = document.querySelector(".top-nav");
  if (topNav) {
    window.addEventListener("scroll", () => {
      document.body.classList.toggle("scrolled", window.scrollY > 30);
    });
  } else {
    console.warn("[NavInit] Element .top-nav hittades inte för scroll-event.");
  }

  // Logik för att fälla ihop/expandera sidomenyn på desktop
  const toggleBtnDesktop = document.getElementById("toggleSideNavDesktop");
  const sideNavEl = document.querySelector(".side-nav");
  const contentAreaEl = document.querySelector(".content-area");

  if (toggleBtnDesktop && sideNavEl && contentAreaEl) {
    try {
      const savedState = localStorage.getItem("sideNavCollapsed");
      isSideNavCollapsed = savedState === "true";
      console.log("[NavInit] Läste från localStorage. Kollapsad:", isSideNavCollapsed);
    } catch (e) {
      console.warn(
        "[NavInit] Kunde inte komma åt localStorage för att läsa sidomenyns tillstånd. Fortsätter utan minne.",
        e.message
      );
      isSideNavCollapsed = false;
    }

    sideNavEl.classList.toggle("collapsed", isSideNavCollapsed);
    if (window.innerWidth > 768) {
      contentAreaEl.style.marginLeft = isSideNavCollapsed
        ? "var(--side-nav-width-collapsed)"
        : "var(--side-nav-width-expanded)";
    }
    const iconDesktop = toggleBtnDesktop.querySelector("i");
    if (iconDesktop) {
      iconDesktop.classList.toggle("fa-chevron-right", isSideNavCollapsed);
      iconDesktop.classList.toggle("fa-chevron-left", !isSideNavCollapsed);
    }

    toggleBtnDesktop.addEventListener("click", () => {
      isSideNavCollapsed = !isSideNavCollapsed;
      sideNavEl.classList.toggle("collapsed", isSideNavCollapsed);
      if (window.innerWidth > 768) {
        contentAreaEl.style.marginLeft = isSideNavCollapsed
          ? "var(--side-nav-width-collapsed)"
          : "var(--side-nav-width-expanded)";
      }
      if (iconDesktop) {
        iconDesktop.classList.toggle("fa-chevron-right", isSideNavCollapsed);
        iconDesktop.classList.toggle("fa-chevron-left", !isSideNavCollapsed);
      }

      try {
        localStorage.setItem("sideNavCollapsed", isSideNavCollapsed);
        console.log("[NavInit] Sparade sidomenyns tillstånd till localStorage. Kollapsad:", isSideNavCollapsed);
      } catch (e) {
        console.warn("[NavInit] Kunde inte komma åt localStorage för att spara sidomenyns tillstånd.", e.message);
      }
    });
  } else {
    console.warn(
      "[NavInit Desktop] Något av elementen #toggleSideNavDesktop, .side-nav eller .content-area hittades inte."
    );
  }

  // Logik för mobilmenyn
  const toggleBtnMobile = document.getElementById("toggleSideNavMobile");
  if (toggleBtnMobile && sideNavEl) {
    toggleBtnMobile.addEventListener("click", toggleMobileNav);
  } else {
    console.warn("[NavInit Mobil] Något av elementen #toggleSideNavMobile eller .side-nav hittades inte.");
  }

  // Logik för att stänga dropdown-menyer vid klick utanför
  document.addEventListener("click", function (event) {
    const dropdownContent = document.getElementById("sectionLinksDropdownContent"); // Korrekt ID
    const toggleDropdownBtnElement = document.getElementById("toggleSectionLinksDropdownBtn");

    if (dropdownContent && toggleDropdownBtnElement && dropdownContent.classList.contains("visible")) {
      if (!toggleDropdownBtnElement.contains(event.target) && !dropdownContent.contains(event.target)) {
        dropdownContent.classList.remove("visible");
        toggleDropdownBtnElement.setAttribute("aria-expanded", "false");
      }
    }
  });

  console.log("[NavInit] Ny navigering initialiserad.");
}
// UPPDATERAD FUNKTION: Använder getBoundingClientRect för exakt positionering
function scrollToSection(sectionId) {
  const targetSection = document.getElementById(sectionId);
  if (!targetSection) {
    console.warn(`scrollToSection: Sektion med ID '${sectionId}' hittades inte.`);
    return;
  }

  const targetHeader = targetSection.querySelector(".collapsible-header");
  if (!targetHeader) {
    console.warn(`scrollToSection: Rubrik för sektion '${sectionId}' hittades inte.`);
    return;
  }

  const scrollContainer = document.querySelector(".content-area");
  if (!scrollContainer) {
    console.error("scrollToSection: Scroll-container '.content-area' hittades inte!");
    return;
  }

  // Vänta en kort stund för att låta webbläsaren rendera sektionen som öppen.
  setTimeout(() => {
    const subHeader = document.getElementById("huvudmanActionSubHeader");
    // Hämta höjden på sub-headern BARA om den är synlig
    const subHeaderHeight = subHeader && getComputedStyle(subHeader).display !== "none" ? subHeader.offsetHeight : 0;

    // === NY, ROBUST BERÄKNING STARTAR HÄR ===
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const headerTop = targetHeader.getBoundingClientRect().top;
    const currentScrollTop = scrollContainer.scrollTop;

    // Beräkna den absoluta positionen för rubriken inuti det scrollbara området
    const absoluteHeaderPosition = headerTop - containerTop + currentScrollTop;

    // Den slutgiltiga scroll-positionen är rubrikens position minus höjden på sub-headern,
    // plus en liten marginal för att det inte ska ligga kloss an.
    const finalScrollPosition = absoluteHeaderPosition - subHeaderHeight - 15; // 15px marginal
    // === SLUT PÅ NY BERÄKNING ===

    // Utför den mjuka scrollningen
    scrollContainer.scrollTo({
      top: finalScrollPosition,
      behavior: "smooth",
    });

    console.log(`[Scroll] Skrollar till sektion '${sectionId}'. Slutposition: ${finalScrollPosition}`);
  }, 100); // 100ms fördröjning är oftast tillräckligt
}

// ========================================================================
// HJÄLPFUNKTION FÖR MOBILMENYN
// ========================================================================

function toggleMobileNav() {
  const sideNavEl = document.querySelector(".side-nav");
  const toggleBtnMobile = document.getElementById("toggleSideNavMobile");
  if (!sideNavEl || !toggleBtnMobile) return;

  isMobileNavOpen = !isMobileNavOpen;
  sideNavEl.classList.toggle("open", isMobileNavOpen); // 'open' klassen styr synlighet på mobil

  const iconMobile = toggleBtnMobile.querySelector("i");
  if (iconMobile) {
    iconMobile.classList.toggle("fa-bars", !isMobileNavOpen);
    iconMobile.classList.toggle("fa-times", isMobileNavOpen);
  }
}

async function fetchMappableDbColumns() {
  // Ändrad kontroll: kolla om objektet har nycklar
  if (Object.keys(mappableDbColumns).length > 0) {
    return; // Använd cachad data
  }
  try {
    const response = await fetch("/api/get_db_columns.php");
    if (!response.ok) {
      throw new Error(`Serverfel: ${response.statusText}`);
    }
    mappableDbColumns = await response.json(); // Förväntar sig nu ett objekt
    console.log("Hämtade kategoriserade DB-kolumner:", mappableDbColumns);
  } catch (error) {
    console.error("Kunde inte hämta databaskolumner:", error);
    alert("Kunde inte ladda listan med databaskolumner. Försök ladda om sidan.");
    mappableDbColumns = {}; // Nollställ till ett tomt objekt vid fel
  }
}

/**
 * Hanterar när användaren väljer en PDF-mallfil.
 */
async function handleTemplateFileSelect(event) {
  const fileInput = event.target;
  const file = fileInput.files[0];
  const templateName = document.getElementById("templateNameInput").value.trim();
  const statusDiv = document.getElementById("pdfUploadStatus");
  const mappingSection = document.getElementById("mappingSection");

  if (!file || !templateName) {
    alert("Du måste ange ett namn för mallen och välja en PDF-fil.");
    fileInput.value = "";
    return;
  }

  statusDiv.textContent = "Laddar upp mall till servern...";
  statusDiv.style.color = "orange";
  mappingSection.style.display = "none";

  const formData = new FormData();
  formData.append("templateFile", file);
  formData.append("templateName", templateName);

  try {
    const uploadResponse = await fetch("/api/upload_pdf_template.php", {
      method: "POST",
      body: formData,
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok) {
      throw new Error(uploadResult.error || "Okänt fel vid uppladdning.");
    }

    currentTemplateId = uploadResult.templateId;
    statusDiv.textContent = `Mall '${templateName}' uppladdad! (ID: ${currentTemplateId}). Läser fält från PDF...`;
    statusDiv.style.color = "green";

    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const pdfBytes = e.target.result;
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        const pdfFieldNames = fields.map(f => f.getName());

        if (pdfFieldNames.length === 0) {
          alert("Varning: Inga ifyllbara fält hittades i PDF-filen.");
          mappingSection.style.display = "none";
          return;
        }

        await fetchMappableDbColumns();
        renderMappingTable(pdfFieldNames);
        mappingSection.style.display = "block";
      } catch (pdfError) {
        console.error("Fel vid läsning av PDF-fält:", pdfError);
        alert(`Kunde inte läsa fälten från PDF-filen: ${pdfError.message}`);
        statusDiv.textContent = "Fel vid läsning av PDF.";
        statusDiv.style.color = "red";
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error("Fel vid uppladdning av mall:", error);
    statusDiv.textContent = `Fel: ${error.message}`;
    statusDiv.style.color = "red";
    currentTemplateId = null;
  }
}

/**
 * Renderar tabellen där PDF-fält kopplas till databaskolumner.
 *
 * @param {string[]} pdfFields
 * @param {Array<{PdfFieldName:string, DbColumnName:string}>} [maybeSavedMappings]
 */
async function renderMappingTable(pdfFields, maybeSavedMappings) {
  // 0) Rensa målbehållare
  const containerDiv = document.getElementById("mappingTableContainer");
  const tbodyElm = document.querySelector("#pdfFieldMappingTable tbody");

  if (!containerDiv && !tbodyElm) {
    console.warn("[renderMappingTable] Ingen målbehållare i DOM.");
    return;
  }
  if (containerDiv) containerDiv.innerHTML = "";
  if (tbodyElm) tbodyElm.innerHTML = "";

  // 1) Saved mappings
  let savedMappings = [];
  if (Array.isArray(maybeSavedMappings) && maybeSavedMappings.length && maybeSavedMappings[0].PdfFieldName) {
    savedMappings = maybeSavedMappings;
  }
  if (arguments.length === 3 && Array.isArray(arguments[2])) {
    savedMappings = arguments[2];
  }
  const mappingLookup = new Map(savedMappings.map(m => [m.PdfFieldName, m.DbColumnName]));

  // 2) DB-kolumner
  let categorized = {};
  try {
    const res = await fetch("api/get_db_columns.php");
    let data = await res.json();
    if (data && typeof data === "object" && "data" in data) data = data.data;

    if (!Array.isArray(data) && typeof data === "object") {
      categorized = data;
    } else if (Array.isArray(data)) {
      data.forEach(col => {
        const [cat] = col.split(".");
        (categorized[cat] = categorized[cat] || []).push(col);
      });
    } else {
      throw new Error("Oväntat format på kolumndata");
    }
  } catch (err) {
    console.error("[renderMappingTable] Kunde inte hämta/läsa DB-kolumner", err);
    alert("Kunde inte hämta databaskolumner.");
    return;
  }

  // 3) Options
  let optionsHtml = '<option value="">-- Koppla inte --</option>';
  for (const category in categorized) {
    if (!categorized[category].length) continue;
    optionsHtml += `<optgroup label="${category}">`;
    categorized[category].forEach(fullName => {
      const label = fullName.split(".").pop();
      optionsHtml += `<option value="${fullName}">${label}</option>`;
    });
    optionsHtml += "</optgroup>";
  }

  // 4) Sortera PDF-fälten
  pdfFields = [...new Set(pdfFields)].sort((a, b) => a.localeCompare(b));

  // 5) Skriv rader
  const writeRow = targetTbody => fld => {
    const tr = document.createElement("tr");

    const tdPdf = document.createElement("td");
    tdPdf.textContent = fld;

    const tdSel = document.createElement("td");
    const sel = document.createElement("select");
    sel.dataset.pdfField = fld;
    sel.innerHTML = optionsHtml;

    const preSel = mappingLookup.get(fld);
    if (preSel) sel.value = preSel;

    tdSel.appendChild(sel);
    tr.append(tdPdf, tdSel);
    targetTbody.appendChild(tr);
  };

  let tableForPreselect = null;

  // Layout 1: containerDiv -> skapa ny tabell
  if (containerDiv) {
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr><th>PDF-fält</th><th>Datakälla</th></tr>
      </thead>`;
    const tbody = document.createElement("tbody");
    pdfFields.forEach(writeRow(tbody));
    table.appendChild(tbody);
    containerDiv.appendChild(table);
    tableForPreselect = table;
  }

  // Layout 2: redan befintlig <tbody>
  if (tbodyElm) {
    pdfFields.forEach(writeRow(tbodyElm));
    tableForPreselect = tbodyElm.closest("table") || tbodyElm.parentElement;
  }

  // 🚀 Förvälj standard för Upplands Väsby efter att raderna finns
  if (tableForPreselect) preselectDefaultsForUV(tableForPreselect);
}

// 🔧 Default-mappning (OBS: fältnamn exakt som i PDF)
const UPPLANDS_VASBY_DEFAULT_MAPPING = {
  kommunHandlaggare: "OVERFORMYNDARE_ID",
  personnummer: "PERSONNUMMER",
  // "heltNamn#0" lämnar vi TOMT här (kombineras i genereringen: FORNAMN + ' ' + EFTERNAMN)
  medsokandePersonnummer: "MEDSOKANDE_PERSONNUMMER",
  medsokandeFornamn: "MEDSOKANDE_FORNAMN",
  medsokandeEfternamn: "MEDSOKANDE_EFTERNAMN",
  adress: "ADRESS",
  postnummer: "POSTNUMMER",
  ort: "ORT",
  bostadAntalrum: "BOSTAD_ANTAL_RUM",
  bostadAntalBoende: "BOSTAD_ANTAL_BOENDE",
  boendeNamn: "BOENDE_NAMN",
  sysselsattning: "SYSSELSATTNING",
  ovrigaUpplysningar: "ARSR_OVRIGA_UPPLYSNINGAR",
  hyra: "HYRA",
  bredband: "BREDBAND",
  fackAvgiftAkassa: "FACK_AVGIFT_AKASSA",
  hemforsakring: "HEMFORSAKRING",
  reskostnader: "RESKOSTNADER",
  elKostnad: "EL_KOSTNAD",
  medicinkostnad: "MEDICIN_KOSTNAD",
  lakarvardskostnad: "LAKARVARDSKOSTNAD",
  barnomsorgAvgift: "BARNOMSORG_AVGIFT",
  fardtjanstAvgift: "FARDTJANST_AVGIFT",
  ovrigKostnadBeskrivning: "OVRIG_KOSTNAD_BESKRIVNING",
  ovrigKostnadBelopp: "OVRIG_KOSTNAD_BELOPP",
  datum: "DAGENS_DATUM",
  "gm.heltNamn": "GODMAN_NAMN",         // 👈 exakt pdf-fältnamn
  manad: "MANAD",
  "Bank_Sökande": "Bank_Sökande",
  "Clearingnummer_Sökande": "Clearingnummer_Sökande",
  "Kontonummer_Sökande": "Kontonummer_Sökande"
};

function preselectDefaultsForUV(tableEl) {
  tableEl.querySelectorAll("select").forEach(sel => {
    const def = UPPLANDS_VASBY_DEFAULT_MAPPING[sel.dataset.pdfField];
    if (def && !sel.value) sel.value = def;
  });
}

/**
 * Samlar in mappningarna från tabellen och skickar dem till servern.
 */
async function savePdfMappings() {
  if (!currentTemplateId) {
    alert("Inget aktivt mall-ID. Ladda upp en mall först.");
    return;
  }

  const mappingSelects = document.querySelectorAll("#mappingTableContainer select");
  const mappings = [];

  mappingSelects.forEach(select => {
    const dbColumn = select.value;
    if (dbColumn) {
      mappings.push({
        pdfField: select.dataset.pdfField,
        dbColumn: dbColumn,
      });
    }
  });

  if (mappings.length === 0) {
    if (!confirm("Du har inte gjort några kopplingar. Vill du fortsätta och spara en tom mappning?")) {
      return;
    }
  }

  const payload = {
    templateId: currentTemplateId,
    mappings: mappings,
  };

  try {
    const response = await fetch("/api/save_pdf_mapping.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Okänt fel vid sparande av kopplingar.");
    }

    alert(result.message || "Kopplingar sparade!");

    document.getElementById("templateNameInput").value = "";
    document.getElementById("templateFileInput").value = "";
    document.getElementById("pdfUploadStatus").textContent = "";
    document.getElementById("mappingSection").style.display = "none";
    currentTemplateId = null;

    await loadAndDisplaySavedTemplates();
  } catch (error) {
    console.error("Fel vid sparande av kopplingar:", error);
    alert(`Kunde inte spara kopplingar: ${error.message}`);
  }
}

/**
 * Startar redigeringsläget för en befintlig mall.
 * @param {number} templateId - ID för mallen som ska redigeras.
 */
async function editTemplate(templateId) {
  console.log(`Startar redigering för mall-ID: ${templateId}`);
  const mappingSection = document.getElementById("mappingSection");
  const statusDiv = document.getElementById("pdfUploadStatus");
  const uploadBox = document.querySelector("#tab-pdf-templates .box:nth-of-type(2)"); // Hitta uppladdningsboxen

  // Dölj uppladdningssektionen och visa mappningssektionen
  if (uploadBox) uploadBox.style.display = "none";
  statusDiv.innerHTML =
    'Laddar befintlig mall och kopplingar... <button class="small secondary" onclick="cancelEditTemplate()">Avbryt redigering</button>';
  statusDiv.style.color = "orange";
  mappingSection.style.display = "block";

  try {
    // Steg 1: Hämta malldetaljer (fil-URL och sparade kopplingar) från servern
    const detailsResponse = await fetch(`/api/get_pdf_template_details.php?id=${templateId}`);
    if (!detailsResponse.ok) {
      const errorResult = await detailsResponse.json();
      throw new Error(errorResult.error || "Kunde inte hämta malldetaljer.");
    }
    const templateDetails = await detailsResponse.json();

    currentTemplateId = templateId; // Sätt det globala ID:t så "Spara" vet vilken mall som redigeras
    statusDiv.innerHTML = `Redigerar mall: <strong>"${templateDetails.templateInfo.TemplateName}"</strong> <button class="small secondary" onclick="cancelEditTemplate()">Avbryt redigering</button>`;
    statusDiv.style.color = "blue";

    // Steg 2: Hämta själva PDF-filen från den URL vi fick
    const pdfResponse = await fetch(templateDetails.templateInfo.fileUrl);
    if (!pdfResponse.ok) {
      throw new Error("Kunde inte hämta PDF-filen från servern.");
    }
    const pdfBytes = await pdfResponse.arrayBuffer();

    // Steg 3: Läs fälten från PDF:en
    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const pdfFieldNames = fields.map(f => f.getName());

    // Steg 4: Hämta DB-kolumner och rita tabellen, men skicka med de sparade kopplingarna
    await fetchMappableDbColumns();
    renderMappingTable(pdfFieldNames, templateDetails.mappings);

    // Scrolla ner till mappningssektionen
    mappingSection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Fel vid redigering av mall:", error);
    alert(`Kunde inte ladda mall för redigering: ${error.message}`);
    cancelEditTemplate(); // Anropa avbryt-funktionen vid fel
  }
}
async function loadAndDisplaySavedTemplates() {
  const container = document.getElementById("savedTemplatesListContainer");
  if (!container) return;

  container.innerHTML = "<p><i>Laddar mallar...</i></p>";

  try {
    const response = await fetch("/api/get_pdf_templates.php");
    if (!response.ok) {
      const errorResult = await response.json();
      throw new Error(errorResult.error || "Okänt serverfel");
    }

    const templates = await response.json();

    if (templates.length === 0) {
      container.innerHTML = "<p>Inga mallar har laddats upp ännu.</p>";
      return;
    }

    container.innerHTML = "";
    const table = document.createElement("table");
    table.innerHTML = `
            <thead>
                <tr>
                    <th>Mallnamn</th>
                    <th>Ursprungligt Filnamn</th>
                    <th>Sparades</th>
                    <th>Åtgärder</th>
                </tr>
            </thead>
        `;
    const tbody = document.createElement("tbody");

    templates.forEach(template => {
      const row = tbody.insertRow();
      row.insertCell().textContent = template.TemplateName;
      row.insertCell().textContent = template.OriginalFilename;

      const date = new Date(template.CreatedAt);
      row.insertCell().textContent = date.toLocaleDateString("sv-SE") + " " + date.toLocaleTimeString("sv-SE");

      const actionsCell = row.insertCell();
      const editButton = document.createElement("button");
      editButton.className = "small secondary";
      editButton.textContent = "Redigera";
      editButton.onclick = () => editTemplate(template.ID);
      actionsCell.appendChild(editButton);

      // === ÄNDRING HÄR: Knappen är nu aktiv och anropar en ny funktion ===
      const deleteButton = document.createElement("button");
      deleteButton.className = "small danger";
      deleteButton.textContent = "Ta bort";
      deleteButton.onclick = () => deletePdfTemplate(template.ID, template.TemplateName);
      actionsCell.appendChild(deleteButton);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  } catch (error) {
    console.error("Kunde inte ladda sparade mallar:", error);
    container.innerHTML = `<p style="color: red;">Kunde inte ladda mallar: ${error.message}</p>`;
  }
}

function setupEventListeners() {
  // --- befintliga lyssnare (oförändrade) ----------------------------
  document.getElementById("periodStart_ars")?.addEventListener("change", handleArsrakningPeriodChange);
  document.getElementById("periodSlut_ars")?.addEventListener("change", handleArsrakningPeriodChange);
  document.querySelectorAll('input[name="rakningTyp_ars"]').forEach(radio => {
    radio.addEventListener("change", setPeriodDatesForArsrakningTab);
  });
  document.getElementById("fileInput")?.addEventListener("change", handleFileSelect);

  ["adjustmentTax", "adjustmentGarnishment", "adjustmentHousing", "adjustmentAddCost"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", calculateAdjustedGrossIncome)
  );

  ["arvForvalta", "arvSorja", "arvExtra", "arvBilersattning", "arvKostnadsersattning"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", beraknaArvode)
  );

  // --- PDF-mallar ----------------------------------------------------
  document.getElementById("templateFileInput")?.addEventListener("change", handleTemplateFileSelect);
  document.getElementById("saveMappingButton")?.addEventListener("click", savePdfMappings);

  // --- Dokument­generator -------------------------------------------
  // ▼▼  här är den enda egentliga ändringen
  const hmSelectEl = document.getElementById("generatorHuvudmanSelect");
  hmSelectEl?.addEventListener("change", () => {
    const pnr = hmSelectEl.value || "";
    populateTemplateSelect(pnr); // uppdatera mall-listan
    checkGeneratorSelections(); // tänd/släck knappen
  });
  // ▲▲  (den gamla raden med bara checkGeneratorSelections är borttagen)

  document.getElementById("generatorTemplateSelect")?.addEventListener("change", checkGeneratorSelections);
  document.getElementById("loadDataForPdfButton")?.addEventListener("click", loadDataForPdf);
  document.getElementById("generateFinalPdfButton")?.addEventListener("click", generateFinalPdf);

  // --- Dokument­arkiv -----------------------------------------------
  document.getElementById("arkivHuvudmanSelect")?.addEventListener("change", handleArkivHuvudmanSelect);
  document.getElementById("uploadArkivButton")?.addEventListener("click", uploadArkivDokument);
  document.getElementById("arkivFilInput")?.addEventListener("change", checkArkivUploadButton);
  document.getElementById("arkivDokumentTyp")?.addEventListener("input", checkArkivUploadButton);

  // --- OCR-hjälp -----------------------------------------------------
  document.getElementById("ocrFakturaInput")?.addEventListener("change", handleOcrFakturaUpload);

  // --- Global event delegation --------------------------------------
  document.body.addEventListener("click", function (event) {
    const btn = event.target.closest("button");
    if (!btn) return;
    switch (btn.id) {
      case "saveHuvudmanButton":
        saveHuvudmanFullDetails();
        break;
      case "btnNyOfn":
        openNewOverformyndareModal();
        break;
      case "btnRedigeraOfn":
        openEditOverformyndareModal();
        break;
      case "btnSparaRedogorelse":
        collectAndSaveRedogorelseData();
        break;
    }

  });
  

  console.log("[EventListeners] Global event delegation är nu aktiv på document.body.");
}

/**
 * Sätter upp händelselyssnare specifikt för Länkar-fliken.
 */
function setupLankarTabListeners() {
  const saveLinkButton = document.getElementById("saveLinkButton");
  if (saveLinkButton) {
    saveLinkButton.addEventListener("click", handleSaveLink);
  }

  const clearLinkFormButton = document.getElementById("clearLinkFormButton");
  if (clearLinkFormButton) {
    clearLinkFormButton.addEventListener("click", clearLinkForm);
  }
}

/**
 * Sätter upp händelselyssnare för RPA-fliken (Betala Fakturor).
 */
function setupRpaTabListeners() {
  const rpaButton = document.getElementById("startRpaButton");
  if (rpaButton) {
    rpaButton.addEventListener("click", startRpaPaymentProcess);
  }
}

// Öppnar modalen för att REDIGERA en befintlig överförmyndare
function openEditOverformyndareModal() {
  const select = document.getElementById("overformyndareSelect");
  const ofId = select.value;

  if (!ofId) {
    alert("Välj en överförmyndare från listan för att redigera den.");
    return;
  }

  const ofData = allOverformyndare.find(of => String(of.ID) === ofId);
  if (!ofData) {
    alert("Kunde inte hitta data för den valda överförmyndaren.");
    return;
  }

  document.getElementById("ofnModalTitle").textContent = "Redigera Överförmyndare";
  document.getElementById("editOfnId").value = ofData.ID; // Sätt ID-fältet
  document.getElementById("newOfnNamn").value = ofData.Namn || "";
  document.getElementById("newOfnAdress").value = ofData.Adress || "";
  document.getElementById("newOfnPostnummer").value = ofData.Postnummer || "";
  document.getElementById("newOfnPostort").value = ofData.Postort || "";
  document.getElementById("newOfnTelefon").value = ofData.Telefon || "";
  document.getElementById("newOfnEpost").value = ofData.Epost || "";
  document.getElementById("overformyndareModal").style.display = "block";
}

function getPdfFieldName(kommunNamn, generiskNyckel) {
  const kommunMapping = pdfFieldMappings[kommunNamn] || pdfFieldMappings.Default;
  const specifiktNamn = kommunMapping[generiskNyckel];
  if (!specifiktNamn && kommunMapping !== pdfFieldMappings.Default) {
    console.warn(`[PDF Mappning] '${generiskNyckel}' saknas för '${kommunNamn}', testar Default.`);
    return pdfFieldMappings.Default[generiskNyckel] || generiskNyckel;
  }
  return specifiktNamn || generiskNyckel;
}

function setPeriodDatesForArsrakningTab() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const lastYear = currentYear - 1;

  // Skapa en sträng för dagens datum i formatet YYYY-MM-DD
  const todayString = today.toISOString().slice(0, 10);

  const periodStartInput = document.getElementById("periodStart_ars");
  const periodSlutInput = document.getElementById("periodSlut_ars");
  const rakningTypRadio = document.querySelector('input[name="rakningTyp_ars"]:checked');

  if (!periodStartInput || !periodSlutInput || !rakningTypRadio) {
    console.warn("Periodinput eller radioknapp saknas för Årsräknings-fliken.");
    return;
  }
  const rakningTyp = rakningTypRadio.value;

  if (rakningTyp === "arsrakning") {
    // Sätt standard för Årsräkning (förra året)
    periodStartInput.value = `${lastYear}-01-01`;
    periodSlutInput.value = `${lastYear}-12-31`;
  } else if (rakningTyp === "slutrakning") {
    // Sätt standard för Sluträkning (innevarande år)
    periodStartInput.value = `${currentYear}-01-01`;

    // === NY KOD: Sätt slutdatum till dagens datum ===
    periodSlutInput.value = todayString;
    // ===============================================
  }

  console.log(
    `[setPeriodDatesForArsrakningTab] Efter uppdatering - Start: ${periodStartInput.value}, Slut: ${periodSlutInput.value}`
  );

  // Anropa alltid för att uppdatera UI och ladda om data baserat på de nya datumen
  handleArsrakningPeriodChange();
}
async function handleArsrakningPeriodChange() {
  displayPersonInfoForArsrakning();

  const selectedHuvudmanPnr = document.getElementById("huvudmanSelect").value;
  if (selectedHuvudmanPnr) {
    await loadHuvudmanFullDetails(true);
  }

  processedTransactions = [];
  currentFileStartSaldo = 0;
  currentFileSlutSaldo = 0;
  const reviewTbody = document.getElementById("reviewTable")?.querySelector("tbody");
  if (reviewTbody) reviewTbody.innerHTML = "";
  const fileInputEl = document.getElementById("fileInput");
  if (fileInputEl) fileInputEl.value = "";
  const reportSectionEl = document.getElementById("reportSection");
  if (reportSectionEl) reportSectionEl.classList.add("hidden");
  calculateAndDisplayBalance();
}

// --- INITIALISERING AV KATEGORI-SELECTS ---
function initializeKategoriSelects() {
  const ruleCatSelect = document.getElementById("ruleCategory");
  const filterCatSelect = document.getElementById("kategoriFilter");

  [ruleCatSelect, filterCatSelect].forEach(select => {
    if (!select) return;
    if (select.id === "kategoriFilter") {
      select.innerHTML = `
                <option value="alla">Visa alla</option>
                <option value="okategoriserat">Okategoriserade</option>
                <option value="justerbara">Justerbara Inkomster</option>`;
    } else {
      select.innerHTML = '<option value="">-- Välj Kategori --</option>';
    }
    const sortedKategoriKeys = Object.keys(ALL_KATEGORIER).sort((a, b) => {
      if (ALL_KATEGORIER[a].namn < ALL_KATEGORIER[b].namn) return -1;
      if (ALL_KATEGORIER[a].namn > ALL_KATEGORIER[b].namn) return 1;
      return 0;
    });
    sortedKategoriKeys.forEach(key => {
      if (ALL_KATEGORIER.hasOwnProperty(key) && key !== "Okategoriserat") {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = ALL_KATEGORIER[key].namn;
        select.appendChild(option);
      }
    });
  });
}

// --- HUVUDMAN-FLIKEN ---

function setPeriodDatesForHuvudmanTab() {
  // Denna funktion verkar inte användas längre då periodvalet är på Årsräkningsfliken.
  // Om den behövs, se till att den har korrekta ID:n.
  console.warn("setPeriodDatesForHuvudmanTab anropad, men periodval är på Årsräkningsfliken.");
}

function updateHuvudmanTabPeriodDisplay() {
  // Denna funktion verkar inte användas längre.
  console.warn("updateHuvudmanTabPeriodDisplay anropad, men periodval är på Årsräkningsfliken.");
}

function showSectionNavigator() {
  const navigator = document.getElementById("huvudmanSectionNavigator");
  const content = document.getElementById("huvudmanSectionContent");
  if (navigator) navigator.style.display = "block";
  if (content) content.style.display = "none";
}

function showSingleSection(sectionId) {
  const navigator = document.getElementById("huvudmanSectionNavigator");
  const content = document.getElementById("huvudmanSectionContent");
  if (navigator) navigator.style.display = "none";
  if (content) content.style.display = "block";

  // Göm alla sektioner först
  content.querySelectorAll(".form-section").forEach(section => {
    section.style.display = "none";
  });

  // Visa bara den valda sektionen
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = "block";
    // Scrolla vyn till toppen av content-arean
    document.querySelector(".content-area").scrollTop = 0;
  }
}

async function handleHuvudmanPeriodChange() {
  // Denna funktion verkar inte användas längre.
  console.warn("handleHuvudmanPeriodChange anropad, men periodval är på Årsräkningsfliken.");
  const selectedHuvudmanPnr = document.getElementById("huvudmanSelect").value;
  if (selectedHuvudmanPnr) {
    await loadHuvudmanFullDetails(true);
  }
}

/**
 * KORRIGERAD IGEN: Hämtar all data för en huvudman och initierar interaktivitet.
 */
async function loadHuvudmanFullDetails(forceServerLoad = false) {
  const selectedHuvudmanPnr = document.getElementById("huvudmanSelect").value;

  const detailsContainer = document.getElementById("huvudmanDetailsContainer");
  const actionSubHeader = document.getElementById("huvudmanActionSubHeader");

  if (!detailsContainer) {
    console.error("[LoadDetails] FATALT: huvudmanDetailsContainer finns inte i DOM!");
    return;
  }

  if (!selectedHuvudmanPnr) {
    clearHuvudmanDetailsForm();
    if (detailsContainer) detailsContainer.style.display = "none";
    if (actionSubHeader) actionSubHeader.style.display = "none";
    currentHuvudmanFullData = null;
    displayPersonInfoForArsrakning();
    populateRedogorelseTabWithDefaults();
    return;
  }

  // ======================= KORRIGERING HÄR =======================
  // Hämtar 'year' på ett säkert sätt utan att krascha om elementet inte finns.
  let year;
  const periodStartInput = document.getElementById("periodStart_ars");
  if (periodStartInput && periodStartInput.value) {
    year = new Date(periodStartInput.value).getFullYear();
  } else {
    year = new Date().getFullYear();
  }
  // ===============================================================

  const selectedOptionText = document.querySelector(
    `#huvudmanSelect option[value="${selectedHuvudmanPnr}"]`
  )?.textContent;
  const displayName = selectedOptionText ? selectedOptionText.split(" (")[0] : selectedHuvudmanPnr;

  const subHeaderNameEl = document.getElementById("subHeaderHuvudmanName");
  const subHeaderPnrEl = document.getElementById("subHeaderHuvudmanPnr");
  if (subHeaderNameEl) subHeaderNameEl.textContent = displayName;
  if (subHeaderPnrEl) subHeaderPnrEl.textContent = selectedHuvudmanPnr;

  if (actionSubHeader) actionSubHeader.style.display = "flex";

  // Sökväg 1: Använd cachad data
  if (
    !forceServerLoad &&
    currentHuvudmanFullData &&
    currentHuvudmanFullData.huvudmanDetails &&
    currentHuvudmanFullData.huvudmanDetails.Personnummer === selectedHuvudmanPnr
  ) {
    console.log("[LoadDetails] Använder cachad huvudmandata.");
    populateHuvudmanDetailsForm(currentHuvudmanFullData);
    _activateHuvudmanInteractivity();
    return;
  }

  console.log(`[LoadDetails] Hämtar detaljer från server för ${selectedHuvudmanPnr}, år ${year}`);

  try {
    // Sökväg 2: Hämta ny data från server
    const response = await fetch(`/api/get_huvudman_details.php?pnr=${selectedHuvudmanPnr}&ar=${year}`);
    const result = await response.json();

    if (!response.ok) {
      const errorMsg = `Serverfel ${response.status}: ${result.error || "Okänt fel"}`;
      throw new Error(errorMsg);
    }

    currentHuvudmanFullData = result;
    populateHuvudmanDetailsForm(result);
    displayPersonInfoForArsrakning();
    populateRedogorelseTabWithDefaults();

    _activateHuvudmanInteractivity();
  } catch (error) {
    console.error("[LoadDetails] Fel vid hämtning av huvudmansdetaljer:", error);
    alert(`Kunde inte ladda huvudmansdetaljer: ${error.message}`);
    clearHuvudmanDetailsForm();
  }
}
/**
 * HJÄLPFUNKTION: Samlar logiken för att aktivera interaktiva element på Huvudman-fliken.
 */
function _activateHuvudmanInteractivity() {
  const detailsContainer = document.getElementById("huvudmanDetailsContainer");
  initializeCollapsibleEventListeners(detailsContainer);
  setupHuvudmanActionButtons();
}

function updateRakningskontoSaldoDisplay() {
  const hm = currentHuvudmanFullData?.huvudmanDetails;
  if (!hm) return;

  const rakningkontoBeskrivning = `${hm.Banknamn || "Räkningskonto"} (${hm.Clearingnummer || "xxxx"}-${
    hm.Kontonummer || "xxxxxxxxx"
  })`;

  // Uppdatera Startsaldo
  const startContainer = document.getElementById("hmBankkontonStartContainer");
  if (startContainer) {
    let rkRowStart = startContainer.querySelector('div[data-is-rakningskonto="true"]');
    if (!rkRowStart) {
      rkRowStart = createBankkontoRow(
        "BankkontoStart",
        { RadNr: 1, Beskrivning: rakningkontoBeskrivning, Kronor: currentFileStartSaldo, BilagaRef: "Kontoutdrag" },
        true
      );
      startContainer.insertBefore(rkRowStart, startContainer.firstChild);
    } else {
      const kronorInput = rkRowStart.querySelector('input[data-field="Kronor"]');
      if (kronorInput) {
        kronorInput.value =
          currentFileStartSaldo !== null && !isNaN(parseFloat(currentFileStartSaldo))
            ? parseFloat(currentFileStartSaldo).toFixed(2)
            : ""; // Punkt som decimal
      }
      const beskrivningInput = rkRowStart.querySelector('input[data-field="Beskrivning"]');
      if (beskrivningInput) beskrivningInput.value = rakningkontoBeskrivning;
    }
  }

  // Uppdatera Slutsaldo
  const slutContainer = document.getElementById("hmBankkontonSlutContainer");
  if (slutContainer) {
    let rkRowSlut = slutContainer.querySelector('div[data-is-rakningskonto="true"]');
    if (!rkRowSlut) {
      rkRowSlut = createBankkontoRow(
        "BankkontoSlut",
        { RadNr: 1, Beskrivning: rakningkontoBeskrivning, Kronor: currentFileSlutSaldo, BilagaRef: "Kontoutdrag" },
        true
      );
      slutContainer.insertBefore(rkRowSlut, slutContainer.firstChild);
    } else {
      const kronorInput = rkRowSlut.querySelector('input[data-field="Kronor"]');
      if (kronorInput) {
        kronorInput.value =
          currentFileSlutSaldo !== null && !isNaN(parseFloat(currentFileSlutSaldo))
            ? parseFloat(currentFileSlutSaldo).toFixed(2)
            : ""; // Punkt som decimal
      }
      const beskrivningInput = rkRowSlut.querySelector('input[data-field="Beskrivning"]');
      if (beskrivningInput) beskrivningInput.value = rakningkontoBeskrivning;
    }
  }
}

/**
 * KOMPLETT VERSION: Använder logiken från din ursprungliga funktion för att fylla i alla fälttyper korrekt.
 * Integrerar getCaseInsensitive för att robust läsa data från databasen.
 */
function populateHuvudmanDetailsForm(data) {
  console.log("[PopulateForm] Startar ifyllnad av formulär med komplett logik.");
  const detailsContainer = document.getElementById("huvudmanDetailsContainer");
  if (!detailsContainer) {
    console.error("[PopulateForm] huvudmanDetailsContainer hittades inte i DOM.");
    return;
  }
  if (!data || !data.huvudmanDetails) {
    console.warn("[PopulateForm] Anropad utan giltig data. Rensar formuläret.");
    clearHuvudmanDetailsForm();
    if (detailsContainer) detailsContainer.style.display = "none";
    return;
  }

  const hm = data.huvudmanDetails;
  // Hjälpfunktion för att läsa data skiftlägesokänsligt.
  const getCI = (obj, key) => getCaseInsensitive(obj, key);

  const setVal = (
    id,
    value,
    isCheckbox = false,
    isRadioName = null,
    isNumeric = false,
    isFloat = false,
    isSelectInt = false
  ) => {
    const el = document.getElementById(id);
    if (el) {
      if (isRadioName && value !== null && value !== undefined) {
        const radioToSelect = document.querySelector(`input[name="${isRadioName}"][value="${String(value)}"]`);
        if (radioToSelect) radioToSelect.checked = true;
        else {
          document.querySelectorAll(`input[name="${isRadioName}"]`).forEach(r => (r.checked = false));
        }
      } else if (isCheckbox) {
        el.checked = value === 1 || value === true || String(value) === "1";
      } else if (isSelectInt) {
        el.value = value !== null && value !== undefined && String(value).trim() !== "" ? String(parseInt(value)) : "";
      } else if (el.tagName === "SELECT" && !isSelectInt) {
        el.value = value !== null && value !== undefined ? String(value) : "";
      } else if (isNumeric) {
        if (value !== null && value !== undefined && String(value).trim() !== "") {
          const numericString = String(value).replace(",", ".");
          if (isFloat) {
            const numericValue = parseFloat(numericString);
            // FIX: Konverterar till svenskt format med komma för decimaler.
            el.value = !isNaN(numericValue) ? numericValue.toFixed(2).replace(".", ",") : "";
          } else {
            const intValue = parseInt(numericString);
            el.value = !isNaN(intValue) ? String(intValue) : "";
          }
        } else {
          el.value = "";
        }
      } else {
        el.value = value !== null && value !== undefined ? String(value) : "";
      }
    }
  };

  // --- Grunduppgifter & Kontakt ---
  setVal("personnummer", getCI(hm, "Personnummer"));
  setVal("fornamn", getCI(hm, "Fornamn"));
  setVal("efternamn", getCI(hm, "Efternamn"));
  // Uppdatera rubrik med namn och personnummer
  const nameDisplay = document.getElementById("huvudmanNameDisplay");
  const pnrDisplay = document.getElementById("huvudmanPnrDisplay");
  if (nameDisplay) {
    const fornamn = getCI(hm, "Fornamn") || "";
    const efternamn = getCI(hm, "Efternamn") || "";
    nameDisplay.textContent = (fornamn + " " + efternamn).trim();
  }
  if (pnrDisplay) {
    pnrDisplay.textContent = getCI(hm, "Personnummer") || "";
  }

  setVal("adress", getCI(hm, "Adress"));
  setVal("postnummer", getCI(hm, "Postnummer"));
  setVal("ort", getCI(hm, "Ort"));
  setVal("telefon", getCI(hm, "Telefon"));
  setVal("mobil", getCI(hm, "Mobil"));
  setVal("epost", getCI(hm, "Epost"));
  setVal("medborgarskap", getCI(hm, "Medborgarskap"));
  setVal("civilstand", getCI(hm, "Civilstand"));
  setVal("sammanboende", getCI(hm, "Sammanboende"), false, null, false, false, true);
  setVal("forordnandeDatum", getCI(hm, "ForordnandeDatum"));
  setVal("saldoRakningskontoForordnande", getCI(hm, "SaldoRakningskontoForordnande"), false, null, true, true);

  // --- Medsökande ---
  toggleMedsokandeSection(); // This function will read the 'sammanboende' select value directly
  setVal("medsokandeFornamn", getCI(hm, "MedsokandeFornamn"));
  setVal("medsokandeEfternamn", getCI(hm, "MedsokandeEfternamn"));
  setVal("medsokandePersonnummer", getCI(hm, "MedsokandePersonnummer"));
  setVal("medsokandeMedborgarskap", getCI(hm, "MedsokandeMedborgarskap"));
  setVal("medsokandeCivilstand", getCI(hm, "MedsokandeCivilstand"));
  setVal("medsokandeSysselsattning", getCI(hm, "MedsokandeSysselsattning"));

  // --- Vistelse, Överförmyndare & Bank ---
  setVal("vistelseadress", getCI(hm, "Vistelseadress"));
  setVal("vistelsepostnr", getCI(hm, "Vistelsepostnr"));
  setVal("vistelseort", getCI(hm, "Vistelseort"));
  if (typeof populateOverformyndareSelect === "function" && typeof allOverformyndare !== "undefined") {
    populateOverformyndareSelect(allOverformyndare, getCI(hm, "OverformyndareId"), "overformyndareSelect");
  }
  setVal("banknamn", getCI(hm, "Banknamn"));
  setVal("clearingnummer", getCI(hm, "Clearingnummer"));
  setVal("kontonummer", getCI(hm, "Kontonummer"));

  // --- Boende, Sysselsättning & Ekonomi (Generellt) ---
  setVal("boendeNamn", getCI(hm, "BoendeNamn"));
  setVal("bostadTyp", getCI(hm, "BostadTyp"));
  setVal("bostadAntalRum", getCI(hm, "BostadAntalRum"), false, null, true, false);
  setVal("bostadAntalBoende", getCI(hm, "BostadAntalBoende"), false, null, true, false);
  setVal("bostadKontraktstid", getCI(hm, "BostadKontraktstid"));
  setVal("sysselsattning", getCI(hm, "Sysselsattning"));
  setVal("inkomsttyp", getCI(hm, "Inkomsttyp"));
  setVal("deklareratStatus", getCI(hm, "DeklareratStatus"));
  setVal("arvodeUtbetaltStatus", getCI(hm, "ArvodeUtbetaltStatus"), false, null, false, false, true);
  setVal("merkostnadsersattningStatus", getCI(hm, "MerkostnadsersattningStatus"), false, null, false, false, true);

  // --- Övriga Kontakter & Statusar ---
  setVal(
    "ersattningAnnanMyndighetStatus",
    getCI(hm, "ErsattningAnnanMyndighetStatus"),
    false,
    null,
    false,
    false,
    true
  );
  toggleErsattningFranFalt();
  setVal("ersattningAnnanMyndighetFran", getCI(hm, "ErsattningAnnanMyndighetFran"));
  setVal("arsrOvrigaUpplysningar", getCI(hm, "ArsrOvrigaUpplysningar"));

  // --- Generella Kostnader & Inkomster (Månadsvis) etc. ---
  const numericFields = [
    "hyra",
    "elKostnad",
    "hemforsakring",
    "reskostnader",
    "fackAvgiftAkassa",
    "medicinKostnad",
    "lakarvardskostnad",
    "akutTandvardskostnad",
    "barnomsorgAvgift",
    "fardtjanstAvgift",
    "bredband",
    "ovrigKostnadBelopp",
    "lon",
    "pensionLivrantaSjukAktivitet",
    "sjukpenningForaldrapenning",
    "arbetsloshetsersattning",
    "bostadsbidrag",
    "barnbidragStudiebidrag",
    "underhallsstodEfterlevandepension",
    "etableringsersattning",
    "avtalsforsakringAfa",
    "hyresintaktInneboende",
    "barnsInkomst",
    "skatteaterbaring",
    "studiemedel",
    "vantadInkomstBelopp",
    "ovrigInkomstBelopp",
    "tillgangBankmedelVarde",
    "tillgangBostadsrattFastighetVarde",
    "tillgangFordonMmVarde",
    "skuldKfmVarde",
  ];
  numericFields.forEach(fieldId => setVal(fieldId, getCI(hm, fieldId), false, null, true, true));

  // Text fields that are not numeric
  setVal("ovrigKostnadBeskrivning", getCI(hm, "OvrigKostnadBeskrivning"));
  setVal("vantadInkomstBeskrivning", getCI(hm, "VantadInkomstBeskrivning"));
  setVal("ovrigInkomstBeskrivning", getCI(hm, "OvrigInkomstBeskrivning"));
  setVal("handlaggare", getCI(hm, "Handlaggare"));

  // --- Fyll i dynamiska listor ---
  renderDynamicList("hmBankkontonStartContainer", data.bankkontonStart || [], "BankkontoStart", createBankkontoRow);
  renderDynamicList("hmBankkontonSlutContainer", data.bankkontonSlut || [], "BankkontoSlut", createBankkontoRow);
  renderDynamicList(
    "hmOvrigaTillgangarStartContainer",
    data.ovrigaTillgangarStart || [],
    "TillgangStart",
    createOvrigTillgangRow
  );
  renderDynamicList(
    "hmOvrigaTillgangarSlutContainer",
    data.ovrigaTillgangarSlut || [],
    "TillgangSlut",
    createOvrigTillgangRow
  );
  renderDynamicList("hmSkulderContainer", data.skulder || [], "Skuld", createSkuldRow);

  updateRakningskontoSaldoDisplay();

  if (detailsContainer) detailsContainer.style.display = "block";

  // Sätt initialt tillstånd för expanderbara sektioner (stäng alla)
  const allCollapsibleHeaders = detailsContainer.querySelectorAll(".collapsible-section .collapsible-header");
  const allCollapsibleContents = detailsContainer.querySelectorAll(".collapsible-section .collapsible-content");
  allCollapsibleHeaders.forEach(header => header.classList.remove("active"));
  allCollapsibleContents.forEach(content => content.classList.add("hidden-content"));

  console.log("[PopulateForm] Avslutar ifyllnad.");
}

/**
 * Samlar in ALL data från både de statiska fälten (i kollapsade sektioner)
 * och de dynamiska fälten (i dashboarden).
 * KORRIGERAD VERSION: Alla nycklar i 'baseHmDetails' är nu i VERSALER för att
 * exakt matcha databasens kolumnnamn och PHP-vitlistan.
 */
function collectHuvudmanFullDetailsFromForm() {
  const selectedPnr = document.getElementById("huvudmanSelect")?.value;
  if (!selectedPnr) {
    console.error("collectHuvudmanFullDetailsFromForm: Ingen huvudman vald för att samla in data.");
    alert("Fel: Ingen huvudman vald. Kan inte samla in formulärdata.");
    return null;
  }

  // --- Hjälpare: definiera FÖRST ---
  const getVal = (
    id,
    isCheckbox = false,
    isRadioName = null,
    isNumeric = false,
    isFloat = false,
    isSelectInt = false
  ) => {
    const el = document.getElementById(id);
    if (!el) return null;

    if (isRadioName) {
      const radioChecked = document.querySelector(`input[name="${isRadioName}"]:checked`);
      if (!radioChecked) return null;
      return isNumeric ? parseInt(radioChecked.value) : radioChecked.value;
    }
    if (isCheckbox) return el.checked ? 1 : 0;

    if (isSelectInt) return el.value === "" ? null : parseInt(el.value);

    if (el.tagName === "SELECT" && !isSelectInt) {
      return el.value.trim() === "" ? null : el.value.trim();
    }

    if (isNumeric) {
      const valStr = String(el.value).replace(",", ".");
      if (valStr.trim() === "") return null;
      const val = isFloat ? parseFloat(valStr) : parseInt(valStr);
      return isNaN(val) ? null : val;
    }

    return el.value.trim() === "" ? null : el.value.trim();
  };

  // --- Samling av data ---
  const baseHmDetails = {};

  // Grunduppgifter & Kontakt (VERSALER)
  baseHmDetails.FORNAMN = getVal("fornamn");
  baseHmDetails.EFTERNAMN = getVal("efternamn");
  baseHmDetails.ADRESS = getVal("adress");
  baseHmDetails.POSTNUMMER = getVal("postnummer");
  baseHmDetails.ORT = getVal("ort");
  baseHmDetails.TELEFON = getVal("telefon");
  baseHmDetails.MOBIL = getVal("mobil");
  baseHmDetails.EPOST = getVal("epost");
  baseHmDetails.MEDBORGARSKAP = getVal("medborgarskap");
  baseHmDetails.CIVILSTAND = getVal("civilstand");
  baseHmDetails.SAMMANBOENDE = getVal("sammanboende", false, null, false, false, true);
  baseHmDetails.FORORDNANDE_DATUM = getVal("forordnandeDatum");
  baseHmDetails.SALDO_RAKNINGSKONTO_FORORDNANDE = getVal("saldoRakningskontoForordnande", false, null, true, true);

  // Medsökande
  if (baseHmDetails.SAMMANBOENDE === 1) {
    baseHmDetails.MEDSOKANDE_FORNAMN = getVal("medsokandeFornamn");
    baseHmDetails.MEDSOKANDE_EFTERNAMN = getVal("medsokandeEfternamn");
    baseHmDetails.MEDSOKANDE_PERSONNUMMER = getVal("medsokandePersonnummer");
    baseHmDetails.MEDSOKANDE_MEDBORGARSKAP = getVal("medsokandeMedborgarskap");
    baseHmDetails.MEDSOKANDE_CIVILSTAND = getVal("medsokandeCivilstand");
    baseHmDetails.MEDSOKANDE_SYSSELSATTNING = getVal("medsokandeSysselsattning");
  }

  // Vistelse, ÖF & Bank
  baseHmDetails.VISTELSEADRESS = getVal("vistelseadress");
  baseHmDetails.VISTELSEPOSTNR = getVal("vistelsepostnr");
  baseHmDetails.VISTELSEORT = getVal("vistelseort");
  baseHmDetails.OVERFORMYNDARE_ID = getVal("overformyndareSelect", false, null, false, false, true);
  baseHmDetails.BANKNAMN = getVal("banknamn");
  baseHmDetails.CLEARINGNUMMER = getVal("clearingnummer");
  baseHmDetails.KONTONUMMER = getVal("kontonummer");

  // Generella Kostnader & Inkomster (VERSALER)
  // HYRA: primärt från Generella kostnader (#hyra), sekundärt från dashboard (#ov-HYRA)
  const hyraPrim = getVal("hyra", false, null, true, true);
  const hyraAlt  = getVal("ov-HYRA", false, null, true, true);
  baseHmDetails.HYRA = hyraPrim ?? hyraAlt ?? null;

  baseHmDetails.EL_KOSTNAD = getVal("elKostnad", false, null, true, true);
  baseHmDetails.FACK_AVGIFT_AKASSA = getVal("fackAvgiftAkassa", false, null, true, true);
  baseHmDetails.RESKOSTNADER = getVal("reskostnader", false, null, true, true);
  baseHmDetails.HEMFORSAKRING = getVal("hemforsakring", false, null, true, true);
  baseHmDetails.MEDICIN_KOSTNAD = getVal("medicinKostnad", false, null, true, true);
  baseHmDetails.LAKARVARDSKOSTNAD = getVal("lakarvardskostnad", false, null, true, true);
  baseHmDetails.BARNOMSORG_AVGIFT = getVal("barnomsorgAvgift", false, null, true, true);
  baseHmDetails.FARDTJANST_AVGIFT = getVal("fardtjanstAvgift", false, null, true, true);
  baseHmDetails.AKUT_TANDVARDSKOSTNAD = getVal("akutTandvardskostnad", false, null, true, true);
  baseHmDetails.BREDBAND = getVal("bredband", false, null, true, true);
  baseHmDetails.OVRIG_KOSTNAD_BESKRIVNING = getVal("ovrigKostnadBeskrivning");
  baseHmDetails.OVRIG_KOSTNAD_BELOPP = getVal("ovrigKostnadBelopp", false, null, true, true);
  baseHmDetails.ARBETSLOSHETSERSTATTNING = getVal("arbetsloshetsersattning", false, null, true, true);
  baseHmDetails.AVTALSFOrSAKRING_AFA = getVal("avtalsforsakringAfa", false, null, true, true);
  baseHmDetails.BARNBIDRAG_STUDIEBIDRAG = getVal("barnbidragStudiebidrag", false, null, true, true);
  baseHmDetails.BOSTADSBIDRAG = getVal("bostadsbidrag", false, null, true, true);
  baseHmDetails.ETABLERINGSERSATTNING = getVal("etableringsersattning", false, null, true, true);
  baseHmDetails.BARNS_INKOMST = getVal("barnsInkomst", false, null, true, true);
  baseHmDetails.HYRESINTAKT_INNEBOENDE = getVal("hyresintaktInneboende", false, null, true, true);
  baseHmDetails.LON = getVal("lon", false, null, true, true);
  baseHmDetails.PENSION_LIVRANTA_SJUK_AKTIVITET = getVal("pensionLivrantaSjukAktivitet", false, null, true, true);
  baseHmDetails.SJUKPENNING_FORALDRAPENNING = getVal("sjukpenningForaldrapenning", false, null, true, true);
  baseHmDetails.SKATTEATERBARING = getVal("skatteaterbaring", false, null, true, true);
  baseHmDetails.STUDIEMEDEL = getVal("studiemedel", false, null, true, true);
  baseHmDetails.UNDERHALLSSTOD_EFTERLEVANDEPENSION = getVal("underhallsstodEfterlevandepension", false, null, true, true);
  baseHmDetails.VANTAD_INKOMST_BESKRIVNING = getVal("vantadInkomstBeskrivning");
  baseHmDetails.VANTAD_INKOMST_BELOPP = getVal("vantadInkomstBelopp", false, null, true, true);
  baseHmDetails.OVRIG_INKOMST_BESKRIVNING = getVal("ovrigInkomstBeskrivning");
  baseHmDetails.OVRIG_INKOMST_BELOPP = getVal("ovrigInkomstBelopp", false, null, true, true);

  // Generella Tillgångar & Skulder
  baseHmDetails.TILLGANG_BANKMEDEL_VARDE = getVal("tillgangBankmedelVarde", false, null, true, true);
  baseHmDetails.TILLGANG_BOSTADSRATT_FASTIGHET_VARDE = getVal("tillgangBostadsrattFastighetVarde", false, null, true, true);
  baseHmDetails.TILLGANG_FORDON_MM_VARDE = getVal("tillgangFordonMmVarde", false, null, true, true);
  baseHmDetails.SKULD_KFM_VARDE = getVal("skuldKfmVarde", false, null, true, true);

  // Dashboard-budget (ingen överskrivning av HYRA här!)
  baseHmDetails.KontaktpersonNamn = getVal("ov-KontaktpersonNamn");
  baseHmDetails.KontaktpersonTel = getVal("ov-KontaktpersonTel");
  baseHmDetails.BoendeKontaktpersonNamn = getVal("ov-BoendeKontaktpersonNamn");
  baseHmDetails.BoendeKontaktpersonTel = getVal("ov-BoendeKontaktpersonTel");
  baseHmDetails.PensionLeverantor = getVal("ov-PensionLeverantor");
  baseHmDetails.BostadsbidragLeverantor = getVal("ov-BostadsbidragLeverantor");
  baseHmDetails.HyraLeverantor = getVal("ov-HyraLeverantor");
  // baseHmDetails.HYRA = getVal("ov-HYRA", false, null, true, true); // LÅT VARA AVSTÄNGD
  baseHmDetails.Omsorgsavgiftleverantor = getVal("ov-OmsorgsavgiftLeverantor");
  baseHmDetails.ElLeverantor = getVal("ov-ElLeverantor");
  baseHmDetails.HemforsakringLeverantor = getVal("ov-HemforsakringLeverantor");
  baseHmDetails.LakarvardskostnadLeverantor = getVal("ov-LakarvardskostnadLeverantor");
  baseHmDetails.MedicinLeverantor = getVal("ov-MedicinLeverantor");
  baseHmDetails.BredbandLeverantor = getVal("ov-BredbandLeverantor");
  baseHmDetails.FickpengarLeverantor = getVal("ov-FickpengarLeverantor");
  baseHmDetails.FickpengarManad = getVal("ov-FickpengarManad", false, null, true, true);
  baseHmDetails.FickpengMondag = getVal("ov-FickpengMondag", false, null, true, true);
  baseHmDetails.FickpengTisdag = getVal("ov-FickpengTisdag", false, null, true, true);
  baseHmDetails.FickpengOnsdag = getVal("ov-FickpengOnsdag", false, null, true, true);
  baseHmDetails.FickpengTorsdag = getVal("ov-FickpengTorsdag", false, null, true, true);
  baseHmDetails.FickpengFredag = getVal("ov-FickpengFredag", false, null, true, true);
  baseHmDetails.FickpengTotalVecka = getVal("ov-FickpengTotalVecka", false, null, true, true);

  // Dynamiska listor
  const dataToReturn = {
    details: baseHmDetails,
    bankkontonStart: collectDynamicListData("hmBankkontonStartContainer", [
      "Beskrivning",
      "Kronor",
      "BilagaRef",
      "OFnot",
    ]),
    bankkontonSlut: collectDynamicListData("hmBankkontonSlutContainer", [
      "Beskrivning",
      "Kronor",
      "BilagaRef",
      "OFnot",
    ]),
    ovrigaTillgangarStart: collectDynamicListData("hmOvrigaTillgangarStartContainer", [
      "Beskrivning",
      "Andelar",
      "Kronor",
      "BilagaRef",
      "OFnot",
    ]),
    ovrigaTillgangarSlut: collectDynamicListData("hmOvrigaTillgangarSlutContainer", [
      "Beskrivning",
      "Andelar",
      "Kronor",
      "BilagaRef",
      "OFnot",
    ]),
    skulder: collectDynamicListData("hmSkulderContainer", ["Langivare", "BilagaRef", "StartBelopp", "SlutBelopp"]),
  };

  console.log("[COLLECT] Data som samlats in från formulär (inkl. listor):", JSON.parse(JSON.stringify(dataToReturn)));
  return dataToReturn;
}


function clearHuvudmanDetailsForm() {
  const formIdsToClearValue = [
    "personnummer",
    "fornamn",
    "efternamn",
    "adress",
    "postnummer",
    "ort",
    "telefon",
    "mobil",
    "epost",
    "medborgarskap",
    "vistelseadress",
    "vistelsepostnr",
    "vistelseort",
    "banknamn",
    "clearingnummer",
    "kontonummer",
    "boendeNamn",
    "bostadAntalRum",
    "bostadAntalBoende",
    "bostadKontraktstid",
    "sysselsattning",
    "inkomsttyp",
    "deklareratStatus",
    "arsrOvrigaUpplysningar",
    "ersattningAnnanMyndighetFran",
    "hyra",
    "elKostnad",
    "hemforsakring",
    "reskostnader",
    "fackAvgiftAkassa",
    "medicinKostnad",
    "lakarvardskostnad",
    "akutTandvardskostnad",
    "barnomsorgAvgift",
    "fardtjanstAvgift",
    "bredband",
    "ovrigKostnadBeskrivning",
    "ovrigKostnadBelopp",
    "handlaggare",
    "lon",
    "pensionLivrantaSjukAktivitet",
    "sjukpenningForaldrapenning",
    "arbetsloshetsersattning",
    "bostadsbidrag",
    "barnbidragStudiebidrag",
    "underhallsstodEfterlevandepension",
    "etableringsersattning",
    "avtalsforsakringAfa",
    "hyresintaktInneboende",
    "barnsInkomst",
    "skatteaterbaring",
    "studiemedel",
    "vantadInkomstBeskrivning",
    "vantadInkomstBelopp",
    "ovrigInkomstBeskrivning",
    "ovrigInkomstBelopp",
    "tillgangBankmedelVarde",
    "tillgangBostadsrattFastighetVarde",
    "tillgangFordonMmVarde",
    "skuldKfmVarde",
    "medsokandeFornamn",
    "medsokandeEfternamn",
    "medsokandePersonnummer",
    "medsokandeMedborgarskap",
    "medsokandeSysselsattning",
    "forordnandeDatum",
    "saldoRakningskontoForordnande", // Lade till dessa
  ];
  formIdsToClearValue.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const selectIdsToReset = [
    "civilstand",
    "sammanboende",
    "overformyndareSelect",
    "bostadTyp",
    "arvodeUtbetaltStatus",
    "merkostnadsersattningStatus",
    "ersattningAnnanMyndighetStatus",
    "medsokandeCivilstand",
  ];
  selectIdsToReset.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0; // Återställ till första alternativet (oftast "-- Välj --")
  });

  const nameDisplay = document.getElementById("huvudmanNameDisplay");
  if (nameDisplay) nameDisplay.textContent = "";
  const pnrDisplay = document.getElementById("huvudmanPnrDisplay");
  if (pnrDisplay) pnrDisplay.textContent = "";

  // Dölj sub-headern och rensa dess info
  const actionSubHeader = document.getElementById("huvudmanActionSubHeader");
  if (actionSubHeader) {
    actionSubHeader.style.display = "none";
    const subName = document.getElementById("subHeaderHuvudmanName");
    const subPnr = document.getElementById("subHeaderHuvudmanPnr");
    if (subName) subName.textContent = "";
    if (subPnr) subPnr.textContent = "";
  }

  // Dölj snabblänkar
  const sectionLinksContainer = document.getElementById("huvudmanSectionLinks");
  if (sectionLinksContainer) {
    sectionLinksContainer.style.display = "none";
    sectionLinksContainer.innerHTML = ""; // Rensa eventuella gamla länkar
  }

  // Rensa dynamiska listor
  [
    "hmBankkontonStartContainer",
    "hmBankkontonSlutContainer",
    "hmOvrigaTillgangarStartContainer",
    "hmOvrigaTillgangarSlutContainer",
    "hmSkulderContainer",
  ].forEach(containerId => {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = "";
  });

  document.getElementById("medsokandeSection").style.display = "none";
  document.getElementById("medsokandeHr").style.display = "none";
  document.getElementById("ersattningFranContainer").style.display = "none";

  const jsonDataEl = document.getElementById("huvudmanJsonData");
  if (jsonDataEl) jsonDataEl.textContent = "Formulär rensat.";

  // Stäng alla kollapsbara sektioner
  const collapsibleContents = document.querySelectorAll("#huvudmanDetailsContainer .collapsible-content");
  collapsibleContents.forEach(content => content.classList.add("hidden-content"));
  const collapsibleHeaders = document.querySelectorAll("#huvudmanDetailsContainer .collapsible-header");
  collapsibleHeaders.forEach(header => header.classList.remove("active"));
}

async function promptDeleteHuvudman() {
  const selectedHuvudmanPnr = document.getElementById("huvudmanSelect").value;
  const huvudmanNamnElement = document.getElementById("huvudmanNameDisplay");
  const huvudmanNamn = huvudmanNamnElement ? huvudmanNamnElement.textContent : selectedHuvudmanPnr;

  if (!selectedHuvudmanPnr) {
    alert("Ingen huvudman är vald för att tas bort.");
    return;
  }

  if (
    confirm(
      `Är du helt säker på att du vill radera ${huvudmanNamn} (${selectedHuvudmanPnr})?\nAll sparad data för denna huvudman kommer att försvinna permanent.`
    )
  ) {
    if (
      confirm(
        `VARNING: Detta går INTE att ångra!\n\nÄr du absolut säker på att du vill permanent radera ${huvudmanNamn}? Klicka OK för att radera.`
      )
    ) {
      try {
        console.log(`Försöker radera huvudman: ${selectedHuvudmanPnr}`);
        const response = await fetch(`/api/huvudman/${selectedHuvudmanPnr}`, {
          method: "DELETE",
        });

        if (response.ok) {
          alert(`${huvudmanNamn} har raderats.`);
          currentHuvudmanFullData = null;
          clearHuvudmanDetailsForm();
          document.getElementById("huvudmanDetailsContainer").style.display = "none";
          await loadHuvudmanOptions();
          processedTransactions = [];
          currentFileStartSaldo = 0;
          currentFileSlutSaldo = 0;
          document.getElementById("fileInput").value = "";
          document.getElementById("reportSection")?.classList.add("hidden");
          displayPersonInfoForArsrakning();
          calculateAndDisplayBalance();
        } else {
          const errorData = await response.json();
          alert(`Kunde inte radera huvudman: ${errorData.error || response.statusText}`);
        }
      } catch (error) {
        console.error("Nätverksfel vid radering av huvudman:", error);
        alert("Nätverksfel vid radering av huvudman.");
      }
    }
  }
}

// --- GOD MAN PROFILER-FLIKEN ---
async function loadAllGodManProfiles() {
  console.log("[PROFILER] Startar loadAllGodManProfiles...");
  try {
    const response = await fetch("/api/get_godman_profiles.php");
    if (response.ok) {
      allGodManProfiler = await response.json();
      console.log("[PROFILER] Mottagna God Man-profiler från server:", allGodManProfiler);
      if (typeof populateGodManProfileSelect === "function") {
        populateGodManProfileSelect();
      } else {
        console.error("[PROFILER] Funktionen populateGodManProfileSelect är inte definierad!");
      }
      activeGodManProfile = allGodManProfiler.find(p => p.IsCurrentUser === 1);
      if (activeGodManProfile) {
        console.log("[PROFILER] Aktiv God Man-profil satt:", activeGodManProfile);
        if (godmanProfileChoicesInstance) {
          godmanProfileChoicesInstance.setChoiceByValue(String(activeGodManProfile.ID));
        } else {
          const selectEl = document.getElementById("godmanProfileSelect"); // Korrigerat ID
          if (selectEl) selectEl.value = String(activeGodManProfile.ID);
        }
        if (typeof loadSelectedGodManProfileForEditing === "function") {
          loadSelectedGodManProfileForEditing();
        } else {
          console.error("[PROFILER] Funktionen loadSelectedGodManProfileForEditing är inte definierad!");
        }
      } else if (allGodManProfiler.length > 0) {
        console.warn("[PROFILER] Ingen profil markerad som 'IsCurrentUser'.");
      } else {
        console.log("[PROFILER] Inga God Man-profiler hittades i databasen.");
        activeGodManProfile = null;
        if (typeof clearGodManEditForm === "function") clearGodManEditForm();
        const editForm = document.getElementById("godmanProfileEditForm");
        if (editForm) editForm.style.display = "none";
      }
    } else {
      console.error(
        "[PROFILER] Fel vid hämtning av God Man-profiler från server:",
        response.status,
        response.statusText
      );
      allGodManProfiler = [];
      if (typeof populateGodManProfileSelect === "function") populateGodManProfileSelect();
    }
  } catch (error) {
    console.error("[PROFILER] Nätverksfel eller annat JavaScript-fel vid hämtning av God Man-profiler:", error);
    allGodManProfiler = [];
    if (typeof populateGodManProfileSelect === "function") populateGodManProfileSelect();
  }
}
function getSaldoPaDatum(datumStr, transaktioner) {
  if (!datumStr || !transaktioner || transaktioner.length === 0) {
    return null;
  }
  let senasteSaldoForeEllerPaDatum = null;
  let senasteTransaktionDatum = "";

  for (const tr of transaktioner) {
    if (tr.datum <= datumStr) {
      if (tr.saldoEfter !== null && !isNaN(tr.saldoEfter)) {
        // Vi vill ha saldot från den SENASTE transaktionen PÅ eller FÖRE det givna datumet
        if (tr.datum > senasteTransaktionDatum) {
          senasteSaldoForeEllerPaDatum = tr.saldoEfter;
          senasteTransaktionDatum = tr.datum;
        } else if (tr.datum === senasteTransaktionDatum) {
          // Om flera transaktioner på samma dag, ta den sista (högst saldoEfter om det är en serie)
          // Detta antagande kan behöva justeras beroende på hur banken sorterar transaktioner på samma dag.
          senasteSaldoForeEllerPaDatum = tr.saldoEfter;
        }
      }
    } else {
      // Vi har passerat måldatumet, och vi har det senaste saldot vi kunde hitta
      break;
    }
  }
  return senasteSaldoForeEllerPaDatum;
}

// --- godman_logic.js ---

async function genereraForteckningPDF() {
  console.log("[PDF Gen Förteckning V7] Startar generering..."); // Ny version för loggning
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman på 'Huvudman'-fliken först. PDF-generering avbruten.");
    return;
  }
  if (!activeGodManProfile) {
    alert("Välj en aktiv God Man-profil. PDF-generering avbruten.");
    return;
  }

  const hmData = currentHuvudmanFullData.huvudmanDetails;
  const forordnandeDatum = hmData.ForordnandeDatum;

  if (!forordnandeDatum) {
    alert("Förordnandedatum saknas för huvudmannen. Fyll i det på Huvudman-fliken och spara.");
    return;
  }

  let saldoRakningskontoPaForordnandeDagen = parseFloat(hmData.SaldoRakningskontoForordnande);
  if (isNaN(saldoRakningskontoPaForordnandeDagen)) {
    const manuelltSaldoStr = prompt(
      `Saldo för räkningskonto på förordnandedagen (${formatDateForPdf(
        forordnandeDatum
      )}) saknas eller är ogiltigt. Ange saldo:`,
      "0.00"
    );
    if (manuelltSaldoStr === null) {
      alert("Saldo måste anges. Avbrutet.");
      return;
    }
    saldoRakningskontoPaForordnandeDagen = parseFloat(String(manuelltSaldoStr).replace(",", "."));
    if (isNaN(saldoRakningskontoPaForordnandeDagen)) {
      alert("Ogiltigt saldo. Avbrutet.");
      return;
    }
  }
  console.log(
    "[PDF Gen Förteckning V7] Saldo räkningskonto på förordnandedagen:",
    saldoRakningskontoPaForordnandeDagen
  );

  const { PDFDocument, rgb } = window.PDFLib;
  const fontkit = window.fontkit;
  const mallUrl = "/forteckning_mall.pdf";
  const fontUrl = "/fonts/LiberationSans-Regular.ttf";

  try {
    console.log(`[PDF Gen Förteckning V7] Laddar mall: ${mallUrl}`);
    const [existingPdfBytes, fontBytes] = await Promise.all([
      fetch(mallUrl).then(res => {
        if (!res.ok) throw new Error(`Mallfel (${res.status}): ${res.statusText} för ${mallUrl}`);
        return res.arrayBuffer();
      }),
      fetch(fontUrl).then(res => {
        if (!res.ok) throw new Error(`Fontfel (${res.status}): ${res.statusText} för ${fontUrl}`);
        return res.arrayBuffer();
      }),
    ]);

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const form = pdfDoc.getForm();
    console.log("[PDF Gen Förteckning V7] Mall och font laddade.");

    const godMan = activeGodManProfile;
    const overformyndare = currentHuvudmanFullData.overformyndareDetails;

    // Bilagehantering (som tidigare, V3 var bra för detta)
    let aktuellBilagaNummerForteckning = 1;
    const getForteckningBilaga = () => String(aktuellBilagaNummerForteckning++);
    const bilageMapForteckning = new Map();

    const createItemKeyForteckning = (item, type) => {
      if (type === "bank" || type === "ovrigt") {
        return (
          `${type}_${(item.Beskrivning || "tom_beskrivning").toLowerCase()}` +
          (type === "ovrigt" ? `_${(item.Andelar || "inga_andelar").toLowerCase()}` : "")
        );
      } else if (type === "skuld") {
        return `skuld_${(item.Langivare || "okand_langivare").toLowerCase()}`;
      }
      return `unknown_forteckning_${Date.now()}_${Math.random()}`;
    };

    const getOrAssignBilagaForteckning = (item, itemKey, isRakningskonto = false) => {
      if (isRakningskonto) {
        bilageMapForteckning.set(itemKey, "1");
        aktuellBilagaNummerForteckning = Math.max(aktuellBilagaNummerForteckning, 2);
        return "1";
      }
      if (item.BilagaRef && String(item.BilagaRef).trim() !== "") {
        const userBilaga = String(item.BilagaRef).trim();
        if (userBilaga === "1" && itemKey !== "RAKNINGSKONTO_KEY_FORTECKNING") {
          console.warn(
            `[PDF Förteckning Bilaga] Användare angav bilaga "1" för ${itemKey}, men "1" är reserverat. Tilldelar nytt.`
          );
        } else {
          bilageMapForteckning.set(itemKey, userBilaga);
          const numVal = parseInt(userBilaga);
          if (!isNaN(numVal) && numVal >= aktuellBilagaNummerForteckning) {
            aktuellBilagaNummerForteckning = numVal + 1;
          }
          return userBilaga;
        }
      }
      if (bilageMapForteckning.has(itemKey)) {
        return bilageMapForteckning.get(itemKey);
      }
      const nyBilaga = getForteckningBilaga();
      bilageMapForteckning.set(itemKey, nyBilaga);
      return nyBilaga;
    };

    // --- Fyll i PDF-fält ---
    // Notera: trySetTextField hanterar redan internt om ett fält inte finns.
    // Den extra if-kontrollen här är för block av fält.

    trySetTextField(form, "Ofn_Rad1_Text", overformyndare?.Namn || "");
    trySetTextField(form, "Ofn_Rad2_Text", overformyndare?.Adress || "");
    trySetTextField(
      form,
      "Ofn_Rad3_Text",
      `${overformyndare?.Postnummer || ""} ${overformyndare?.Postort || ""}`.trim()
    );

    // Försök fylla datumfälten, trySetTextField hanterar om de inte finns
    trySetTextField(form, "Forordnande_Datum", formatDateForPdf(forordnandeDatum));
    trySetTextField(form, "Period_Start", formatDateForPdf(forordnandeDatum));
    trySetTextField(form, "Period_Slut", formatDateForPdf(forordnandeDatum));
    trySetTextField(form, "Perioden", formatDateForPdf(forordnandeDatum));

    const hmHeltNamn = `${hmData.Fornamn || ""} ${hmData.Efternamn || ""}`.trim();
    trySetTextField(form, "Huvudman_HeltNamn", hmHeltNamn);
    trySetTextField(form, "Huvudman_Fornamn", hmData.Fornamn || "");
    trySetTextField(form, "Huvudman_Efternamn", hmData.Efternamn || "");
    trySetTextField(form, "Huvudman_Pnr", hmData.Personnummer || "");
    trySetTextField(form, "Postadress (gata, box, etc.)", hmData.Adress || "");
    trySetTextField(form, "Postnummer", hmData.Postnummer);
    trySetTextField(form, "Postort", hmData.Ort);
    trySetTextField(form, "Vistelseadress", hmData.Vistelseadress || "");
    trySetTextField(form, "Vistelse_Postnummer_PDF_Falt", hmData.Vistelsepostnr || "");
    trySetTextField(form, "Vistelse_Postort_PDF_Falt", hmData.Vistelseort || "");
    trySetTextField(form, "Telefonnummer dagtid", hmData.Telefon || "");
    trySetTextField(form, "Mobilnummer", hmData.Mobil || "");
    trySetTextField(form, "E-postadress", hmData.Epost || "");

    const godManHeltNamn = `${godMan.Fornamn || ""} ${godMan.Efternamn || ""}`.trim();
    trySetTextField(form, "Godman_HeltNamn", godManHeltNamn);
    trySetTextField(form, "Godman_Fornamn", godMan.Fornamn || "");
    trySetTextField(form, "Godman_Efternamn", godMan.Efternamn || "");
    trySetTextField(form, "Godman_Pnr", godMan.Personnummer || "");
    trySetTextField(form, "Godman_Adress", godMan.Adress || "");
    trySetTextField(form, "Godman_Postnr", godMan.Postnummer || "");
    trySetTextField(form, "Godman_Postort", godMan.Postort || "");
    trySetTextField(form, "Godman_Telefon", godMan.Telefon || "");
    trySetTextField(form, "Godman_Mobil", godMan.Mobil || "");
    trySetTextField(form, "Godman_Epost", godMan.Epost || "");

    const undertecknadOrtDatumUI =
      document.getElementById("arsrakningUndertecknadOrtDatum")?.value ||
      `${godMan.Postort || "Okänd ort"} ${new Date().toLocaleDateString("sv-SE")}`;
    trySetTextField(form, "Undertecknad_OrtDatum", undertecknadOrtDatumUI);
    trySetTextField(form, "Undertecknad_Namn", godManHeltNamn);

    let summaBankkontoFort = 0;
    const rakningkontoBeskrivning = `${hmData.Banknamn || "Räkningskonto"} (${hmData.Clearingnummer || "xxxx"}-${
      hmData.Kontonummer || "xxxxxxxxx"
    })`;
    const bilagaRkFort = getOrAssignBilagaForteckning({ BilagaRef: "1" }, "RAKNINGSKONTO_KEY_FORTECKNING", true);

    trySetTextField(form, `TillgStart_Bankkonto_Rad1_Beskrivning`, rakningkontoBeskrivning);
    trySetTextField(
      form,
      `TillgStart_Bankkonto_Rad1_Belopp`,
      formatCurrencyForPdf(saldoRakningskontoPaForordnandeDagen, false)
    );
    trySetTextField(form, `TillgStart_Bankkonto_Rad1_Bilaga`, bilagaRkFort);
    summaBankkontoFort += saldoRakningskontoPaForordnandeDagen;

    const bankkontonData = currentHuvudmanFullData.bankkontonStart || [];
    bankkontonData.forEach((konto, index) => {
      const radNummerPdf = index + 2;
      if (radNummerPdf <= 6) {
        trySetTextField(form, `TillgStart_Bankkonto_Rad${radNummerPdf}_Beskrivning`, konto.Beskrivning || "");
        trySetTextField(
          form,
          `TillgStart_Bankkonto_Rad${radNummerPdf}_Belopp`,
          formatCurrencyForPdf(konto.Kronor, true)
        );
        trySetTextField(
          form,
          `TillgStart_Bankkonto_Rad${radNummerPdf}_Bilaga`,
          getOrAssignBilagaForteckning(konto, createItemKeyForteckning(konto, "bank"))
        );
        summaBankkontoFort += parseFloat(konto.Kronor) || 0;
      }
    });
    trySetTextField(form, "TillgStart_Bankkonto_Summa_A", formatCurrencyForPdf(summaBankkontoFort, false));

    let summaOvrigtFort = 0;
    const ovrigaTillgangarData = currentHuvudmanFullData.ovrigaTillgangarStart || [];
    ovrigaTillgangarData.forEach((tillg, index) => {
      const radNummerPdf = index + 1;
      if (radNummerPdf <= 14) {
        trySetTextField(form, `TillgStart_Ovrigt_Rad${radNummerPdf}_Beskrivning`, tillg.Beskrivning || "");
        trySetTextField(form, `TillgStart_Ovrigt_Rad${radNummerPdf}_Andelar`, tillg.Andelar || "");
        trySetTextField(form, `TillgStart_Ovrigt_Rad${radNummerPdf}_Belopp`, formatCurrencyForPdf(tillg.Kronor, true));
        trySetTextField(
          form,
          `TillgStart_Ovrigt_Rad${radNummerPdf}_Bilaga`,
          getOrAssignBilagaForteckning(tillg, createItemKeyForteckning(tillg, "ovrigt"))
        );
        summaOvrigtFort += parseFloat(tillg.Kronor) || 0;
      }
    });
    trySetTextField(form, "TillgStart_Ovrigt_Summa", formatCurrencyForPdf(summaOvrigtFort, false));

    trySetTextField(form, "Inkomst_Summa_B", formatCurrencyForPdf(0, false));
    trySetTextField(form, "Summa_A_Plus_B", formatCurrencyForPdf(summaBankkontoFort + summaOvrigtFort, false));
    trySetTextField(form, "Utgift_Summa_C", formatCurrencyForPdf(0, false));

    // Kontrollera om slut-sektionens fält finns innan vi försöker fylla dem
    let slutSektionFinns = false;
    try {
      if (form.getField(`TillgSlut_Bankkonto_Rad1_Beskrivning`)) {
        // Använd getField här för att se om det kastar fel
        slutSektionFinns = true;
      }
    } catch (e) {
      // Fältet finns inte, slutSektionFinns förblir false
      console.log("[PDF Gen Förteckning V7] Fältet 'TillgSlut_Bankkonto_Rad1_Beskrivning' finns inte i mallen.");
    }

    if (slutSektionFinns) {
      console.log("[PDF Gen Förteckning V7] Fyller i slut-sektioner (samma som start).");
      trySetTextField(form, `TillgSlut_Bankkonto_Rad1_Beskrivning`, rakningkontoBeskrivning);
      trySetTextField(
        form,
        `TillgSlut_Bankkonto_Rad1_Belopp`,
        formatCurrencyForPdf(saldoRakningskontoPaForordnandeDagen, false)
      );
      trySetTextField(form, `TillgSlut_Bankkonto_Rad1_Bilaga`, bilagaRkFort);

      let tempSummaBankkontoSlut = saldoRakningskontoPaForordnandeDagen;
      (currentHuvudmanFullData.bankkontonStart || []).forEach((konto, index) => {
        const radNummerPdf = index + 2;
        if (radNummerPdf <= 6) {
          trySetTextField(form, `TillgSlut_Bankkonto_Rad${radNummerPdf}_Beskrivning`, konto.Beskrivning || "");
          trySetTextField(
            form,
            `TillgSlut_Bankkonto_Rad${radNummerPdf}_Belopp`,
            formatCurrencyForPdf(konto.Kronor, true)
          );
          trySetTextField(
            form,
            `TillgSlut_Bankkonto_Rad${radNummerPdf}_Bilaga`,
            getOrAssignBilagaForteckning(konto, createItemKeyForteckning(konto, "bank"))
          );
          tempSummaBankkontoSlut += parseFloat(konto.Kronor) || 0;
        }
      });
      trySetTextField(form, "TillgSlut_Bankkonto_Summa_D", formatCurrencyForPdf(tempSummaBankkontoSlut, false));

      let tempSummaOvrigtSlut = 0;
      (currentHuvudmanFullData.ovrigaTillgangarStart || []).forEach((tillg, index) => {
        const radNummerPdf = index + 1;
        if (radNummerPdf <= 13) {
          trySetTextField(form, `TillgSlut_Ovrigt_Rad${radNummerPdf}_Beskrivning`, tillg.Beskrivning || "");
          trySetTextField(form, `TillgSlut_Ovrigt_Rad${radNummerPdf}_Andelar`, tillg.Andelar || "");
          trySetTextField(form, `TillgSlut_Ovrigt_Rad${radNummerPdf}_Belopp`, formatCurrencyForPdf(tillg.Kronor, true));
          trySetTextField(
            form,
            `TillgSlut_Ovrigt_Rad${radNummerPdf}_Bilaga`,
            getOrAssignBilagaForteckning(tillg, createItemKeyForteckning(tillg, "ovrigt"))
          );
          tempSummaOvrigtSlut += parseFloat(tillg.Kronor) || 0;
        }
      });
      trySetTextField(form, "TillgSlut_Ovrigt_Summa", formatCurrencyForPdf(tempSummaOvrigtSlut, false));

      trySetTextField(
        form,
        "Summa_C_Plus_D",
        formatCurrencyForPdf(0 + tempSummaBankkontoSlut + tempSummaOvrigtSlut, false)
      );
    } else {
      console.log(
        "[PDF Gen Förteckning V7] Slut-sektionens fält ('TillgSlut_Bankkonto_Rad1_Beskrivning') hittades inte, hoppar över ifyllnad av slut-sektion."
      );
      const summaA = summaBankkontoFort;
      const summaOvrigtStartPDF = summaOvrigtFort;
      trySetTextField(form, "Summa_C_Plus_D", formatCurrencyForPdf(0 + summaA + summaOvrigtStartPDF, false));
    }
    trySetTextField(form, "Diff_AB_CD", formatCurrencyForPdf(0));

    let summaSkuldFort = 0;
    const skulderDataFort = currentHuvudmanFullData.skulder || [];
    skulderDataFort.forEach((skuld, index) => {
      const radNummerPdf = index + 1;
      if (radNummerPdf <= 9) {
        trySetTextField(form, `Skuld_Rad${radNummerPdf}_Langivare`, skuld.Langivare || "");
        trySetTextField(
          form,
          `Skuld_Rad${radNummerPdf}_Bilaga`,
          getOrAssignBilagaForteckning(skuld, createItemKeyForteckning(skuld, "skuld"))
        );
        trySetTextField(form, `Skuld_Rad${radNummerPdf}_Start`, formatCurrencyForPdf(skuld.StartBelopp, true));
        trySetTextField(form, `Skuld_Rad${radNummerPdf}_Slut`, formatCurrencyForPdf(skuld.StartBelopp, true));
        trySetTextField(form, `Skuld_Rad${radNummerPdf}_Forandring`, formatCurrencyForPdf(0));
        summaSkuldFort += parseFloat(skuld.StartBelopp) || 0;
      }
    });
    trySetTextField(form, "Skuld_Summa_Start", formatCurrencyForPdf(summaSkuldFort, false));
    trySetTextField(form, "Skuld_Summa_Slut", formatCurrencyForPdf(summaSkuldFort, false));
    trySetTextField(form, "Skuld_Summa_Forandring", formatCurrencyForPdf(0));

    trySetTextField(
      form,
      "OvrigaUpplysningar",
      hmData.ArsrOvrigaUpplysningar ||
        `Förteckning avser tillgångar och skulder per förordnandedagen ${formatDateForPdf(forordnandeDatum)}.`
    );

    form.getFields().forEach(field => {
      try {
        if (field.defaultUpdateAppearances && typeof field.defaultUpdateAppearances === "function")
          field.defaultUpdateAppearances(customFont);
      } catch (e) {
        /* Ignorera */
      }
    });
    form.flatten();

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `Forteckning_${(hmData.Personnummer || "hm").replace(/\W/g, "_")}_${formatDateForPdf(
      forordnandeDatum
    ).replace(/-/g, "")}.pdf`;
    triggerDownload(blob, filename);
    alert("Förteckning genererad!");
  } catch (error) {
    console.error("[PDF Gen Förteckning V7] Allvarligt fel:", error);
    alert(`Kunde inte skapa Förtecknings-PDF: ${error.message}\nSe konsolen för detaljer.`);
  }
}
function toggleMedsokandeSection() {
  const sammanboendeSelect = document.getElementById("sammanboende");
  const medsokandeSection = document.getElementById("medsokandeSection");
  const medsokandeHr = document.getElementById("medsokandeHr");
  if (sammanboendeSelect && medsokandeSection && medsokandeHr) {
    if (sammanboendeSelect.value === "1") {
      medsokandeSection.style.display = "block";
      medsokandeHr.style.display = "block";
    } else {
      medsokandeSection.style.display = "none";
      medsokandeHr.style.display = "none";
    }
  }
}

function populateGodManProfileSelect() {
  const select = document.getElementById("godmanProfileSelect");
  if (!select) {
    console.error("[PROFILER] Dropdown-element 'godmanProfileSelect' hittades inte.");
    return;
  }
  select.innerHTML = '<option value="">-- Välj profil att redigera eller skapa ny --</option>';
  allGodManProfiler.forEach(p => {
    const option = document.createElement("option");
    option.value = p.ID;
    let profileText = `${p.Fornamn || ""} ${p.Efternamn || ""}`;
    if (!profileText.trim()) profileText = p.Personnummer || `ID: ${p.ID}`;
    else if (p.Personnummer) profileText += ` (${p.Personnummer})`;
    if (p.IsCurrentUser === 1) option.textContent = profileText + " (Nuvarande)";
    else option.textContent = profileText;
    select.appendChild(option);
  });
  if (godmanProfileChoicesInstance) godmanProfileChoicesInstance.destroy();
  godmanProfileChoicesInstance = new Choices(select, {
    searchEnabled: true,
    itemSelectText: "Välj",
    placeholder: false,
    shouldSort: false,
  });
  select.removeEventListener("change", loadSelectedGodManProfileForEditing);
  select.addEventListener("change", loadSelectedGodManProfileForEditing);
}

function loadSelectedGodManProfileForEditing() {
  const profileSelect = document.getElementById("godmanProfileSelect");
  if (!profileSelect) {
    console.error("[PROFILER] Dropdown 'godmanProfileSelect' hittades inte.");
    clearGodManEditForm(); // Rensa formuläret om dropdown saknas
    const editForm = document.getElementById("godmanProfileEditForm");
    if (editForm) editForm.style.display = "none";
    return;
  }
  const profileId = profileSelect.value;
  const editForm = document.getElementById("godmanProfileEditForm");

  if (!editForm) {
    console.error("[PROFILER] Redigeringsformulär 'godmanProfileEditForm' hittades inte.");
    return;
  }

  if (!profileId) {
    // Om inget är valt (t.ex. "-- Välj profil --")
    clearGodManEditForm();
    editForm.style.display = "none";
    return;
  }

  const profile = allGodManProfiler.find(p => String(p.ID) === String(profileId));

  if (profile) {
    document.getElementById("godmanEditProfilId").value = profile.ID || "";
    document.getElementById("godmanEditProfilFornamn").value = profile.Fornamn || "";
    document.getElementById("godmanEditProfilEfternamn").value = profile.Efternamn || "";
    document.getElementById("godmanEditProfilPersonnummer").value = profile.Personnummer || "";
    document.getElementById("godmanEditProfilAdress").value = profile.Adress || "";
    document.getElementById("godmanEditProfilPostnummer").value = profile.Postnummer || "";
    document.getElementById("godmanEditProfilPostort").value = profile.Postort || "";
    document.getElementById("godmanEditProfilTelefon").value = profile.Telefon || "";
    document.getElementById("godmanEditProfilMobil").value = profile.Mobil || "";
    document.getElementById("godmanEditProfilEpost").value = profile.Epost || "";

    // Hantera bankuppgifter, kolla båda möjliga nycklarna från databasen
    // (Clearingnummer från JS-objektet, Clearingnumm om det är så det heter i DB-resultatet)
    document.getElementById("godmanEditProfilClearingnummer").value =
      profile.Clearingnummer || profile.Clearingnumm || "";
    document.getElementById("godmanEditProfilKontonummer").value = profile.Kontonummer || "";

    document.getElementById("godmanEditIsCurrentUser").checked =
      profile.IsCurrentUser === 1 || profile.IsCurrentUser === true;

    editForm.style.display = "block";
  } else {
    console.warn(`[PROFILER] Profil med ID ${profileId} hittades inte i 'allGodManProfiler'.`);
    clearGodManEditForm();
    editForm.style.display = "none";
  }
}

function clearGodManEditForm() {
  const editForm = document.getElementById("godmanProfileEditForm");
  if (!editForm) {
    console.error("[PROFILER] Redigeringsformulär 'godmanProfileEditForm' hittades inte.");
    return;
  }
  editForm.style.display = "block"; // Se till att formuläret visas om det var dolt

  document.getElementById("godmanEditProfilId").value = "";

  const idsToClear = [
    "godmanEditProfilFornamn",
    "godmanEditProfilEfternamn",
    "godmanEditProfilPersonnummer",
    "godmanEditProfilAdress",
    "godmanEditProfilPostnummer",
    "godmanEditProfilPostort",
    "godmanEditProfilTelefon",
    "godmanEditProfilMobil",
    "godmanEditProfilEpost",
    "godmanEditProfilClearingnummer", // Nytt fält
    "godmanEditProfilKontonummer", // Nytt fält
  ];

  idsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = "";
    } else {
      console.warn(`[clearGodManEditForm] Element med ID '${id}' hittades inte.`);
    }
  });

  const checkbox = document.getElementById("godmanEditIsCurrentUser");
  if (checkbox) {
    checkbox.checked = false;
  } else {
    console.warn("[clearGodManEditForm] Checkbox 'godmanEditIsCurrentUser' hittades inte.");
  }
  // Fokusera på första fältet kan vara bra för användarupplevelsen
  const fornamnInput = document.getElementById("godmanEditProfilFornamn");
  if (fornamnInput) {
    fornamnInput.focus();
  }
}
function createNewGodManProfile() {
  console.log("[PROFILER] createNewGodManProfile anropad.");
  if (godmanProfileChoicesInstance) {
    godmanProfileChoicesInstance.setChoiceByValue("");
  } else {
    const selectEl = document.getElementById("godmanProfileSelect"); // Korrigerat ID
    if (selectEl) selectEl.value = "";
  }
  if (typeof clearGodManEditForm === "function") {
    clearGodManEditForm();
    const fornamnInput = document.getElementById("godmanEditProfilFornamn");
    if (fornamnInput) fornamnInput.focus();
  } else {
    console.error("[PROFILER] Funktionen clearGodManEditForm är inte definierad!");
  }
}

async function saveGodManProfileChanges() {
  const profileIdFromForm = document.getElementById("godmanEditProfilId").value;
  const profileData = {
    Fornamn: document.getElementById("godmanEditProfilFornamn").value.trim(),
    Efternamn: document.getElementById("godmanEditProfilEfternamn").value.trim(),
    Personnummer: document.getElementById("godmanEditProfilPersonnummer").value.trim(),
    Adress: document.getElementById("godmanEditProfilAdress").value.trim(),
    Postnummer: document.getElementById("godmanEditProfilPostnummer").value.trim(),
    Postort: document.getElementById("godmanEditProfilPostort").value.trim(),
    Telefon: document.getElementById("godmanEditProfilTelefon").value.trim(),
    Mobil: document.getElementById("godmanEditProfilMobil").value.trim(),
    Epost: document.getElementById("godmanEditProfilEpost").value.trim(),
    IsCurrentUser: document.getElementById("godmanEditIsCurrentUser").checked ? 1 : 0,
    Clearingnummer: document.getElementById("godmanEditProfilClearingnummer").value.trim(),
    Kontonummer: document.getElementById("godmanEditProfilKontonummer").value.trim(),
  };
  if (!profileData.Fornamn || !profileData.Efternamn || !profileData.Personnummer) {
    alert("Förnamn, Efternamn och Personnummer är obligatoriska fält.");
    return;
  }

  // Bestäm URL och metod baserat på om vi uppdaterar eller skapar ny
  let url;
  let method;

  if (profileIdFromForm) {
    // Vi har ett ID, så vi ska uppdatera (PUT)
    url = `/api/save_godman_profile.php/${profileIdFromForm}`;
    method = "PUT";
  } else {
    // Inget ID, vi skapar en ny (POST)
    url = "/api/save_godman_profile.php";
    method = "POST";
  }

  console.log(`[PROFILER SPARA] Skickar ${method} till ${url} med data:`, JSON.stringify(profileData, null, 2));

  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });

    let result = {};
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error("Kunde inte tolka JSON-svar från servern:", await response.text());
      throw new Error("Servern gav ett oväntat svar.");
    }

    if (response.ok) {
      alert(result.message || "God Man-profil sparad!");
      await loadAllGodManProfiles();
      const savedId = result.id || profileIdFromForm;
      if (savedId && godmanProfileChoicesInstance) {
        godmanProfileChoicesInstance.setChoiceByValue(String(savedId));
      }
    } else {
      alert(`Kunde inte spara profil: ${result.error || response.statusText} (Status: ${response.status})`);
    }
  } catch (error) {
    console.error("Fel vid sparande av God Man-profil:", error);
    alert("Nätverksfel eller fel vid sparande av profil: ".concat(error.message));
  }
}

// --- ÅRSRÄKNINGS-FLIKEN ---
function displayPersonInfoForArsrakning() {
  const personInfoDiv = document.getElementById("personInfo");
  if (!personInfoDiv) {
    console.warn("Element 'personInfo' saknas för årsräkningsinfo.");
    return;
  }
  let periodStartText = "ej vald";
  let periodSlutText = "ej vald";
  const periodStartEl = document.getElementById("periodStart_ars");
  const periodSlutEl = document.getElementById("periodSlut_ars");
  if (periodStartEl) periodStartText = periodStartEl.value || "ej vald";
  if (periodSlutEl) periodSlutText = periodSlutEl.value || "ej vald";

  if (currentHuvudmanFullData && currentHuvudmanFullData.huvudmanDetails) {
    const hm = currentHuvudmanFullData.huvudmanDetails;
    const ofData = currentHuvudmanFullData.overformyndareDetails;
    const ofNamn = ofData?.Namn || (hm.OverformyndareId ? `ÖF ID: ${hm.OverformyndareId}` : "Ej angivet"); // Korrigerat från OverformyndareID
    personInfoDiv.innerHTML = `
            <h3>Huvudman: ${hm.Fornamn || ""} ${hm.Efternamn || ""} (${hm.Personnummer || ""})</h3>
            <p><strong>Period för årsräkning:</strong> ${periodStartText} till ${periodSlutText}</p>
            <p><strong>Överförmyndare:</strong> ${ofNamn}</p>
        `;
    personInfoDiv.style.display = "block";
  } else {
    personInfoDiv.innerHTML = `Ingen huvudman vald eller data saknas. Välj huvudman på "Huvudman"-fliken.<br>
                                   Period: ${periodStartText} till ${periodSlutText}`;
    personInfoDiv.style.display = "block";
  }
}

// --- UPPDATERAD handleFileSelect ---
async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman på 'Huvudman'-fliken innan du laddar upp en kontoutdragsfil.");
    document.getElementById("fileInput").value = ""; // Rensa filinput
    return;
  }

  // Nollställ tidigare transaktionsdata och saldon
  processedTransactions = [];
  currentFileStartSaldo = 0;
  currentFileSlutSaldo = 0;

  const reviewTbody = document.getElementById("reviewTable")?.querySelector("tbody");
  if (reviewTbody) reviewTbody.innerHTML = ""; // Rensa granskningstabellen

  const transactionCountEl = document.getElementById("transactionCount");
  if (transactionCountEl) transactionCountEl.textContent = "Läser fil...";

  const reportSection = document.getElementById("reportSection");
  if (reportSection) reportSection.classList.add("hidden");

  const balansDiv = document.getElementById("balans");
  if (balansDiv) {
    balansDiv.innerHTML = `<h3>Balanskontroll</h3><p>Laddar transaktioner...</p>`;
    balansDiv.style.display = "none";
  }

  const periodStart = document.getElementById("periodStart_ars").value;
  const periodSlut = document.getElementById("periodSlut_ars").value;
  if (!periodStart || !periodSlut) {
    alert("Välj en redovisningsperiod (både start- och slutdatum) på 'Årsräkning'-fliken innan du laddar upp filen.");
    document.getElementById("fileInput").value = "";
    if (transactionCountEl) transactionCountEl.textContent = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = async e => {
    const fileData = e.target.result;
    let rawDataRows = [];
    try {
      if (file.name.toLowerCase().endsWith(".xlsx")) {
        const workbook = XLSX.read(fileData, { type: "array" });
        rawDataRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
          header: 1,
          defval: "",
          rawNumbers: false,
        });
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        let csvText = "";
        try {
          csvText = new TextDecoder("utf-8").decode(new Uint8Array(fileData));
          if (csvText.includes("\uFFFD")) {
            // Om UTF-8 misslyckas, prova ISO-8859-1
            console.warn("UTF-8 avkodning misslyckades, provar ISO-8859-1");
            csvText = new TextDecoder("iso-8859-1").decode(new Uint8Array(fileData));
          }
        } catch (decodeError) {
          try {
            console.warn("Första avkodningsförsöket misslyckades, provar ISO-8859-1 direkt");
            csvText = new TextDecoder("iso-8859-1").decode(new Uint8Array(fileData));
          } catch (isoError) {
            alert("Filkodningen kunde inte bestämmas. Kontrollera att filen är UTF-8 eller ISO-8859-1.");
            if (transactionCountEl) transactionCountEl.textContent = "Fel filkodning.";
            return;
          }
        }
        if (csvText.charCodeAt(0) === 0xfeff) {
          // Ta bort BOM (Byte Order Mark) om den finns
          csvText = csvText.substring(1);
        }
        const parseResult = Papa.parse(csvText, { delimiter: ",", skipEmptyLines: true });
        if (parseResult.errors.length > 0) {
          console.error("PapaParse errors:", parseResult.errors);
          // Du kan välja att visa ett felmeddelande här om parsningsfel är kritiska
        }
        rawDataRows = parseResult.data;
      } else {
        alert("Filtypen stöds inte. Välj en .csv eller .xlsx fil.");
        if (transactionCountEl) transactionCountEl.textContent = "";
        return;
      }

      if (!rawDataRows || rawDataRows.length === 0) {
        alert("Kunde inte läsa data från filen, eller så var filen tom.");
        if (transactionCountEl) transactionCountEl.textContent = "";
        return;
      }

      const extractedData = parseBankData(rawDataRows, periodStart, periodSlut);

      if (!extractedData) {
        // Om parseBankData returnerar null/undefined
        alert("Kunde inte tolka bankdata från filen.");
        if (transactionCountEl) transactionCountEl.textContent = "Fel vid tolkning av bankdata.";
        return;
      }

      currentFileStartSaldo = extractedData.startSaldo || 0;
      currentFileSlutSaldo = extractedData.slutSaldo || 0;

      // Uppdatera räkningskontots saldon på Huvudman-fliken
      updateRakningskontoSaldoDisplay();

      if (!extractedData.transactions || extractedData.transactions.length === 0) {
        alert("Kunde inte identifiera några transaktioner för den valda perioden i filen.");
        if (transactionCountEl) transactionCountEl.textContent = "0 transaktioner för perioden.";
        calculateAndDisplayBalance(); // Visa balansen även om inga transaktioner
        if (reportSection) reportSection.classList.remove("hidden");
        if (document.getElementById("personInfo").style.display !== "none" && balansDiv)
          balansDiv.style.display = "block";
        document.getElementById("reviewBox")?.classList.add("hidden"); // Dölj granskningsboxen
        document.getElementById("exportBoxArsrakning")?.classList.add("hidden"); // Dölj exportboxen
        return;
      }

      processedTransactions = await autoCategorizeTransactions(extractedData.transactions);
      displayReviewTable();
      calculateAndDisplayBalance();

      if (reportSection) reportSection.classList.remove("hidden");
      document.getElementById("reviewBox")?.classList.remove("hidden");
      document.getElementById("exportBoxArsrakning")?.classList.remove("hidden");
      if (balansDiv) balansDiv.style.display = "block";
    } catch (error) {
      console.error("Fel vid bearbetning av fil i handleFileSelect:", error);
      alert(`Fel vid bearbetning av fil: ${error.message}`);
      if (reviewTbody) reviewTbody.innerHTML = "";
      if (transactionCountEl) transactionCountEl.textContent = "Fel vid inläsning.";
    }
  };
  reader.onerror = e => {
    console.error("FileReader error:", e);
    alert("Kunde inte läsa filen.");
    if (transactionCountEl) transactionCountEl.textContent = "";
  };
  reader.readAsArrayBuffer(file);
}

// ========================================================================
// ENHETER FÖR PARSNING AV BANKDATA
// ========================================================================

// --- identifierare ---
const bankIdentifierPatterns = {
  // Handelsbanken CSV (ny specifik kontroll baserad på din fil)
  Handelsbanken_CSV_New: dataRows => {
    if (!dataRows || dataRows.length === 0) return false;
    for (let i = 0; i < Math.min(dataRows.length, 15); i++) {
      const row = dataRows[i];
      if (Array.isArray(row)) {
        const lower = row.map(c =>
          String(c || "")
            .trim()
            .toLowerCase()
        );
        if (
          lower.length >= 5 &&
          lower[0] === "reskontradatum" &&
          lower[1] === "transaktionsdatum" &&
          lower[2] === "text" &&
          lower[3] === "belopp" &&
          lower[4] === "saldo"
        ) {
          return true;
        }
      }
    }
    return false;
  },
  // Swedbank CSV (ny identifiering baserat på din filstruktur)
  Swedbank_CSV: dataRows => {
    if (!dataRows || dataRows.length === 0) return false;
    const firstRowLower = dataRows[0].map(c =>
      String(c || "")
        .trim()
        .toLowerCase()
    );
    // Leta efter den övergripande raden som innehåller "Transaktioner Period"
    if (firstRowLower.join(";").includes("transaktioner period")) {
      return true;
    }
    return false;
  },
  // Nordea CSV (personkonto)
  Nordea_CSV: dataRows => {
    if (!dataRows || dataRows.length === 0) return false;
    const headerRow = dataRows[0] || [];
    const lowerHeader = headerRow.map(h =>
      String(h || "")
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase()
    );
    return (
      lowerHeader.includes("bokföringsdag") &&
      lowerHeader.includes("rubrik") &&
      lowerHeader.includes("belopp") &&
      lowerHeader.includes("saldo")
    );
  },
  // Handelsbanken XLSX (behåll om du har ett annat XLSX-format från dem)
  Handelsbanken_XLSX: dataRows => {
    if (!dataRows || dataRows.length === 0) return false;
    for (let i = 0; i < Math.min(dataRows.length, 15); i++) {
      const row = dataRows[i];
      if (Array.isArray(row)) {
        const lower = row.map(c =>
          String(c || "")
            .trim()
            .toLowerCase()
        );
        if (
          lower.includes("transaktionsdatum") &&
          lower.includes("text") &&
          !lower.includes("beskrivning") &&
          lower.includes("belopp") &&
          lower.includes("saldo")
        ) {
          return true;
        }
      }
    }
    return false;
  },
  // Lägg till fler identifierare här vid behov
};

/** Normalisera cell → gemener utan BOM/whitespace */
const norm = (c = "") => String(c).replace(/^﻿/, "").trim().replace(/^"|"$/g, "").toLowerCase();

/**
 * Delar upp en rad oavsett om Papa Parse redan splittrat den eller inte.
 * @param {Array|string} rawRow – Rad från Papa Parse eller sträng.
 * @returns {string[]} Array av normaliserade celler.
 */
function explodeRow(rawRow) {
  if (Array.isArray(rawRow)) {
    // Om det redan är en array (t.ex. från Papa Parse)
    if (rawRow.length === 1 && typeof rawRow[0] === "string" && rawRow[0].includes(",")) {
      // Om Papa Parse misslyckades med att detektera kommatecken som avgränsare
      return rawRow[0].split(",").map(norm);
    }
    return rawRow.map(norm);
  }
  // Om det är en ren sträng (t.ex. från fil-läsning utan Papa)
  // Försök dela med semikolon eller komma
  return String(rawRow).split(/[;,]/).map(norm);
}

// --- PARSARE FÖR BANKDATA ---
function parseBankData(dataRows, periodStartUser, periodSlutUser) {
  console.log(
    `[parseBankData] Startar. Parsar data för period: ${periodStartUser} till ${periodSlutUser}. Antal rader in: ${dataRows.length}`
  );

  const bankType = identifyBank(dataRows);
  console.log(`[parseBankData] Identifierad banktyp: ${bankType}`);

  const allParsedTransactions = [];

  // ───────────────────────────────────────────────────────────────
  switch (bankType) {
    // -----------------------------------------------------------
    // Handelsbanken (nytt CSV‑format)
    // -----------------------------------------------------------
    case "Handelsbanken_CSV_New": {
      console.log("--- [parseBankData] Kör Handelsbanken CSV Parser (Nytt format) ---");
      let handCsvHeaderRowIndex = -1;
      // Sök efter rubrikraden bland de första 15 raderna
      for (let i = 0; i < Math.min(dataRows.length, 15); i++) {
        const row = dataRows[i];
        if (!Array.isArray(row) || row.length < 5) continue; // Hoppa om det inte är en giltig rad

        const rowLower = row.map(h =>
          String(h || "")
            .trim()
            .toLowerCase()
        );
        // Kontrollera om rubrikerna matchar de förväntade
        if (
          rowLower.length >= 5 &&
          rowLower[0] === "reskontradatum" &&
          rowLower[1] === "transaktionsdatum" &&
          rowLower[2] === "text" &&
          rowLower[3] === "belopp" &&
          rowLower[4] === "saldo"
        ) {
          handCsvHeaderRowIndex = i;
          break;
        }
      }

      if (handCsvHeaderRowIndex !== -1) {
        console.log(`  [parseBankData] Handelsbanken CSV: Rubrikrad funnen på index ${handCsvHeaderRowIndex}`);
        // Definiera kolumnindexen baserat på rubrikradens struktur
        const reskontradatumIdx = 0; // Används inte aktivt, men för referens
        const transdatumIdx = 1; // Primärt datum att sortera och filtrera på
        const textIdx = 2; // Beskrivning av transaktionen
        const beloppIdx = 3; // Beloppet
        const saldoIdx = 4; // Saldot efter transaktionen

        // Iterera över raderna efter rubrikraden
        for (let i = handCsvHeaderRowIndex + 1; i < dataRows.length; i++) {
          const row = dataRows[i];
          // Hoppa över rader som inte är giltiga eller har för få kolumner
          if (!Array.isArray(row) || row.length < Math.max(transdatumIdx, textIdx, beloppIdx) + 1) {
            // console.warn(`  [parseBankData] Handelsbanken CSV: Skippar rad ${i + 1} (fel format eller för få kolumner)`);
            continue;
          }

          let dateStr = String(row[transdatumIdx] || "").trim();
          const text = String(row[textIdx] || "").trim();
          const amountStrRaw = String(row[beloppIdx] || "").trim();
          const saldoEfterStrRaw = String(row[saldoIdx] || "").trim();

          // Validera datumformatet (YYYY-MM-DD)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            // Försök konvertera om datumet ser ut som en Excel-datum såsiffra (t.ex. 45000+)
            const excelDateNum = parseFloat(dateStr);
            if (!isNaN(excelDateNum) && excelDateNum > 1) {
              // Enklare datum som 1 är 1970-01-01
              try {
                dateStr = convertExcelDate(excelDateNum); // Använd hjälpfunktionen
              } catch (e) {
                console.warn(
                  `  [parseBankdata] Handelsbanken CSV: Kunde inte konvertera Excel-datum '${dateStr}' på rad ${
                    i + 1
                  }.`,
                  e
                );
                continue; // Skippa raden om datum är ogiltigt
              }
            } else {
              // console.warn(`  [parseBankData] Handelsbanken CSV: Ogiltigt datumformat på rad ${i + 1}: '${dateStr}'. Skippar.`);
              continue;
            }
          }

          // Försök parsa belopp och saldo om de finns
          if (text && amountStrRaw) {
            const cleanedAmountStr = amountStrRaw.replace(/\s/g, "").replace(",", ".");
            const cleanedSaldoStr = saldoEfterStrRaw.replace(/\s/g, "").replace(",", ".");

            const amount = parseFloat(cleanedAmountStr);
            const saldoEfter = parseFloat(cleanedSaldoStr);

            if (!isNaN(amount)) {
              // Lägg till transaktionen om beloppet är ett giltigt nummer
              allParsedTransactions.push({
                datum: dateStr,
                text: text,
                belopp: amount,
                saldoEfter: isNaN(saldoEfter) ? null : saldoEfter, // Sätt till null om saldo är ogiltigt
              });
            } else {
              // console.warn(`  [parseBankData] Handelsbanken CSV: Kunde inte tolka belopp på rad ${i + 1}: '${amountStrRaw}' (rensat: '${cleanedAmountStr}')`);
            }
          }
        }
      } else {
        console.warn("[parseBankData] Handelsbanken CSV (Nytt format): Rubrikrad ej funnen. Kan inte parsa.");
      }
      break;
    }

    // -----------------------------------------------------------
    // Swedbank CSV
    // -----------------------------------------------------------
    case "Swedbank_CSV": {
      console.log("--- [parseBankData] Kör Swedbank CSV Parser ---");
      // Eftersom Swedbank CSV har en unik första rad som INTE är rubrik,
      // och rubrikerna är specificerade till fasta index, sätter vi startIndex till 1.
      const startIndex_SC = 1;

      // Definiera korrekta kolumnindex för Swedbank CSV baserat på din fil
      const datumIdx_SC = 5, // Bokföringsdag
        textIdx_SC = 9, // Beskrivning
        beloppIdx_SC = 10, // Belopp
        saldoIdx_SC = 11; // Bokfört saldo

      console.log(
        `  [Swedbank CSV] Använder index: Datum=${datumIdx_SC}, Text=${textIdx_SC}, Belopp=${beloppIdx_SC}, Saldo=${saldoIdx_SC}`
      );

      // Iterera över raderna från index 1 (efter den första informationsraden)
      for (let i = startIndex_SC; i < dataRows.length; i++) {
        const row = dataRows[i];
        // Kontrollera att raden är giltig och har tillräckligt med kolumner
        if (!Array.isArray(row) || row.length <= Math.max(datumIdx_SC, textIdx_SC, beloppIdx_SC, saldoIdx_SC)) {
          // console.warn(`  [Swedbank CSV] Skippar rad ${i + 1} (fel format eller för få kolumner).`);
          continue;
        }

        let dateStr = String(row[datumIdx_SC] || "");
        const text = String(row[textIdx_SC] || "").trim();
        const amountStr = String(row[beloppIdx_SC] || "");
        const saldoEfterStr = String(row[saldoIdx_SC] || "");

        // Hantera datumformat som kan innehålla tid eller '/' istället för '-'
        if (dateStr.includes("/")) dateStr = dateStr.replace(/\//g, "-");
        // Försök få datumet till YYYY-MM-DD format
        const dateParts = dateStr.split(/[- ]/); // Dela på '-' eller mellanslag (om det finns tid)
        if (dateParts.length >= 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]);
          const day = parseInt(dateParts[2]);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            dateStr = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(
              2,
              "0"
            )}`;
          } else {
            console.warn(`  [Swedbank CSV] Kunde inte tolka datumkomponenter på rad ${i + 1}: '${dateStr}'`);
            continue; // Skippa om datum inte kan tolkas
          }
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          // Om det inte är YYYY-MM-DD efter eventuell ersättning
          console.warn(`  [Swedbank CSV] Ogiltigt datumformat på rad ${i + 1}: '${dateStr}'. Skippar.`);
          continue;
        }
        if (!dateStr) continue; // Om datumet blev tomt efter rensning

        // Parsa belopp och saldo om de finns
        if (text && amountStr && amountStr.trim() !== "") {
          const amount = parseFloat(amountStr.replace(/\s/g, "").replace(",", "."));
          const saldoEfter = saldoEfterStr ? parseFloat(saldoEfterStr.replace(/\s/g, "").replace(",", ".")) : NaN;
          if (!isNaN(amount)) {
            allParsedTransactions.push({
              datum: dateStr,
              text: text,
              belopp: amount,
              saldoEfter: isNaN(saldoEfter) ? null : saldoEfter,
            });
          }
        }
      }
      break; // Avsluta Swedbank CSV-fallet
    }

    // -----------------------------------------------------------
    // Nordea CSV (personkonto)
    // -----------------------------------------------------------
    case "Nordea_CSV": {
      console.log("--- [parseBankData] Kör Nordea CSV Parser ---");
      let nordeaHeaderFound = false;
      let bokfDatumIdx = 0,
        beloppIdx = 1,
        textIdx = 5,
        saldoIdx = 6; // Default index om ingen rubrik hittas

      // Försök identifiera rubrikraden och kolumnindexen dynamiskt
      if (dataRows.length > 0 && Array.isArray(dataRows[0])) {
        const headerRow = dataRows[0];
        const lowerHeader = headerRow.map(h =>
          String(h || "")
            .replace(/^\uFEFF/, "")
            .trim()
            .toLowerCase()
        ); // Ta bort BOM och trimma

        // Hitta index för de nödvändiga kolumnerna
        const fdIdx = lowerHeader.findIndex(h => h.includes("bokföringsdag")); // Finns bokföringsdag?
        const fbIdx = lowerHeader.findIndex(h => h.includes("belopp")); // Finns belopp?
        // Leta efter text-relaterade rubriker (kan variera)
        const ftIdx = lowerHeader.findIndex(
          h => h.includes("rubrik") || h.includes("text") || h.includes("beskrivning")
        );
        const fsIdx = lowerHeader.findIndex(h => h.includes("saldo")); // Finns saldo?

        // Kontrollera att vi hittade allt och att ordningen verkar rimlig (t.ex. belopp före text)
        if (fdIdx !== -1 && fbIdx !== -1 && ftIdx !== -1 && fsIdx !== -1 && fbIdx < ftIdx) {
          nordeaHeaderFound = true;
          bokfDatumIdx = fdIdx;
          beloppIdx = fbIdx;
          textIdx = ftIdx;
          saldoIdx = fsIdx;
        }
      }

      const startIndex = nordeaHeaderFound ? 1 : 0; // Börja efter rubrikraden om den hittades
      if (!nordeaHeaderFound) {
        console.warn(
          "[Nordea CSV] Kunde inte identifiera rubrikraden dynamiskt. Försöker med standardkolumner (0:Datum, 1:Belopp, 5:Text, 6:Saldo)."
        );
      }

      for (let i = startIndex; i < dataRows.length; i++) {
        const row = dataRows[i];
        // Kontrollera att raden är giltig och har tillräckligt med kolumner för våra index
        if (!Array.isArray(row) || row.length <= Math.max(bokfDatumIdx, beloppIdx, textIdx, saldoIdx)) continue;

        let dateStr = String(row[bokfDatumIdx] || "");
        const text = String(row[textIdx] || "").trim();
        const amountStr = String(row[beloppIdx] || "");
        const saldoEfterStr = saldoIdx !== -1 && row.length > saldoIdx ? String(row[saldoIdx] || "") : null; // Hantera om saldokolumn saknas

        // Normalisera datumformatet (hantera '/', '.' och ev. tid)
        if (dateStr.includes("/")) dateStr = dateStr.replace(/\//g, "-");
        if (dateStr.includes(".")) dateStr = dateStr.replace(/\./g, "-");
        dateStr = dateStr.split(" ")[0]; // Ta bort ev. tid

        // Validera datumformatet
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          // Försök hantera om datumet är ett Excel-tal
          const excelDateNum = parseFloat(dateStr);
          if (!isNaN(excelDateNum) && excelDateNum > 1) {
            try {
              dateStr = convertExcelDate(excelDateNum);
            } catch (e) {
              console.warn(`  [Nordea CSV] Kunde inte konvertera Excel-datum '${dateStr}' på rad ${i + 1}.`, e);
              continue;
            }
          } else {
            // console.warn(`  [Nordea CSV] Ogiltigt datumformat på rad ${i + 1}: '${dateStr}'. Skippar.`);
            continue;
          }
        }
        if (!dateStr) continue; // Om datumet blev tomt efter rensning

        // Parsa belopp och saldo om de finns
        if (text && amountStr && amountStr.trim() !== "") {
          const amount = parseFloat(amountStr.replace(/\s/g, "").replace(",", "."));
          const saldoEfter = saldoEfterStr ? parseFloat(saldoEfterStr.replace(/\s/g, "").replace(",", ".")) : NaN;
          if (!isNaN(amount)) {
            allParsedTransactions.push({
              datum: dateStr,
              text: text,
              belopp: amount,
              saldoEfter: isNaN(saldoEfter) ? null : saldoEfter,
            });
          }
        }
      }
      break;
    }

    // -----------------------------------------------------------
    // DEFAULT/FALLBACK: Generisk CSV-parser om inget annat matchar
    // -----------------------------------------------------------
    default:
      console.warn(
        `--- [parseBankData] Okänd banktyp "${bankType}". Försöker med generisk CSV (Datum=0, Text=1, Belopp=2, Saldo=3). ---`
      );
      // Försök att parsa med enklare, standardindex om ingen annan bank identifierats
      const GENERIC_DATUM_IDX = 0;
      const GENERIC_TEXT_IDX = 1;
      const GENERIC_BELOPP_IDX = 2;
      const GENERIC_SALDO_IDX = 3; // Antar saldo är kolumn 3 om det finns

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!Array.isArray(row) || row.length <= Math.max(GENERIC_DATUM_IDX, GENERIC_TEXT_IDX, GENERIC_BELOPP_IDX))
          continue;

        let dateStr = String(row[GENERIC_DATUM_IDX] || "");
        const text = String(row[GENERIC_TEXT_IDX] || "").trim();
        const amountStr = String(row[GENERIC_BELOPP_IDX] || "");
        const saldoEfterStr = row.length > GENERIC_SALDO_IDX ? String(row[GENERIC_SALDO_IDX] || "") : null;

        if (dateStr.includes("/")) dateStr = dateStr.replace(/\//g, "-");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const excelDateNum = parseFloat(dateStr); // Försök konvertera Excel-datum
          if (!isNaN(excelDateNum) && excelDateNum > 1) {
            try {
              dateStr = convertExcelDate(excelDateNum);
            } catch (e) {
              console.warn(`  [Generic CSV] Kunde inte konvertera Excel-datum '${dateStr}' på rad ${i + 1}.`, e);
              continue;
            }
          } else {
            // console.warn(`  [Generic CSV] Ogiltigt datumformat på rad ${i + 1}: '${dateStr}'. Skippar.`);
            continue;
          }
        }
        if (!dateStr) continue;

        if (text && amountStr && amountStr.trim() !== "") {
          const amount = parseFloat(amountStr.replace(/\s/g, "").replace(",", "."));
          const saldoEfter = saldoEfterStr ? parseFloat(saldoEfterStr.replace(/\s/g, "").replace(",", ".")) : NaN;
          if (!isNaN(amount)) {
            allParsedTransactions.push({
              datum: dateStr,
              text: text,
              belopp: amount,
              saldoEfter: isNaN(saldoEfter) ? null : saldoEfter,
            });
          }
        }
      }
      break; // Avsluta generiskt fall
  } // Slut på switch(bankType)

  // ───────────────────────────────────────────────────────────────
  // --- Slutlig bearbetning av alla transaktioner ---

  // Om inga transaktioner kunde parsas, returnera tomt resultat
  if (allParsedTransactions.length === 0) {
    console.error("[parseBankData] Inga transaktioner kunde läsas från filen.");
    return { bank: bankType, transactions: [], startSaldo: 0, slutSaldo: 0 };
  }

  // Sortera alla transaktioner kronologiskt efter datum.
  // Om datum är samma, sortera efter belopp för att få den "senaste" transaktionen först om det är samma dag.
  allParsedTransactions.sort((a, b) => {
    const dateDiff = new Date(a.datum) - new Date(b.datum);
    if (dateDiff !== 0) return dateDiff; // Sortera primärt på datum
    // Sekundär sortering: Om datum är lika, sortera efter belopp (positivt först, sedan negativt)
    // Detta är en gissning för att få den "sista" transaktionen på dagen först vid samma datum
    return b.belopp - a.belopp;
  });

  // --- Beräkna start- och slutsaldo för den angivna perioden ---
  let saldoImmediatelyBeforePeriod = null; // Saldot precis före periodens start
  let firstTransactionInPeriod = null; // Första transaktionen som hittades inom perioden
  const periodTransactions = []; // Transaktioner som faktiskt tillhör perioden

  for (const tr of allParsedTransactions) {
    // Om transaktionen är före perioden
    if (tr.datum < periodStartUser) {
      // Om saldot efter denna transaktion är känt, spara det som det senaste kända saldot före perioden
      if (tr.saldoEfter !== null && !isNaN(tr.saldoEfter)) {
        saldoImmediatelyBeforePeriod = tr.saldoEfter;
      }
    }
    // Om transaktionen är inom perioden (inklusive start- och slutdatum)
    else if (tr.datum >= periodStartUser && tr.datum <= periodSlutUser) {
      // Spara den första transaktionen i perioden om den inte redan är sparad
      if (!firstTransactionInPeriod) {
        firstTransactionInPeriod = tr;
      }
      // Lägg till transaktionen i vår period-lista
      periodTransactions.push({
        id: `p-${bankType}-${tr.datum}-${Math.random().toString(16).slice(2)}`, // Skapa ett unikt ID för front-end
        datum: tr.datum,
        text: tr.text,
        belopp: tr.belopp,
        ursprungligtBelopp: tr.belopp, // Spara ursprungligt belopp för justeringar
        kategori: "Okategoriserat", // Default kategori
        inlärd: false, // Flagga om kategorin är "inlärd"
        justeringar: {}, // Objekt för eventuella justeringar
      });
    }
    // Om transaktionen är efter perioden
    else if (tr.datum > periodSlutUser) {
      // Om vi redan har ett känt saldo som var före perioden, kan vi sluta iterera
      // Annars, om vi ännu inte hittat ett saldo före perioden, fortsätt för att se om vi hittar ett senare.
      if (saldoImmediatelyBeforePeriod !== null) {
        break;
      }
    }
  }

  // Beräkna start- och slutsaldo baserat på hittad data
  let calculatedStartSaldoForPeriod = 0;

  if (firstTransactionInPeriod) {
    // Om vi hittade transaktioner inom perioden
    if (saldoImmediatelyBeforePeriod !== null) {
      // Om vi hade ett saldo före perioden, använd det
      calculatedStartSaldoForPeriod = saldoImmediatelyBeforePeriod;
    } else if (firstTransactionInPeriod.saldoEfter !== null && !isNaN(firstTransactionInPeriod.saldoEfter)) {
      // Om ingen saldo före, men första transaktionen i perioden har saldo efter,
      // så är start-saldot det saldot minus beloppet för den första transaktionen.
      calculatedStartSaldoForPeriod = firstTransactionInPeriod.saldoEfter - firstTransactionInPeriod.belopp;
    } else {
      // Om varken saldo före eller saldo efter första transaktionen är känt,
      // anta 0 som startsaldo och ge en varning.
      console.warn(
        "[parseBankData] Kunde inte bestämma ett tillförlitligt startSaldo för perioden från filen. Sätter till 0."
      );
      calculatedStartSaldoForPeriod = 0;
    }
  } else {
    // Om det inte fanns några transaktioner alls inom perioden
    if (saldoImmediatelyBeforePeriod !== null) {
      // Använd det senaste kända saldot FÖRE perioden om det finns
      calculatedStartSaldoForPeriod = saldoImmediatelyBeforePeriod;
    } else if (
      allParsedTransactions.length > 0 &&
      allParsedTransactions[0].saldoEfter !== null &&
      !isNaN(allParsedTransactions[0].saldoEfter)
    ) {
      // Om inga transaktioner före perioden, och första transaktionen i HELA filen har saldo efter,
      // beräkna start-saldot som det saldot minus SUMMAN av alla transaktioner FÖRE perioden.
      // Detta kan vara mer korrekt om exporten inte innehåller data före periodstart.
      // (Mer avancerat: behöver summera beloppen FÖRE periodStart för en exakt beräkning)
      // För nu, låt oss bara använda ett enklare antagande:
      calculatedStartSaldoForPeriod = allParsedTransactions[0].saldoEfter - allParsedTransactions[0].belopp; // Enklare antagande
      console.warn(
        "[parseBankData] Ingen transaktion i perioden, men första transaktionen i filen hade saldo. Försöker beräkna startsaldo."
      );
    } else if (
      allParsedTransactions.length > 0 &&
      allParsedTransactions[allParsedTransactions.length - 1].saldoEfter !== null &&
      !isNaN(allParsedTransactions[allParsedTransactions.length - 1].saldoEfter)
    ) {
      // Om ingen saldo alls har hittats, använd det sista saldot som finns i filen.
      // Detta är också en gissning och kan vara felaktigt.
      calculatedStartSaldoForPeriod = allParsedTransactions[allParsedTransactions.length - 1].saldoEfter;
      console.warn(
        "[parseBankData] Inga transaktioner i perioden och inget tidigare saldo hittat. Använder sista saldot i filen som startsaldo."
      );
    } else {
      console.warn(
        "[parseBankData] Inga transaktioner i perioden och inget tidigare saldo hittat. Sätter startSaldo till 0."
      );
      calculatedStartSaldoForPeriod = 0; // Fallback
    }
  }

  // Beräkna slut-saldot baserat på start-saldot och periodens transaktioner
  let summaPeriodTransaktioner = 0;
  periodTransactions.forEach(pt => {
    summaPeriodTransaktioner += pt.belopp;
  });
  const calculatedSlutSaldoForPeriod = parseFloat(
    (calculatedStartSaldoForPeriod + summaPeriodTransaktioner).toFixed(2)
  ); // Avrunda till 2 decimaler

  console.log(
    `[parseBankData] Periodparsning klar. Bank: ${bankType}, Transaktioner i period: ${periodTransactions.length}. Beräknat Ing. Saldo: ${calculatedStartSaldoForPeriod}, Beräknat Utg. Saldo: ${calculatedSlutSaldoForPeriod}`
  );

  return {
    bank: bankType,
    transactions: periodTransactions,
    startSaldo: calculatedStartSaldoForPeriod,
    slutSaldo: calculatedSlutSaldoForPeriod,
  };
}

/**
 * Identifierar vilken typ av bankfil som har laddats.
 * @param {Array<Array<string>>} dataRows – De lästa raderna från filen.
 * @returns {string} – Namnet på banktypen (t.ex. 'Swedbank_CSV', 'Nordea_CSV') eller 'Generisk_CSV'.
 */
function identifyBank(dataRows) {
  if (!dataRows || dataRows.length === 0) {
    console.log("[identifyBank] Ingen data eller tomma rader mottagna.");
    return "Okänd";
  }

  // --- Testa Swedbank CSV ---
  if (bankIdentifierPatterns.Swedbank_CSV(dataRows)) {
    console.log("[identifyBank] Identifierad som Swedbank_CSV.");
    return "Swedbank_CSV";
  }

  // --- Testa Handelsbanken CSV (Nytt format) ---
  if (bankIdentifierPatterns.Handelsbanken_CSV_New(dataRows)) {
    console.log("[identifyBank] Identifierad som Handelsbanken_CSV_New.");
    return "Handelsbanken_CSV_New";
  }

  // --- Testa Nordea CSV (Personkonto) ---
  if (bankIdentifierPatterns.Nordea_CSV(dataRows)) {
    console.log("[identifyBank] Identifierad som Nordea_CSV.");
    return "Nordea_CSV";
  }

  // --- Testa Handelsbanken XLSX (Alternativt format) ---
  if (bankIdentifierPatterns.Handelsbanken_XLSX(dataRows)) {
    console.log("[identifyBank] Identifierad som Handelsbanken_XLSX.");
    return "Handelsbanken_XLSX";
  }

  // --- Fallback: Generisk CSV-parser om inget annat matchar ---
  console.warn(`[identifyBank] Ingen specifik bank identifierad. Försöker med Generisk_CSV.`);
  return "Generisk_CSV";
}
// --- HJÄLPAKTÖRER FÖR Datum & Nummer ---

/**
 * Konverterar ett Excel-datum (tal) till ett YYYY-MM-DD-format.
 * @param {number} excelDate – Datumet som ett tal (t.ex. 45000).
 * @returns {string|null} Datumet i YYYY-MM-DD-format, eller null vid fel.
 */
function convertExcelDate(excelDate) {
  // Excel lagrar datum som antal dagar sedan 1899-12-30 (på grund av en bugg i gamla system)
  // 1899-12-30 är dag 0 för Excel.
  const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30 är månad 11 i JS Dates (december är 11)
  const millisecondsPerDay = 86400 * 1000;

  // Excel har problem med skottår, särskilt runt 1900.
  // Om datumet är 60 eller högre och före 1900-03-01, subtrahera en dag.
  // Detta är för att hantera Excel's felaktiga behandling av 1900 som skottår.
  let dateOffset = excelDate;
  if (excelDate >= 60) {
    dateOffset -= 1;
  }

  const date = new Date(excelEpoch.getTime() + dateOffset * millisecondsPerDay);

  // Kontrollera om konverteringen blev korrekt
  if (isNaN(date.getTime())) {
    console.error("Kunde inte konvertera Excel-datum:", excelDate);
    return null;
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0"); // Månader är 0-indexerade
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Formaterar ett nummer för visning i PDF, med två decimaler och svensk formatering.
 * Använder endast heltal för vissa fält, annars två decimaler.
 * @param {*} amount – Värdet som ska formateras.
 * @param {boolean} useTwoDecimals – Om två decimaler ska visas.
 * @returns {string} – Formaterat belopp som sträng, eller tom sträng om ogiltigt.
 */
function formatCurrencyForPdf(amount, useTwoDecimals = true) {
  if (amount === null || amount === undefined || String(amount).trim() === "") {
    return "";
  }
  const cleanedString = String(amount).replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleanedString);

  if (isNaN(num)) {
    return "";
  }

  if (useTwoDecimals) {
    return num.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    // För heltal (t.ex. saldo)
    return Math.round(num).toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
}

function convertExcelDate(excelDate) {
  if (typeof excelDate === "number" && excelDate > 1) {
    const jsDate = new Date((excelDate - 25569) * 86400 * 1000);
    const year = jsDate.getFullYear();
    const month = String(jsDate.getMonth() + 1).padStart(2, "0");
    const day = String(jsDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } else if (typeof excelDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(excelDate)) {
    return excelDate.split(" ")[0];
  }
  return null;
}
async function autoCategorizeTransactions(transactions) {
  const rules = await fetchRules();
  console.log("[AutoCategorize] Använder", rules ? rules.length : 0, "regler.");

  const categorized = transactions.map(tr => {
    let newCategoryKey = "Okategoriserat";
    const transactionTextLower = (tr.text || "").trim().toLowerCase();
    const transactionAmount = tr.belopp || 0;

    if (!tr || typeof tr.text !== "string") {
      return { ...tr, kategori: "Okategoriserat" };
    }

    if (rules && rules.length > 0 && transactionTextLower) {
      const sortedRules = [...rules].sort((a, b) => (b.Prioritet || 0) - (a.Prioritet || 0));

      for (const rule of sortedRules) {
        const matchTextLower = (rule.MatchningsText || "").trim().toLowerCase();
        const ruleMatchTypLower = (rule.MatchningsTyp || "").toLowerCase();

        if (!matchTextLower || !ruleMatchTypLower) continue;

        let match = false;
        if (ruleMatchTypLower === "innehåller" && transactionTextLower.includes(matchTextLower)) match = true;
        else if (ruleMatchTypLower === "exakt" && transactionTextLower === matchTextLower) match = true;
        else if (ruleMatchTypLower === "börjarmed" && transactionTextLower.startsWith(matchTextLower)) match = true;
        else if (ruleMatchTypLower === "slutarmed" && transactionTextLower.endsWith(matchTextLower)) match = true;

        if (match) {
          if (ALL_KATEGORIER[rule.Kategori]) {
            newCategoryKey = rule.Kategori;
          }
          break;
        }
      }
    }

    // Justera för överföringar
    if (newCategoryKey === "ÖverföringEgetKontoIn" || newCategoryKey === "ÖverföringEgetKontoUt") {
      if (transactionAmount > 0) newCategoryKey = "ÖverföringEgetKontoIn";
      else if (transactionAmount < 0) newCategoryKey = "ÖverföringEgetKontoUt";
    }
    return { ...tr, kategori: newCategoryKey };
  });
  return categorized;
}
async function fetchRules() {
  try {
    const response = await fetch("/api/get_rules.php");
    if (response.ok) {
      const fetchedRules = await response.json(); // Hämta reglerna
      console.log("[RULES] Regler hämtade från server:", JSON.stringify(fetchedRules, null, 2)); // Logga vad som kom
      return fetchedRules; // Returnera dem
    } else {
      console.error("[RULES] Fel vid hämtning av regler från server:", response.status, response.statusText);
    }
  } catch (e) {
    console.error("[RULES] Nätverksfel eller JS-fel vid hämtning av regler:", e);
  }
  return []; // Returnera tom array vid fel
}

function displayReviewTable() {
  const tbody = document.getElementById("reviewTable")?.querySelector("tbody");
  if (!tbody) {
    console.warn("Element #reviewTable tbody hittades inte för att visa transaktioner.");
    return;
  }
  tbody.innerHTML = ""; // Rensa befintliga rader
  const filterValue = document.getElementById("kategoriFilter").value;

  // Logga hela processedTransactions som displayReviewTable ser den
  // Använder JSON.parse(JSON.stringify(...)) för att få en "djup kopia" för loggning,
  // så att vi ser tillståndet exakt när funktionen anropas.
  console.log(
    "[DisplayReviewTable] processedTransactions som används:",
    JSON.parse(JSON.stringify(processedTransactions))
  );

  const filteredTransactions = processedTransactions.filter(tr => {
    if (filterValue === "alla") return true;
    if (filterValue === "okategoriserat") return tr.kategori === "Okategoriserat";
    if (filterValue === "justerbara") return ALL_KATEGORIER[tr.kategori] && ALL_KATEGORIER[tr.kategori].justerbar;
    return tr.kategori === filterValue; // Detta filtrerar på KATEGORI-NYCKELN
  });

  if (filteredTransactions.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4; // Antal kolumner i din tabell
    cell.textContent = "Inga transaktioner att visa för det valda filtret.";
    cell.style.textAlign = "center";
    cell.style.fontStyle = "italic";
  } else {
    filteredTransactions.forEach(tr => {
      // Logga kategorin för den specifika transaktionen som ska visas
      console.log(
        `  [DisplayReviewTable] Visar trans: "${tr.text}", Kategori från processedTransactions: "${tr.kategori}"`
      );

      const row = tbody.insertRow();
      row.insertCell().textContent = tr.datum;
      row.insertCell().textContent = tr.text;
      const beloppCell = row.insertCell();
      beloppCell.textContent = formatCurrencyForPdf(tr.belopp);
      beloppCell.style.textAlign = "right";

      const kategoriCell = row.insertCell();
      kategoriCell.className = "category-cell"; // Behåll klassen om du har specifik styling
      const select = document.createElement("select");
      select.dataset.transactionId = tr.id; // För att identifiera transaktionen vid ändring

      // console.log(`    [Select For "${tr.text}"] Ska sätta vald kategori till: "${tr.kategori}" (Nyckel)`);

      const sortedKategoriKeys = Object.keys(ALL_KATEGORIER).sort((a, b) => {
        if (ALL_KATEGORIER[a].namn < ALL_KATEGORIER[b].namn) return -1;
        if (ALL_KATEGORIER[a].namn > ALL_KATEGORIER[b].namn) return 1;
        return 0;
      });

      let foundSelectedInDropdown = false;
      sortedKategoriKeys.forEach(key_from_all_kategorier => {
        // Byt namn på variabeln för tydlighet
        const option = document.createElement("option");
        option.value = key_from_all_kategorier;
        option.textContent = ALL_KATEGORIER[key_from_all_kategorier].namn;

        if (key_from_all_kategorier === tr.kategori) {
          option.selected = true;
          foundSelectedInDropdown = true;
          // console.log(`      [Select For "${tr.text}"] VALD: key="${key_from_all_kategorier}", tr.kategori="${tr.kategori}", option.text="${option.textContent}"`);
        }
        select.appendChild(option);
      });

      if (!foundSelectedInDropdown && tr.kategori !== "Okategoriserat") {
        console.warn(
          `      [Select For "${tr.text}"] HITTADE INTE kategori-nyckeln "${tr.kategori}" bland ALL_KATEGORIER-nycklarna för att sätta selected. Kontrollera att "${tr.kategori}" är en giltig nyckel i ALL_KATEGORIER.`
        );
        // Om tr.kategori är en giltig nyckel men ändå inte hittas, kan det vara ett skiftlägesproblem
        // eller att nyckeln saknas i sortedKategoriKeys av någon anledning.
        // Försök sätta till Okategoriserat om den finns, annars första alternativet.
        const okategoriseratOption = select.querySelector('option[value="Okategoriserat"]');
        if (okategoriseratOption) {
          okategoriseratOption.selected = true;
        } else if (select.options.length > 0) {
          select.options[0].selected = true;
        }
      } else if (!foundSelectedInDropdown && tr.kategori === "Okategoriserat") {
        // Om kategorin ÄR Okategoriserat och den inte valdes, försök välja den explicit
        const okategoriseratOption = select.querySelector('option[value="Okategoriserat"]');
        if (okategoriseratOption) {
          okategoriseratOption.selected = true;
        }
      }

      select.addEventListener("change", e => {
        updateTransactionCategory(e.target.dataset.transactionId, e.target.value);
      });
      kategoriCell.appendChild(select);

      if (tr.inlärd) {
        const learnedSpan = document.createElement("span");
        learnedSpan.className = "learned-indicator";
        learnedSpan.textContent = " (Inlärd)";
        learnedSpan.style.fontSize = "0.8em";
        learnedSpan.style.fontStyle = "italic";
        kategoriCell.appendChild(learnedSpan);
      }

      if (ALL_KATEGORIER[tr.kategori] && ALL_KATEGORIER[tr.kategori].justerbar) {
        const adjustButton = document.createElement("button");
        adjustButton.textContent = "Justera";
        adjustButton.className = "small";
        adjustButton.style.marginLeft = "5px";
        adjustButton.onclick = () => openAdjustmentModal(tr.id);
        kategoriCell.appendChild(adjustButton);
      }
    });
  }
  const transactionCountEl = document.getElementById("transactionCount");
  if (transactionCountEl) {
    transactionCountEl.textContent = `Visar ${tbody.rows.length} av ${processedTransactions.length} transaktioner.`;
  }
}
async function updateTransactionCategory(transactionId, newCategoryKey) {
  const transaction = processedTransactions.find(t => t.id === transactionId);
  if (!transaction) return;

  const oldCategoryKey = transaction.kategori;
  if (oldCategoryKey === newCategoryKey) return;

  const transactionText = (transaction.text || "").trim();

  // Om det är en meningsfull ändring, visa vår anpassade modal
  if (newCategoryKey !== "Okategoriserat" && transactionText) {
    const categoryDisplayName = ALL_KATEGORIER[newCategoryKey]?.namn || newCategoryKey;

    // Hämta element från vår nya modal
    const modal = document.getElementById("ruleChoiceModal");
    const title = document.getElementById("ruleChoiceModalTitle");
    const text = document.getElementById("ruleChoiceModalText");
    const btnCreate = document.getElementById("ruleChoiceCreate");
    const btnOnce = document.getElementById("ruleChoiceOnce");
    const btnCancel = document.getElementById("ruleChoiceCancel");

    // Fyll i texten i modalen
    title.textContent = `Ny kategori vald: "${categoryDisplayName}"`;
    text.textContent = `Vad vill du göra för transaktioner med texten "${transactionText}"?`;

    // Visa modalen
    modal.style.display = "block";

    // Skapa en "Promise" som väntar på att användaren klickar på en knapp
    const userChoice = new Promise(resolve => {
      btnCreate.onclick = () => resolve("create");
      btnOnce.onclick = () => resolve("once");
      btnCancel.onclick = () => resolve("cancel");
    });

    // Vänta på användarens val
    const choice = await userChoice;

    // Dölj modalen igen
    modal.style.display = "none";

    // Agera baserat på valet
    switch (choice) {
      case "create":
        // Användaren vill skapa en regel -> öppna den vanliga regel-modalen
        transaction.kategori = newCategoryKey;
        const prefillData = {
          matchType: "Exakt",
          matchText: transactionText,
          category: newCategoryKey,
          priority: 10,
        };
        openRuleModal(null, prefillData);
        break;

      case "once":
        // Användaren vill bara ändra denna gång
        transaction.kategori = newCategoryKey;
        break;

      case "cancel":
        // Användaren ångrade sig, återställ
        transaction.kategori = oldCategoryKey;
        break;
    }
  } else {
    // Om man ändrar till "Okategoriserat", gör det direkt
    transaction.kategori = newCategoryKey;
  }

  // Uppdatera alltid gränssnittet för att visa resultatet
  displayReviewTable();
  calculateAndDisplayBalance();
}

function calculateAndDisplayBalance() {
  const ingSaldoUI = currentFileStartSaldo;
  const utgSaldoUI = currentFileSlutSaldo;
  const balansDiv = document.getElementById("balans");
  const chartContainer = document.getElementById("balanceChartContainer");

  if (!balansDiv || !chartContainer) {
    console.warn("Nödvändiga element för balans/diagram saknas.");
    return;
  }

  // Dölj diagrammet om inga transaktioner finns
  if (!processedTransactions || processedTransactions.length === 0) {
    chartContainer.style.display = "none";
    if (incomeChartInstance) incomeChartInstance.destroy();
    if (expenseChartInstance) expenseChartInstance.destroy();

    const diffInitial = ingSaldoUI - utgSaldoUI;
    balansDiv.innerHTML = `
            <h3>Balanskontroll</h3>
            <table>
                <tr><th>Ingående saldo (kontoutdrag):</th><td>${formatCurrencyForPdf(ingSaldoUI)}</td></tr>
                <tr><th>Summa transaktioner (netto):</th><td>0,00</td></tr>
                <tr><th>Beräknat utgående saldo:</th><td>${formatCurrencyForPdf(ingSaldoUI)}</td></tr>
                <tr><th>Utgående saldo (kontoutdrag):</th><td>${formatCurrencyForPdf(utgSaldoUI)}</td></tr>
                <tr><th>Differens:</th><td class="${
                  Math.abs(diffInitial) < 0.01 ? "ok" : "fel"
                }">${formatCurrencyForPdf(diffInitial)}</td></tr>
            </table>
        `;
    if (document.getElementById("personInfo").style.display !== "none") {
      balansDiv.style.display = "block";
    }
    return;
  }

  const totals = calculateTotals(processedTransactions);

  let totalaInkomster = 0;
  for (const key in totals.inkomster) {
    totalaInkomster += totals.inkomster[key];
  }

  let totalaUtgifter = 0;
  for (const key in totals.utgifter) {
    totalaUtgifter += totals.utgifter[key];
  }

  const summaTransaktionerNetto = totalaInkomster - totalaUtgifter;
  const beraknatUtgSaldo = ingSaldoUI + summaTransaktionerNetto;
  const diff = beraknatUtgSaldo - utgSaldoUI;

  // Bygg HTML-strängen för balanstabellen
  let tableHTML = `<h3>Balanskontroll</h3><table>`;
  tableHTML += `<tr><th>Ingående saldo (kontoutdrag):</th><td>${formatCurrencyForPdf(ingSaldoUI)}</td></tr>`;
  tableHTML += `<tr><th>Summa transaktioner (netto):</th><td>${formatCurrencyForPdf(
    summaTransaktionerNetto
  )}</td></tr>`;
  tableHTML += `<tr><td colspan="2" style="padding-top: 10px; padding-bottom: 5px; font-weight: bold; border-bottom: 1px solid #ccc;">Detaljerade Summeringar:</td></tr>`;
  tableHTML += `<tr><td colspan="2" style="font-style: italic; background-color: #f0f8ff; padding-left:15px;">Inkomster:</td></tr>`;
  Object.entries(totals.inkomster).forEach(([kategoriKey, summa]) => {
    if (summa > 0) {
      tableHTML += `<tr><th style="padding-left: 30px; font-weight: normal;">${
        ALL_KATEGORIER[kategoriKey].namn
      }</th><td>${formatCurrencyForPdf(summa)}</td></tr>`;
    }
  });
  tableHTML += `<tr><th style="padding-left: 15px; border-top: 1px solid #ddd;">Totala Inkomster:</th><td style="border-top: 1px solid #ddd;">${formatCurrencyForPdf(
    totalaInkomster
  )}</td></tr>`;

  tableHTML += `<tr><td colspan="2" style="font-style: italic; background-color: #fff0f5; padding-left:15px;">Utgifter:</td></tr>`;
  Object.entries(totals.utgifter).forEach(([kategoriKey, summa]) => {
    if (summa > 0) {
      tableHTML += `<tr><th style="padding-left: 30px; font-weight: normal;">${
        ALL_KATEGORIER[kategoriKey].namn
      }</th><td>${formatCurrencyForPdf(summa)}</td></tr>`;
    }
  });
  tableHTML += `<tr><th style="padding-left: 15px; border-top: 1px solid #ddd;">Totala Utgifter:</th><td style="border-top: 1px solid #ddd;">${formatCurrencyForPdf(
    totalaUtgifter
  )}</td></tr>`;

  tableHTML += `<tr><td colspan="2" style="padding-top: 10px; border-top: 1px solid #ccc;"></td></tr>`;
  tableHTML += `<tr><th>Beräknat utgående saldo:</th><td>${formatCurrencyForPdf(beraknatUtgSaldo)}</td></tr>`;
  tableHTML += `<tr><th>Utgående saldo (kontoutdrag):</th><td>${formatCurrencyForPdf(utgSaldoUI)}</td></tr>`;
  tableHTML += `<tr><th>Differens:</th><td class="${Math.abs(diff) < 0.01 ? "ok" : "fel"}">${formatCurrencyForPdf(
    diff
  )}</td></tr>`;
  tableHTML += `</table>`;

  balansDiv.innerHTML = tableHTML;
  if (document.getElementById("personInfo").style.display !== "none") {
    balansDiv.style.display = "block";
  } else {
    balansDiv.style.display = "none";
  }

  // Anropa funktionen som ritar BÅDA diagrammen
  renderAllCharts(totals);
}

function renderSimplePieChart(totalaInkomster, totalaUtgifter) {
  const ctx = document.getElementById("balanceChart");
  const container = document.getElementById("balanceChartContainer");
  if (!ctx || !container) return;

  if (totalaInkomster === 0 && totalaUtgifter === 0) {
    container.style.display = "none";
    return;
  }
  container.style.display = "block";

  if (balanceChartInstance) {
    balanceChartInstance.destroy();
  }

  balanceChartInstance = new Chart(ctx, {
    type: "doughnut", // Doughnut är snyggt!
    data: {
      labels: ["Totala Inkomster", "Totala Utgifter"],
      datasets: [
        {
          data: [totalaInkomster, totalaUtgifter],
          backgroundColor: ["hsl(145, 63%, 42%)", "hsl(340, 82%, 56%)"],
          borderColor: "#fff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Periodens Inkomster vs. Utgifter" },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.label || "";
              if (label) label += ": ";
              if (context.parsed !== null) {
                label += new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(context.parsed);
              }
              return label;
            },
          },
        },
      },
    },
  });
}

function calculateTotals(transactions) {
  const totals = { inkomster: {}, utgifter: {} };
  for (const kategoriKey in ALL_KATEGORIER) {
    if (ALL_KATEGORIER[kategoriKey].typ === "inkomst") totals.inkomster[kategoriKey] = 0;
    else if (ALL_KATEGORIER[kategoriKey].typ === "utgift") totals.utgifter[kategoriKey] = 0;
  }
  transactions.forEach(tr => {
    const kategoriKey = tr.kategori;
    let beloppForSumma = parseFloat(tr.belopp);
    if (ALL_KATEGORIER[kategoriKey] && ALL_KATEGORIER[kategoriKey].justerbar && tr.justeringar) {
      let brutto = parseFloat(tr.ursprungligtBelopp);
      if (tr.justeringar.skatt) brutto += parseFloat(tr.justeringar.skatt);
      if (tr.justeringar.utmatning) brutto += parseFloat(tr.justeringar.utmatning);
      beloppForSumma = brutto;
      if (tr.justeringar.bostadsbidrag && parseFloat(tr.justeringar.bostadsbidrag) > 0) {
        totals.inkomster["BostadstilläggBidrag"] =
          (totals.inkomster["BostadstilläggBidrag"] || 0) + parseFloat(tr.justeringar.bostadsbidrag);
      }
    }
    if (isNaN(beloppForSumma)) return;
    if (ALL_KATEGORIER[kategoriKey]) {
      if (ALL_KATEGORIER[kategoriKey].typ === "inkomst") {
        totals.inkomster[kategoriKey] = (totals.inkomster[kategoriKey] || 0) + beloppForSumma;
      } else if (ALL_KATEGORIER[kategoriKey].typ === "utgift") {
        totals.utgifter[kategoriKey] = (totals.utgifter[kategoriKey] || 0) + Math.abs(beloppForSumma);
      }
    }
  });
  return totals;
}

async function sparaArsrakningPDF_MedMall() {
  console.log("[PDF Gen Årsr.] Startar generering av årsräknings-PDF...");
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman först.");
    return;
  }
  if (!activeGodManProfile) {
    alert("Välj en aktiv God Man-profil först.");
    return;
  }

  const mallUrl = "/Arsrakning_Mall.pdf";
  const pdfSetup = await setupPdfDocument(mallUrl);
  if (!pdfSetup) return;

  const { pdfDoc, form, customFont } = pdfSetup;
  const { rgb, PageSizes } = PDFLib;

  try {
    // --- Hämta all nödvändig data först ---
    const rakningTypRadio = document.querySelector('input[name="rakningTyp_ars"]:checked');
    const rakningTyp = rakningTypRadio ? rakningTypRadio.value : "arsrakning";
    const rubrikText = rakningTyp === "slutrakning" ? "Sluträkning" : "Årsräkning";

    const hmPdf = currentHuvudmanFullData.huvudmanDetails;
    const godMan = activeGodManProfile;
    const overformyndare = currentHuvudmanFullData.overformyndareDetails;
    const periodStartInput = document.getElementById("periodStart_ars").value;
    const periodSlutInput = document.getElementById("periodSlut_ars").value;
    const yearForFilename = periodStartInput ? new Date(periodStartInput).getFullYear() : new Date().getFullYear();

    trySetTextField(form, "Ars_Slut_rakning", rubrikText);
    trySetTextField(form, "Period_Start", formatDateForPdf(periodStartInput));
    trySetTextField(form, "Period_Slut", formatDateForPdf(periodSlutInput));

    trySetTextField(form, "Ofn_Rad1_Text", overformyndare?.Namn || "");
    trySetTextField(form, "Ofn_Rad2_Text", overformyndare?.Adress || "");
    trySetTextField(
      form,
      "Ofn_Rad3_Text",
      `${overformyndare?.Postnummer || ""} ${overformyndare?.Postort || ""}`.trim()
    );

    // --- Fyll i resten av formulärfälten ---
    trySetTextField(form, "Huvudman_Fornamn", hmPdf.Fornamn || "");
    trySetTextField(form, "Huvudman_Efternamn", hmPdf.Efternamn || "");
    trySetTextField(form, "Huvudman_Pnr", hmPdf.Personnummer || "");
    trySetTextField(form, "Postadress (gata, box, etc.)", hmPdf.Adress || "");
    trySetTextField(form, "Postnummer", hmPdf.Postnummer);
    trySetTextField(form, "Postort", hmPdf.Ort);
    trySetTextField(form, "Vistelseadress", hmPdf.Vistelseadress || "");
    trySetTextField(form, "Telefonnummer dagtid", hmPdf.Telefon || "");
    trySetTextField(form, "Mobilnummer", hmPdf.Mobil || "");
    trySetTextField(form, "E-postadress", hmPdf.Epost || "");
    trySetTextField(form, "Godman_Fornamn", godMan.Fornamn || "");
    trySetTextField(form, "Godman_Efternamn", godMan.Efternamn || "");
    trySetTextField(form, "Godman_Pnr", godMan.Personnummer || "");
    trySetTextField(form, "Godman_Adress", godMan.Adress || "");
    trySetTextField(form, "Godman_Postnr", godMan.Postnummer || "");
    trySetTextField(form, "Godman_Postort", godMan.Postort || "");
    trySetTextField(form, "Godman_Telefon", godMan.Telefon || "");
    trySetTextField(form, "Godman_Mobil", godMan.Mobil || "");
    trySetTextField(form, "Godman_Epost", godMan.Epost || "");
    const undertecknadOrtDatumUI = document.getElementById("arsrakningUndertecknadOrtDatum").value;
    trySetTextField(
      form,
      "Undertecknad_OrtDatum",
      undertecknadOrtDatumUI || `${godMan.Postort || "Okänd ort"} ${new Date().toLocaleDateString("sv-SE")}`
    );
    trySetTextField(form, "Undertecknad_Namn", `${godMan.Fornamn || ""} ${godMan.Efternamn || ""}`);

    // --- Bilagehantering och ifyllnad av listor (oförändrad) ---
    let naestaBilagaNummerGlobalt = 1;
    const getNextGlobalBilagaNummer = () => String(naestaBilagaNummerGlobalt++);
    const manuellaPosterBilagorMap = new Map();
    const createItemKey = (item, type) => {
      if (type === "bank" || type === "ovrigt") {
        return (
          `${type}_${(item.Beskrivning || "tom_beskrivning").toLowerCase()}` +
          (type === "ovrigt" ? `_${(item.Andelar || "inga_andelar").toLowerCase()}` : "")
        );
      } else if (type === "skuld") {
        return `skuld_${(item.Langivare || "okand_langivare").toLowerCase()}`;
      }
      return `unknown_${Date.now()}_${Math.random()}`;
    };
    const getOrAssignBilagaForManualItem = (item, itemKey, isRakningskontoSpecial = false) => {
      if (isRakningskontoSpecial) {
        const bilaga = "1";
        manuellaPosterBilagorMap.set(itemKey, bilaga);
        naestaBilagaNummerGlobalt = Math.max(naestaBilagaNummerGlobalt, 2);
        return bilaga;
      }
      if (item.BilagaRef && String(item.BilagaRef).trim() !== "") {
        const anvandarensBilaga = String(item.BilagaRef).trim();
        const numVal = parseInt(anvandarensBilaga);
        if (!isNaN(numVal) && numVal >= naestaBilagaNummerGlobalt) {
          naestaBilagaNummerGlobalt = numVal + 1;
        }
        manuellaPosterBilagorMap.set(itemKey, anvandarensBilaga);
        return anvandarensBilaga;
      }
      if (manuellaPosterBilagorMap.has(itemKey)) {
        return manuellaPosterBilagorMap.get(itemKey);
      }
      const nyBilaga = getNextGlobalBilagaNummer();
      manuellaPosterBilagorMap.set(itemKey, nyBilaga);
      return nyBilaga;
    };
    const bilagaRakningskonto = getOrAssignBilagaForManualItem({ BilagaRef: "1" }, "RAKNINGSKONTO_KEY", true);
    const bankkontonStartData = currentHuvudmanFullData.bankkontonStart || [];
    bankkontonStartData.forEach(konto => {
      konto._pdfBilaga = getOrAssignBilagaForManualItem(konto, createItemKey(konto, "bank"));
    });
    const bankkontonSlutData = currentHuvudmanFullData.bankkontonSlut || [];
    bankkontonSlutData.forEach(konto => {
      konto._itemKey = createItemKey(konto, "bank");
    });
    const ovrigaTillgangarStartData = currentHuvudmanFullData.ovrigaTillgangarStart || [];
    ovrigaTillgangarStartData.forEach(tillg => {
      tillg._pdfBilaga = getOrAssignBilagaForManualItem(tillg, createItemKey(tillg, "ovrigt"));
    });
    const ovrigaTillgangarSlutData = currentHuvudmanFullData.ovrigaTillgangarSlut || [];
    ovrigaTillgangarSlutData.forEach(tillg => {
      tillg._itemKey = createItemKey(tillg, "ovrigt");
    });
    const reportContent = getReportDataForPdf(
      processedTransactions,
      currentFileStartSaldo,
      currentFileSlutSaldo,
      naestaBilagaNummerGlobalt
    );
    let maxTransBilaga = 0;
    if (reportContent && reportContent.bilagaMap) {
      for (const key in reportContent.bilagaMap) {
        if (reportContent.bilagaMap.hasOwnProperty(key)) {
          const num = parseInt(reportContent.bilagaMap[key]);
          if (!isNaN(num) && num > maxTransBilaga) maxTransBilaga = num;
        }
      }
    }
    naestaBilagaNummerGlobalt = maxTransBilaga > 0 ? maxTransBilaga + 1 : naestaBilagaNummerGlobalt;
    const skulderData = currentHuvudmanFullData.skulder || [];
    skulderData.forEach(skuld => {
      skuld._pdfBilaga = getOrAssignBilagaForManualItem(skuld, createItemKey(skuld, "skuld"));
    });

    // --- Sida 2: Tillgångar & Inkomster ---
    let summaBankkontoStart = 0;
    const rakningkontoBeskrivning = `${hmPdf.Banknamn || "Räkningskonto"} (${hmPdf.Clearingnummer || "xxxx"}-${
      hmPdf.Kontonummer || "xxxxxxxxx"
    })`;
    trySetTextField(form, `TillgStart_Bankkonto_Rad1_Beskrivning`, rakningkontoBeskrivning);
    trySetTextField(form, `TillgStart_Bankkonto_Rad1_Belopp`, formatCurrencyForPdf(currentFileStartSaldo));
    trySetTextField(form, `TillgStart_Bankkonto_Rad1_Bilaga`, bilagaRakningskonto);
    summaBankkontoStart += parseFloat(currentFileStartSaldo) || 0;

    bankkontonStartData.forEach((konto, index) => {
      const radNummerPdf = index + 2;
      if (radNummerPdf <= 6) {
        trySetTextField(form, `TillgStart_Bankkonto_Rad${radNummerPdf}_Beskrivning`, konto.Beskrivning || "");
        trySetTextField(form, `TillgStart_Bankkonto_Rad${radNummerPdf}_Belopp`, formatCurrencyForPdf(konto.Kronor));
        trySetTextField(form, `TillgStart_Bankkonto_Rad${radNummerPdf}_Bilaga`, konto._pdfBilaga);
        summaBankkontoStart += parseFloat(konto.Kronor) || 0;
      }
    });
    trySetTextField(form, "TillgStart_Bankkonto_Summa_A", formatCurrencyForPdf(summaBankkontoStart));

    let summaOvrigtStart = 0;
    ovrigaTillgangarStartData.forEach((tillg, index) => {
      const radNummerPdf = index + 1;
      if (radNummerPdf <= 14) {
        trySetTextField(form, `TillgStart_Ovrigt_Rad${radNummerPdf}_Beskrivning`, tillg.Beskrivning || "");
        trySetTextField(form, `TillgStart_Ovrigt_Rad${radNummerPdf}_Andelar`, tillg.Andelar || "");
        trySetTextField(form, `TillgStart_Ovrigt_Rad${radNummerPdf}_Belopp`, formatCurrencyForPdf(tillg.Kronor));
        trySetTextField(form, `TillgStart_Ovrigt_Rad${radNummerPdf}_Bilaga`, tillg._pdfBilaga);
        summaOvrigtStart += parseFloat(tillg.Kronor) || 0;
      }
    });
    trySetTextField(form, "TillgStart_Ovrigt_Summa", formatCurrencyForPdf(summaOvrigtStart));

    for (const key in reportContent.categorizedIncome) {
      if (reportContent.categorizedIncome.hasOwnProperty(key)) {
        const catData = reportContent.categorizedIncome[key];
        if (catData.pdfBase && (catData.sum !== 0 || (catData.items && catData.items.length > 0))) {
          trySetTextField(form, `${catData.pdfBase}_Belopp`, formatCurrencyForPdf(catData.sum));
          const bilagaNummer = reportContent.bilagaMap[key];
          if (bilagaNummer) trySetTextField(form, `${catData.pdfBase}_Bilaga`, bilagaNummer);
        }
      }
    }
    trySetTextField(form, "Inkomst_Summa_B", formatCurrencyForPdf(reportContent.totalIncome_B));

    // --- KORRIGERING START ---
    // Den totala summan för A+B ska vara summan av bankkonton (A) + summan av inkomster (B).
    // Den ska INTE inkludera övriga tillgångar.
    const summa_A_plus_B = summaBankkontoStart + reportContent.totalIncome_B;
    trySetTextField(form, "Summa_A_Plus_B", formatCurrencyForPdf(summa_A_plus_B));
    // --- KORRIGERING SLUT ---

    // --- Sida 3: Utgifter & Tillgångar ---
    for (const key in reportContent.categorizedExpense) {
      if (reportContent.categorizedExpense.hasOwnProperty(key)) {
        const catData = reportContent.categorizedExpense[key];
        if (catData.pdfBase && (catData.sum !== 0 || (catData.items && catData.items.length > 0))) {
          trySetTextField(form, `${catData.pdfBase}_Belopp`, formatCurrencyForPdf(catData.sum));
          const bilagaNummer = reportContent.bilagaMap[key];
          if (bilagaNummer) trySetTextField(form, `${catData.pdfBase}_Bilaga`, bilagaNummer);
        }
      }
    }
    trySetTextField(form, "Utgift_Summa_C", formatCurrencyForPdf(reportContent.totalExpense_C));
    let summaBankkontoSlut = 0;
    trySetTextField(form, `TillgSlut_Bankkonto_Rad1_Beskrivning`, rakningkontoBeskrivning);
    trySetTextField(form, `TillgSlut_Bankkonto_Rad1_Belopp`, formatCurrencyForPdf(currentFileSlutSaldo));
    trySetTextField(form, `TillgSlut_Bankkonto_Rad1_Bilaga`, bilagaRakningskonto);
    summaBankkontoSlut += parseFloat(currentFileSlutSaldo) || 0;
    bankkontonSlutData.forEach((konto, index) => {
      const radNummerPdf = index + 2;
      if (radNummerPdf <= 6) {
        trySetTextField(form, `TillgSlut_Bankkonto_Rad${radNummerPdf}_Beskrivning`, konto.Beskrivning || "");
        trySetTextField(form, `TillgSlut_Bankkonto_Rad${radNummerPdf}_Belopp`, formatCurrencyForPdf(konto.Kronor));
        trySetTextField(
          form,
          `TillgSlut_Bankkonto_Rad${radNummerPdf}_Bilaga`,
          getOrAssignBilagaForManualItem(konto, konto._itemKey)
        );
        summaBankkontoSlut += parseFloat(konto.Kronor) || 0;
      }
    });
    trySetTextField(form, "TillgSlut_Bankkonto_Summa_D", formatCurrencyForPdf(summaBankkontoSlut));
    let summaOvrigtSlut = 0;
    ovrigaTillgangarSlutData.forEach((tillg, index) => {
      const radNummerPdf = index + 1;
      if (radNummerPdf <= 13) {
        trySetTextField(form, `TillgSlut_Ovrigt_Rad${radNummerPdf}_Beskrivning`, tillg.Beskrivning || "");
        trySetTextField(form, `TillgSlut_Ovrigt_Rad${radNummerPdf}_Andelar`, tillg.Andelar || "");
        trySetTextField(form, `TillgSlut_Ovrigt_Rad${radNummerPdf}_Belopp`, formatCurrencyForPdf(tillg.Kronor));
        trySetTextField(
          form,
          `TillgSlut_Ovrigt_Rad${radNummerPdf}_Bilaga`,
          getOrAssignBilagaForManualItem(tillg, tillg._itemKey)
        );
        summaOvrigtSlut += parseFloat(tillg.Kronor) || 0;
      }
    });
    trySetTextField(form, "TillgSlut_Ovrigt_Summa", formatCurrencyForPdf(summaOvrigtSlut));

    // --- KORRIGERING START ---
    // Den totala summan för C+D ska vara summan av utgifter (C) + summan av bankkonton vid periodens slut (D).
    // Den ska INTE inkludera övriga tillgångar vid periodens slut.
    const summa_C_plus_D = reportContent.totalExpense_C + summaBankkontoSlut;
    trySetTextField(form, "Summa_C_Plus_D", formatCurrencyForPdf(summa_C_plus_D));

    // Differensen ska nu stämma, eftersom den jämför (A+B) med (C+D) där A och D bara är bankmedel.
    trySetTextField(form, "Diff_AB_CD", formatCurrencyForPdf(summa_A_plus_B - summa_C_plus_D));
    // --- KORRIGERING SLUT ---

    // --- Sida 4: Skulder & Övriga Upplysningar ---
    let summaSkuldStart = 0;
    let summaSkuldSlut = 0;
    skulderData.forEach((skuld, index) => {
      const radNummerPdf = index + 1;
      if (radNummerPdf <= 9) {
        trySetTextField(form, `Skuld_Rad${radNummerPdf}_Langivare`, skuld.Langivare || "");
        trySetTextField(form, `Skuld_Rad${radNummerPdf}_Bilaga`, skuld._pdfBilaga);
        trySetTextField(form, `Skuld_Rad${radNummerPdf}_Start`, formatCurrencyForPdf(skuld.StartBelopp));
        trySetTextField(form, `Skuld_Rad${radNummerPdf}_Slut`, formatCurrencyForPdf(skuld.SlutBelopp));
        const forandring = (parseFloat(skuld.SlutBelopp) || 0) - (parseFloat(skuld.StartBelopp) || 0);
        trySetTextField(form, `Skuld_Rad${radNummerPdf}_Forandring`, formatCurrencyForPdf(forandring));
        summaSkuldStart += parseFloat(skuld.StartBelopp) || 0;
        summaSkuldSlut += parseFloat(skuld.SlutBelopp) || 0;
      }
    });
    trySetTextField(form, "Skuld_Summa_Start", formatCurrencyForPdf(summaSkuldStart));
    trySetTextField(form, "Skuld_Summa_Slut", formatCurrencyForPdf(summaSkuldSlut));
    trySetTextField(form, "Skuld_Summa_Forandring", formatCurrencyForPdf(summaSkuldSlut - summaSkuldStart));
    trySetTextField(form, "OvrigaUpplysningar", hmPdf.ArsrOvrigaUpplysningar || "");

    // --- Dynamiska sidor (Journal & Bilagor) ---
    const pageMargin = 40;
    const headerFontSize = 10;
    const tableHeaderFontSize = 8;
    const textFontSize = 7;
    const lineHeight = textFontSize * 1.35;
    const a4Width = PageSizes.A4[0];
    const journalCol = {
      datum: pageMargin,
      text: pageMargin + 55,
      kategori: pageMargin + 55 + 175,
      verNr: pageMargin + 55 + 175 + 115,
      belopp: a4Width - pageMargin - 70 - 30,
      bilaga: a4Width - pageMargin - 30,
      textWidth: 170,
      kategoriWidth: 110,
      verNrWidth: 30,
      beloppWidth: 70,
      bilagaWidth: 30,
    };
    const appendixCol = {
      datum: pageMargin,
      text: pageMargin + 55,
      verNr: pageMargin + 55 + 255,
      belopp: a4Width - pageMargin - 80,
      textWidth: 250,
      verNrWidth: 35,
      beloppWidth: 80,
    };
    const drawLine = (page, yPos) =>
      page.drawLine({
        start: { x: pageMargin, y: yPos },
        end: { x: a4Width - pageMargin, y: yPos },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
    const drawTextRight = (page, text, yPos, xEnd, fontToUse, size) => {
      const textWidthVal = fontToUse.widthOfTextAtSize(String(text), size);
      page.drawText(String(text), {
        x: xEnd - textWidthVal,
        y: yPos,
        font: fontToUse,
        size: size,
        color: rgb(0, 0, 0),
      });
    };
    const getPageDimensions = page => ({ width: page.getWidth(), height: page.getHeight() });
    const drawJournalHeader = (page, pageNum) => {
      const { height: pageHeight } = getPageDimensions(page);
      const topY = pageHeight - pageMargin;
      page.drawText("Transaktionsjournal", { x: journalCol.datum, y: topY, font: customFont, size: headerFontSize });
      drawTextRight(
        page,
        `Sida ${pageNum}`,
        topY,
        journalCol.bilaga + journalCol.bilagaWidth,
        customFont,
        tableHeaderFontSize
      );
      const tableHeaderY = topY - headerFontSize * 2.2;
      page.drawText("Datum", { x: journalCol.datum, y: tableHeaderY, font: customFont, size: tableHeaderFontSize });
      page.drawText("Text", { x: journalCol.text, y: tableHeaderY, font: customFont, size: tableHeaderFontSize });
      page.drawText("Kategori", {
        x: journalCol.kategori,
        y: tableHeaderY,
        font: customFont,
        size: tableHeaderFontSize,
      });
      drawTextRight(
        page,
        "Ver.nr",
        tableHeaderY,
        journalCol.verNr + journalCol.verNrWidth - 2,
        customFont,
        tableHeaderFontSize
      );
      drawTextRight(
        page,
        "Belopp",
        tableHeaderY,
        journalCol.belopp + journalCol.beloppWidth - 2,
        customFont,
        tableHeaderFontSize
      );
      drawTextRight(
        page,
        "Bil.nr",
        tableHeaderY,
        journalCol.bilaga + journalCol.bilagaWidth - 2,
        customFont,
        tableHeaderFontSize
      );
      drawLine(page, tableHeaderY - 5);
      return tableHeaderY - 5 - lineHeight;
    };
    const drawJournalRow = (page, yPos, transaction) => {
      page.drawText(transaction.datum || "", { x: journalCol.datum, y: yPos, font: customFont, size: textFontSize });
      let textToShow = transaction.text || "";
      if (customFont.widthOfTextAtSize(textToShow, textFontSize) > journalCol.textWidth - 4) {
        let truncated = "";
        for (const char of textToShow) {
          if (customFont.widthOfTextAtSize(truncated + char + "...", textFontSize) > journalCol.textWidth - 4) break;
          truncated += char;
        }
        textToShow = truncated + "...";
      }
      page.drawText(textToShow, { x: journalCol.text, y: yPos, font: customFont, size: textFontSize });
      let catDisplayName = (ALL_KATEGORIER[transaction.kategori]?.namn || transaction.kategori || "Okänt").replace(
        /^(Inkomst|Utgift)\s-\s/,
        ""
      );
      if (customFont.widthOfTextAtSize(catDisplayName, textFontSize) > journalCol.kategoriWidth - 4) {
        let truncatedCat = "";
        for (const char of catDisplayName) {
          if (customFont.widthOfTextAtSize(truncatedCat + char + "...", textFontSize) > journalCol.kategoriWidth - 4)
            break;
          truncatedCat += char;
        }
        catDisplayName = truncatedCat + "...";
      }
      page.drawText(catDisplayName, { x: journalCol.kategori, y: yPos, font: customFont, size: textFontSize });
      drawTextRight(
        page,
        String(transaction.globalVerNr || "-"),
        yPos,
        journalCol.verNr + journalCol.verNrWidth - 2,
        customFont,
        textFontSize
      );
      drawTextRight(
        page,
        formatCurrencyForPdf(transaction.belopp || 0),
        yPos,
        journalCol.belopp + journalCol.beloppWidth - 2,
        customFont,
        textFontSize
      );
      drawTextRight(
        page,
        String(transaction.bilagaNr || "-"),
        yPos,
        journalCol.bilaga + journalCol.bilagaWidth - 2,
        customFont,
        textFontSize
      );
    };
    const drawAppendixHeader = (page, pageNum, bilagaNum, kategoriNamn) => {
      const { height: pageHeight } = getPageDimensions(page);
      const topY = pageHeight - pageMargin;
      page.drawText(`Bilaga ${bilagaNum}`, { x: appendixCol.datum, y: topY, font: customFont, size: headerFontSize });
      page.drawText(kategoriNamn.replace(/^(Inkomst|Utgift)\s-\s/, ""), {
        x: appendixCol.datum,
        y: topY - headerFontSize * 1.5,
        font: customFont,
        size: headerFontSize * 0.9,
      });
      drawTextRight(
        page,
        `Sida ${pageNum}`,
        topY,
        appendixCol.belopp + appendixCol.beloppWidth,
        customFont,
        tableHeaderFontSize
      );
      const tableHeaderY = topY - headerFontSize * 3;
      page.drawText("Datum", { x: appendixCol.datum, y: tableHeaderY, font: customFont, size: tableHeaderFontSize });
      page.drawText("Specifikation", {
        x: appendixCol.text,
        y: tableHeaderY,
        font: customFont,
        size: tableHeaderFontSize,
      });
      drawTextRight(
        page,
        "Ver.nr",
        tableHeaderY,
        appendixCol.verNr + appendixCol.verNrWidth - 2,
        customFont,
        tableHeaderFontSize
      );
      drawTextRight(
        page,
        "Belopp",
        tableHeaderY,
        appendixCol.belopp + appendixCol.beloppWidth - 2,
        customFont,
        tableHeaderFontSize
      );
      drawLine(page, tableHeaderY - 5);
      return tableHeaderY - 5 - lineHeight;
    };
    const drawTransactionRowAppendix = (page, yPos, transaction) => {
      page.drawText(transaction.datum || "", { x: appendixCol.datum, y: yPos, font: customFont, size: textFontSize });
      let textToShow = transaction.text || "";
      if (customFont.widthOfTextAtSize(textToShow, textFontSize) > appendixCol.textWidth - 4) {
        let truncated = "";
        for (const char of textToShow) {
          if (customFont.widthOfTextAtSize(truncated + char + "...", textFontSize) > appendixCol.textWidth - 4) break;
          truncated += char;
        }
        textToShow = truncated + "...";
      }
      page.drawText(textToShow, { x: appendixCol.text, y: yPos, font: customFont, size: textFontSize });
      drawTextRight(
        page,
        String(transaction.globalVerNr || "-"),
        yPos,
        appendixCol.verNr + appendixCol.verNrWidth - 2,
        customFont,
        textFontSize
      );
      drawTextRight(
        page,
        formatCurrencyForPdf(Math.abs(transaction.belopp || 0)),
        yPos,
        appendixCol.belopp + appendixCol.beloppWidth - 2,
        customFont,
        textFontSize
      );
    };
    let currentJournalPage,
      journalPageCount = 0,
      currentJournalY;
    if (reportContent.chronologicalTransactions.length > 0) {
      currentJournalPage = pdfDoc.addPage(PageSizes.A4);
      journalPageCount = 1;
      currentJournalY = drawJournalHeader(currentJournalPage, journalPageCount);
      for (const transaction of reportContent.chronologicalTransactions) {
        if (currentJournalY < pageMargin + lineHeight) {
          currentJournalPage = pdfDoc.addPage(PageSizes.A4);
          journalPageCount++;
          currentJournalY = drawJournalHeader(currentJournalPage, journalPageCount);
        }
        drawJournalRow(currentJournalPage, currentJournalY, transaction);
        currentJournalY -= lineHeight;
      }
    }
    const allCategorizedDataForAppendix = { ...reportContent.categorizedIncome, ...reportContent.categorizedExpense };
    const sortedCatKeysForAppendix = Object.keys(allCategorizedDataForAppendix)
      .filter(key => reportContent.bilagaMap[key] && allCategorizedDataForAppendix[key].items.length > 0)
      .sort((a, b) => (parseInt(reportContent.bilagaMap[a]) || 999) - (parseInt(reportContent.bilagaMap[b]) || 999));
    for (const kategoriKey of sortedCatKeysForAppendix) {
      const kategoriData = allCategorizedDataForAppendix[kategoriKey];
      const bilagaNummer = reportContent.bilagaMap[kategoriKey];
      let currentAppendixPage = pdfDoc.addPage(PageSizes.A4);
      let appendixPageCount = 1;
      let currentAppendixY = drawAppendixHeader(
        currentAppendixPage,
        appendixPageCount,
        bilagaNummer,
        kategoriData.namn
      );
      for (const transactionItem of kategoriData.items) {
        if (currentAppendixY < pageMargin + lineHeight * 2) {
          currentAppendixPage = pdfDoc.addPage(PageSizes.A4);
          appendixPageCount++;
          currentAppendixY = drawAppendixHeader(
            currentAppendixPage,
            appendixPageCount,
            bilagaNummer,
            kategoriData.namn
          );
        }
        drawTransactionRowAppendix(currentAppendixPage, currentAppendixY, transactionItem);
        currentAppendixY -= lineHeight;
      }
      if (currentAppendixY < pageMargin + lineHeight * 2) {
        currentAppendixPage = pdfDoc.addPage(PageSizes.A4);
        appendixPageCount++;
        currentAppendixY = drawAppendixHeader(currentAppendixPage, appendixPageCount, bilagaNummer, kategoriData.namn);
      }
      currentAppendixY -= lineHeight * 0.5;
      drawLine(currentAppendixPage, currentAppendixY);
      currentAppendixY -= lineHeight;
      currentAppendixPage.drawText("Summa kategori", {
        x: appendixCol.text,
        y: currentAppendixY,
        font: customFont,
        size: tableHeaderFontSize,
      });
      drawTextRight(
        currentAppendixPage,
        formatCurrencyForPdf(kategoriData.sum),
        currentAppendixY,
        appendixCol.belopp + appendixCol.beloppWidth - 2,
        customFont,
        tableHeaderFontSize
      );
    }
    if (incomeChartInstance && expenseChartInstance) {
      const diagramSida = pdfDoc.addPage(PageSizes.A4);
      const { width: pageWidth, height: pageHeight } = diagramSida.getSize();
      const margin = 50;

      diagramSida.drawText("Ekonomisk Översikt - Periodens Kassaflöde", {
        x: margin,
        y: pageHeight - margin,
        font: customFont,
        size: 16,
      });

      const incomeImageBytes = await pdfDoc.embedPng(incomeChartInstance.toBase64Image());
      const expenseImageBytes = await pdfDoc.embedPng(expenseChartInstance.toBase64Image());

      const chartWidth = (pageWidth - 3 * margin) / 2;
      const incomeDims = incomeImageBytes.scale(chartWidth / incomeImageBytes.width);
      const expenseDims = expenseImageBytes.scale(chartWidth / expenseImageBytes.width);

      diagramSida.drawImage(incomeImageBytes, {
        x: margin,
        y: pageHeight - margin - 30 - incomeDims.height,
        width: incomeDims.width,
        height: incomeDims.height,
      });

      diagramSida.drawImage(expenseImageBytes, {
        x: margin * 2 + chartWidth,
        y: pageHeight - margin - 30 - expenseDims.height,
        width: expenseDims.width,
        height: expenseDims.height,
      });
    }
    // --- Slutförande ---
    form.getFields().forEach(field => {
      try {
        if (field.defaultUpdateAppearances && typeof field.defaultUpdateAppearances === "function")
          field.defaultUpdateAppearances(customFont);
      } catch (e) {
        console.warn(`Kunde inte uppdatera utseende för fält ${field.getName()}: ${e.message}`);
      }
    });
    form.flatten();

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `${rubrikText}_${yearForFilename}_${(hmPdf.Personnummer || "hm").replace(/\W/g, "_")}.pdf`;
    triggerDownload(blob, filename);
    alert(`${rubrikText} genererad!`);
  } catch (error) {
    console.error("[PDF Gen Årsr.] Allvarligt fel vid generering:", error);
    alert(`Kunde inte skapa PDF: ${error.message}`);
  }
}
function getReportDataForPdf(transactions, startSaldo, slutSaldo, naestaTillgangligaBilagaNummer) {
  console.log(
    `[getReportDataForPdf] Startar. Antal transaktioner: ${
      transactions ? transactions.length : 0
    }, Nästa bilaga startar på: ${naestaTillgangligaBilagaNummer}`
  );
  const reportOutput = {
    startSaldo_A: startSaldo,
    slutSaldo_D: slutSaldo,
    categorizedIncome: {},
    categorizedExpense: {},
    chronologicalTransactions: [],
    bilagaMap: {},
    totalIncome_B: 0,
    totalExpense_C: 0,
    year: transactions.length > 0 ? (transactions[0].datum || "").substring(0, 4) : new Date().getFullYear().toString(),
    firstDate: transactions.length > 0 ? transactions[0].datum : "",
    lastDate: transactions.length > 0 ? transactions[transactions.length - 1].datum : "",
  };

  // Nollställ alla kategorier
  for (const key in ALL_KATEGORIER) {
    if (ALL_KATEGORIER.hasOwnProperty(key)) {
      const katInfo = ALL_KATEGORIER[key];
      if (katInfo.typ === "inkomst")
        reportOutput.categorizedIncome[key] = {
          sum: 0,
          items: [],
          pdfBase: KATEGORI_POSTKOD_MAP[katInfo.postKod]?.pdfBase,
          namn: katInfo.namn,
        };
      else if (katInfo.typ === "utgift")
        reportOutput.categorizedExpense[key] = {
          sum: 0,
          items: [],
          pdfBase: KATEGORI_POSTKOD_MAP[katInfo.postKod]?.pdfBase,
          namn: katInfo.namn,
        };
    }
  }

  // Definiera nycklar för tydlighet
  const bruttoCatKey = "LönerPensioner";
  const taxExpenseCatKey = "PreliminärSkattInk";
  const garnishmentExpenseCatKey = "AmorteringSkuldAvgift";
  const housingIncomeCatKey = "BostadstilläggBidrag";
  const addCostIncomeCatKey = "ÖvrigInkomst";

  transactions.forEach((tr_orig, index) => {
    const tr = { ...tr_orig, globalVerNr: index + 1 };
    reportOutput.chronologicalTransactions.push(tr);

    const kategoriKey = tr.kategori;
    const adj = tr.justeringar || {};
    const isAdjustableIncome = kategoriKey === bruttoCatKey && ALL_KATEGORIER[bruttoCatKey].justerbar;

    if (isAdjustableIncome) {
      // Hantera justerbar inkomst genom att dela upp den
      const nettoBelopp = parseFloat(tr.ursprungligtBelopp) || 0;
      const skatt = parseFloat(adj.skatt) || 0;
      const utmatning = parseFloat(adj.utmatning) || 0;
      const bostadsbidrag = parseFloat(adj.bostadsbidrag) || 0;
      const merkostnad = parseFloat(adj.merkostnadsersattning) || 0;

      // --- KORRIGERING START: Korrekt beräkning av bruttolön ---
      // Bruttolön = Nettoutbetalning + avdragen skatt + avdragen utmätning - inkluderat bostadsbidrag - inkluderad merkostnadsers.
      const bruttoInkomst = nettoBelopp + skatt + utmatning - bostadsbidrag - merkostnad;
      // --- KORRIGERING SLUT ---

      // 1. Lägg till den korrekt beräknade bruttolönen
      reportOutput.categorizedIncome[bruttoCatKey].sum += bruttoInkomst;
      reportOutput.categorizedIncome[bruttoCatKey].items.push({ ...tr, belopp: bruttoInkomst, text: tr.text });

      // 2. Lägg till de avdragna/tillagda delarna i sina respektive kategorier
      if (skatt > 0) {
        reportOutput.categorizedExpense[taxExpenseCatKey].sum += skatt;
        reportOutput.categorizedExpense[taxExpenseCatKey].items.push({
          ...tr,
          belopp: -skatt,
          text: `${tr.text} (Avdragen skatt)`,
        });
      }
      if (utmatning > 0) {
        reportOutput.categorizedExpense[garnishmentExpenseCatKey].sum += utmatning;
        reportOutput.categorizedExpense[garnishmentExpenseCatKey].items.push({
          ...tr,
          belopp: -utmatning,
          text: `${tr.text} (Utmätning)`,
        });
      }
      if (bostadsbidrag > 0) {
        reportOutput.categorizedIncome[housingIncomeCatKey].sum += bostadsbidrag;
        reportOutput.categorizedIncome[housingIncomeCatKey].items.push({
          ...tr,
          belopp: bostadsbidrag,
          text: `${tr.text} (Bostadsbidrag)`,
        });
      }
      if (merkostnad > 0) {
        reportOutput.categorizedIncome[addCostIncomeCatKey].sum += merkostnad;
        reportOutput.categorizedIncome[addCostIncomeCatKey].items.push({
          ...tr,
          belopp: merkostnad,
          text: `${tr.text} (Merkostnadsers.)`,
        });
      }
    } else if (ALL_KATEGORIER[kategoriKey]) {
      // Hantera alla andra, ojusterade transaktioner
      const belopp = parseFloat(tr.belopp) || 0;
      if (ALL_KATEGORIER[kategoriKey].typ === "inkomst") {
        reportOutput.categorizedIncome[kategoriKey].sum += belopp;
        reportOutput.categorizedIncome[kategoriKey].items.push(tr);
      } else if (ALL_KATEGORIER[kategoriKey].typ === "utgift") {
        reportOutput.categorizedExpense[kategoriKey].sum += Math.abs(belopp);
        reportOutput.categorizedExpense[kategoriKey].items.push(tr);
      }
    }
  });

  // Summera de slutgiltiga kategorisummorna för att få korrekta totalsummor
  let finalTotalIncome = 0;
  for (const key in reportOutput.categorizedIncome) {
    finalTotalIncome += reportOutput.categorizedIncome[key].sum;
  }

  let finalTotalExpense = 0;
  for (const key in reportOutput.categorizedExpense) {
    finalTotalExpense += reportOutput.categorizedExpense[key].sum;
  }

  reportOutput.totalIncome_B = finalTotalIncome;
  reportOutput.totalExpense_C = finalTotalExpense;

  console.log(
    `[getReportDataForPdf] Summering korrekta kategorier: totalIncome_B=${reportOutput.totalIncome_B}, totalExpense_C=${reportOutput.totalExpense_C}`
  );

  // Tilldela bilagenummer (denna del är oförändrad och bör fungera som den ska)
  let transaktionsBilagaCounter = naestaTillgangligaBilagaNummer;
  const appendixOrder = [
    "LönerPensioner",
    "BostadstilläggBidrag",
    "HABErsättning",
    "Skatteåterbäring",
    "RäntaBankkonto",
    "Utdelning",
    "UttagFonderFörsäljAktier",
    "ÅterbetalningarInkomst",
    "ArvInkomst",
    "InsättningAnhörig",
    "Hyresinkomst",
    "ÖverföringEgetKontoIn",
    "ÖvrigInkomst",
    "PreliminärSkattInk",
    "AmorteringSkuldAvgift",
    "HyraBoendeMat",
    "Försäkringar",
    "TVTeleEl",
    "SjukvårdLäkarbesökApotek",
    "KöpAktierFonder",
    "MedelEgetBrukUttag",
    "ArvodeStällföreträdare",
    "Färdtjänst",
    "FackAvgAKassa",
    "Föreningsavgifter",
    "CSNUtgift",
    "Tidningar",
    "Bankavgifter",
    "Kvarskatt",
    "ÖverföringEgetKontoUt",
    "ÖvrigUtgift",
  ];

  const allCategoriesWithItems = {};
  for (const key in reportOutput.categorizedIncome) {
    if (reportOutput.categorizedIncome[key].items && reportOutput.categorizedIncome[key].items.length > 0) {
      allCategoriesWithItems[key] = reportOutput.categorizedIncome[key];
    }
  }
  for (const key in reportOutput.categorizedExpense) {
    if (reportOutput.categorizedExpense[key].items && reportOutput.categorizedExpense[key].items.length > 0) {
      allCategoriesWithItems[key] = reportOutput.categorizedExpense[key];
    }
  }

  appendixOrder.forEach(catKey => {
    if (allCategoriesWithItems[catKey]) {
      reportOutput.bilagaMap[catKey] = String(transaktionsBilagaCounter++);
    }
  });

  for (const catKey in allCategoriesWithItems) {
    if (allCategoriesWithItems.hasOwnProperty(catKey) && !reportOutput.bilagaMap[catKey]) {
      reportOutput.bilagaMap[catKey] = String(transaktionsBilagaCounter++);
    }
  }

  reportOutput.chronologicalTransactions.forEach(tr => {
    tr.bilagaNr = reportOutput.bilagaMap[tr.kategori] || "-";
  });

  console.log(
    "[getReportDataForPdf] Slutlig bilagaMap för transaktioner:",
    JSON.stringify(reportOutput.bilagaMap, null, 2)
  );
  console.log("[getReportDataForPdf] Avslutar. Returnerar reportOutput.");
  return reportOutput;
}
function openArvodesModal() {
  console.log(
    "[ARVODESMODAL] Öppnar modal. currentHuvudmanFullData:",
    JSON.stringify(currentHuvudmanFullData, null, 2)
  );
  const f = currentHuvudmanFullData?.huvudmanDetails;
  if (!f) {
    alert("Ingen huvudman vald. Välj en huvudman på 'Huvudman'-fliken först.");
    return;
  }
  const namnSpan = document.getElementById("arvModalNamn"); // NYTT ID
  const personnummerSpan = document.getElementById("arvModalPersonnummer"); // NYTT ID
  const adressSpan = document.getElementById("arvModalAdress"); // NYTT ID
  const postnummerSpan = document.getElementById("arvModalPostnummer"); // NYTT ID
  const ortSpan = document.getElementById("arvModalOrt"); // NYTT ID

  if (!namnSpan || !personnummerSpan || !adressSpan || !postnummerSpan || !ortSpan) {
    console.error("Ett eller flera informationsfält saknas i arvodesmodalen. Kontrollera HTML-ID:n.");
  }
  if (namnSpan) namnSpan.textContent = `${f.Fornamn || ""} ${f.Efternamn || ""}`.trim() || f.HeltNamn || "Namn saknas";
  if (personnummerSpan) personnummerSpan.textContent = f.Personnummer || "Pnr saknas";
  if (adressSpan) adressSpan.textContent = f.Adress || "Adress saknas";
  if (postnummerSpan) postnummerSpan.textContent = f.Postnummer || "Postnr saknas";
  if (ortSpan) ortSpan.textContent = f.Ort || "Ort saknas";

  document.getElementById("arvForvalta").value = "";
  document.getElementById("arvSorja").value = "";
  document.getElementById("arvExtra").value = "";
  document.getElementById("arvBilersattning").value = "";
  document.getElementById("arvKostnadsersattning").value = "";
  document.getElementById("arvDeklInskickad").value = "";
  const arvodesModalEl = document.getElementById("arvodesModal");
  if (arvodesModalEl) {
    arvodesModalEl.style.display = "block";
  } else {
    console.error("Kunde inte hitta arvodesModal för att visa den!");
    return;
  }
  beraknaArvode();
}

async function generateArvodePdf() {
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman först innan du genererar arvodesberäkning!");
    return;
  }
  if (!activeGodManProfile) {
    alert("Välj en aktiv God Man-profil först.");
    return;
  }

  const templateUrl = "/Arvodesberakning_Mall.pdf";

  // ANROP TILL DEN NYA HJÄLPFUNKTIONEN
  const pdfSetup = await setupPdfDocument(templateUrl);
  if (!pdfSetup) {
    // Om setupPdfDocument misslyckades (t.ex. mallen hittades inte) avbryts funktionen.
    // Ett felmeddelande har redan visats från hjälpfunktionen.
    return;
  }
  const { pdfDoc, form, customFont } = pdfSetup;

  try {
    // --- DIN BEFINTLIGA LOGIK FÖR ATT SAMLA IN DATA OCH FYLLA I PDF:en ---
    // (Denna del är identisk med din gamla funktion)
    const hm = currentHuvudmanFullData.huvudmanDetails;
    const gm = activeGodManProfile;

    const arvForvalta = parseFloat(document.getElementById("arvForvalta").value) || 0;
    const arvSorja = parseFloat(document.getElementById("arvSorja").value) || 0;
    const arvExtra = parseFloat(document.getElementById("arvExtra").value) || 0;
    const bilersattning = parseFloat(document.getElementById("arvBilersattning").value) || 0;
    const kostnadsersattningSkattefri = parseFloat(document.getElementById("arvKostnadsersattning").value) || 0;
    const deklInskickad = document.getElementById("arvDeklInskickad").value;

    const summaArvodeInnanErs = arvForvalta + arvSorja + arvExtra;
    const summaErsattning = bilersattning + kostnadsersattningSkattefri;
    const totaltBeloppInnanAvg = summaArvodeInnanErs + summaErsattning;
    const arvodeEfterSkatt = Math.round(summaArvodeInnanErs * 0.7);
    const arbetsgivaravgift = Math.round(summaArvodeInnanErs * 0.3142);
    const avdragenSkatt = Math.round(summaArvodeInnanErs * 0.3);
    const utbetaltTillStallforetradare = arvodeEfterSkatt + summaErsattning;
    const attBetalaTillSkatteverket = arbetsgivaravgift + avdragenSkatt;
    const totaltAttBetalaHuvudman = summaArvodeInnanErs + summaErsattning + arbetsgivaravgift;
    const ocrNummer = generateSkatteverketOcr(hm.Personnummer);

    const hmUtbetalningBank = hm.Banknamn || "";
    const hmUtbetalningClearing = hm.Clearingnummer || "";
    const hmUtbetalningKonto = hm.Kontonummer || "";
    let delar = [];
    if (hmUtbetalningBank) delar.push(hmUtbetalningBank.trim());
    let clearingKontoStr =
      hmUtbetalningClearing && hmUtbetalningKonto
        ? `${hmUtbetalningClearing.trim()}-${hmUtbetalningKonto.trim()}`
        : hmUtbetalningKonto || hmUtbetalningClearing || "";
    if (clearingKontoStr) delar.push(clearingKontoStr.trim());
    const franKontoText = delar.join(" ").trim() || "Huvudmannens räkningskonto";

    // Fyll i PDF-fälten
    trySetTextField(form, "Huvudman_Namn", `${hm.Fornamn || ""} ${hm.Efternamn || ""}`);
    trySetTextField(form, "Huvudman_Pnr", hm.Personnummer || "");
    trySetTextField(form, "Arvode_ForvaltaEgendom", formatCurrencyForPdf(arvForvalta));
    trySetTextField(form, "Arvode_SorjaForPerson", formatCurrencyForPdf(arvSorja));
    trySetTextField(form, "Arvode_Extra", formatCurrencyForPdf(arvExtra));
    trySetTextField(form, "Arvode_Summa1", formatCurrencyForPdf(summaArvodeInnanErs));
    trySetTextField(form, "Arvode_Bilersattning", formatCurrencyForPdf(bilersattning));
    trySetTextField(form, "Arvode_Kostnadsersattning_Skattefri", formatCurrencyForPdf(kostnadsersattningSkattefri));
    trySetTextField(form, "Arvode_SummaErsattning", formatCurrencyForPdf(summaErsattning));
    trySetTextField(form, "Arvode_TotaltBelopp_InnanAvg", formatCurrencyForPdf(totaltBeloppInnanAvg));
    trySetTextField(form, "Arvode_Arbetsgivaravgift_Belopp", formatCurrencyForPdf(arbetsgivaravgift));
    trySetTextField(form, "Arvode_TotaltAttBetala_InklAvg", formatCurrencyForPdf(totaltAttBetalaHuvudman));
    trySetTextField(form, "Arvode_Summa1_EfterSkatt", formatCurrencyForPdf(arvodeEfterSkatt));
    trySetTextField(form, "Arvode_Arbetsgivaravgift_Procent", "31,42%");
    trySetTextField(form, "Arvode_TotaltAttBetala_GM", formatCurrencyForPdf(utbetaltTillStallforetradare));
    trySetTextField(form, "BetalaTillGM_FranKonto", franKontoText);
    trySetTextField(
      form,
      "Stallforetradare_TillKonto",
      `${gm.Clearingnummer || ""}-${gm.Kontonummer || ""}`.replace(/^-|-$/g, "").trim()
    );
    trySetTextField(form, "SKV_Bruttolon", formatCurrencyForPdf(summaArvodeInnanErs));
    trySetTextField(form, "SKV_UnderlagSkatteavdrag", formatCurrencyForPdf(summaArvodeInnanErs));
    trySetTextField(form, "SKV_Arbetsgivaravgift", formatCurrencyForPdf(arbetsgivaravgift));
    trySetTextField(form, "SKV_AvdragenSkatt_Belopp", formatCurrencyForPdf(avdragenSkatt));
    trySetTextField(form, "SKV_SummaAttBetala", formatCurrencyForPdf(attBetalaTillSkatteverket));
    trySetTextField(form, "SKV_DeklarationInskickad", deklInskickad);
    trySetTextField(form, "BetalaTillSKV_FranKonto", franKontoText);
    trySetTextField(form, "BetalaTillSKV_OCR", ocrNummer);

    // Slutför och ladda ner PDF (identiskt med förut)
    form.getFields().forEach(field => {
      try {
        if (field.defaultUpdateAppearances && typeof field.defaultUpdateAppearances === "function") {
          field.defaultUpdateAppearances(customFont);
        }
      } catch (e) {
        /* Ignorera */
      }
    });
    form.flatten();

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `Arvodesrakning_${(hm.Personnummer || "hm").replace(/\W/g, "_")}.pdf`;
    triggerDownload(blob, filename);
    alert("Arvodes-PDF genererad!");
  } catch (error) {
    console.error("[ArvodesPDF] Fel vid generering (efter setup):", error);
    alert(`Kunde inte skapa Arvodes-PDF: ${error.message}\nSe konsolen för detaljer.`);
  }
}
function getHmValue(hm, ...fieldNames) {
  for (const name of fieldNames) {
    if (hm[name] !== undefined && hm[name] !== null && String(hm[name]).trim() !== "") {
      return hm[name];
    }
  }
  return "";
}

function fillAllHuvudmanFieldsToPdf(form, hm) {
  trySetTextField(
    form,
    "Sokande_Namn",
    getHmValue(hm, "Fornamn", "FS_Sokande_Fornamn", "Namn") + " " + getHmValue(hm, "Efternamn", "FS_Sokande_Efternamn")
  );
  trySetTextField(form, "Sokande_Personnummer", getHmValue(hm, "Personnummer", "FS_Sokande_Personnummer"));
  trySetTextField(form, "Sokande_Medborgarskap", getHmValue(hm, "Medborgarskap", "FS_Sokande_Medborgarskap"));
  trySetTextField(form, "adress", getHmValue(hm, "Adress", "Boende", "FS_Bostad_AdressLghPost"));
  trySetTextField(form, "postnummer", getHmValue(hm, "Postnummer", "FS_Bostad_Postnummer"));
  trySetTextField(form, "Bostad_Ort", getHmValue(hm, "Ort", "FS_Bostad_Ort"));
  trySetTextField(
    form,
    "Sysselsattning_Sokande",
    getHmValue(hm, "Sysselsattning_Grund", "FS_Sysselsattning_Sokande_Text")
  );
  trySetTextField(form, "Ansokan_Kostnad_Hyra", getHmValue(hm, "FS_Kostnad_Hyra"));
  trySetTextField(form, "Kostnad_Bredband", getHmValue(hm, "FS_Kostnad_Bredband"));
  trySetTextField(form, "Kostnad_Hushallsel", getHmValue(hm, "FS_Kostnad_Hushallsel"));
  trySetTextField(form, "Kostnad_Hemforsakring", getHmValue(hm, "FS_Kostnad_Hemforsakring"));
  trySetTextField(form, "Kostnad_AnnatBeskrivning", getHmValue(hm, "FS_Kostnad_AnnatBeskrivning"));
  trySetTextField(form, "Kostnad_AnnatBelopp", getHmValue(hm, "FS_Kostnad_AnnatBelopp"));
  trySetTextField(
    form,
    "UnderskriftsDatum",
    getHmValue(hm, "UnderskriftsDatum") || new Date().toLocaleDateString("sv-SE")
  );
  trySetTextField(
    form,
    "UnderskriftsNamn",
    getHmValue(hm, "Fornamn", "FS_Sokande_Fornamn", "Namn") + " " + getHmValue(hm, "Efternamn", "FS_Sokande_Efternamn")
  );
}

async function genereraFsPdfDirekt(kommunNamn, pdfMallFilnamn) {
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj först en huvudman.");
    return;
  }
  const huvudmanDetails = currentHuvudmanFullData.huvudmanDetails;
  const fieldValues = {
    hyra: huvudmanDetails.Hyra ?? "",
    elKostnad: huvudmanDetails.ElKostnad ?? "",
    hemforsakring: huvudmanDetails.Hemforsakring ?? "",
    barnomsorgAvgift: huvudmanDetails.BarnomsorgAvgift ?? "",
    reskostnader: huvudmanDetails.Reskostnader ?? "",
    medicinkostnad: huvudmanDetails.MedicinKostnad ?? "", // Korrigerat från medicinkostad
    lakarvardkostnad: huvudmanDetails.Lakarvardskostnad ?? "",
    fackAvgiftAkassa: huvudmanDetails.FackAvgiftAkassa ?? "",
    bredband: huvudmanDetails.Bredband ?? "",
    ovrigKostnadBeskrivning: huvudmanDetails.OvrigKostnadBeskrivning ?? "",
    ovrigKostnadBelopp: huvudmanDetails.OvrigKostnadBelopp ?? "",
    personnummer: huvudmanDetails.Personnummer ?? "",
    fornamn: huvudmanDetails.Fornamn ?? "",
    efternamn: huvudmanDetails.Efternamn ?? "",
    medsokandeFornamn: huvudmanDetails.MedsokandeFornamn ?? "",
    medsokandeEfternamn: huvudmanDetails.MedsokandeEfternamn ?? "",
    medsokandePersonnummer: huvudmanDetails.MedsokandePersonnummer ?? "",
    adress: huvudmanDetails.Adress ?? "",
    postnummer: huvudmanDetails.Postnummer ?? "",
    ort: huvudmanDetails.Ort ?? "",
    boendeNamn: huvudmanDetails.BoendeNamn ?? "",
    bostadAntalRum: huvudmanDetails.BostadAntalRum ?? "",
    bostadAntalBoende: huvudmanDetails.BostadAntalBoende ?? "",
    sysselsattning: huvudmanDetails.Sysselsattning ?? "",
    ovrigaUpplysningar: huvudmanDetails.ArsrOvrigaUpplysningar ?? "",
    datum: new Date().toLocaleDateString("sv-SE"),
    manad: new Date().toLocaleString("sv-SE", { month: "long" }),
    kommunHandlaggare: kommunNamn || "", // Använd kommunNamn från parametern
    gm: activeGodManProfile?.Fornamn + " " + activeGodManProfile?.Efternamn || "", // Korrigerat för att få helt namn
    heltNamn: huvudmanDetails.HeltNamn || (huvudmanDetails.Fornamn || "") + " " + (huvudmanDetails.Efternamn || ""),
  };
  await fillAndDownloadPdf(pdfMallFilnamn, fieldValues, `ifylld_${kommunNamn.replace(/\s+/g, "_")}.pdf`);
}

async function genereraOchLaddaNerForsorjningsstodPdf() {
  console.log("[PDF Gen FS] Startar generering av Försörjningsstöd PDF...");
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman först. PDF-generering avbruten.");
    return;
  }
  if (!activeGodManProfile) {
    alert("Välj en aktiv God Man-profil. PDF-generering avbruten.");
    return;
  }
  if (!currentFsPdfMallFilnamn || !currentFsKommunNamn) {
    alert("Internt fel: Mallfilnamn eller kommunnamn för PDF saknas. PDF-generering avbruten.");
    return;
  }
  const hm = currentHuvudmanFullData.huvudmanDetails;
  const gm = activeGodManProfile;
  console.log("[PDF Gen FS] Data för PDF (hm-objekt):", JSON.parse(JSON.stringify(hm)));
  console.log("[PDF Gen FS] Alla keys i hm-objekt:", Object.keys(hm));
  console.log("[PDF Gen FS] Kostnadsfält - Hyra:", hm.Hyra, "ElKostnad:", hm.ElKostnad, "Bredband:", hm.Bredband);
  const idag = new Date();
  const ansokanDatumPdf = hm.AnsokanDatum || idag.toISOString().slice(0, 10);
  const ansokanAvserArPdf = String(hm.AnsokanAvserAr || idag.getFullYear());
  let ansokanAvserManadPdf = hm.AnsokanAvserManad || idag.toLocaleString("sv-SE", { month: "long" });
  console.log(
    `[PDF Gen FS] Ansökningsdatum: ${ansokanDatumPdf}, Avser År: ${ansokanAvserArPdf}, Avser Månad: ${ansokanAvserManadPdf}`
  );
  const ovrigInfoPdf = hm.ArsrOvrigaUpplysningar || "";
  console.log("[PDF Gen FS] Övrig Info (hämtad från ArsrOvrigaUpplysningar):", ovrigInfoPdf);
  if (!window.PDFLib || !window.fontkit) {
    alert("PDF-bibliotek (PDFLib eller Fontkit) är inte korrekt laddat.");
    return;
  }
  const { PDFDocument, rgb } = window.PDFLib;
  const fontkit = window.fontkit;
  try {
    const templateUrl = `/${currentFsPdfMallFilnamn}`;
    const fontUrl = "/fonts/LiberationSans-Regular.ttf";
    console.log(`[PDF Gen FS] Laddar mall från: ${templateUrl} och font från: ${fontUrl}`);
    const [existingPdfBytes, fontBytes] = await Promise.all([
      fetch(templateUrl).then(res => {
        if (!res.ok)
          throw new Error(`Kunde inte ladda mall ${currentFsPdfMallFilnamn}: ${res.statusText} (${res.status})`);
        return res.arrayBuffer();
      }),
      fetch(fontUrl).then(res => {
        if (!res.ok) throw new Error(`Kunde inte ladda font: ${res.statusText} (${res.status})`);
        return res.arrayBuffer();
      }),
    ]);
    console.log("[PDF Gen FS] Mall och font har laddats.");
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const form = pdfDoc.getForm();
    console.log("[PDF Gen FS] Formulär-objekt hämtat.");

    // Fyll i fälten
    trySetTextField(form, "heltNamn", `${hm.Fornamn || ""} ${hm.Efternamn || ""}`);
    trySetTextField(form, "personnummer", hm.Personnummer);
    trySetTextField(form, "adress", hm.Adress);
    trySetTextField(form, "postnummer", hm.Postnummer);
    trySetTextField(form, "ort", hm.Ort);
    trySetTextField(form, "telefon", hm.Telefon || hm.Mobil || "");
    trySetTextField(form, "epost", hm.Epost);
    trySetTextField(form, "medborgarskap", hm.Medborgarskap);
    trySetTextField(form, "civilstand", hm.Civilstand);
    trySetTextField(form, "datum", ansokanDatumPdf);
    trySetTextField(form, "Ansokan_AvserManad", ansokanAvserManadPdf);
    trySetTextField(form, "Ansokan_AvserAr", ansokanAvserArPdf);
    const isSammanboende = hm.Sammanboende === 1 || String(hm.Sammanboende) === "1";
    if (isSammanboende) {
      trySetTextField(form, "medsokandeFornamn", hm.MedsokandeFornamn);
      trySetTextField(form, "medsokandeEfternamn", hm.MedsokandeEfternamn);
      trySetTextField(form, "medsokandePersonnummer", hm.MedsokandePersonnummer);
    }
    trySetTextField(form, "boendeNamn", hm.BoendeNamn);
    trySetTextField(form, "bostadAntalRum", String(hm.BostadAntalRum || ""));
    trySetTextField(form, "bostadAntalBoende", String(hm.BostadAntalBoende || ""));
    trySetTextField(form, "sysselsattning", hm.Sysselsattning);
    const kostnaderAttFylla = [
      { pdfFaltnamn: "hyra", hmDataNyckel: "Hyra" },
      { pdfFaltnamn: "elKostnad", hmDataNyckel: "ElKostnad" },
      { pdfFaltnamn: "fackAvgiftAkassa", hmDataNyckel: "FackAvgiftAkassa" },
      { pdfFaltnamn: "reskostnader", hmDataNyckel: "Reskostnader" },
      { pdfFaltnamn: "hemforsakring", hmDataNyckel: "Hemforsakring" },
      { pdfFaltnamn: "medicinkostnad", hmDataNyckel: "MedicinKostnad" },
      { pdfFaltnamn: "lakarvardskostnad", hmDataNyckel: "Lakarvardskostnad" },
      { pdfFaltnamn: "barnomsorgAvgift", hmDataNyckel: "BarnomsorgAvgift" },
      { pdfFaltnamn: "fardtjanstAvgift", hmDataNyckel: "FardtjanstAvgift" },
      { pdfFaltnamn: "akutTandvardskostnad", hmDataNyckel: "AkutTandvardskostnad" },
      { pdfFaltnamn: "bredband", hmDataNyckel: "Bredband" },
      { pdfFaltnamn: "ovrigKostnadBeskrivning", hmDataNyckel: "OvrigKostnadBeskrivning", ärText: true },
      { pdfFaltnamn: "ovrigKostnadBelopp", hmDataNyckel: "OvrigKostnadBelopp" },
    ];
    let summaUtgifter = 0;
    console.log("[PDF Gen FS] Försöker fylla kostnader. Kostnad-mappning:", kostnaderAttFylla.map(k => `${k.hmDataNyckel}→${k.pdfFaltnamn}`).join(", "));
    kostnaderAttFylla.forEach(kostnad => {
      const vardeFranHm = hm[kostnad.hmDataNyckel];
      console.log(`[PDF Gen FS] Kostnad ${kostnad.hmDataNyckel}: Värde från HM = ${vardeFranHm}`);
      if (vardeFranHm !== null && vardeFranHm !== undefined && String(vardeFranHm).trim() !== "") {
        if (kostnad.ärText) {
          trySetTextField(form, kostnad.pdfFaltnamn, String(vardeFranHm));
        } else {
          const numerisktVarde = parseFloat(String(vardeFranHm).replace(",", "."));
          if (!isNaN(numerisktVarde)) {
            summaUtgifter += numerisktVarde;
            trySetTextField(form, kostnad.pdfFaltnamn, formatBeloppForPdf(numerisktVarde));
          } else {
            trySetTextField(form, kostnad.pdfFaltnamn, "");
          }
        }
      } else {
        trySetTextField(form, kostnad.pdfFaltnamn, "");
      }
    });
    trySetTextField(form, "summaUtgifter", formatBeloppForPdf(summaUtgifter));
    trySetTextField(form, "ovrigaUpplysningar", ovrigInfoPdf);
    console.log("[PDF Gen FS] Alla fält har försökts fyllas i. Uppdaterar utseende och plattar till...");
    form.getFields().forEach(field => {
      try {
        if (field.defaultUpdateAppearances && typeof field.defaultUpdateAppearances === "function") {
          field.defaultUpdateAppearances(customFont);
        }
      } catch (e) {
        console.warn(`[PDF Gen FS] PDF Fältutseende: Kunde inte uppdatera för ${field.getName()}: ${e.message}`);
      }
    });
    form.flatten();
    console.log("[PDF Gen FS] PDF:en är nu tillplattad.");
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `AnsokanFS_${currentFsKommunNamn.replace(/\s+/g, "_")}_${(hm.Personnummer || "hm").replace(
      /\W/g,
      "_"
    )}_${ansokanAvserManadPdf}_${ansokanAvserArPdf}.pdf`;
    triggerDownload(blob, filename);
    alert(`PDF-ansökan för Försörjningsstöd (${currentFsKommunNamn}) genererad!`);
    console.log(`[PDF Gen FS] PDF '${filename}' skickad för nedladdning.`);
  } catch (error) {
    console.error(`[PDF Gen FS] Allvarligt fel under PDF-generering för ${currentFsKommunNamn}:`, error);
    alert(
      `Kunde inte skapa PDF-ansökan för ${currentFsKommunNamn}.\nFel: ${error.message}\nSe konsolen för mer detaljer.`
    );
  }
}
// Alias för bakåtkompatibilitet
window.onClickGenerateFsPdf = function onClickGenerateFsPdf() {
  return genereraOchLaddaNerForsorjningsstodPdf();
};

function setCivilstandRadioFromCheckboxes(form, baseName, civilstandFromDb) {
  const options = ["Gift", "Sambo", "Ensamstaende"];
  options.forEach(opt => {
    const pdfFieldName = `${baseName}_${opt}`;
    let match = false;
    if (civilstandFromDb) {
      if (civilstandFromDb.toLowerCase().replace("åäö", "aao").startsWith(opt.toLowerCase().substring(0, 3))) {
        match = true;
      }
    }
    trySetCheckbox(form, pdfFieldName, match);
  });
}

function setBostadstypRadioFromCheckboxes(form, baseName, typFromDb, annanTextFromDb) {
  const options = ["Bostadsratt", "Hyresratt", "AndraHand", "Inneboende"];
  let annanKryssad = false;
  options.forEach(opt => {
    const pdfFieldName = `${baseName}_${opt}`;
    let match = false;
    if (typFromDb && typFromDb.toLowerCase().replace(/\s+/g, "") === opt.toLowerCase()) {
      match = true;
      if (opt === "AndraHand" && typFromDb.toLowerCase().includes("andra")) match = true;
    }
    trySetCheckbox(form, pdfFieldName, match);
    if (match) annanKryssad = true;
  });
  if ((typFromDb && typFromDb.toLowerCase() === "annan") || (!annanKryssad && annanTextFromDb)) {
    trySetCheckbox(form, `${baseName}_Annan`, true);
    trySetTextField(form, "Bostad_Typ_AnnanText", annanTextFromDb || typFromDb);
  } else {
    trySetCheckbox(form, `${baseName}_Annan`, false);
  }
}

function setTillgangCheckboxOchVarde(form, baseName, harTillgang, varde) {
  if (harTillgang) {
    trySetCheckbox(form, `${baseName}_Ja`, true);
    trySetCheckbox(form, `${baseName}_Nej`, false);
    trySetTextField(form, `${baseName}_Varde`, formatCurrencyForPdfNoDecimals(varde));
  } else {
    trySetCheckbox(form, `${baseName}_Ja`, false);
    trySetCheckbox(form, `${baseName}_Nej`, true);
    trySetTextField(form, `${baseName}_Varde`, "");
  }
}

function formatCurrencyForPdfNoDecimals(amount, showZeroAsEmpty = true) {
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
  return roundedNum.toLocaleString("sv-SE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
async function genereraSKV4805Pdf() {
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman först innan du genererar SKV 4805!");
    return;
  }
  if (!activeGodManProfile) {
    alert("Välj en aktiv God Man-profil först innan du genererar SKV 4805.");
    return;
  }

  const arvForvaltaEl = document.getElementById("arvForvalta");
  const arvSorjaEl = document.getElementById("arvSorja");
  const arvExtraEl = document.getElementById("arvExtra");
  const skattepliktigKostnadsersattningEl = document.getElementById("arvSkattepliktigKostnadsersattning"); // För ruta 20

  if (!arvForvaltaEl || !arvSorjaEl || !arvExtraEl || !skattepliktigKostnadsersattningEl) {
    alert(
      "Ett eller flera nödvändiga fält för arvodesberäkning (SKV 4805) saknas. Kontrollera HTML-ID:n i arvodesmodalen."
    );
    return;
  }

  const arvForvalta = parseFloat(arvForvaltaEl.value) || 0;
  const arvSorja = parseFloat(arvSorjaEl.value) || 0;
  const arvExtra = parseFloat(arvExtraEl.value) || 0;
  const skattepliktigKostnadsersattningRuta20 = parseFloat(skattepliktigKostnadsersattningEl.value) || 0;

  const summa1_bruttolon_ruta04_eller_11 = arvForvalta + arvSorja + arvExtra;
  const underlagForSkatteavdrag_06 = summa1_bruttolon_ruta04_eller_11;

  let arbetsgivaravgift_07 = 0;
  let alderspensionsavgift_12 = 0;
  const mottagarePnr = activeGodManProfile.Personnummer;
  let mottagareFoddAr = 0;
  if (mottagarePnr && mottagarePnr.length >= 4) {
    mottagareFoddAr = parseInt(mottagarePnr.substring(0, 4));
  }

  if (mottagareFoddAr >= 1959) {
    arbetsgivaravgift_07 = Math.round(summa1_bruttolon_ruta04_eller_11 * 0.3142);
  } else if (mottagareFoddAr >= 1938 && mottagareFoddAr <= 1958) {
    alderspensionsavgift_12 = Math.round(summa1_bruttolon_ruta04_eller_11 * 0.1021);
  }

  const avdragenSkatt_09 = Math.round(underlagForSkatteavdrag_06 * 0.3);
  const summaAttBetala_10 = arbetsgivaravgift_07 + alderspensionsavgift_12 + avdragenSkatt_09;

  const idag = new Date();
  const periodStartValue = document.getElementById("periodStart_ars")?.value;
  const yearForPrompt = periodStartValue ? new Date(periodStartValue).getFullYear() : idag.getFullYear();

  let manadForUtbetalning = prompt(
    `Vilken månad avser utbetalningen av arvodet för ${yearForPrompt} (för SKV 4805)? Ange månadens namn (t.ex. januari).`,
    idag.toLocaleDateString("sv-SE", { month: "long" })
  );
  if (!manadForUtbetalning) {
    alert("Månad för utbetalning måste anges. PDF-generering avbruten.");
    return;
  }
  manadForUtbetalning = manadForUtbetalning.trim().toLowerCase();

  const { PDFDocument, rgb } = PDFLib;
  if (!window.PDFLib || !window.fontkit) {
    alert("PDF-bibliotek är inte korrekt laddat.");
    return;
  }
  const fontkit = window.fontkit;
  const templateUrl = "/Forenklad_arbetsgivardeklaration_mall_fungerar.pdf";
  const fontUrl = "/fonts/LiberationSans-Regular.ttf";

  try {
    const [existingPdfBytes, fontBytes] = await Promise.all([
      fetch(templateUrl).then(res => {
        if (!res.ok) throw new Error(`Mallfel SKV4805: ${res.statusText}`);
        return res.arrayBuffer();
      }),
      fetch(fontUrl).then(res => {
        if (!res.ok) throw new Error(`Fontfel SKV4805: ${res.statusText}`);
        return res.arrayBuffer();
      }),
    ]);
    if (!existingPdfBytes || !fontBytes) throw new Error("Kunde inte ladda PDF-mall eller font.");

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const form = pdfDoc.getForm();
    const hm = currentHuvudmanFullData.huvudmanDetails;
    const gm = activeGodManProfile;

    trySetTextField(form, "Manad", manadForUtbetalning);
    trySetTextField(form, "UtbetalarePnr", hm.Personnummer || "");
    trySetTextField(form, "UtbetalareNamn", `${hm.Fornamn || ""} ${hm.Efternamn || ""}`.trim());
    trySetTextField(form, "Utbetalare_Adress1", `c/o ${gm.Fornamn || ""} ${gm.Efternamn || ""}`.trim());
    trySetTextField(
      form,
      "Utbetalare_Adress2",
      `${gm.Adress || ""}, ${gm.Postnummer || ""} ${gm.Postort || ""}`.trim()
    );
    trySetTextField(form, "MottagarePnr", gm.Personnummer || "");
    trySetTextField(form, "MottagareNamn", `${gm.Fornamn || ""} ${gm.Efternamn || ""}`.trim());
    trySetTextField(form, "Mottagare_Adress1", `${gm.Adress || ""}`);
    trySetTextField(form, "Mottagare_Adress2", `${gm.Postnummer || ""} ${gm.Postort || ""}`.trim());

    if (mottagareFoddAr >= 1938 && mottagareFoddAr <= 1958) {
      trySetTextField(form, "ruta11", formatCurrencyForPdfInteger(summa1_bruttolon_ruta04_eller_11));
      trySetTextField(form, "ruta12", formatCurrencyForPdfInteger(alderspensionsavgift_12));
      trySetTextField(form, "ruta04", "");
      trySetTextField(form, "ruta07", "");
    } else if (mottagareFoddAr >= 1959) {
      trySetTextField(form, "ruta04", formatCurrencyForPdfInteger(summa1_bruttolon_ruta04_eller_11));
      trySetTextField(form, "ruta07", formatCurrencyForPdfInteger(arbetsgivaravgift_07));
      trySetTextField(form, "ruta11", "");
      trySetTextField(form, "ruta12", "");
    } else {
      trySetTextField(form, "ruta04", formatCurrencyForPdfInteger(summa1_bruttolon_ruta04_eller_11));
      trySetTextField(form, "ruta07", "");
      trySetTextField(form, "ruta11", "");
      trySetTextField(form, "ruta12", "");
    }
    trySetTextField(form, "ruta06", formatCurrencyForPdfInteger(underlagForSkatteavdrag_06));
    trySetTextField(form, "ruta09", formatCurrencyForPdfInteger(avdragenSkatt_09));
    trySetTextField(form, "ruta20", formatCurrencyForPdfInteger(skattepliktigKostnadsersattningRuta20));
    trySetTextField(form, "ruta10", formatCurrencyForPdfInteger(summaAttBetala_10));
    trySetTextField(form, "UnderskriftNamn", `${gm.Fornamn || ""} ${gm.Efternamn || ""}`.trim());
    trySetTextField(form, "UnderskriftTelefon", gm.Telefon || gm.Mobil || "");

    form.getFields().forEach(field => {
      try {
        if (field.defaultUpdateAppearances) field.defaultUpdateAppearances(customFont);
      } catch (e) {}
    });
    form.flatten();
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `SKV4805_${yearForPrompt}_${manadForUtbetalning}_${(hm.Personnummer || "hm").replace(
      /\W/g,
      "_"
    )}.pdf`;
    triggerDownload(blob, filename);
    alert("Förenklad Arbetsgivardeklaration (SKV 4805) PDF genererad!");
  } catch (error) {
    console.error("[SKV4805 PDF] Fel:", error);
    alert(`Kunde inte skapa SKV 4805 PDF: ${error.message}`);
  }
}

/**
 * Returnerar databaskolumnens värde ur det AJAX-objekt vi fick från PHP.
 * - **NYTT**: Hanterar alla skiftlägen (VERSALER, PascalCase, camelCase) för alla fält, inklusive sammansatta.
 *
 * @param {string} dbColumnName  t.ex. "huvudman.HeltNamn"
 * @param {object} data          strukturn från PHP (huvudman, godman, overformyndare …)
 * @returns {string}
 */
function resolveDbValue(dbColumnName, data) {
  if (!dbColumnName) return "";

  const [source, ...rest] = dbColumnName.split(".");
  const rawField = rest.join(".");
  const fieldNorm = rawField.toLowerCase();

  // Hjälpfunktion som hittar en egenskap i ett objekt, oavsett skiftläge.
  const getProp = (obj, key) => {
    if (!obj || !key) return "";
    const lowerKey = key.toLowerCase();
    // Hitta den faktiska nyckeln i objektet genom att jämföra med små bokstäver.
    const actualKey = Object.keys(obj).find(k => k.toLowerCase() === lowerKey);
    return actualKey ? obj[actualKey] : "";
  };

  switch (source.toLowerCase()) {
    case "huvudman": {
      const hm = data.huvudman || {};
      if (["heltnamn", "helt_namn"].includes(fieldNorm)) {
        const fn = getProp(hm, "Fornamn"); // Använder getProp
        const en = getProp(hm, "Efternamn"); // Använder getProp
        return `${fn} ${en}`.trim();
      }
      if (fieldNorm === "fulladress")
        return `${getProp(hm, "Adress")}, ${getProp(hm, "Postnummer")} ${getProp(hm, "Ort")}`
          .replace(/^, |, $/g, "")
          .trim();
      if (fieldNorm === "postnummerort") return `${getProp(hm, "Postnummer")} ${getProp(hm, "Ort")}`.trim();
      if (fieldNorm === "kontofullstandigt")
        return `${getProp(hm, "Clearingnummer")}-${getProp(hm, "Kontonummer")}`.replace(/^-|-$/g, "");
      return getProp(hm, rawField);
    }

    case "godmanprofiler": {
      const gm = data.godman || {};
      if (["heltnamn", "helt_namn"].includes(fieldNorm)) {
        const fn = getProp(gm, "Fornamn"); // Använder getProp
        const en = getProp(gm, "Efternamn"); // Använder getProp
        return `${fn} ${en}`.trim();
      }
      if (fieldNorm === "fulladress")
        return `${getProp(gm, "Adress")}, ${getProp(gm, "Postnummer")} ${getProp(gm, "Postort")}`
          .replace(/^, |, $/g, "")
          .trim();
      if (fieldNorm === "postnummerort") return `${getProp(gm, "Postnummer")} ${getProp(gm, "Postort")}`.trim();
      if (fieldNorm === "ortdatum") {
        const ort = getProp(gm, "Postort");
        const datum = new Date().toLocaleDateString("sv-SE");
        return `${ort}, ${datum}`.replace(/^, /, "").trim();
      }
      return getProp(gm, rawField);
    }

    case "overformyndare": {
      const ov = data.overformyndare || {};
      if (fieldNorm === "postnummerort") return `${getProp(ov, "Postnummer")} ${getProp(ov, "Ort")}`.trim();
      return getProp(ov, rawField);
    }

    case "auto":
      const now = new Date();
      if (fieldNorm === "dagens_datum") return now.toLocaleDateString("sv-SE");
      if (fieldNorm === "innevarande_manad") return now.toLocaleString("sv-SE", { month: "long" });
      if (fieldNorm === "innevarande_ar") return now.getFullYear().toString();
      return "";

    default:
      return "";
  }
}

async function startNordeaEdge() {
  const statusDiv = document.getElementById("nordeaEdgeStatus");
  if (!statusDiv) {
    console.error("Element #nordeaEdgeStatus saknas i DOM.");
    alert("Fel: Statusfält för Edge-start saknas.");
    return;
  }

  statusDiv.textContent = "Försöker starta/ansluta till Edge på servern...";
  statusDiv.style.color = "orange";

  try {
    const response = await fetch("/api/nordea/start_edge.php", { method: "POST" });

    // Försök alltid tolka svaret som JSON
    const result = await response.json().catch(() => {
      // Om JSON-tolkning misslyckas, returnera ett felobjekt
      return { error: "Servern gav ett oväntat svar som inte var JSON." };
    });

    if (response.ok) {
      statusDiv.textContent =
        result.message || "Edge bör ha startats/anslutits. Logga in manuellt i det fönster som öppnats.";
      statusDiv.style.color = "green";
    } else {
      statusDiv.textContent = "Fel: " + (result.error || "Okänt fel vid start av Edge.");
      statusDiv.style.color = "red";
    }
  } catch (error) {
    console.error("Nätverksfel vid startNordeaEdge:", error);
    statusDiv.textContent = "Nätverksfel eller så svarar inte servern: " + error.message;
    statusDiv.style.color = "red";
  }
}
async function runNordeaAutomation() {
  const statusDiv = document.getElementById("nordeaAutomationStatus");
  if (!statusDiv) {
    console.error("Element #nordeaAutomationStatus saknas i DOM.");
    alert("Fel: Statusfält för Nordea-automatisering saknas.");
    return;
  }

  const userToSwitchEl = document.getElementById("nordeaUserToSwitch");
  const accountNameEl = document.getElementById("nordeaAccountName");
  const dateFromEl = document.getElementById("nordeaDateFrom");
  const dateToEl = document.getElementById("nordeaDateTo");
  const outputFormatEl = document.querySelector('input[name="nordeaOutputFormat"]:checked');

  if (!userToSwitchEl || !accountNameEl || !dateFromEl || !dateToEl || !outputFormatEl) {
    statusDiv.textContent = "Fel: Ett eller flera formulärfält för Nordea-automatisering saknas i DOM.";
    statusDiv.style.color = "red";
    return;
  }

  const userToSwitch = userToSwitchEl.value.trim();
  const accountName = accountNameEl.value.trim();
  const dateFrom = dateFromEl.value;
  const dateTo = dateToEl.value;
  const outputFormat = outputFormatEl.value;

  if (!userToSwitch || !accountName || !dateFrom || !dateTo) {
    statusDiv.textContent = "Fel: Alla fält (Huvudman, Kontonamn, Från/Till datum) måste fyllas i.";
    statusDiv.style.color = "red";
    return;
  }

  statusDiv.textContent = "Startar automatisering... Detta kan ta en stund. Rör inte mus eller tangentbord.";
  statusDiv.style.color = "orange";

  const payload = {
    user_to_switch: userToSwitch,
    kontonamn: accountName,
    from_date: dateFrom,
    to_date: dateTo,
    output_format: outputFormat,
  };

  try {
    const response = await fetch("/api/nordea/run_automation.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => {
      return { error: "Servern gav ett oväntat svar som inte var JSON." };
    });

    if (response.ok) {
      statusDiv.textContent =
        result.message || "Automatisering slutförd! Kontrollera din dators mapp för Nedladdningar.";
      statusDiv.style.color = "green";
    } else {
      statusDiv.textContent = "Fel vid automatisering: " + (result.error || "Okänt serverfel.");
      statusDiv.style.color = "red";
    }
  } catch (error) {
    console.error("Nätverksfel vid runNordeaAutomation:", error);
    statusDiv.textContent = "Nätverksfel eller så svarar inte servern: " + error.message;
    statusDiv.style.color = "red";
  }
}
async function genereraAutogiroPdf(typ) {
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman först.");
    return;
  }
  const { PDFDocument, rgb } = PDFLib;
  const fontkit = window.fontkit;
  let templateUrl = "",
    pdfBasename = "";
  if (typ === "fardtjanst") {
    templateUrl = "/mall_autogiro_fardtjanst.pdf";
    pdfBasename = "Autogiroanmalan_Fardtjanst";
  } // Korrigerat mallnamn
  else if (typ === "apotekstjanst") {
    templateUrl = "/mall_autogiro_apotekstjanst.pdf";
    pdfBasename = "Autogiroanmalan_Apotekstjanst_Walley";
  } else {
    alert("Okänd autogirotyp: " + typ);
    return;
  }
  const GEMENSAMMA_PDF_FALTNAMN = {
    betalareNamn: "Betalarens förnamn och efternamn",
    betalarePnr: "Personnummer (ååååmmdd-xxxx)",
    betalareAdress: "Adress",
    betalarePostadress: "Postnummer",
    clearing: "Clearingnummer",
    konto: "Kontonummer",
    datum: "Datum",
    rakningkontoBank: "Rakningskonto_Bank",
  };
  const fontUrl = "/fonts/LiberationSans-Regular.ttf";
  try {
    const [existingPdfBytes, fontBytes] = await Promise.all([
      fetch(templateUrl).then(res => {
        if (!res.ok) throw new Error(`Mallfel ${typ}: ${res.statusText}`);
        return res.arrayBuffer();
      }),
      fetch(fontUrl).then(res => {
        if (!res.ok) throw new Error(`Fontfel: ${res.statusText}`);
        return res.arrayBuffer();
      }),
    ]);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    pdfDoc.registerFontkit(fontkit);
    const customFont = await pdfDoc.embedFont(fontBytes);
    const form = pdfDoc.getForm();
    const hm = currentHuvudmanFullData.huvudmanDetails;
    const betalareNamnData = `${hm.Fornamn || ""} ${hm.Efternamn || ""}`.trim();
    const betalarePnrData = hm.Personnummer || "";
    const clearingData = hm.Clearingnummer || ""; // Använder huvudmannens generella
    const kontoData = hm.Kontonummer || "";
    const idag = new Date();
    const dagensDatumData = `${idag.getFullYear()}-${String(idag.getMonth() + 1).padStart(2, "0")}-${String(
      idag.getDate()
    ).padStart(2, "0")}`;
    const rakningkontoBankData = hm.Banknamn || "";
    if (GEMENSAMMA_PDF_FALTNAMN.betalareNamn)
      trySetTextField(form, GEMENSAMMA_PDF_FALTNAMN.betalareNamn, betalareNamnData);
    if (GEMENSAMMA_PDF_FALTNAMN.betalarePnr)
      trySetTextField(form, GEMENSAMMA_PDF_FALTNAMN.betalarePnr, betalarePnrData);
    if (GEMENSAMMA_PDF_FALTNAMN.clearing) trySetTextField(form, GEMENSAMMA_PDF_FALTNAMN.clearing, clearingData);
    if (GEMENSAMMA_PDF_FALTNAMN.konto) trySetTextField(form, GEMENSAMMA_PDF_FALTNAMN.konto, kontoData);
    if (GEMENSAMMA_PDF_FALTNAMN.datum) trySetTextField(form, GEMENSAMMA_PDF_FALTNAMN.datum, dagensDatumData);
    if (GEMENSAMMA_PDF_FALTNAMN.rakningkontoBank)
      trySetTextField(form, GEMENSAMMA_PDF_FALTNAMN.rakningkontoBank, rakningkontoBankData);
    if (GEMENSAMMA_PDF_FALTNAMN.betalareAdress)
      trySetTextField(form, GEMENSAMMA_PDF_FALTNAMN.betalareAdress, hm.Adress || "");
    if (GEMENSAMMA_PDF_FALTNAMN.betalarePostadress)
      trySetTextField(
        form,
        GEMENSAMMA_PDF_FALTNAMN.betalarePostadress,
        `${hm.Postnummer || ""} ${hm.Ort || ""}`.trim()
      );
    form.getFields().forEach(field => {
      try {
        if (field.defaultUpdateAppearances) field.defaultUpdateAppearances(customFont);
      } catch (e) {}
    });
    form.flatten();
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `${pdfBasename}_${(hm.Personnummer || "hm").replace(/\W/g, "_")}.pdf`;
    triggerDownload(blob, filename);
    alert(`Autogiro-PDF för '${typ}' genererad!`);
  } catch (error) {
    alert(`Kunde inte skapa Autogiro-PDF för '${typ}': ${error.message}`);
  }
}

async function generateLetterPdf() {
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman först.");
    return;
  }
  if (!activeGodManProfile) {
    alert("Välj en aktiv God Man-profil först.");
    return;
  }
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;
  const margin = 50;
  let y = height - margin;
  let template = document.getElementById("letterTemplate").value;
  const hm = currentHuvudmanFullData.huvudmanDetails;
  const gm = activeGodManProfile;
  const placeholders = {
    "{{HUVUDMAN_FORNAMN}}": hm.Fornamn || "",
    "{{HUVUDMAN_EFTERNAMN}}": hm.Efternamn || "",
    "{{HUVUDMAN_PNR}}": hm.Personnummer || "",
    "{{HUVUDMAN_ADRESS}}": hm.Adress || "",
    "{{HUVUDMAN_POSTNR}}": hm.Postnummer || "",
    "{{HUVUDMAN_POSTORT}}": hm.Ort || "",
    "{{HUVUDMAN_VISTELSEADRESS}}": hm.Vistelseadress || hm.Adress || "", // Korrigerat från Huvudman_Vistelseadress
    "{{HUVUDMAN_VISTELSEPOSTNR}}": hm.Vistelsepostnr || hm.Postnummer || "", // Korrigerat
    "{{HUVUDMAN_VISTELSEORT}}": hm.Vistelseort || hm.Ort || "", // Korrigerat
    "{{GODMAN_FORNAMN}}": gm.Fornamn || "",
    "{{GODMAN_EFTERNAMN}}": gm.Efternamn || "",
    "{{GODMAN_ADRESS}}": gm.Adress || "",
    "{{GODMAN_POSTNR}}": gm.Postnummer || "",
    "{{GODMAN_POSTORT}}": gm.Postort || "",
    "{{GODMAN_TELEFON}}": gm.Telefon || "",
    "{{GODMAN_MOBIL}}": gm.Mobil || "",
    "{{GODMAN_EPOST}}": gm.Epost || "",
    "{{DAGENS_DATUM}}": new Date().toLocaleDateString("sv-SE"),
  };
  for (const key in placeholders) {
    template = template.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), placeholders[key]);
  }
  const lines = template.split("\n");
  for (const line of lines) {
    if (y < margin + fontSize) {
      page = pdfDoc.addPage();
      y = height - margin;
    }
    page.drawText(line, {
      x: margin,
      y: y,
      font: font,
      size: fontSize,
      color: rgb(0, 0, 0),
      lineHeight: fontSize * 1.2,
    });
    y -= fontSize * 1.2;
  }
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const filename = `Brev_${(hm.Personnummer || "hm").replace(/\W/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  triggerDownload(blob, filename);
}

function formatDateForPdf(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// --- godman_logic.js ---

function formatCurrencyForPdf(amount, showZeroAsEmpty = false) {
  // Lade till showZeroAsEmpty
  if (amount === null || amount === undefined || String(amount).trim() === "") {
    return showZeroAsEmpty ? "" : "0,00"; // Visa 0,00 om inte showZeroAsEmpty är sant
  }
  const cleanedString = String(amount).replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleanedString);

  if (isNaN(num)) {
    return showZeroAsEmpty ? "" : "0,00";
  }
  // Alltid två decimaler, använd svensk formatering (komma som decimaltecken)
  return num.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrencyForPdfInteger(amount, showZeroAsEmpty = true) {
  if (
    amount === null ||
    amount === undefined ||
    String(amount).trim() === "" ||
    isNaN(parseFloat(String(amount).replace(",", ".")))
  ) {
    return showZeroAsEmpty ? "" : "0";
  }
  const num = parseFloat(String(amount).replace(",", "."));
  if (isNaN(num)) return showZeroAsEmpty ? "" : "0";

  const roundedNum = Math.round(num); // Avrunda till närmaste heltal

  if (showZeroAsEmpty && roundedNum === 0) return "";

  return roundedNum.toLocaleString("sv-SE", {
    // Svensk formatering för tusentalsavgränsare
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// triggerDownload (du bör redan ha denna)
function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

function trySetTextField(form, fieldName, value) {
  try {
    const field = form.getField(fieldName);
    if (!field) {
      console.warn(`[PDF TextFält] Fältet '${fieldName}' hittades INTE i PDF-mallen. Möjliga PDF-fält:`);
      // Visa alla tillgängliga fält för debugging
      try {
        const allFields = form.getFields().map(f => f.getName());
        console.log('Tillgängliga fält i PDF:', allFields);
      } catch (e) {
        console.log('Kunde inte lista fält:', e.message);
      }
      return;
    }
    if (typeof field.setText === "function") {
      field.setText(value === null || value === undefined ? "" : String(value));
      console.log(`[PDF TextFält] ✓ Fältet '${fieldName}' fyllt med: "${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}"`);
    } else {
      console.warn(`[PDF TextFält] Fältet '${fieldName}' är inte ett textfält. Typ: ${field.constructor.name}`);
    }
  } catch (e) {
    console.warn(`[PDF TextFält FEL] Kunde inte hantera fältet '${fieldName}' med värdet '${value}': ${e.message}`);
  }
}

// --- MODAL: Ny Huvudman ---
function nyHuvudman() {
  document.getElementById("newHmPnr").value = "";
  document.getElementById("newHmFornamn").value = "";
  document.getElementById("newHmEfternamn").value = "";
  document.getElementById("newHmAdress").value = "";
  document.getElementById("newHmPostnr").value = "";
  document.getElementById("newHmPostort").value = "";
  populateOverformyndareSelect(allOverformyndare, null, "newHmOverformyndareSelect");
  document.getElementById("nyHuvudmanModal").style.display = "block";
}

async function saveNewHuvudman() {
  const nyHuvudmanData = {
    Personnummer: document.getElementById("newHmPnr").value.trim(),
    Fornamn: document.getElementById("newHmFornamn").value.trim(),
    Efternamn: document.getElementById("newHmEfternamn").value.trim(),
    Adress: document.getElementById("newHmAdress").value.trim() || null,
    Postnummer: document.getElementById("newHmPostnr").value.trim() || null,
    Ort: document.getElementById("newHmPostort").value.trim() || null,
    OverformyndareID: document.getElementById("newHmOverformyndareSelect").value || null,
  };
  if (!nyHuvudmanData.Personnummer || !nyHuvudmanData.Fornamn || !nyHuvudmanData.Efternamn) {
    alert("Personnummer, Förnamn och Efternamn är obligatoriska.");
    return;
  }
  try {
    const response = await fetch("/api/create_huvudman.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nyHuvudmanData),
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message || "Ny huvudman tillagd!");
      closeNyHuvudmanModal();
      await loadHuvudmanOptions();
      if (result.huvudman && result.huvudman.Personnummer && huvudmanChoicesInstance) {
        huvudmanChoicesInstance.setChoiceByValue(result.huvudman.Personnummer);
        document.getElementById("huvudmanSelect").dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else {
      alert(`Kunde inte lägga till huvudman: ${result.error || response.statusText}`);
    }
  } catch (error) {
    alert("Nätverksfel vid tillägg av ny huvudman.");
  }
}
function closeNyHuvudmanModal() {
  document.getElementById("nyHuvudmanModal").style.display = "none";
}

// --- MODAL: Överförmyndare ---
/** Fyll en given select med ÖF-alternativ */
function populateOverformyndareSelect(list, selectedId, targetId) {
  const sel = document.getElementById(targetId);
  if (!sel) return; // inget att fylla

  const prev = sel.value || selectedId || "";
  sel.innerHTML = ""; // rensa

  // Default-option
  const first = document.createElement("option");
  first.value = "";
  first.textContent = targetId === "huvudmanFilterOF" ? "Alla överförmyndare" : "-- Välj Överförmyndare --";
  sel.appendChild(first);

  // Lista
  (list || []).forEach(of => {
    const opt = document.createElement("option");
    opt.value = String(of.ID ?? of.id ?? "");
    opt.textContent = of.Namn ?? of.namn ?? "";
    sel.appendChild(opt);
  });

  // Återställ tidigare val om möjligt
  if (prev) sel.value = prev;
}

function openNewOverformyndareModal() {
  document.getElementById("ofnModalTitle").textContent = "Lägg till Ny Överförmyndare";
  document.getElementById("editOfnId").value = ""; // Töm ID-fältet
  document.getElementById("newOfnNamn").value = "";
  document.getElementById("newOfnAdress").value = "";
  document.getElementById("newOfnPostnummer").value = "";
  document.getElementById("newOfnPostort").value = "";
  document.getElementById("newOfnTelefon").value = "";
  document.getElementById("newOfnEpost").value = "";
  document.getElementById("overformyndareModal").style.display = "block";
}
// En gemensam funktion för att spara (både ny och redigerad)
async function saveOverformyndare() {
  const ofId = document.getElementById("editOfnId").value;
  const newData = {
    Namn: document.getElementById("newOfnNamn").value.trim(),
    Adress: document.getElementById("newOfnAdress").value.trim(),
    Postnummer: document.getElementById("newOfnPostnummer").value.trim(),
    Postort: document.getElementById("newOfnPostort").value.trim(),
    Telefon: document.getElementById("newOfnTelefon").value.trim(),
    Epost: document.getElementById("newOfnEpost").value.trim(),
  };

  if (!newData.Namn) {
    alert("Namn på enhet måste anges.");
    return;
  }

  const isEditing = !!ofId;
  const method = isEditing ? "PUT" : "POST";
  const url = isEditing ? `/api/update_overformyndare.php?id=${ofId}` : "/api/add_overformyndare.php";

  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newData),
    });

    const result = await response.json();

    if (response.ok) {
      alert(result.message || "Överförmyndare sparad!");
      closeOverformyndareModal();

      const currentHmOfId = document.getElementById("overformyndareSelect").value;
      const savedId = result.id || ofId;

      await loadOverformyndareList();

      const overformyndareSelect = document.getElementById("overformyndareSelect");
      if (isEditing) {
        overformyndareSelect.value = savedId;
      } else {
        overformyndareSelect.value = currentHmOfId;
      }
    } else {
      alert(`Kunde inte spara: ${result.error || response.statusText}`);
    }
  } catch (error) {
    console.error("Nätverksfel vid sparande av överförmyndare:", error);
    alert("Nätverksfel vid sparande av överförmyndare.");
  }
}

function closeOverformyndareModal() {
  document.getElementById("overformyndareModal").style.display = "none";
}

// --- MODAL: Regler ---
let rulesCache = [];
async function loadRules(forceRefresh = false) {
  if (!forceRefresh && rulesCache && rulesCache.length > 0) {
    // Kontrollera att rulesCache inte är null
    console.log("[RULES] Använder cachade regler:", rulesCache.length);
    displayRules(rulesCache);
    return;
  }
  try {
    console.log("[RULES] Tvingar uppdatering eller cache är tom. Hämtar från server...");
    rulesCache = await fetchRules(); // Uppdatera den globala rulesCache
    console.log("[RULES] rulesCache uppdaterad, antal regler:", rulesCache ? rulesCache.length : 0);
    displayRules(rulesCache || []); // Skicka tom array om rulesCache är null/undefined
  } catch (error) {
    console.error("Fel vid laddning av regler i loadRules:", error);
    rulesCache = []; // Säkerställ att rulesCache är en array
    displayRules([]);
  }
}

function displayRules(rules) {
  const tbody = document.getElementById("rulesTable")?.querySelector("tbody");
  if (!tbody) {
    console.warn("Element #rulesTable tbody hittades inte för att visa regler.");
    return;
  }
  tbody.innerHTML = ""; // Rensa befintliga rader

  if (!rules || rules.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><i>Inga regler att visa.</i></td></tr>';
    return;
  }

  // Sortera efter Prioritet (stort P), sedan kanske ID eller MatchText
  rules
    .sort((a, b) => (b.Prioritet || 0) - (a.Prioritet || 0) || a.ID - b.ID)
    .forEach(rule => {
      const row = tbody.insertRow();
      row.insertCell().textContent = rule.MatchningsTyp || ""; // Använd stort M, T
      row.insertCell().textContent = rule.MatchningsText || ""; // Använd stort M, T

      const kategoriObj = ALL_KATEGORIER[rule.Kategori]; // Stort K
      row.insertCell().textContent = kategoriObj ? kategoriObj.namn : rule.Kategori || "";

      row.insertCell().textContent = rule.Prioritet !== undefined ? rule.Prioritet : 0; // Stort P

      const actionsCell = row.insertCell();
      actionsCell.innerHTML = `
            <button class="small" onclick="editRule(${rule.ID})">Ändra</button>
            <button class="small danger" onclick="deleteRule_prompt(${rule.ID})">Ta bort</button>
        `;
    });
}

function openRuleModal(ruleId = null, prefillData = null) {
  const modal = document.getElementById("ruleModal");
  if (!modal) {
    console.error("Regel-modalen hittades inte i DOM.");
    return;
  }

  document.getElementById("ruleId").value = ruleId || "";

  if (ruleId) {
    // Redigera en befintlig regel
    document.getElementById("modalTitle").textContent = "Redigera Regel";
    const rule = rulesCache.find(r => r.ID === ruleId); // Använd stort ID
    if (rule) {
      document.getElementById("matchType").value = rule.MatchningsTyp;
      document.getElementById("matchText").value = rule.MatchningsText;
      document.getElementById("ruleCategory").value = rule.Kategori;
      document.getElementById("rulePriority").value = rule.Prioritet || 0;
    }
  } else {
    // Skapa en ny regel
    document.getElementById("modalTitle").textContent = "Lägg till Ny Regel";
    // Använd förifylld data om den finns, annars standardvärden
    document.getElementById("matchType").value = prefillData?.matchType || "Innehåller";
    document.getElementById("matchText").value = prefillData?.matchText || "";
    document.getElementById("ruleCategory").value = prefillData?.category || "";
    document.getElementById("rulePriority").value = prefillData?.priority || 10;
  }

  modal.style.display = "block";
}

async function saveRule() {
  const ruleId = document.getElementById("ruleId").value;
  const data = {
    MatchningsTyp: document.getElementById("matchType").value,
    MatchningsText: document.getElementById("matchText").value,
    Kategori: document.getElementById("ruleCategory").value,
    Prioritet: parseInt(document.getElementById("rulePriority").value) || 0,
  };

  if (!data.MatchningsTyp || !data.MatchningsText || !data.Kategori) {
    alert("Matchningstyp, Matchningstext och Kategori måste anges.");
    return;
  }

  // Bestäm metod och URL
  const method = ruleId ? "PUT" : "POST";
  // Skicka ID som en parameter i URL:en för PUT, annars ingen parameter för POST
  const url = ruleId ? `/api/save_rule.php?id=${ruleId}` : "/api/save_rule.php";

  console.log(`[SaveRule] Skickar ${method} till ${url}`);

  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.ok) {
      closeRuleModal();
      await loadRules(true); // Tvinga omladdning av regellistan

      // Kategorisera om befintliga transaktioner om det finns några
      if (processedTransactions.length > 0) {
        console.log("[SaveRule] Regler sparade, kategoriserar om befintliga transaktioner...");
        processedTransactions = await autoCategorizeTransactions(processedTransactions);
        displayReviewTable();
        calculateAndDisplayBalance();
      }
      alert(result.message || "Regel sparad!");
    } else {
      alert(`Fel vid sparande av regel: ${result.error || response.statusText}`);
    }
  } catch (error) {
    console.error("Nätverksfel eller JS-fel vid sparande av regel:", error);
    alert("Nätverksfel vid sparande av regel.");
  }
}
function editRule(ruleId) {
  openRuleModal(ruleId);
}

async function deleteRule_prompt(ruleId) {
  if (confirm("Är du säker på att du vill ta bort denna regel?")) {
    try {
      const response = await fetch(`/api/delete_rule.php/${ruleId}`, { method: "DELETE" });
      if (response.ok) {
        await loadRules(true);
        if (processedTransactions.length > 0) {
          processedTransactions = await autoCategorizeTransactions(processedTransactions);
          displayReviewTable();
          calculateAndDisplayBalance();
        }
      } else {
        const error = await response.json();
        alert(`Fel vid borttagning: ${error.error}`);
      }
    } catch (error) {
      console.error("Fel vid borttagning av regel:", error);
      alert("Nätverksfel vid borttagning av regel.");
    }
  }
}

function closeRuleModal() {
  document.getElementById("ruleModal").style.display = "none";
}

// --- MODAL: Justeringar ---
function openAdjustmentModal(transactionId) {
  const transaction = processedTransactions.find(t => t.id === transactionId);
  if (!transaction) return;
  document.getElementById("adjustmentTransactionId").value = transactionId;
  document.getElementById("adjustmentModalDate").textContent = transaction.datum;
  document.getElementById("adjustmentModalText").textContent = transaction.text;
  document.getElementById("adjustmentOriginalAmountDisplay").value = formatCurrencyForPdf(
    transaction.ursprungligtBelopp
  );
  document.getElementById("adjustmentOriginalAmountValue").value = transaction.ursprungligtBelopp;
  document.getElementById("adjustmentTax").value = transaction.justeringar?.skatt || 0;
  document.getElementById("adjustmentGarnishment").value = transaction.justeringar?.utmatning || 0;
  document.getElementById("adjustmentHousing").value = transaction.justeringar?.bostadsbidrag || 0;
  document.getElementById("adjustmentAddCost").value = transaction.justeringar?.merkostnadsersattning || 0;
  calculateAdjustedGrossIncome();
  document.getElementById("adjustmentModal").style.display = "block";
}

function calculateAdjustedGrossIncome() {
  const originalAmount = parseFloat(document.getElementById("adjustmentOriginalAmountValue").value) || 0;
  const tax = parseFloat(document.getElementById("adjustmentTax").value) || 0;
  const garnishment = parseFloat(document.getElementById("adjustmentGarnishment").value) || 0;
  const housing = parseFloat(document.getElementById("adjustmentHousing").value) || 0;
  const addCost = parseFloat(document.getElementById("adjustmentAddCost").value) || 0;
  const calculatedGross = originalAmount + tax + garnishment - housing - addCost;
  document.getElementById("adjustmentCalculatedGross").textContent = formatCurrencyForPdf(calculatedGross);
  document.getElementById("adjustmentCalculatedHousing").textContent = formatCurrencyForPdf(housing);
  document.getElementById("adjustmentCalculatedAddCost").textContent = formatCurrencyForPdf(addCost);
}

function saveTransactionAdjustments() {
  const transactionId = document.getElementById("adjustmentTransactionId").value;
  const transaction = processedTransactions.find(t => t.id === transactionId);
  if (!transaction) return;

  // Hämta justeringsvärdena från modalen
  const tax = parseFloat(document.getElementById("adjustmentTax").value) || 0;
  const garnishment = parseFloat(document.getElementById("adjustmentGarnishment").value) || 0;
  const housing = parseFloat(document.getElementById("adjustmentHousing").value) || 0;
  const addCost = parseFloat(document.getElementById("adjustmentAddCost").value) || 0;

  // 1. Uppdatera den aktuella transaktionen som du redigerade
  transaction.justeringar = {
    skatt: tax,
    utmatning: garnishment,
    bostadsbidrag: housing,
    merkostnadsersattning: addCost,
  };
  if (ALL_KATEGORIER[transaction.kategori]?.justerbar) {
    transaction.belopp = transaction.ursprungligtBelopp + tax + garnishment - housing - addCost;
  }

  // --- NY LOGIK STARTAR HÄR ---
  // 2. Fråga om att applicera på framtida transaktioner av samma typ
  if (transaction.kategori === "LönerPensioner") {
    if (
      confirm(
        "Vill du applicera dessa justeringar på alla framtida transaktioner i samma kategori (Brutto inkomst...)?"
      )
    ) {
      // Hitta index för den nuvarande transaktionen för att veta var vi ska börja
      const currentIndex = processedTransactions.findIndex(t => t.id === transactionId);

      if (currentIndex !== -1) {
        // Loopa igenom alla transaktioner EFTER den nuvarande
        for (let i = currentIndex + 1; i < processedTransactions.length; i++) {
          let futureTransaction = processedTransactions[i];

          // Om en framtida transaktion är i samma kategori, applicera justeringarna
          if (futureTransaction.kategori === "LönerPensioner") {
            console.log(`Applicerar justeringar på framtida transaktion: ${futureTransaction.text}`);

            futureTransaction.justeringar = {
              skatt: tax,
              utmatning: garnishment,
              bostadsbidrag: housing,
              merkostnadsersattning: addCost,
            };

            // Beräkna om dess "belopp" baserat på dess eget ursprungliga belopp
            if (ALL_KATEGORIER[futureTransaction.kategori]?.justerbar) {
              futureTransaction.belopp = futureTransaction.ursprungligtBelopp + tax + garnishment - housing - addCost;
            }
          }
        }
      }
    }
  }
  // --- NY LOGIK SLUTAR HÄR ---

  // 3. Stäng modalen och uppdatera gränssnittet som vanligt
  closeAdjustmentModal();
  displayReviewTable();
  calculateAndDisplayBalance();
}

function closeAdjustmentModal() {
  document.getElementById("adjustmentModal").style.display = "none";
}

function openArvodesModal() {
  console.log(
    "[ARVODESMODAL] Öppnar modal. currentHuvudmanFullData:",
    JSON.stringify(currentHuvudmanFullData, null, 2)
  );
  const f = currentHuvudmanFullData?.huvudmanDetails;
  if (!f) {
    alert("Ingen huvudman vald. Välj en huvudman på 'Huvudman'-fliken först.");
    return;
  }
  const namnSpan = document.getElementById("arvModalNamn"); // NYTT ID
  const personnummerSpan = document.getElementById("arvModalPersonnummer"); // NYTT ID
  const adressSpan = document.getElementById("arvModalAdress"); // NYTT ID
  const postnummerSpan = document.getElementById("arvModalPostnummer"); // NYTT ID
  const ortSpan = document.getElementById("arvModalOrt"); // NYTT ID

  if (!namnSpan || !personnummerSpan || !adressSpan || !postnummerSpan || !ortSpan) {
    console.error("Ett eller flera informationsfält saknas i arvodesmodalen. Kontrollera HTML-ID:n.");
  }
  if (namnSpan) namnSpan.textContent = `${f.Fornamn || ""} ${f.Efternamn || ""}`.trim() || f.HeltNamn || "Namn saknas";
  if (personnummerSpan) personnummerSpan.textContent = f.Personnummer || "Pnr saknas";
  if (adressSpan) adressSpan.textContent = f.Adress || "Adress saknas";
  if (postnummerSpan) postnummerSpan.textContent = f.Postnummer || "Postnr saknas";
  if (ortSpan) ortSpan.textContent = f.Ort || "Ort saknas";

  document.getElementById("arvForvalta").value = "";
  document.getElementById("arvSorja").value = "";
  document.getElementById("arvExtra").value = "";
  document.getElementById("arvBilersattning").value = "";
  document.getElementById("arvKostnadsersattning").value = "";
  document.getElementById("arvDeklInskickad").value = "";
  const arvodesModalEl = document.getElementById("arvodesModal");
  if (arvodesModalEl) {
    arvodesModalEl.style.display = "block";
  } else {
    console.error("Kunde inte hitta arvodesModal för att visa den!");
    return;
  }
  beraknaArvode();
}

function beraknaArvode() {
  const arvForvalta = parseFloat(document.getElementById("arvForvalta").value) || 0;
  const arvSorja = parseFloat(document.getElementById("arvSorja").value) || 0;
  const arvExtra = parseFloat(document.getElementById("arvExtra").value) || 0;
  const bilersattning = parseFloat(document.getElementById("arvBilersattning").value) || 0;
  const kostnadsersattning = parseFloat(document.getElementById("arvKostnadsersattning").value) || 0;
  const summa1 = arvForvalta + arvSorja + arvExtra;
  const summaErsattning = bilersattning + kostnadsersattning;
  const arvodeEfterSkatt = Math.round(summa1 * 0.7);
  const arbetsgivaravgift = Math.round(summa1 * 0.3142);
  const avdragenSkatt = Math.round(summa1 * 0.3);
  const tillStallforetradare = arvodeEfterSkatt + summaErsattning;
  const tillSkatteverket = arbetsgivaravgift + avdragenSkatt;
  document.getElementById("arvSumma1").textContent = formatCurrencyForPdf(summa1);
  document.getElementById("arvSummaErsattning").textContent = formatCurrencyForPdf(summaErsattning);
  document.getElementById("calcBruttoArvode").textContent = formatCurrencyForPdf(summa1);
  document.getElementById("calcArvodeEfterSkatt").textContent = formatCurrencyForPdf(arvodeEfterSkatt);
  document.getElementById("calcArbetsgivaravgift").textContent = formatCurrencyForPdf(arbetsgivaravgift);
  document.getElementById("calcAvdragenSkatt").textContent = formatCurrencyForPdf(avdragenSkatt);
  document.getElementById("calcTillStallforetradare").textContent = formatCurrencyForPdf(tillStallforetradare);
  document.getElementById("calcTillSkatteverket").textContent = formatCurrencyForPdf(tillSkatteverket);
  if (currentHuvudmanFullData && currentHuvudmanFullData.huvudmanDetails?.Personnummer) {
    document.getElementById("arvOCR").textContent = generateSkatteverketOcr(
      currentHuvudmanFullData.huvudmanDetails.Personnummer
    );
  } else {
    document.getElementById("arvOCR").textContent = "Pnr saknas";
  }
}

function closeArvodesModal() {
  document.getElementById("arvodesModal").style.display = "none";
}

function renderDynamicList(containerId, items, typePrefix, rowCreatorFunction) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[renderDynamicList] Container '${containerId}' ej funnen.`);
    return;
  }
  container.innerHTML = ""; // Rensa först

  if (!items || items.length === 0) {
    return;
  }

  items.forEach(item => {
    // VIKTIGT: Skicka med item.pairId till radskapande funktion
    const rowElement = rowCreatorFunction(typePrefix, item, item.pairId || null);
    container.appendChild(rowElement);
  });
  renumberDynamicListRowsVisual(containerId);
}

function collectDynamicListData(containerId, fieldNamesPascalCase) {
  console.log(`[collectDynamicListData] Startar för container: '${containerId}'`);
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[collectDynamicListData] Container '${containerId}' hittades inte.`);
    return [];
  }

  const items = [];
  container.querySelectorAll(".dynamic-list-item").forEach(rowElement => {
    // Hoppa över det autogenererade räkningskontot, det ska inte sparas som en manuell rad.
    if (rowElement.dataset.isRakningskonto === "true") {
      return;
    }

    const item = {};
    let hasAnyData = false;

    // *** VIKTIG DEL: Hämta pairId från rad-elementet ***
    if (rowElement.dataset.pairId) {
      item.pairId = rowElement.dataset.pairId;
    }

    // Gå igenom alla fält och samla in deras värden
    fieldNamesPascalCase.forEach(fieldNamePC => {
      const inputElement = rowElement.querySelector(`[data-field="${fieldNamePC}"]`);
      if (inputElement) {
        let value;
        if (
          inputElement.type === "number" ||
          inputElement.classList.contains("kronor") ||
          inputElement.classList.contains("belopp")
        ) {
          const valStr = (inputElement.value || "").replace(",", ".");
          const numVal = parseFloat(valStr);
          value = valStr.trim() === "" || isNaN(numVal) ? null : valStr.trim() === "" ? null : numVal;
        } else {
          value = (inputElement.value || "").trim() || null;
        }
        item[fieldNamePC] = value;
        if (value !== null && String(value).trim() !== "") {
          hasAnyData = true;
        }
      } else {
        item[fieldNamePC] = null;
      }
    });

    // Lägg bara till raden i listan om den innehåller någon data
    if (hasAnyData) {
      items.push(item);
    }
  });

  // Tilldela RadNr sist, baserat på de rader som faktiskt hade data
  const finalItems = items.map((item, idx) => ({ ...item, RadNr: idx + 1 }));
  console.log(
    `[collectDynamicListData] Avslutar för '${containerId}'. Returnerar ${finalItems.length} objekt:`,
    JSON.parse(JSON.stringify(finalItems))
  );
  return finalItems;
}
function createBankkontoRow(
  typePrefix,
  data = { RadNr: null, Beskrivning: "", Kronor: null, BilagaRef: "", OFnot: "" },
  isRakningskonto = false,
  pairId = null
) {
  const currentPairId = isRakningskonto ? null : pairId;

  // console.log(`[createBankkontoRow] Skapar rad för typ: '${typePrefix}', Rakningskonto: ${isRakningskonto}, PairID: ${currentPairId}, Data in:`, JSON.stringify(data));
  const div = document.createElement("div");
  div.className = "dynamic-list-item bankkonto-rad";

  if (currentPairId) {
    div.dataset.pairId = currentPairId;
  }
  if (isRakningskonto) {
    div.dataset.isRakningskonto = "true";
  }

  let kronorForInputValue = "";
  if (data.Kronor !== null && data.Kronor !== undefined && !isNaN(parseFloat(data.Kronor))) {
    kronorForInputValue = parseFloat(data.Kronor).toFixed(2);
  }

  const beskrivningDisabled = isRakningskonto ? "disabled" : "";
  const kronorDisabled = isRakningskonto ? "disabled" : "";
  const taBortKnappHtml = isRakningskonto
    ? ""
    : `<button type="button" class="small danger" onclick="removeBankkontoPair(this)">Ta bort</button>`;

  div.innerHTML = `
        <label style="min-width:40px;">Rad ${data.RadNr || (isRakningskonto ? "1 (Räkning)" : "Ny")}:</label>
        <input type="text" class="beskrivning" data-field="Beskrivning" placeholder="Kontotyp/Bank" value="${
          data.Beskrivning || ""
        }" ${beskrivningDisabled}>
        <input type="number" step="0.01" class="kronor" data-field="Kronor" placeholder="Kronor" value="${kronorForInputValue}" ${kronorDisabled}>
        <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${
          data.BilagaRef || ""
        }">
        <input type="text" class="ofnot" data-field="OFnot" placeholder="ÖF not." value="${data.OFnot || ""}">
        ${taBortKnappHtml}
    `;

  if (typePrefix === "BankkontoStart" && !isRakningskonto && currentPairId) {
    const fieldsToSync = ["Beskrivning", "BilagaRef", "OFnot"]; // Fält som ska synkas

    fieldsToSync.forEach(fieldName => {
      const inputElement = div.querySelector(`input[data-field="${fieldName}"]`);
      if (inputElement) {
        inputElement.addEventListener("input", event => {
          const sourceValue = event.target.value;
          const actualPairId = div.dataset.pairId; // Hämta alltid från elementet vid event-tillfället

          if (!actualPairId) return;

          const slutRadElement = document.querySelector(
            `#hmBankkontonSlutContainer .dynamic-list-item[data-pair-id="${actualPairId}"]`
          );
          if (slutRadElement) {
            const targetSlutInput = slutRadElement.querySelector(`input[data-field="${fieldName}"]`);
            if (targetSlutInput) {
              targetSlutInput.value = sourceValue;
              console.log(
                `  [Sync Bankkonto] Uppdaterade SLUT-rad (pairId: ${actualPairId}), fält '${fieldName}' till '${sourceValue}'`
              );
            } else {
              console.warn(
                `  [Sync Bankkonto] Kunde inte hitta target input för fält '${fieldName}' på SLUT-rad med pairId ${actualPairId}`
              );
            }
          } else {
            console.warn(
              `  [Sync Bankkonto] Kunde inte hitta SLUT-rad med pairId ${actualPairId} för att synka fält '${fieldName}'`
            );
          }
        });
      }
    });
    console.log(
      `  [createBankkontoRow] Event listeners för synkning (Beskrivning, BilagaRef, OFnot) tillagda för START-bankkontorad med pairId: ${currentPairId}`
    );
  }
  return div;
}
function addBankkontoRow(periodType, containerId) {
  // periodType är 'Start' eller 'Slut'
  console.log(`[addBankkontoRow] Anropad för periodType: '${periodType}', containerId: '${containerId}'`);
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[addBankkontoRow] Container '${containerId}' not found.`);
    return;
  }

  // Räkna befintliga rader för att bestämma nästa RadNr.
  // Räkna inte med räkningskontot om det redan finns.
  let nextRadNrInThisContainer = 1;
  container.querySelectorAll(".dynamic-list-item").forEach(item => {
    if (item.dataset.isRakningskonto !== "true") {
      nextRadNrInThisContainer++;
    }
  });
  // Om det är första manuella raden, och räkningskonto finns, ska den bli Rad 2.
  if (container.querySelector('.dynamic-list-item[data-is-rakningskonto="true"]') && nextRadNrInThisContainer === 1) {
    nextRadNrInThisContainer = 2;
  }

  const rowTypePrefix = containerId.includes("Start") ? "BankkontoStart" : "BankkontoSlut";

  if (rowTypePrefix === "BankkontoStart") {
    const newPairId = `bkpair-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    console.log(`  [addBankkontoRow] Nytt bankkonto pairId genererat: ${newPairId}`);

    // Skapa och lägg till START-raden (inte ett räkningskonto, med pairId)
    const startRadData = { RadNr: nextRadNrInThisContainer, Beskrivning: "", Kronor: null, BilagaRef: "", OFnot: "" };
    const newStartRowElement = createBankkontoRow("BankkontoStart", startRadData, false, newPairId);
    container.appendChild(newStartRowElement);
    console.log(
      `  [addBankkontoRow] Ny manuell START-bankkontorad tillagd i '${containerId}' med pairId: ${newPairId}.`
    );

    // Skapa och lägg till motsvarande SLUT-rad
    const slutContainer = document.getElementById("hmBankkontonSlutContainer");
    if (slutContainer) {
      let nextRadNrInSlutContainer = 1;
      slutContainer.querySelectorAll(".dynamic-list-item").forEach(item => {
        if (item.dataset.isRakningskonto !== "true") {
          nextRadNrInSlutContainer++;
        }
      });
      if (
        slutContainer.querySelector('.dynamic-list-item[data-is-rakningskonto="true"]') &&
        nextRadNrInSlutContainer === 1
      ) {
        nextRadNrInSlutContainer = 2;
      }

      const slutRadData = {
        RadNr: nextRadNrInSlutContainer,
        Beskrivning: "", // Kopieras via event listener
        Kronor: null,
        BilagaRef: "",
        OFnot: "",
      };
      const newSlutRowElement = createBankkontoRow("BankkontoSlut", slutRadData, false, newPairId);
      slutContainer.appendChild(newSlutRowElement);
      console.log(`  [addBankkontoRow] Motsvarande manuell SLUT-bankkontorad tillagd med pairId: ${newPairId}.`);
    } else {
      console.warn("  [addBankkontoRow] Kunde inte hitta slut-container 'hmBankkontonSlutContainer'.");
    }
  } else if (rowTypePrefix === "BankkontoSlut") {
    // Om man klickar "Lägg till Bankkonto (Slut)"
    const slutRadData = { RadNr: nextRadNrInThisContainer, Beskrivning: "", Kronor: null, BilagaRef: "", OFnot: "" };
    const newSlutRowElement = createBankkontoRow("BankkontoSlut", slutRadData, false, null); // Inget pairId
    container.appendChild(newSlutRowElement);
    console.log(`  [addBankkontoRow] Ny fristående manuell SLUT-bankkontorad tillagd i '${containerId}'.`);
  }
  renumberDynamicListRowsVisual("hmBankkontonStartContainer", true); // true för bankkonto-numrering
  renumberDynamicListRowsVisual("hmBankkontonSlutContainer", true); // true för bankkonto-numrering
}

function createOvrigTillgangRow(typePrefix, data = {}, pairId = null) {
  const div = document.createElement("div");
  div.className = "dynamic-list-item ovrig-tillgang-rad";
  if (pairId) {
    div.dataset.pairId = pairId;
  }

  let kronorForInputValue = "";
  if (data.Kronor !== null && data.Kronor !== undefined && !isNaN(parseFloat(data.Kronor))) {
    kronorForInputValue = parseFloat(data.Kronor).toFixed(2);
  }

  div.innerHTML = `
        <label style="min-width:40px;">Rad ${data.RadNr || "Ny"}:</label>
        <input type="text" class="beskrivning" data-field="Beskrivning" placeholder="Typ av tillgång" value="${
          data.Beskrivning || ""
        }">
        <input type="text" class="andelar" data-field="Andelar" placeholder="Andelar/Antal" value="${
          data.Andelar || ""
        }">
        <input type="number" step="0.01" class="kronor" data-field="Kronor" placeholder="Värde (Kr)" value="${kronorForInputValue}">
        <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${
          data.BilagaRef || ""
        }">
        <input type="text" class="ofnot" data-field="OFnot" placeholder="ÖF not." value="${data.OFnot || ""}">
        <button type="button" class="small danger" onclick="removeOvrigTillgangPair(this)">Ta bort</button> 
    `;

  if (typePrefix === "TillgangStart" && pairId) {
    const fieldsToSync = ["Beskrivning", "Andelar", "BilagaRef", "OFnot"];
    fieldsToSync.forEach(fieldName => {
      const inputElement = div.querySelector(`input[data-field="${fieldName}"]`);
      if (inputElement) {
        inputElement.addEventListener("input", event => {
          const sourceValue = event.target.value;
          const slutRadElement = document.querySelector(
            `#hmOvrigaTillgangarSlutContainer .dynamic-list-item[data-pair-id="${pairId}"]`
          );
          if (slutRadElement) {
            const targetSlutInput = slutRadElement.querySelector(`input[data-field="${fieldName}"]`);
            if (targetSlutInput) {
              targetSlutInput.value = sourceValue;
            }
          }
        });
      }
    });
  }
  return div;
}

function removeBankkontoPair(buttonElement) {
  const rowToRemove = buttonElement.parentElement;
  if (!rowToRemove) return;

  // Ett räkningskonto ska aldrig kunna tas bort på detta sätt
  if (rowToRemove.dataset.isRakningskonto === "true") {
    console.warn("[removeBankkontoPair] Försök att ta bort ett räkningskonto via knapp. Ignoreras.");
    return;
  }

  const pairId = rowToRemove.dataset.pairId;
  console.log(`[removeBankkontoPair] Försöker ta bort bankkontorad. PairId: ${pairId}`);

  rowToRemove.remove();
  console.log("  [removeBankkontoPair] Den klickade bankkontoraden är borttagen.");

  if (pairId) {
    const otherRowStart = document.querySelector(
      `#hmBankkontonStartContainer .dynamic-list-item[data-pair-id="${pairId}"]`
    );
    const otherRowSlut = document.querySelector(
      `#hmBankkontonSlutContainer .dynamic-list-item[data-pair-id="${pairId}"]`
    );

    if (otherRowStart) {
      otherRowStart.remove();
      console.log(`  [removeBankkontoPair] Motsvarande START-bankkontorad med pairId ${pairId} borttagen.`);
    }
    if (otherRowSlut) {
      otherRowSlut.remove();
      console.log(`  [removeBankkontoPair] Motsvarande SLUT-bankkontorad med pairId ${pairId} borttagen.`);
    }
  }
  // Omsortera RadNr visuellt efter borttagning
  renumberDynamicListRowsVisual("hmBankkontonStartContainer", true); // true för bankkonto-specifik numrering
  renumberDynamicListRowsVisual("hmBankkontonSlutContainer", true); // true för bankkonto-specifik numrering
}

// Anpassad hjälpreda för att numrera om RadNr visuellt, tar hänsyn till räkningskonto
// --- godman_logic.js ---

function removeOvrigTillgangPair(buttonElement) {
  const rowToRemove = buttonElement.closest(".dynamic-list-item"); // Använd closest för att vara säker
  if (!rowToRemove) {
    console.warn("[removeOvrigTillgangPair] Kunde inte hitta raden att ta bort.");
    return;
  }

  const pairId = rowToRemove.dataset.pairId;
  console.log(`[removeOvrigTillgangPair] Försöker ta bort rad. PairId: ${pairId}`);

  // Ta bort den klickade raden
  const parentContainerId = rowToRemove.parentElement.id; // Hämta ID på föräldern
  rowToRemove.remove();
  console.log("  [removeOvrigTillgangPair] Den klickade raden är borttagen från container:", parentContainerId);

  if (pairId) {
    // Hitta och ta bort den andra raden i paret
    // Kolla i båda containrarna, eftersom vi inte vet vilken som klickades
    const otherRowStart = document.querySelector(
      `#hmOvrigaTillgangarStartContainer .dynamic-list-item[data-pair-id="${pairId}"]`
    );
    const otherRowSlut = document.querySelector(
      `#hmOvrigaTillgangarSlutContainer .dynamic-list-item[data-pair-id="${pairId}"]`
    );

    if (otherRowStart) {
      const otherParentContainerId = otherRowStart.parentElement.id;
      otherRowStart.remove();
      console.log(
        `  [removeOvrigTillgangPair] Motsvarande START-rad med pairId ${pairId} borttagen från container:`,
        otherParentContainerId
      );
    }
    if (otherRowSlut) {
      const otherParentContainerId = otherRowSlut.parentElement.id;
      otherRowSlut.remove();
      console.log(
        `  [removeOvrigTillgangPair] Motsvarande SLUT-rad med pairId ${pairId} borttagen från container:`,
        otherParentContainerId
      );
    }
  }
  // Omsortera RadNr visuellt efter borttagning
  renumberDynamicListRowsVisual("hmOvrigaTillgangarStartContainer");
  renumberDynamicListRowsVisual("hmOvrigaTillgangarSlutContainer");
}

// Hjälpfunktion för att numrera om RadNr visuellt (du bör redan ha denna)
// Se till att den är korrekt och inte bankkonto-specifik om den används generellt
function renumberDynamicListRowsVisual(containerId, isBankkontoList = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  let currentRadNr = 1;
  const rows = Array.from(container.querySelectorAll(".dynamic-list-item"));

  if (isBankkontoList) {
    rows.sort((a, b) => {
      const aIsRakning = a.dataset.isRakningskonto === "true";
      const bIsRakning = b.dataset.isRakningskonto === "true";
      if (aIsRakning && !bIsRakning) return -1;
      if (!aIsRakning && bIsRakning) return 1;
      return 0;
    });
  }

  rows.forEach(row => {
    const label = row.querySelector("label");
    if (label) {
      if (isBankkontoList && row.dataset.isRakningskonto === "true") {
        label.textContent = `Rad 1 (Räkning):`;
        currentRadNr = 2; // Nästa manuella börjar på 2
      } else {
        label.textContent = `Rad ${currentRadNr}:`;
        currentRadNr++;
      }
    }
  });
}
// Hjälpfunktion för att numrera om RadNr visuellt
function renumberDynamicListRows(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const rows = container.querySelectorAll(".dynamic-list-item");
  rows.forEach((row, index) => {
    const label = row.querySelector("label");
    if (label) {
      // Behåll "(Räkning)" om det finns
      const isRakningskonto = label.textContent.includes("(Räkning)");
      label.textContent = `Rad ${index + 1}${isRakningskonto ? " (Räkning)" : ""}:`;
    }
    // Uppdatera inte RadNr i data-objektet här, det görs vid insamling
  });
}
function addOvrigTillgangRow(periodType, containerId) {
  console.log(`[addOvrigTillgangRow] Anropad för periodType: '${periodType}', containerId: '${containerId}'`);
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[addOvrigTillgangRow] Container '${containerId}' not found.`);
    return;
  }

  const nextRadNrInThisContainer = container.querySelectorAll(".dynamic-list-item").length + 1;
  const rowTypePrefix = containerId.includes("Start") ? "TillgangStart" : "TillgangSlut";

  if (rowTypePrefix === "TillgangStart") {
    // Skapa ett unikt ID för paret av rader (start och slut)
    const newPairId = `pair-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    console.log(`  [addOvrigTillgangRow] Nytt pairId genererat: ${newPairId}`);

    // Skapa och lägg till START-raden
    const startRadData = {
      RadNr: nextRadNrInThisContainer,
      Beskrivning: "",
      Andelar: "",
      Kronor: null,
      BilagaRef: "",
      OFnot: "",
    };
    const newStartRowElement = createOvrigTillgangRow("TillgangStart", startRadData, newPairId);
    container.appendChild(newStartRowElement);
    console.log(`  [addOvrigTillgangRow] Ny START-rad tillagd i '${containerId}' med pairId: ${newPairId}.`);

    // Skapa och lägg till motsvarande SLUT-rad
    const slutContainer = document.getElementById("hmOvrigaTillgangarSlutContainer");
    if (slutContainer) {
      const nextRadNrInSlutContainer = slutContainer.querySelectorAll(".dynamic-list-item").length + 1;
      const slutRadData = {
        RadNr: nextRadNrInSlutContainer,
        Beskrivning: "", // Kopieras via event listener från start-raden
        Andelar: "", // Kopieras via event listener från start-raden
        Kronor: null,
        BilagaRef: "",
        OFnot: "",
      };
      const newSlutRowElement = createOvrigTillgangRow("TillgangSlut", slutRadData, newPairId); // Skicka med samma pairId
      slutContainer.appendChild(newSlutRowElement);
      console.log(`  [addOvrigTillgangRow] Motsvarande SLUT-rad tillagd med pairId: ${newPairId}.`);
    } else {
      console.warn("  [addOvrigTillgangRow] Kunde inte hitta slut-container 'hmOvrigaTillgangarSlutContainer'.");
    }
  } else if (rowTypePrefix === "TillgangSlut") {
    // Om man klickar "Lägg till Övrig Tillgång (Slut)" - ingen automatisk koppling till start
    const slutRadData = {
      RadNr: nextRadNrInThisContainer,
      Beskrivning: "",
      Andelar: "",
      Kronor: null,
      BilagaRef: "",
      OFnot: "",
    };
    const newSlutRowElement = createOvrigTillgangRow("TillgangSlut", slutRadData, null); // Inget pairId här
    container.appendChild(newSlutRowElement);
    console.log(`  [addOvrigTillgangRow] Ny fristående SLUT-rad tillagd i '${containerId}'.`);
  }
}
function createSkuldRow(
  typePrefix,
  data = { RadNr: null, Langivare: "", BilagaRef: "", StartBelopp: null, SlutBelopp: null }
) {
  const div = document.createElement("div");
  div.className = "dynamic-list-item skuld-rad";

  let startBeloppForInputValue = "";
  if (data.StartBelopp !== null && data.StartBelopp !== undefined && !isNaN(parseFloat(data.StartBelopp))) {
    startBeloppForInputValue = parseFloat(data.StartBelopp).toFixed(2); // Punkt som decimal
  }

  let slutBeloppForInputValue = "";
  if (data.SlutBelopp !== null && data.SlutBelopp !== undefined && !isNaN(parseFloat(data.SlutBelopp))) {
    slutBeloppForInputValue = parseFloat(data.SlutBelopp).toFixed(2); // Punkt som decimal
  }

  div.innerHTML = `
        <label style="min-width:40px;">Rad ${data.RadNr || "Ny"}:</label>
        <input type="text" class="langivare" data-field="Langivare" placeholder="Långivare" value="${
          data.Langivare || ""
        }">
        <input type="text" class="bilagaref" data-field="BilagaRef" placeholder="Bilaga" value="${
          data.BilagaRef || ""
        }">
        <input type="number" step="0.01" class="belopp" data-field="StartBelopp" placeholder="Belopp Start (Kr)" value="${startBeloppForInputValue}">
        <input type="number" step="0.01" class="belopp" data-field="SlutBelopp" placeholder="Belopp Slut (Kr)" value="${slutBeloppForInputValue}">
        <button type="button" class="small danger" onclick="this.parentElement.remove()">Ta bort</button>
    `;
  return div;
}

function addSkuldRow(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found for addSkuldRow`);
    return;
  }
  const nextRadNr = container.children.length + 1;
  const newRow = createSkuldRow("Skuld", { RadNr: nextRadNr });
  container.appendChild(newRow);
}

// --- ÖVRIGA HJÄLPFUNKTIONER (OCR, Redogörelse PDF etc.) ---
function calculateLuhn(numberString) {
  let sum = 0;
  let alternate = true;
  for (let i = numberString.length - 1; i >= 0; i--) {
    let n = parseInt(numberString.charAt(i), 10);
    if (isNaN(n)) return -1;
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0 ? 0 : 10 - (sum % 10);
}

function generateSkatteverketOcr(pnr) {
  if (!pnr) return "Pnr saknas";
  let cleanedPnr = String(pnr).replace(/\D/g, "");
  let ocrBase = "";
  if (cleanedPnr.length === 12) ocrBase = cleanedPnr;
  else if (cleanedPnr.length === 10) {
    const currentYearShort = new Date().getFullYear() % 100;
    const pnrYearShort = parseInt(cleanedPnr.substring(0, 2), 10);
    ocrBase = pnrYearShort <= currentYearShort + 10 ? "20" + cleanedPnr : "19" + cleanedPnr;
  } else return "Ogiltigt Pnr-format";
  if (!/^\d{12}$/.test(ocrBase)) return "Internt Pnr-konverteringsfel";
  const luhnDigit = calculateLuhn(ocrBase);
  return luhnDigit === -1 ? "Fel vid OCR-beräkning" : ocrBase + String(luhnDigit);
}

async function sparaRedogorelsePDF() {
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Välj en huvudman på 'Huvudman'-fliken först.");
    return;
  }
  if (!activeGodManProfile) {
    alert("Välj en aktiv God Man-profil på 'God Man Profiler'-fliken.");
    return;
  }

  const { PDFDocument, rgb, StandardFonts } = PDFLib;

  const createPdf = async () => {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fontSize = 11;
    const margin = 50;
    let y = height - margin;

    const hm = currentHuvudmanFullData.huvudmanDetails;
    const gm = activeGodManProfile;

    const periodStart = document.getElementById("periodStart_ars").value;
    const periodSlut = document.getElementById("periodSlut_ars").value;

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

    await drawTextLine(`Huvudman: ${hm.Fornamn || ""} ${hm.Efternamn || ""} (${hm.Personnummer || ""})`, 12, true);
    await drawTextLine(`Adress: ${hm.Adress || ""}, ${hm.Postnummer || ""} ${hm.Postort || ""}`);
    if (hm.Vistelseadress && hm.Vistelseadress !== hm.Adress) {
      // Korrigerat från Huvudman_Vistelseadress
      await drawTextLine(`Vistelseadress: ${hm.Vistelseadress}, ${hm.Vistelsepostnr || ""} ${hm.Vistelseort || ""}`);
    }
    y -= fontSize * 0.5;

    await drawTextLine(
      `God Man/Förvaltare: ${gm.Fornamn || ""} ${gm.Efternamn || ""} (${gm.Personnummer || ""})`,
      12,
      true
    );
    await drawTextLine(`Adress: ${gm.Adress || ""}, ${gm.Postnummer || ""} ${gm.Postort || ""}`);
    await drawTextLine(`Telefon: ${gm.Telefon || gm.Mobil || ""}  E-post: ${gm.Epost || ""}`);
    y -= fontSize;

    await drawTextLine(`Uppdragets omfattning: Bevaka rätt, Förvalta egendom, Sörja för person`, 11, true);
    y -= fontSize * 0.5;

    await drawTextLine(
      `Antal besök hos huvudmannen: ${document.getElementById("redogAntalBesok").value || "Ej specificerat"}`,
      11
    );
    await drawTextLine(
      `Antal telefonsamtal med huvudmannen: ${document.getElementById("redogAntalTelefon").value || "Ej specificerat"}`,
      11
    );
    await drawTextLine(
      `Antal kontakter med anhöriga/vårdgivare etc.: ${
        document.getElementById("redogAntalAnhorigKontakt").value || "Ej specificerat"
      }`,
      11
    );
    y -= fontSize * 0.5;

    await drawTextLine(`Övriga insatser och viktiga händelser under perioden:`, 11, true);
    const ovrigaInsatser = document.getElementById("redogOvrigaInsatserText").value;
    await drawParagraph(ovrigaInsatser || "Inga särskilda övriga insatser att rapportera för perioden.");
    y -= fontSize;

    await drawTextLine(
      `Ort och datum: ${gm.Postort || "___________________"}, ${new Date().toLocaleDateString("sv-SE")}`,
      11
    );
    y -= fontSize * 2;
    await drawTextLine(`Underskrift God Man/Förvaltare:`, 11);
    y -= fontSize * 2.5;
    await drawTextLine(`_________________________________________`, 11);
    await drawTextLine(`${gm.Fornamn || ""} ${gm.Efternamn || ""}`, 10);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const filename = `Redogorelse_${(hm.Personnummer || "hm").replace(/\W/g, "_")}_${yearForFilename(periodStart)}.pdf`;
    triggerDownload(blob, filename);
    alert("Redogörelse-PDF genererad!");
  };

  createPdf().catch(err => {
    console.error("Fel vid skapande av redogörelse-PDF:", err);
    alert("Kunde inte skapa redogörelse-PDF: " + err.message);
  });
}

function yearForFilename(dateString) {
  if (!dateString) return new Date().getFullYear();
  const d = new Date(dateString);
  return isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
}

window.onclick = function (event) {
  const modals = ["ruleModal", "adjustmentModal", "overformyndareModal", "nyHuvudmanModal", "arvodesModal"];
  modals.forEach(modalId => {
    const modalElement = document.getElementById(modalId);
    if (event.target == modalElement) {
      if (modalId === "ruleModal" && typeof closeRuleModal === "function") closeRuleModal();
      else if (modalId === "adjustmentModal" && typeof closeAdjustmentModal === "function") closeAdjustmentModal();
      else if (modalId === "overformyndareModal" && typeof closeOverformyndareModal === "function")
        closeOverformyndareModal();
      else if (modalId === "nyHuvudmanModal" && typeof closeNyHuvudmanModal === "function") closeNyHuvudmanModal();
      else if (modalId === "arvodesModal" && typeof closeArvodesModal === "function") closeArvodesModal();
      else if (modalElement) modalElement.style.display = "none";
    }
  });
};


function getSelectedPnr() {
  const el = document.getElementById("huvudmanSelect");
  return el ? el.value : "";
}

// Idempotent mapping som fallback (om knappen skulle sakna data-template-id)
window.FS_TEMPLATE_IDS_BY_NAME = window.FS_TEMPLATE_IDS_BY_NAME || {
  "Upplands Väsby":   2,
  "Järfälla Kommun":  3,
  "Sigtuna Kommun":   4,
  "Solna Stad":       5,
  "Stockholm Stad":   6
};

// Mappning av kommun-namn till PDF-mallfilnamn
window.FS_PDF_FILENAMES_BY_NAME = window.FS_PDF_FILENAMES_BY_NAME || {
  "Upplands Väsby":   "pdf_templates/Ansokan_Upplands_Vasby.pdf",
  "Järfälla Kommun":  "pdf_templates/Ansokan_Jarfalla.pdf",
  "Sigtuna Kommun":   "pdf_templates/Ansokan_Sigtuna.pdf",
  "Solna Stad":       "pdf_templates/Ansokan_Solna.pdf",
  "Stockholm Stad":   "pdf_templates/Ansokan_Stockholm.pdf"
};

function getSelectedPnr() {
  const el = document.getElementById("huvudmanSelect");
  return el ? el.value : "";
}

// Normalisera namn vid fallback-matchning
function normKommun(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

window.openForsorjningsstodModal = function openForsorjningsstodModal(kommunNamn, mallFilnamn /*optional*/, ev /*optional*/) {
  // Grundkrav
  if (!currentHuvudmanFullData?.huvudmanDetails) { alert("Välj en huvudman på 'Huvudman'-fliken först."); return; }
  if (!activeGodManProfile) { alert("Välj en aktiv God Man-profil på 'God Man Profiler'-fliken."); return; }

  // 1) Hämta templateId på ett robust sätt (sluta använda en lös variabel "templateId")
  const tidFromMap = (window.FS_TEMPLATE_IDS_BY_NAME || {})[kommunNamn] ?? null;
  const tidFromBtn = ev?.currentTarget?.dataset?.templateId
    ? parseInt(ev.currentTarget.dataset.templateId, 10)
    : null;
  const tid = tidFromMap || tidFromBtn || null;

  // 2) Spara globalt
  window.currentFsKommunNamn = kommunNamn || "";
  window.currentFsTemplateId = tid;

  // 3) Varning om ID saknas (istället för att krascha)
  if (!tid) {
    alert(`Hittade inget templateId för “${kommunNamn}”. Kontrollera kartan FS_TEMPLATE_IDS_BY_NAME eller lägg data-template-id på knappen.`);
    return;
  }

  // 4) Uppdatera rubriker/labels i modalen
  const titleEl = document.getElementById("forsorjningsstodModalTitle");
  if (titleEl) titleEl.textContent = `Granska Uppgifter för Försörjningsstöd till ${kommunNamn}`;
  const span1 = document.getElementById("fsModalKommunNamn");
  if (span1) span1.textContent = kommunNamn;
  const span2 = document.getElementById("fsModalKommunNamnKnapp2");
  if (span2) span2.textContent = kommunNamn;

  // Spara (bakåtkompatibelt) - hämta PDF-filnamn från mappning om inte skickat som parameter
  const pdfFilnamn = mallFilnamn || (window.FS_PDF_FILENAMES_BY_NAME || {})[kommunNamn] || "";
  window.currentFsTemplateId   = tid;
  window.currentFsPdfMallFilnamn = pdfFilnamn;
  window.currentFsKommunNamn     = kommunNamn;

  // Kontrollera att vi har allt vi behöver
  if (!pdfFilnamn) {
    alert(`Hittade inget PDF-filnamn för "${kommunNamn}". Uppdatera FS_PDF_FILENAMES_BY_NAME-mappningen.`);
    return;
  }

  console.log(`[FS Modal] Öppnar: ${kommunNamn} (tid=${tid}, fil=${pdfFilnamn}`);

  // ---- Din befintliga visningslogik: OFÖRÄNDRAD nedan ----

  const dynamicContainers = [
    "fsVisningPersonuppgifterContainer",
    "fsVisningBarnContainer",
    "fsVisningBostadContainer",
    "fsVisningSysselsattningContainer",
    "fsVisningOvrigInfoContainer",
    "fsVisningInkomsterContainer",
    "fsVisningTillgangarContainer",
    "fsVisningKostnaderContainer_Modal",
    "fsVisningFormanContainer",
    "fsVisningMedgivandeContainer",
  ];
  dynamicContainers.forEach(id => {
    const container = document.getElementById(id);
    if (container) container.innerHTML = "";
    else console.warn(`HTML-container med ID '${id}' för visning hittades inte i modalen.`);
  });

  ["fsModalAnsokanDatum", "fsModalAnsokanAvserAr", "fsModalAnsokanAvserManad"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
    else console.warn(`HTML-input med ID '${id}' hittades inte i modalen.`);
  });

  const ovrigInfoTextAreaModal = document.getElementById("fsAnsokanOvrigInfoHandlaggare_Modal");
  if (ovrigInfoTextAreaModal) ovrigInfoTextAreaModal.value = "";

  const hm = currentHuvudmanFullData.huvudmanDetails;
  const idag = new Date();
  const dagensDatumISO = idag.toISOString().slice(0, 10);

  const addTextToContainer = (containerId, label, value) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      const container = document.getElementById(containerId);
      if (container) {
        const p = document.createElement("p");
        p.appendChild(document.createElement("strong")).textContent = `${label}: `;
        p.appendChild(document.createTextNode(value));
        container.appendChild(p);
      } else {
        console.warn(`addTextToContainer: Container med ID '${containerId}' hittades inte.`);
      }
    }
  };

  const addCheckboxDisplay = (containerId, label, checked) => {
    const container = document.getElementById(containerId);
    if (container && (checked === 1 || checked === 0 || typeof checked === "boolean")) {
      addTextToContainer(containerId, label, checked ? "Ja" : "Nej");
    }
  };

  const fsModalAnsokanDatumEl = document.getElementById("fsModalAnsokanDatum");
  if (fsModalAnsokanDatumEl) fsModalAnsokanDatumEl.value = dagensDatumISO;

  let beraknatAnsokanAr =
    hm.FS_AnsokanAvserAr_Sparad || hm.Ansokan_AvserAr
      ? parseInt(hm.FS_AnsokanAvserAr_Sparad || hm.Ansokan_AvserAr)
      : idag.getFullYear();

  let beraknatAnsokanManadNamn = hm.FS_AnsokanAvserManad_Sparad || hm.Ansokan_AvserManad || "";
  if (!beraknatAnsokanManadNamn) {
    let beraknatAnsokanManadNummer = idag.getMonth() + 1;
    if (beraknatAnsokanManadNummer > 11) {
      beraknatAnsokanManadNummer = 0;
      if (!hm.FS_AnsokanAvserAr_Sparad && !hm.Ansokan_AvserAr) beraknatAnsokanAr = idag.getFullYear() + 1;
    } else {
      if (!hm.FS_AnsokanAvserAr_Sparad && !hm.Ansokan_AvserAr) beraknatAnsokanAr = idag.getFullYear();
    }
    beraknatAnsokanManadNamn = new Date(beraknatAnsokanAr, beraknatAnsokanManadNummer, 1).toLocaleString("sv-SE", {
      month: "long",
    });
  }

  const fsModalAnsokanAvserArEl = document.getElementById("fsModalAnsokanAvserAr");
  if (fsModalAnsokanAvserArEl) fsModalAnsokanAvserArEl.value = beraknatAnsokanAr.toString();
  const fsModalAnsokanAvserManadEl = document.getElementById("fsModalAnsokanAvserManad");
  if (fsModalAnsokanAvserManadEl) fsModalAnsokanAvserManadEl.value = beraknatAnsokanManadNamn;

  const fsVisningKommunensHandlaggareEl = document.getElementById("fsVisningKommunensHandlaggare");
  if (fsVisningKommunensHandlaggareEl) {
    fsVisningKommunensHandlaggareEl.textContent = hm.Ansokan_Handlaggare || hm.FS_KommunHandlaggare || "Ej angivet";
  } else {
    console.warn("Element 'fsVisningKommunensHandlaggare' hittades inte.");
  }

  const personContainer = "fsVisningPersonuppgifterContainer";
  addTextToContainer(personContainer, "Namn & Pnr", `${hm.Fornamn || ""} ${hm.Efternamn || ""} (${hm.Personnummer || "-"})`);
  addTextToContainer(personContainer, "Medborgarskap", hm.Medborgarskap || "Svensk");
  const sokandeCivilstand = hm.Civilstand || "";
  addTextToContainer(personContainer, "Civilstånd", sokandeCivilstand);

  const sammanboendeVal = hm.Sammanboende === 1 ? "Ja" : "Nej";
  addTextToContainer(personContainer, "Sammanboende", sammanboendeVal);

  if (sammanboendeVal === "Ja" && hm.MedsokandePersonnummer) {
    const hrEl = document.createElement("hr");
    const medSokCont = document.getElementById(personContainer);
    if (medSokCont) medSokCont.appendChild(hrEl);
    addTextToContainer(personContainer, "Medsökande Namn", `${hm.MedsokandeFornamn || ""} ${hm.MedsokandeEfternamn || ""} (${hm.MedsokandePersonnummer || "-"})`);
    addTextToContainer(personContainer, "Medsökande Medborgarskap", hm.MedsokandeMedborgarskap);
    addTextToContainer(personContainer, "Medsökande Civilstånd", hm.MedsokandeCivilstand);
  }

  addTextToContainer(personContainer, "Utbetalning önskas till", hm.FS_UtbetalningOnskasTill || "Senast registrerat konto");

  const barnVisningsContainerEl = document.getElementById("fsVisningBarnContainer");
  if (barnVisningsContainerEl) {
    barnVisningsContainerEl.innerHTML = "<p><em>Information om hemmavarande barn hämtas från Huvudman-fliken (om relevant).</em></p>";
  }

  const bostadContainerId = "fsVisningBostadContainer";
  const bostadContainerEl = document.getElementById(bostadContainerId);
  if (bostadContainerEl) bostadContainerEl.innerHTML = "";
  addTextToContainer(bostadContainerId, "Adress", hm.Adress || "");
  addTextToContainer(bostadContainerId, "Postnummer", hm.Postnummer || "");
  addTextToContainer(bostadContainerId, "Ort", hm.Ort || "");
  addTextToContainer(bostadContainerId, "Telefon/E-post", hm.Telefon || hm.Mobil || hm.Epost || "");
  addTextToContainer(bostadContainerId, "Antal rum", hm.BostadAntalRum);
  addTextToContainer(bostadContainerId, "Antal boende", hm.BostadAntalBoende);
  addTextToContainer(bostadContainerId, "Hyresvärd", hm.BoendeNamn);
  addTextToContainer(bostadContainerId, "Typ av boende", hm.BostadTyp);
  addTextToContainer(bostadContainerId, "Kontraktstid", hm.BostadKontraktstid || "tillsvidare");

  const sysselContainer = "fsVisningSysselsattningContainer";
  addTextToContainer(sysselContainer, "Sökande", hm.Sysselsattning || "");
  if (sammanboendeVal === "Ja" && hm.MedsokandePersonnummer) {
    addTextToContainer(sysselContainer, "Medsökande", hm.MedsokandeSysselsattning || "");
  }

  const ovrigInfoText = hm.ArsrOvrigaUpplysningar || "";
  const ovrigInfoVisningsContainer = document.getElementById("fsVisningOvrigInfoContainer");
  if (ovrigInfoVisningsContainer) {
    if (ovrigInfoText.trim() !== "") ovrigInfoVisningsContainer.textContent = ovrigInfoText;
    else ovrigInfoVisningsContainer.textContent = "Ingen övrig information angiven på Huvudman-fliken.";
  }

  const fsVisningInkomsterSaknasHeltEl = document.getElementById("fsVisningInkomsterSaknasHelt_Modal");
  if (fsVisningInkomsterSaknasHeltEl) fsVisningInkomsterSaknasHeltEl.checked = !!hm.FS_Inkomster_SaknasHelt;

  const inkomstMapping = {
    "Lön (typiskt)": hm.Lon,
    "Pension/Sjukers./Aktivitetsers. (typiskt)": hm.PensionLivrantaSjukAktivitet,
    "Sjukpenning/Föräldrapenning (typiskt)": hm.SjukpenningForaldrapenning,
    "Arbetslöshetsersättning (typiskt)": hm.Arbetsloshetsersattning,
    "Bostadsbidrag/Bostadstillägg (typiskt)": hm.Bostadsbidrag,
    "Barnbidrag/Studiebidrag (typiskt)": hm.BarnbidragStudiebidrag,
    "Underhållsstöd/Efterlevandepension (typiskt)": hm.UnderhallsstodEfterlevandepension,
    "Etableringsersättning (typiskt)": hm.Etableringsersattning,
    "Avtalsförsäkring (AFA etc.) (typiskt)": hm.AvtalsforsakringAfa,
    "Hyresintäkt (inneboende) (typiskt)": hm.HyresintaktInneboende,
    "Barns Inkomst (typiskt)": hm.BarnsInkomst,
    "Skatteåterbäring (typiskt)": hm.Skatteaterbaring,
    "Studiemedel (bidragsdel) (typiskt)": hm.Studiemedel,
    "Väntad inkomst (typiskt)": `${hm.VantadInkomstBeskrivning || ""} ${formatCurrencyForPdfNoDecimals(hm.VantadInkomstBelopp, false) || ""}`.trim(),
    "Övrig inkomst (typiskt)": `${hm.OvrigInkomstBeskrivning || ""} ${formatCurrencyForPdfNoDecimals(hm.OvrigInkomstBelopp, false) || ""}`.trim(),
  };

  let harInkomsterAttVisa = false;
  for (const label in inkomstMapping) {
    const value = inkomstMapping[label];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      addTextToContainer("fsVisningInkomsterContainer", label, formatCurrencyForPdfNoDecimals(value, false) || value);
      harInkomsterAttVisa = true;
    }
  }
  if (!harInkomsterAttVisa && !hm.FS_Inkomster_SaknasHelt) {
    const inkomstCont = document.getElementById("fsVisningInkomsterContainer");
    if (inkomstCont) inkomstCont.innerHTML = "<p><em>Inga typiska inkomster angivna.</em></p>";
  }

  const fsVisningTillgangarSaknasHeltEl = document.getElementById("fsVisningTillgangarSaknasHelt_Modal");
  if (fsVisningTillgangarSaknasHeltEl) fsVisningTillgangarSaknasHeltEl.checked = !!hm.FS_Tillgangar_SaknasHelt;
  const tillgCont = document.getElementById("fsVisningTillgangarContainer");
  if (tillgCont) {
    tillgCont.innerHTML = "";
    addTextToContainer("fsVisningTillgangarContainer", "Bankmedel (totalt)", formatCurrencyForPdfNoDecimals(hm.TillgangBankmedelVarde, false));
    addTextToContainer("fsVisningTillgangarContainer", "Bostadsrätt/Fastighet", formatCurrencyForPdfNoDecimals(hm.TillgangBostadsrattFastighetVarde, false));
    addTextToContainer("fsVisningTillgangarContainer", "Fordon m.m.", formatCurrencyForPdfNoDecimals(hm.TillgangFordonMmVarde, false));
    if (!hm.TillgangBankmedelVarde && !hm.TillgangBostadsrattFastighetVarde && !hm.TillgangFordonMmVarde && !hm.FS_Tillgangar_SaknasHelt) {
      tillgCont.innerHTML = "<p><em>Inga typiska tillgångar angivna.</em></p>";
    }
  }

  const riksnormManadSpan = document.getElementById("fsVisningRiksnormManad_Modal");
  if (riksnormManadSpan) riksnormManadSpan.textContent = beraknatAnsokanManadNamn;

  const checkboxRiksnormModalEl = document.getElementById("fsVisningCheckboxRiksnorm_Modal");
  if (checkboxRiksnormModalEl)
    checkboxRiksnormModalEl.checked = hm.FS_Ansokan_Checkbox_Riksnorm !== undefined ? !!hm.FS_Ansokan_Checkbox_Riksnorm : true;

  const kostnaderVisningsContainer = document.getElementById("fsVisningKostnaderContainer_Modal");
  if (kostnaderVisningsContainer) kostnaderVisningsContainer.innerHTML = "";
  const kostnaderAttVisa = {
    "Hyra/Boendekostnad": hm.Hyra,
    "Elkostnad": hm.ElKostnad,
    "Hemförsäkring": hm.Hemforsakring,
    "Reskostnader (SL, Färdtjänst etc.)": hm.Reskostnader,
    "Fackavgift/A-kassa": hm.FackAvgiftAkassa,
    "Medicinkostnad": hm.MedicinKostnad,
    "Läkarvårdskostnad": hm.Lakarvardskostnad,
    "Akut Tandvårdskostnad": hm.AkutTandvardskostnad,
    "Barnomsorgsavgift": hm.BarnomsorgAvgift,
    "Färdtjänstavgift": hm.FardtjanstAvgift,
    "Bredbandskostnad": hm.Bredband,
    "Övrig kostnad": `${hm.OvrigKostnadBeskrivning || ""} ${formatCurrencyForPdfNoDecimals(hm.OvrigKostnadBelopp, false) || ""}`.trim(),
  };
  let harTypiskaKostnaderAttVisa = false;
  for (const label in kostnaderAttVisa) {
    const value = kostnaderAttVisa[label];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      addTextToContainer("fsVisningKostnaderContainer_Modal", label, formatCurrencyForPdfNoDecimals(value, false) || value);
      harTypiskaKostnaderAttVisa = true;
    }
  }
  if (!harTypiskaKostnaderAttVisa && kostnaderVisningsContainer) {
    kostnaderVisningsContainer.innerHTML = "<p><em>Inga typiska kostnader angivna.</em></p>";
  }

  const formanCont = document.getElementById("fsVisningFormanContainer");
  if (formanCont) {
    formanCont.innerHTML = "";
    addTextToContainer(
      "fsVisningFormanContainer",
      "Sökande väntar på beslut",
      `${hm.ErsattningAnnanMyndighetStatus === 1 ? "Ja" : "Nej"}${hm.ErsattningAnnanMyndighetStatus === 1 && hm.ErsattningAnnanMyndighetFran ? ": " + hm.ErsattningAnnanMyndighetFran : ""}`
    );
  }

  const medgivCont = document.getElementById("fsVisningMedgivandeContainer");
  if (medgivCont) {
    medgivCont.innerHTML = "";
    addCheckboxDisplay("fsVisningMedgivandeContainer", "Jag/vi lämnar medgivande (stora krysset)", hm.FS_Medgivande_Huvudkryss);
  }

  const underskriftSokandeEl = document.getElementById("fsVisningUnderskriftDatumSokande_Modal");
  if (underskriftSokandeEl) underskriftSokandeEl.textContent = formatDateForPdf(dagensDatumISO);

  const medsokandeUnderskriftSektion = document.getElementById("fsVisningUnderskriftMedsokandeSektion_Modal");
  if (medsokandeUnderskriftSektion) {
    if (hm.Sammanboende === 1 && hm.MedsokandePersonnummer) {
      medsokandeUnderskriftSektion.style.display = "block";
      const underskriftMedEl = document.getElementById("fsVisningUnderskriftDatumMedsokande_Modal");
      if (underskriftMedEl) underskriftMedEl.textContent = formatDateForPdf(dagensDatumISO);
    } else {
      medsokandeUnderskriftSektion.style.display = "none";
    }
  }

  const forsorjningsstodModalElement = document.getElementById("forsorjningsstodModal");
  if (forsorjningsstodModalElement) {
    forsorjningsstodModalElement.style.display = "block";
  } else {
    console.error("Kunde inte hitta forsorjningsstodModal för att visa den!");
  }
}

// Använd denna för din "Generera PDF"-knapp i modalen
function generateForsorjningsstodPdf() {
  const pnr = getSelectedPnr();
  if (!pnr) { alert("Välj huvudman först."); return; }
  if (!window.currentFsTemplateId) { alert("Saknar templateId – öppna modalen via en kommunknapp först."); return; }

  const url = `api/generate_pdf.php?pnr=${encodeURIComponent(pnr)}&templateId=${window.currentFsTemplateId}`;
  window.open(url, "_blank", "noopener");
}

// Kalla denna från din "Skapa/Generera PDF"-knapp i modalen
function generateForsorjningsstodPdf() {
  const pnr = getSelectedPnr();
  if (!pnr) {
    alert('Välj huvudman först.');
    return;
  }
  if (!window.currentFsTemplateId) {
    alert('Saknar templateId – öppna modalen via en kommunknapp först.');
    return;
  }
  const url = `api/generate_pdf.php?pnr=${encodeURIComponent(pnr)}&templateId=${window.currentFsTemplateId}`;
  window.open(url, "_blank", "noopener");
}

function addFsBarnRow() {
  const container = document.getElementById("fsHemmaboendeBarnContainer");
  const barnIndex = container.children.length;
  const div = document.createElement("div");
  div.className = "form-grid fs-barn-rad";
  div.innerHTML = `
        <div class="form-column input-group">
            <label for="fsBarnNamn_${barnIndex}">Barnets Namn:</label>
            <input type="text" id="fsBarnNamn_${barnIndex}" name="fsBarnNamn" placeholder="För- och efternamn">
        </div>
        <div class="form-column input-group">
            <label for="fsBarnPnr_${barnIndex}">Personnummer:</label>
            <input type="text" id="fsBarnPnr_${barnIndex}" name="fsBarnPnr" placeholder="ÅÅMMDD-XXXX">
        </div>
        <div class="form-column input-group">
            <label for="fsBarnDagarHosDig_${barnIndex}">Antal dagar/mån barnet bor hos dig:</label>
            <input type="text" id="fsBarnDagarHosDig_${barnIndex}" name="fsBarnDagarHosDig">
        </div>
        <div class="form-column input-group">
            <label for="fsBarnSysselsattning_${barnIndex}">Sysselsättning (skola/arbetsplats):</label>
            <input type="text" id="fsBarnSysselsattning_${barnIndex}" name="fsBarnSysselsattning">
        </div>
        <div class="form-column" style="align-self: flex-end; padding-bottom: 6px;">
             <button type="button" class="small danger" onclick="this.parentElement.parentElement.remove()">Ta bort barn</button>
        </div>
    `;
  container.appendChild(div);
}



function formatBeloppForPdf(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "";
  }
  const cleanedString = String(value).replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleanedString);
  if (isNaN(num)) {
    return "";
  }
  return Math.round(num).toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function toggleDetaljeradeMedgivanden() {
  const huvudkryssCheckbox = document.getElementById("hmFormFSMedgivandeHuvudkryss");
  const detaljeradeMedgivandenContainer = document.getElementById("fsDetaljeradeMedgivandenContainer");
  const andraMedgivandenIds = [
    "hmFormFSMedgivandeForetagsregistret",
    "hmFormFSMedgivandeJobbtorget",
    "hmFormFSMedgivandeKronofogden",
    "hmFormFSMedgivandeLantmateriet",
    "hmFormFSMedgivandeMigrationsverket",
    "hmFormFSMedgivandeTransportstyrelsen",
    "hmFormFSMedgivandeAnnanSocialtjanst",
  ];
  if (huvudkryssCheckbox && detaljeradeMedgivandenContainer) {
    const isHuvudkryssChecked = huvudkryssCheckbox.checked;
    if (isHuvudkryssChecked) {
      andraMedgivandenIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = true;
      });
    }
    if (isHuvudkryssChecked) {
      detaljeradeMedgivandenContainer.style.display = "none";
    } else {
      detaljeradeMedgivandenContainer.style.display = "block";
    }
  }
}

function setCivilstandPdfCheckboxes(form, baseName, civilstandText) {
  const lowerCivilstand = String(civilstandText || "").toLowerCase();
  trySetCheckbox(
    form,
    `${baseName}_Gift/reg partner`,
    lowerCivilstand === "gift" || lowerCivilstand === "registrerad partner"
  );
  trySetCheckbox(form, `${baseName}_Ogift`, lowerCivilstand === "ogift" || lowerCivilstand === "ensamstående");
  trySetCheckbox(form, `${baseName}_Skild`, lowerCivilstand === "skild");
  trySetCheckbox(form, `${baseName}_Änka/änkling`, lowerCivilstand === "änka/änkling");
}

function setCivilstandRadioFromCheckboxes(form, pdfBaseFieldName, selectedRadioValue) {
  const civilstandOptionsMap = {
    GiftRegPartner: "_GiftRegPartner",
    Ogift: "_Ogift",
    Skild: "_Skild",
    AnkaAnkling: "_AnkaAnkling",
  };
  console.log(`[PDF Civilstånd] Försöker sätta för basnamn: ${pdfBaseFieldName}, valt värde: ${selectedRadioValue}`);
  for (const htmlValue in civilstandOptionsMap) {
    const pdfSuffix = civilstandOptionsMap[htmlValue];
    const pdfFieldName = `${pdfBaseFieldName}${pdfSuffix}`;
    trySetCheckbox(form, pdfFieldName, false);
  }
  if (selectedRadioValue && civilstandOptionsMap[selectedRadioValue]) {
    const pdfSuffixToSet = civilstandOptionsMap[selectedRadioValue];
    const pdfFieldToSet = `${pdfBaseFieldName}${pdfSuffixToSet}`;
    trySetCheckbox(form, pdfFieldToSet, true);
    console.log(`[PDF Civilstånd] Satte checkbox: ${pdfFieldToSet}`);
  } else if (selectedRadioValue) {
    console.warn(
      `[PDF Civilstånd] Oväntat eller ohanterat civilståndsvärde från modalen: '${selectedRadioValue}' för basnamn '${pdfBaseFieldName}'. Ingen checkbox markerad.`
    );
  } else {
    console.log(`[PDF Civilstånd] Inget civilstånd valt från modalen för basnamn '${pdfBaseFieldName}'.`);
  }
}

function trySetCheckbox(form, fieldName, checked) {
  try {
    const field = form.getCheckBox(fieldName);
    if (!field) {
      // console.warn(`[PDF Kryssruta] Fältet '${fieldName}' hittades INTE i PDF-mallen.`);
      return;
    }
    if (checked) field.check();
    else field.uncheck();
  } catch (e) {
    // console.warn(`[PDF Kryssruta FEL] Kunde inte sätta fältet '${fieldName}' till värdet '${checked}': ${e.message}`);
  }
}
function setCivilstandRadioForSthlm(radioGroupNamePrefix, civilstandFromDb) {
  const radios = document.querySelectorAll(`input[name="${radioGroupNamePrefix}"]`);
  let foundMatch = false;
  radios.forEach(radio => {
    let radioValueNormalized = radio.value.toLowerCase().replace(/[\/\s.-]/g, "");
    let dbValueNormalized = (civilstandFromDb || "").toLowerCase().replace(/[\/\s.-]/g, "");
    if (radioValueNormalized === dbValueNormalized) {
      radio.checked = true;
      foundMatch = true;
    } else if (
      (dbValueNormalized === "gift" || dbValueNormalized === "registreradpartner") &&
      radioValueNormalized === "giftregpartner"
    ) {
      radio.checked = true;
      foundMatch = true;
    } else if (
      (dbValueNormalized === "änka" || dbValueNormalized === "änkling") &&
      radioValueNormalized === "ankaaenkling"
    ) {
      radio.checked = true;
      foundMatch = true;
    } else if (dbValueNormalized === "ensamstående" && radioValueNormalized === "ogift") {
      radio.checked = true;
      foundMatch = true;
    } else radio.checked = false;
  });
  if (!foundMatch && !civilstandFromDb) {
    const ogiftRadio = document.getElementById(`${radioGroupNamePrefix.replace("Radio", "_Ogift")}`);
    if (ogiftRadio) ogiftRadio.checked = true;
  }
}

async function saveHuvudmanFullDetails() {
  console.log("[SAVE] Startar spara-processen...");

  const selectedPnr = document.getElementById("huvudmanSelect")?.value;
  if (!selectedPnr) {
    alert("Ingen huvudman är vald. Kan inte spara.");
    return;
  }

  const dataToSave = collectHuvudmanFullDetailsFromForm();
  if (!dataToSave) {
    alert("Kunde inte samla in data från formuläret.");
    return;
  }
  console.log("[SAVE] Data som kommer att skickas till PHP:", JSON.stringify(dataToSave, null, 2));

  const yearForEndpoint = document.getElementById("periodStart_ars")?.value
    ? new Date(document.getElementById("periodStart_ars").value).getFullYear()
    : new Date().getFullYear();

  // URL:en pekar mot PHP-filen och skickar pnr/år som GET-parametrar.
  const url = `/api/save_huvudman_details.php?pnr=${selectedPnr}&ar=${yearForEndpoint}`;

  console.log(`[SAVE] Skickar PUT-request till URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSave),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Kunde inte tolka JSON-svar från servern. Råtext:", responseText);
      alert("Servern gav ett oväntat svar som inte var JSON. Se konsolen för detaljer.");
      return;
    }

    if (response.ok) {
      alert(result.message || "Ändringar sparade!");
      console.log("[SAVE] Servern svarade OK.", result);
      await loadHuvudmanFullDetails(true); // Tvinga omladdning från server
    } else {
      alert(`Fel vid sparande: ${result.error || `Okänt fel (Status: ${response.status})`}`);
      console.error("[SAVE] Servern svarade med ett fel:", result);
    }
  } catch (error) {
    alert("Ett nätverksfel uppstod. Kontrollera anslutningen och försök igen.");
    console.error("[SAVE] Nätverksfel:", error);
  }
}
function collectRedogorelseDataFromForm() {
  const data = {};

  // Grunduppgifter & Period
  data.redogKalenderarStart = document.getElementById("redogKalenderarStart").value;
  data.redogKalenderarSlut = document.getElementById("redogKalenderarSlut").value;
  data.redogSlaktskap = getRadioValue("redogSlaktskap");
  data.redogSlaktskapTyp = document.getElementById("redogSlaktskapTyp").value;

  // Boendeform
  data.redogBoendeform = getRadioValue("redogBoendeform");
  data.redogBoendeAnnatText = document.getElementById("redogBoendeAnnatText").value;

  // Omfattning
  data.redogOmfBevakaRatt = document.getElementById("redogOmfBevakaRatt").checked;
  data.redogOmfForvaltaEgendom = document.getElementById("redogOmfForvaltaEgendom").checked;
  data.redogOmfSorjaForPerson = document.getElementById("redogOmfSorjaForPerson").checked;
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
    data[`redog${fragKey}Kommentar`] = document.getElementById(`redog${fragKey}Kommentar`).value;
  });
  data.redogEkonomiOvrigtSoktFondmedel_Text = document.getElementById("redogEkonomiOvrigtSoktFondmedel_Text").value;

  // Kontakter och tidsinsats
  data.redogAntalBesokTyp = getRadioValue("redogAntalBesokTyp");
  data.redogVistelseUtanforHemmet = getRadioValue("redogVistelseUtanforHemmet");
  data.redogVistelseUtanforHemmetDetaljer = document.getElementById("redogVistelseUtanforHemmetDetaljer").value;
  data.redogAntalTelefonsamtal = document.getElementById("redogAntalTelefonsamtal").value;
  data.redogAntalKontakterAnhoriga = document.getElementById("redogAntalKontakterAnhoriga").value;
  data.redogOvrigaInsatserText = document.getElementById("redogOvrigaInsatserText").value;

  // Förvalta egendom
  data.redogBetalningInternetbank = document.getElementById("redogBetalningInternetbank").checked;
  data.redogBetalningAutogiro = document.getElementById("redogBetalningAutogiro").checked;
  data.redogKontooverforingHm = document.getElementById("redogKontooverforingHm").checked;
  data.redogKontanterHmKvitto = document.getElementById("redogKontanterHmKvitto").checked;
  data.redogKontooverforingBoende = document.getElementById("redogKontooverforingBoende").checked;
  data.redogKontanterBoendeKvitto = document.getElementById("redogKontanterBoendeKvitto").checked;

  const forvaltningsInsatser = [
    "SaltKoptFastighet",
    "HyrtUtFastighet",
    "SaltKoptAktier",
    "AnnanVardepapper",
    "SoktSkuldsanering",
  ];
  forvaltningsInsatser.forEach(insatsKey => {
    data[`redogForvaltning${insatsKey}`] = getRadioValue(`redogForvaltning${insatsKey}`);
    data[`redogForvaltning${insatsKey}Kommentar`] = document.getElementById(
      `redogForvaltning${insatsKey}Kommentar`
    ).value;
  });
  // Raden för redogForvaltningOvrigt1 är nu borttagen

  // Arvode
  data.redogArvodeBevakaRatt = document.getElementById("redogArvodeBevakaRatt").checked;
  data.redogArvodeForvaltaEgendom = document.getElementById("redogArvodeForvaltaEgendom").checked;
  data.redogArvodeSorjaForPerson = document.getElementById("redogArvodeSorjaForPerson").checked;
  data.redogArbetsinsats = getRadioValue("redogArbetsinsats");
  data.redogOnskarKostnadsersattning = getRadioValue("redogOnskarKostnadsersattning");
  data.redogReseersattningKm = document.getElementById("redogReseersattningKm").value;
  data.redogKorjournalBifogas = getRadioValue("redogKorjournalBifogas");
  data.redogArvodeOvrigt = document.getElementById("redogArvodeOvrigt").value;

  // Underskrift
  data.redogUnderskriftDatum = document.getElementById("redogUnderskriftDatum").value;
  data.redogUnderskriftOrt = document.getElementById("redogUnderskriftOrt").value;

  return data;
}
async function collectAndSaveRedogorelseData() {
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Ingen huvudman vald, kan inte spara redogörelsedata.");
    return;
  }

  // Samla in all data från formuläret
  const redogorelseData = collectRedogorelseDataFromForm();
  if (!redogorelseData) {
    alert("Kunde inte samla in data från redogörelseformuläret.");
    return;
  }

  const pnr = currentHuvudmanFullData.huvudmanDetails.Personnummer;
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
      // Spara även datan lokalt i det aktiva objektet
      currentHuvudmanFullData.redogorelseData = redogorelseData;
    } else {
      alert(`Fel vid sparande av redogörelse: ${result.error || "Okänt serverfel"}`);
    }
  } catch (error) {
    console.error("Nätverksfel vid sparande av redogörelse:", error);
    alert("Ett nätverksfel uppstod vid sparande av redogörelse.");
  }
}
function closeForsorjningsstodModal() {
  const modal = document.getElementById("forsorjningsstodModal");
  if (modal) modal.style.display = "none";
}

function addFsBarnRow() {
  const container = document.getElementById("fsHemmaboendeBarnContainer");
  const barnIndex = container.children.length;
  const div = document.createElement("div");
  div.className = "form-grid fs-barn-rad";
  div.innerHTML = `
        <div class="form-column input-group">
            <label for="fsBarnNamn_${barnIndex}">Barnets Namn:</label>
            <input type="text" id="fsBarnNamn_${barnIndex}" name="fsBarnNamn" placeholder="För- och efternamn">
        </div>
        <div class="form-column input-group">
            <label for="fsBarnPnr_${barnIndex}">Personnummer:</label>
            <input type="text" id="fsBarnPnr_${barnIndex}" name="fsBarnPnr" placeholder="ÅÅMMDD-XXXX">
        </div>
        <div class="form-column input-group">
            <label for="fsBarnDagarHosDig_${barnIndex}">Antal dagar/mån barnet bor hos dig:</label>
            <input type="text" id="fsBarnDagarHosDig_${barnIndex}" name="fsBarnDagarHosDig">
        </div>
        <div class="form-column input-group">
            <label for="fsBarnSysselsattning_${barnIndex}">Sysselsättning (skola/arbetsplats):</label>
            <input type="text" id="fsBarnSysselsattning_${barnIndex}" name="fsBarnSysselsattning">
        </div>
        <div class="form-column" style="align-self: flex-end; padding-bottom: 6px;">
             <button type="button" class="small danger" onclick="this.parentElement.parentElement.remove()">Ta bort barn</button>
        </div>
    `;
  container.appendChild(div);
}

async function sparaRedogorelsePDF_FranGrund() {
  console.log("[Redogörelse PDF från Grund] Startar generering...");
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails || !activeGodManProfile) {
    alert("Välj huvudman och se till att en God Man-profil är aktiv.");
    return;
  }
  const data = collectRedogorelseDataFromForm();
  if (!data) {
    alert("Kunde inte samla in data från redogörelseformuläret.");
    return;
  }

  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const fontUrl = "/fonts/LiberationSans-Regular.ttf";
  const boldFontUrl = "/fonts/LiberationSans-Bold.ttf";

  try {
    const pdfDoc = await PDFDocument.create();

    let regularFont;
    let boldVersionFont;

    try {
      const fontBytes = await fetch(fontUrl).then(res => {
        if (!res.ok) throw new Error(`Fontfel Redogörelse (regular): ${res.statusText}`);
        return res.arrayBuffer();
      });
      if (!fontBytes) throw new Error("Kunde inte ladda anpassad REGULAR font för redogörelse.");
      pdfDoc.registerFontkit(fontkit);
      regularFont = await pdfDoc.embedFont(fontBytes);

      if (boldFontUrl) {
        try {
          const boldFontBytesAttempt = await fetch(boldFontUrl).then(res => {
            if (!res.ok) {
              console.warn(`Kunde inte ladda fet font från ${boldFontUrl}, använder vanlig.`);
              return null;
            }
            return res.arrayBuffer();
          });
          if (boldFontBytesAttempt) {
            boldVersionFont = await pdfDoc.embedFont(boldFontBytesAttempt);
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
      console.warn("Kunde inte ladda anpassad Liberation font, återfaller till Helvetica:", fontError);
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

    const hm = currentHuvudmanFullData.huvudmanDetails;
    const gm = activeGodManProfile;

    const checkNewPage = neededSpace => {
      if (y - neededSpace < margin) {
        page = pdfDoc.addPage();
        y = height - margin;
        return true;
      }
      return false;
    };

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
      y = currentY; // Uppdatera globala y efter att hela blocket är ritat
      return y;
    };

    // --- Börja rita innehållet ---
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
    drawTextLine(`Huvudman: ${hm.Fornamn || ""} ${hm.Efternamn || ""} (${hm.Personnummer || ""})`, 10);
    drawTextLine(`God man/Förvaltare: ${gm.Fornamn || ""} ${gm.Efternamn || ""} (${gm.Personnummer || ""})`, 10);
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
    if (data.redogBoendeform === "Annat" && data.redogBoendeAnnatText) boendeText = data.redogBoendeAnnatText;
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
      { label: "Avveckling av huvudmannens bostad (hyresrätt)", key: "AvvecklatBostad" },
      { label: "Har huvudmannen kostnader för omsorg (t.ex. äldreboende)", key: "KostnadOmsorg" },
      { label: "Hänsyn till förbehållsbelopp (vid omsorgskostnader)", key: "ForbehallBelopp" },
      { label: "Tecknande av hyresavtal", key: "TecknatHyresavtal" },
      { label: "Ansökan om nytt boende", key: "AnsoktNyttBoende" },
    ];
    fragor.forEach(f => {
      checkNewPage(3 * (mainFontSize * 1.2 + lineSpacing));
      drawTextLine(f.label, 10);
      let svarText = `Svar: ${data[`redog${f.key}`] || "Ej besvarat"}`;
      let kommentarText = data[`redog${f.key}Kommentar`];
      let tempY = y;
      drawTextLine(svarText, 20, mainFontSize, regularFont, rgb(0.1, 0.1, 0.1));
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
    if (data.redogForvaltningOvrigt1) drawTextLine(`Övrigt: ${data.redogForvaltningOvrigt1}`, 20);
    if (data.redogForvaltningOvrigt2) drawTextLine(`Övrigt: ${data.redogForvaltningOvrigt2}`, 20);
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
    if (data.redogOnskarKostnadsersattning === "schablon") kostnadsersText = "Enligt schablon (2% av prisbasbelopp)";
    else if (data.redogOnskarKostnadsersattning === "specifikation")
      kostnadsersText = "Enligt specifikation (verifieras)";
    drawTextLine(`Önskar kostnadsersättning: ${kostnadsersText}`, 10);
    if (data.redogReseersattningKm) drawTextLine(`Reseersättning antal km: ${data.redogReseersattningKm}`, 10);
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

    const ortDatumText = `${data.redogUnderskriftOrt || gm.Postort || "___________________"}, den ${
      formatDateForPdf(data.redogUnderskriftDatum) || formatDateForPdf(new Date().toISOString().slice(0, 10))
    }`;
    drawTextLine(ortDatumText, 0, mainFontSize);
    y -= sectionSpacing * 2.5;
    drawTextLine("________________________________________", 0, mainFontSize);
    drawTextLine(`${gm.Fornamn || ""} ${gm.Efternamn || ""}`.trim(), 0, mainFontSize);
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
    const filename = `Redogorelse_${(hm.Personnummer || "hm").replace(/\W/g, "_")}_${yearForFilename(
      data.redogKalenderarStart
    )}.pdf`;
    triggerDownload(blob, filename);
    alert("Redogörelse-PDF genererad från grunden!");
  } catch (error) {
    console.error("Fel vid generering av Redogörelse PDF från grunden:", error);
    alert(`Kunde inte skapa Redogörelse PDF: ${error.message}\nSe konsolen för mer detaljer.`);
  }
}
function setJaNejEjAktuelltRadio(form, basePdfFieldName, valueFromJs) {
  // valueFromJs kan vara "Ja", "Nej", "Ej aktuellt"
  trySetCheckbox(form, `${basePdfFieldName}_Ja`, valueFromJs === "Ja");
  trySetCheckbox(form, `${basePdfFieldName}_Nej`, valueFromJs === "Nej");
  trySetCheckbox(form, `${basePdfFieldName}_EjAktuellt`, valueFromJs === "Ej aktuellt");
}

function setBoendeformRadio(form, basePdfFieldName, valueFromJs, annatTextFromJs) {
  // valueFromJs är t.ex. "Egen fastighet", "Hyresrätt", "Annat"
  // annatTextFromJs är texten om "Annat" är valt.
  // Antag att PDF-fälten är t.ex. Boende_EgenFastighet, Boende_Hyresratt, Boende_AnnatKryss, Boende_AnnatText

  const options = {
    "Egen fastighet": `${basePdfFieldName}_EgenFastighet`,
    Hyresrätt: `${basePdfFieldName}_Hyresratt`,
    Bostadsrätt: `${basePdfFieldName}_Bostadsratt`,
    "Särskilt boende (äldre-/demensboende)": `${basePdfFieldName}_SarskiltBoende`,
    "Bostad med särskild service (grupp-/servicebostad enl LSS)": `${basePdfFieldName}_LSSBoende`,
  };

  // Avmarkera alla först
  for (const key in options) trySetCheckbox(form, options[key], false);
  trySetCheckbox(form, `${basePdfFieldName}_AnnatKryss`, false); // Antag att det finns ett separat kryss för "Annat"
  trySetTextField(form, `${basePdfFieldName}_AnnatText`, ""); // Och ett textfält för "Annat"

  if (options[valueFromJs]) {
    trySetCheckbox(form, options[valueFromJs], true);
  } else if (valueFromJs === "Annat") {
    trySetCheckbox(form, `${basePdfFieldName}_AnnatKryss`, true);
    trySetTextField(form, `${basePdfFieldName}_AnnatText`, annatTextFromJs || "");
  } else if (valueFromJs) {
    // Om det är ett värde som inte matchar exakt men "Annat" inte är valt
    trySetCheckbox(form, `${basePdfFieldName}_AnnatKryss`, true);
    trySetTextField(form, `${basePdfFieldName}_AnnatText`, valueFromJs); // Sätt det som "Annat"-text
  }
}

async function sparaForsorjningsstodsData() {
  if (!currentHuvudmanFullData || !currentHuvudmanFullData.huvudmanDetails) {
    alert("Ingen huvudman vald att spara data för.");
    return;
  }
  const dataAttSpara = {
    Hyra: parseFloat(document.getElementById("hyra")?.value) || null,
    Bredband: parseFloat(document.getElementById("bredband")?.value) || null,
    ElKostnad: parseFloat(document.getElementById("elKostnad")?.value) || null, // Använder generellt fält
    Hemforsakring: parseFloat(document.getElementById("hemforsakring")?.value) || null,
    FackAvgiftAkassa: parseFloat(document.getElementById("fackAvgiftAkassa")?.value) || null, // Använder generellt fält
    Reskostnader: parseFloat(document.getElementById("reskostnader")?.value) || null, // Använder generellt fält
    Lakarvardskostnad: parseFloat(document.getElementById("lakarvardskostnad")?.value) || null, // Använder generellt fält
    MedicinKostnad: parseFloat(document.getElementById("medicinKostnad")?.value) || null, // Använder generellt fält
    BarnomsorgAvgift: parseFloat(document.getElementById("barnomsorgAvgift")?.value) || null, // Använder generellt fält
    FardtjanstAvgift: parseFloat(document.getElementById("fardtjanstAvgift")?.value) || null, // Använder generellt fält
    AkutTandvardskostnad: parseFloat(document.getElementById("akutTandvardskostnad")?.value) || null, // Använder generellt fält
    OvrigKostnadBeskrivning: document.getElementById("ovrigKostnadBeskrivning")?.value || "", // Använder generellt fält
    OvrigKostnadBelopp: parseFloat(document.getElementById("ovrigKostnadBelopp")?.value) || null, // Använder generellt fält
    FS_Bostad_AdressLghPost: document.getElementById("fsBostadAdressLghPost")?.value || "",
    FS_Bostad_TelefonEpost: document.getElementById("fsBostadTelefonEpost")?.value || "",
    FS_Bostad_Hyresvard: document.getElementById("fsBostadHyresvard")?.value || "",
    FS_Bostad_Kontraktstid: document.getElementById("fsBostadKontraktstid")?.value || "",
    FS_Bostad_AntalRum: parseInt(document.getElementById("fsBostadAntalRum")?.value) || null,
    FS_Bostad_AntalBoende: parseInt(document.getElementById("fsBostadAntalBoende")?.value) || null,
    FS_Sysselsattning_Sokande_Text: document.getElementById("fsSysselsattningSokande")?.value || "",
    FS_Sysselsattning_Medsokande_Text: document.getElementById("fsSysselsattningMedsokande")?.value || "",
    FS_AnsokanOvrigInfoHandlaggare:
      document.getElementById("fsAnsokanOvrigInfoHandlaggare_Sthlm")?.value ||
      document.getElementById("fsAnsokanOvrigInfoHandlaggare")?.value ||
      "",
  };
  const selectedHuvudmanPnr = currentHuvudmanFullData.huvudmanDetails.Personnummer;
  const yearForEndpoint = document.getElementById("periodStart_ars").value
    ? new Date(document.getElementById("periodStart_ars").value).getFullYear()
    : new Date().getFullYear();
  const payload = {
    huvudmanDetails: {
      Personnummer: selectedHuvudmanPnr,
      ...dataAttSpara,
    },
  };
  try {
    const response = await fetch(`/api/huvudman/${selectedHuvudmanPnr}/details/${yearForEndpoint}`, {
      method: "POST", // Eller PUT om det är mer lämpligt för din backend
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      alert("Uppgifter för försörjningsstöd har sparats för huvudmannen!");
      if (currentHuvudmanFullData && currentHuvudmanFullData.huvudmanDetails) {
        for (const key in dataAttSpara) {
          if (dataAttSpara.hasOwnProperty(key)) {
            currentHuvudmanFullData.huvudmanDetails[key] = dataAttSpara[key];
          }
        }
      }
    } else {
      const errorResult = await response.json();
      alert(`Kunde inte spara uppgifter: ${errorResult.error || response.statusText}`);
    }
  } catch (error) {
    console.error("Nätverksfel vid sparande av FS-data:", error);
    alert("Nätverksfel vid sparande av uppgifter.");
  }
}

function toggleErsattningFranFalt() {
  const statusSelect = document.getElementById("ersattningAnnanMyndighetStatus");
  const franContainer = document.getElementById("ersattningFranContainer");
  if (statusSelect && franContainer) {
    franContainer.style.display = statusSelect.value === "1" ? "block" : "none";
  }
}
/**
 * Avbryter redigeringsläget för en mall och återställer vyn.
 */
function cancelEditTemplate() {
  const mappingSection = document.getElementById("mappingSection");
  const statusDiv = document.getElementById("pdfUploadStatus");
  const uploadBox = document.querySelector("#tab-pdf-templates .box:nth-of-type(2)");

  currentTemplateId = null;
  if (mappingSection) mappingSection.style.display = "none";
  if (statusDiv) statusDiv.innerHTML = "";
  if (uploadBox) uploadBox.style.display = "block";
  document.getElementById("templateNameInput").value = "";
  document.getElementById("templateFileInput").value = "";
}

async function populateTemplateSelect(pnr = "") {
  if (window.__logPopulate) console.log("[populateTemplateSelect] pnr=", pnr);

  const select = document.getElementById("generatorTemplateSelect");
  select.innerHTML = '<option value="">Laddar mallar …</option>';

  try {
    const url = pnr ? `/api/get_pdf_templates.php?pnr=${encodeURIComponent(pnr)}` : "/api/get_pdf_templates.php";

    const res = await fetch(url);
    if (!res.ok) throw new Error(`(${res.status}) ${res.statusText}`);
    const templates = await res.json(); // [{ID,TemplateName,…}, …]

    // Bygg om listan
    select.innerHTML = '<option value="">-- Välj mall --</option>';
    templates.forEach(tpl => {
      const opt = document.createElement("option");
      opt.value = tpl.ID;
      opt.textContent = tpl.TemplateName;
      select.appendChild(opt);
    });

    // Behåll knappen inaktiv tills båda dropdowns har värden
    checkGeneratorSelections();
  } catch (err) {
    console.error("Fel vid hämtning av mallar:", err);
    select.innerHTML = '<option value="">Kunde inte ladda mallar</option>';
  }
}

/* -----------------------------------------------------------------
   I setupEventListeners() – byt ut den befintliga raden så att 
   huvudmans-bytet även laddar mallar på nytt.
------------------------------------------------------------------*/
document.getElementById("generatorHuvudmanSelect")?.addEventListener("change", () => {
  const pnr = document.getElementById("generatorHuvudmanSelect").value;
  populateTemplateSelect(pnr); // ← hämtar nya mallar
  checkGeneratorSelections(); //  & (de)aktiverar knappen
});

/**
 * Fyller dropdown-menyn med huvudmän genom att kopiera från den primära.
 */
function populateGeneratorHuvudmanSelect() {
  const sourceSelect = document.getElementById("huvudmanSelect");
  const targetSelect = document.getElementById("generatorHuvudmanSelect");
  if (sourceSelect && targetSelect) {
    targetSelect.innerHTML = sourceSelect.innerHTML;
    targetSelect.value = ""; // Nollställ valet
  }
}

/**
 * Aktiverar/inaktiverar "Hämta data"-knappen baserat på val.
 */
function checkGeneratorSelections() {
  const hmSelect = document.getElementById("generatorHuvudmanSelect").value;
  const templateSelect = document.getElementById("generatorTemplateSelect").value;
  const button = document.getElementById("loadDataForPdfButton");
  button.disabled = !(hmSelect && templateSelect);
}

async function loadDataForPdf() {
  const pnr = document.getElementById("generatorHuvudmanSelect").value;
  const templateId = document.getElementById("generatorTemplateSelect").value;
  const previewContainer = document.getElementById("pdfPreviewFormContainer");
  const previewSection = document.getElementById("pdfPreviewSection");
  const ocrSection = document.getElementById("ocrHelperSection"); // Nytt
  const button = document.getElementById("loadDataForPdfButton");

  if (!pnr || !templateId) return;

  button.disabled = true;
  button.textContent = "Laddar...";
  previewSection.style.display = "none";
  ocrSection.style.display = "none"; // Nytt
  previewContainer.innerHTML = "";

  try {
    const response = await fetch(`/api/generate_pdf.php?pnr=${pnr}&templateId=${templateId}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Okänt serverfel");
    }
    currentGeneratorData = await response.json();
    console.log("Data för PDF-generator mottagen:", currentGeneratorData);

    renderPreviewForm(currentGeneratorData);

    // Visa sektionerna
    ocrSection.style.display = "block"; // Nytt
    previewSection.style.display = "block";
    previewSection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    alert(`Kunde inte hämta data för PDF: ${error.message}`);
    console.error("Fel i loadDataForPdf:", error);
  } finally {
    button.disabled = false;
    button.textContent = "Hämta data & Förbered";
  }
}

/**
 * Ritar upp förhandsgranskningsformuläret med redigerbara fält.
 * - **KORRIGERAD**: Säkerställer att `data-auto-field` sätts korrekt.
 */
function renderPreviewForm(data) {
  const container = document.getElementById("pdfPreviewFormContainer");
  container.innerHTML = "";

  if (!data.mappings || data.mappings.length === 0) {
    container.innerHTML =
      '<p>Denna mall har inga fält kopplade till databasen. Gå till "PDF-mallar" för att skapa kopplingar.</p>';
    document.getElementById("generateFinalPdfButton").style.display = "none";
    return;
  }
  document.getElementById("generateFinalPdfButton").style.display = "inline-block";

  const formGrid = document.createElement("div");
  formGrid.className = "form-grid";

  data.mappings.forEach(mapping => {
    const { PdfFieldName, DbColumnName } = mapping;

    const formColumn = document.createElement("div");
    formColumn.className = "form-column";
    const inputGroup = document.createElement("div");
    inputGroup.className = "input-group";

    const label = document.createElement("label");
    label.htmlFor = `preview_${PdfFieldName}`;

    let value = resolveDbValue(DbColumnName, data);
    let inputElement;

    if (DbColumnName.startsWith("auto_")) {
      label.innerHTML = `${PdfFieldName}: <small><em>(auto-genereras)</em></small>`;
      inputElement = document.createElement("input");
      inputElement.type = "text";
      inputElement.dataset.autoField = DbColumnName; // Sätt det speciella attributet
      inputElement.disabled = true;
      inputElement.value = value; // Visa initialt värde
    } else if (DbColumnName.startsWith("manual_")) {
      label.innerHTML = `${PdfFieldName}: <small><em>(Manuell inmatning)</em></small>`;
      switch (DbColumnName) {
        case "manual_text_lang":
          inputElement = document.createElement("textarea");
          inputElement.rows = 3;
          break;
        case "manual_datum":
          inputElement = document.createElement("input");
          inputElement.type = "date";
          break;
        case "manual_siffra":
          inputElement = document.createElement("input");
          inputElement.type = "number";
          break;
        case "manual_kryssruta_ja":
          inputElement = document.createElement("input");
          inputElement.type = "checkbox";
          label.style.display = "flex";
          label.style.alignItems = "center";
          label.prepend(inputElement);
          break;
        default:
          inputElement = document.createElement("input");
          inputElement.type = "text";
      }
    } else {
      label.innerHTML = `${PdfFieldName}: <small><em>(från ${DbColumnName})</em></small>`;
      inputElement = document.createElement("input");
      inputElement.type = "text";
    }

    if (inputElement) {
      inputElement.id = `preview_${PdfFieldName}`;
      inputElement.dataset.pdfField = PdfFieldName;
      inputElement.dataset.dbSource = DbColumnName;
      if (inputElement.type !== "checkbox") {
        // Fyll bara i värde om det INTE är ett autofält (det har redan fyllts i ovan)
        if (!inputElement.dataset.autoField) {
          inputElement.value = value || "";
        }
        inputGroup.appendChild(label);
        inputGroup.appendChild(inputElement);
      } else {
        inputElement.checked = !!value;
        inputGroup.appendChild(label);
      }
    }

    formColumn.appendChild(inputGroup);
    formGrid.appendChild(formColumn);
  });

  container.appendChild(formGrid);
}

/**
 * Slutgiltig funktion som tar värdena från förhandsgranskningen och fyller i PDF:en.
 * - Hanterar automatiska fält som `dagens_datum`.
 * - **NYTT**: Hanterar fasta textfält som `Godman_fasttext`.
 */
async function generateFinalPdf() {
  if (!currentGeneratorData) {
    alert("Ingen data är laddad. Klicka på 'Hämta data & Förbered' först.");
    return;
  }

  const { PDFDocument } = PDFLib;
  const { templateFileUrl, huvudman } = currentGeneratorData;

  try {
    const existingPdfBytes = await fetch(templateFileUrl).then(res => {
      if (!res.ok) throw new Error(`Kunde inte ladda mallen från ${templateFileUrl}`);
      return res.arrayBuffer();
    });
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    const previewInputs = document.querySelectorAll("#pdfPreviewFormContainer [data-pdf-field]");

    previewInputs.forEach(input => {
      const pdfFieldName = input.dataset.pdfField;
      const dbSource = input.dataset.dbSource;
      let valueToSet = "";

      if (dbSource && dbSource.startsWith("auto_")) {
        valueToSet = resolveDbValue(dbSource, currentGeneratorData);
      } else if (input.type === "checkbox") {
        // Hantera checkbox separat
      } else {
        valueToSet = input.value || "";
      }

      try {
        const field = form.getField(pdfFieldName);
        if (input.type === "checkbox") {
          if (input.checked) field.check();
          else field.uncheck();
        } else {
          field.setText(String(valueToSet));
        }
      } catch (e) {
        console.warn(`Kunde inte fylla i fältet '${pdfFieldName}': ${e.message}`);
      }
    });

    // *** NYTT BLOCK FÖR FASTA TEXTER ***
    try {
      const fastTextField = form.getTextField("Godman_fasttext"); // Letar efter fältet med detta exakta namn
      fastTextField.setText("God man");
      console.log("Fyllde i det fasta textfältet 'Godman_fasttext' med texten 'God man'.");
    } catch (e) {
      // Ignorera felet om fältet inte finns i just denna mall.
      // console.warn("Fältet 'Godman_fasttext' hittades inte i denna mall.");
    }
    // *** SLUT PÅ NYTT BLOCK ***

    form.flatten();

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    const templateName =
      document.getElementById("generatorTemplateSelect").options[
        document.getElementById("generatorTemplateSelect").selectedIndex
      ].text;
    const safeTemplateName = templateName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${safeTemplateName}_${huvudman.PERSONNUMMER}_${new Date().toISOString().slice(0, 10)}.pdf`;

    triggerDownload(blob, filename);
  } catch (error) {
    console.error("Fel vid skapande av slutgiltig PDF:", error);
    alert(`Kunde inte skapa PDF: ${error.message}`);
  }
}
// ========================================================================
// NYA FUNKTIONER FÖR DOKUMENTARKIV
// ========================================================================

/**
 * Fyller dropdown-menyn i arkivet med huvudmän.
 */
function populateArkivHuvudmanSelect() {
  const sourceSelect = document.getElementById("huvudmanSelect");
  const targetSelect = document.getElementById("arkivHuvudmanSelect");
  if (sourceSelect && targetSelect) {
    targetSelect.innerHTML = sourceSelect.innerHTML;
    targetSelect.value = ""; // Nollställ valet
  }
}

/**
 * Körs när en huvudman väljs i arkiv-fliken.
 */
function handleArkivHuvudmanSelect() {
  const pnr = document.getElementById("arkivHuvudmanSelect").value;
  const contentSection = document.getElementById("arkivContentSection");

  if (!pnr) {
    contentSection.style.display = "none";
    return;
  }

  const selectedOption = document.querySelector(`#arkivHuvudmanSelect option[value="${pnr}"]`);
  document.getElementById("arkivHuvudmanNamn").textContent = selectedOption.textContent;
  contentSection.style.display = "block";

  // Rensa gamla uppgifter och ladda nya
  document.getElementById("arkivDokumentTyp").value = "";
  document.getElementById("arkivFilInput").value = "";
  document.getElementById("arkivUploadStatus").textContent = "";
  checkArkivUploadButton();
  loadAndDisplayArkivDokument(pnr);
}
/**
 * Raderar ett arkiverat dokument efter bekräftelse.
 * @param {number} docId - ID för dokumentet som ska raderas.
 * @param {string} docName - Namnet/typen av dokument för bekräftelsedialogen.
 * @param {string} pnr - Huvudmannens PNR, för att kunna ladda om listan.
 */
async function deleteArkivDokument(docId, docName, pnr) {
  if (!confirm(`Är du säker på att du vill radera dokumentet "${docName}"?\nDetta går inte att ångra.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/delete_huvudman_dokument.php?id=${docId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Okänt fel vid radering.");
    }

    alert(result.message);
    await loadAndDisplayArkivDokument(pnr); // Ladda om listan för den aktuella huvudmannen
  } catch (error) {
    console.error("Fel vid radering av arkivdokument:", error);
    alert(`Kunde inte radera dokumentet: ${error.message}`);
  }
}
async function loadAndDisplayArkivDokument(pnr) {
  const container = document.getElementById("arkivTableContainer");
  container.innerHTML = "<p><i>Laddar dokument...</i></p>";

  try {
    const response = await fetch(`/api/get_huvudman_dokument.php?pnr=${pnr}`);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Okänt serverfel");
    }
    const dokument = await response.json();

    if (dokument.length === 0) {
      container.innerHTML = "<p>Inga dokument har sparats för denna huvudman ännu.</p>";
      return;
    }

    container.innerHTML = "";
    const table = document.createElement("table");
    table.innerHTML = `
            <thead>
                <tr>
                    <th>Dokumenttyp / Beskrivning</th>
                    <th>Uppladdad</th>
                    <th>Åtgärd</th>
                </tr>
            </thead>
        `;
    const tbody = document.createElement("tbody");
    dokument.forEach(doc => {
      const row = tbody.insertRow();
      row.insertCell().textContent = doc.DokumentTyp;
      row.insertCell().textContent = new Date(doc.CreatedAt).toLocaleDateString("sv-SE");

      const actionCell = row.insertCell();

      const link = document.createElement("a");
      link.href = doc.StoredPath;
      link.textContent = "Öppna";
      link.target = "_blank";
      link.className = "button small";
      actionCell.appendChild(link);

      // === NY KNAPP HÄR ===
      const deleteButton = document.createElement("button");
      deleteButton.className = "small danger";
      deleteButton.textContent = "Ta bort";
      deleteButton.style.marginLeft = "8px";
      deleteButton.onclick = () => deleteArkivDokument(doc.ID, doc.DokumentTyp, pnr);
      actionCell.appendChild(deleteButton);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  } catch (error) {
    console.error("Fel vid hämtning av arkivdokument:", error);
    container.innerHTML = `<p style="color: red;">Kunde inte ladda dokument: ${error.message}</p>`;
  }
}
/**
 * Aktiverar/inaktiverar uppladdningsknappen.
 */
function checkArkivUploadButton() {
  const dokumentTyp = document.getElementById("arkivDokumentTyp").value.trim();
  const filVald = document.getElementById("arkivFilInput").files.length > 0;
  document.getElementById("uploadArkivButton").disabled = !(dokumentTyp && filVald);
}

/**
 * Hanterar uppladdning av ett nytt dokument till arkivet.
 */
async function uploadArkivDokument() {
  const pnr = document.getElementById("arkivHuvudmanSelect").value;
  const dokumentTyp = document.getElementById("arkivDokumentTyp").value.trim();
  const fileInput = document.getElementById("arkivFilInput");
  const file = fileInput.files[0];
  const statusDiv = document.getElementById("arkivUploadStatus");
  const uploadButton = document.getElementById("uploadArkivButton");

  if (!pnr || !dokumentTyp || !file) {
    alert("Välj huvudman, ange en beskrivning och välj en fil.");
    return;
  }

  uploadButton.disabled = true;
  statusDiv.textContent = "Laddar upp...";
  statusDiv.style.color = "orange";

  const formData = new FormData();
  formData.append("pnr", pnr);
  formData.append("dokumentTyp", dokumentTyp);
  formData.append("arkivFil", file);

  try {
    const response = await fetch("/api/upload_huvudman_dokument.php", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Okänt fel vid uppladdning.");
    }

    statusDiv.textContent = result.message;
    statusDiv.style.color = "green";

    // Rensa fälten och ladda om listan
    document.getElementById("arkivDokumentTyp").value = "";
    fileInput.value = "";
    await loadAndDisplayArkivDokument(pnr);
  } catch (error) {
    console.error("Fel vid uppladdning av arkivdokument:", error);
    statusDiv.textContent = `Fel: ${error.message}`;
    statusDiv.style.color = "red";
  } finally {
    checkArkivUploadButton();
  }
}
/**
 * Raderar en PDF-mall efter bekräftelse.
 * @param {number} templateId - ID för mallen som ska raderas.
 * @param {string} templateName - Namnet på mallen för bekräftelsedialogen.
 */
async function deletePdfTemplate(templateId, templateName) {
  if (!confirm(`Är du säker på att du vill radera mallen "${templateName}"?\nDetta går inte att ångra.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/delete_pdf_template.php?id=${templateId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Okänt fel vid radering.");
    }

    alert(result.message);
    await loadAndDisplaySavedTemplates(); // Ladda om listan
  } catch (error) {
    console.error("Fel vid radering av PDF-mall:", error);
    alert(`Kunde inte radera mallen: ${error.message}`);
  }
}
// ========================================================================
// NYA FUNKTIONER FÖR OCR-HJÄLP (KORRIGERADE)
// ========================================================================

/**
 * Hanterar uppladdning av en faktura-PDF för textigenkänning.
 * Försöker först läsa textlager. Om det misslyckas, startar den en
 * fullständig OCR-process i webbläsaren med Tesseract.js.
 */
async function handleOcrFakturaUpload(event) {
  const fileInput = event.target;
  const file = fileInput.files[0];
  const statusDiv = document.getElementById("ocrStatus");

  if (!file) {
    statusDiv.textContent = "";
    return;
  }

  statusDiv.textContent = "Läser PDF-fil...";
  statusDiv.style.color = "orange";

  try {
    const fileReader = new FileReader();
    fileReader.onload = async e => {
      const pdfBytes = e.target.result;
      let fullText = "";

      // --- FÖRSÖK 1: Snabb metod med pdf-lib ---
      try {
        statusDiv.textContent = "Försöker läsa textlager (snabb metod)...";
        const { PDFDocument, PDFHexString, PDFString } = PDFLib;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        for (const page of pages) {
          const { contents } = page.node.normalizedEntries();
          const contentStream = pdfDoc.context.lookup(contents);
          if (contentStream) {
            const operators = pdfDoc.context.parser.parseContentStream(contentStream.getContents());
            for (let i = 0; i < operators.length; i++) {
              const op = operators[i];
              if (op.name === "Tj" || op.name === "TJ") {
                const arg = op.args[0];
                let text = "";
                if (arg instanceof PDFHexString || arg instanceof PDFString) {
                  text = arg.toString();
                } else if (Array.isArray(arg)) {
                  arg.forEach(subArg => {
                    if (subArg instanceof PDFHexString || subArg instanceof PDFString) {
                      text += subArg.toString();
                    }
                  });
                }
                fullText += text + " ";
              }
            }
            fullText += "\n";
          }
        }
      } catch (pdfLibError) {
        console.warn("pdf-lib kunde inte läsa filen, fortsätter med OCR.", pdfLibError);
        fullText = ""; // Nollställ om det misslyckades
      }

      // --- FÖRSÖK 2: Full OCR med Tesseract om snabb metod misslyckades ---
      if (!fullText.trim()) {
        statusDiv.textContent = "Inget textlager hittades. Startar bildanalys (OCR)... Detta kan ta en stund.";

        // Ladda PDF:en med pdf.js
        const pdfjsLib = window["pdfjs-dist/build/pdf"];
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js`;
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        const { createWorker } = Tesseract;
        const worker = await createWorker("swe");

        for (let i = 1; i <= numPages; i++) {
          statusDiv.textContent = `Analyserar sida ${i} av ${numPages}...`;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); // Högre skala = bättre OCR

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport: viewport }).promise;

          const {
            data: { text },
          } = await worker.recognize(canvas);
          fullText += text + "\n";
        }
        await worker.terminate();
      }

      if (!fullText.trim()) {
        throw new Error("Kunde inte extrahera någon text. PDF:en är troligen tom eller oläslig.");
      }

      statusDiv.textContent = "Söker efter data i den igenkända texten...";
      const foundData = parseFakturaText(fullText);
      displayOcrResults(foundData);
    };
    fileReader.readAsArrayBuffer(file);
  } catch (error) {
    statusDiv.textContent = `Fel: ${error.message}`;
    statusDiv.style.color = "red";
  }
}

/**
 * **NY, FÖRBÄTTRAD VERSION 28 (Final & Robust)**
 * Söker igenom en textmassa efter vanliga fakturauppgifter med de mest robusta metoderna vi testat.
 * @param {string} text - Den extraherade texten från PDF:en.
 * @returns {object} - Ett objekt med de funna värdena.
 */
function parseFakturaText(text) {
  const foundData = {
    foretagsnamn: null,
    gatuadress: null,
    postadress: null,
    bankgiro: null,
    plusgiro: null,
    orgnr: null,
    kundnr: null,
    belopp: null,
  };

  // Funktion för att hitta ett värde i texten
  const findValue = (patterns, sourceText = text) => {
    for (const pattern of patterns) {
      const match = sourceText.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  };

  // 1. Hitta alla specifika, unika delar först
  foundData.bankgiro = findValue([/(?:Bankgiro|BG)[\s:]*(\d{3,4}-\d{4})/i]);
  foundData.plusgiro = findValue([/(?:Plusgiro|PG)[\s:]*(\d+-\d)/i]);
  foundData.orgnr = findValue([/(?:Org\.?nr|Organisationsnr)[\s:]*(\d{6}-\d{4})/i, /(\d{6}-\d{4})/]);
  foundData.kundnr = findValue([/(?:Kundnr|Kundnummer|Avtalsnr|Betalarnummer)[\s:]*(\S+)/i]);
  foundData.belopp = findValue([/(?:Att betala|Summa|TOTALT)[\s:]*([\d\s,]+kr)/i]);

  // 2. Hitta och dela upp adressen
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const postadressMatch = line.match(/^(\d{5}\s+[A-ZÅÄÖ\s]+)/i);
    if (postadressMatch) {
      foundData.postadress = postadressMatch[1];
      if (i > 0 && /\d/.test(lines[i - 1])) {
        foundData.gatuadress = lines[i - 1].trim();
        // Anta att företagsnamnet är raden innan gatuadressen
        if (i > 1) {
          foundData.foretagsnamn = lines[i - 2].trim();
        }
      }
      break;
    }
  }

  // Fallback för företagsnamn från webbadress om inget annat hittades
  if (!foundData.foretagsnamn) {
    const webMatch = text.match(/www\.(\w+)\.se/i);
    if (webMatch && webMatch[1]) {
      foundData.foretagsnamn = webMatch[1].charAt(0).toUpperCase() + webMatch[1].slice(1);
    }
  }

  // 4. Slutlig rensning
  for (const key in foundData) {
    if (foundData[key] && typeof foundData[key] === "string") {
      // Ta bort allt efter ett telefonnummer
      let cleanedValue = foundData[key].split(/\s\d{2,}[- ]\d{2,}/)[0].trim();
      // Ta bort eventuella e-postadresser
      cleanedValue = cleanedValue.split(/\S+@\S+/)[0].trim();
      foundData[key] = cleanedValue;
    }
  }

  if (foundData.postadress) {
    foundData.postadress = foundData.postadress.replace(/^(\d{3})(\d{2})/, "$1 $2");
  }

  console.log("Extraherad och uppdelad data från OCR (v28):", foundData);
  return foundData;
}
/**
 * Fyller i förhandsgranskningsformuläret med data från OCR-modalen.
 * Använder en skräddarsydd mappning av nyckelord för att matcha formulärfälten.
 */
function applyOcrData(ocrData) {
  if (!ocrData) return;

  console.log("Försöker applicera OCR-data med skräddarsydd mappning:", ocrData);

  const ocrToLabelKeywords = {
    foretagsnamn: ["namn på betalningsmottagare"],
    gatuadress: ["fullständig adress mottagare rad 1"],
    postadress: ["fullständig adress mottagare rad 2"],
    bankgiro: ["bankgironummer"],
    orgnr: ["organisationsnummer"],
    kundnr: ["betalarkundnummer"],
    plusgiro: ["plusgironummer", "plusgiro"],
    belopp: ["belopp", "summa", "betala"],
  };

  const manualInputs = document.querySelectorAll('#pdfPreviewFormContainer [data-db-source^="manual_"]');

  manualInputs.forEach(input => {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (!label) return;

    const labelText = label.textContent.toLowerCase();

    for (const [dataKey, keywords] of Object.entries(ocrToLabelKeywords)) {
      if (keywords.some(keyword => labelText.includes(keyword))) {
        // Fyll i värdet om det finns, annars lämna fältet tomt (eller skriv "Hittades ej" om du föredrar det)
        input.value = ocrData[dataKey] || "";
        console.log(
          `Fält med label "${label.textContent}" matchade nyckel '${dataKey}'. Värde satt till: ${input.value}`
        );
        break;
      }
    }
  });

  const statusDiv = document.getElementById("ocrStatus");
  if (statusDiv) {
    statusDiv.textContent = "Data från faktura har klistrats in!";
    statusDiv.style.color = "green";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 4000);
  }
}

/**
 * Visar de funna OCR-resultaten i en modal.
 * Visar ALLA sökta fält, även de som inte hittades, för tydlighet.
 */
function displayOcrResults(data) {
  const container = document.getElementById("ocrResultContainer");
  const modal = document.getElementById("ocrResultModal");
  const useButton = document.getElementById("useOcrDataButton");
  const statusDiv = document.getElementById("ocrStatus");

  container.innerHTML = ""; // Rensa gammalt innehåll

  const fieldsToShow = {
    Företagsnamn: data.foretagsnamn,
    Gatuadress: data.gatuadress,
    Postadress: data.postadress,
    Organisationsnr: data.orgnr,
    Bankgiro: data.bankgiro,
    Plusgiro: data.plusgiro,
    Kundnr: data.kundnr,
    Belopp: data.belopp,
  };

  let hasAnyData = false;
  for (const [label, value] of Object.entries(fieldsToShow)) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    p.appendChild(strong);

    if (value) {
      p.appendChild(document.createTextNode(value));
      hasAnyData = true;
    } else {
      const em = document.createElement("em");
      em.textContent = "Hittades ej";
      em.style.color = "#999";
      p.appendChild(em);
    }
    container.appendChild(p);
  }

  if (!hasAnyData) {
    statusDiv.textContent = "Kunde inte hitta någon igenkännbar data i PDF:en.";
    statusDiv.style.color = "red";
    useButton.style.display = "none";
  } else {
    statusDiv.textContent = "Data hittades! Granska i fönstret.";
    statusDiv.style.color = "green";
    useButton.style.display = "inline-block";
  }

  useButton.onclick = () => {
    applyOcrData(data);
    closeOcrResultModal();
  };

  modal.style.display = "block";
}
/**
 * **NY, FÖRBÄTTRAD VERSION 6 (applyOcrData - Skräddarsydd)**
 * Fyller i förhandsgranskningsformuläret med data från OCR-modalen.
 * - **NYCKELÄNDRING**: Använder en exakt och skräddarsydd mappning av nyckelord som matchar din PDF-mall.
 * - Fyller i fält med "Hittades ej" om data saknas, för att verifiera kopplingen.
 */
function applyOcrData(ocrData) {
  if (!ocrData) return;

  console.log("Försöker applicera OCR-data med skräddarsydd mappning:", ocrData);

  // **SKRÄDDARSYDD MAPPNING FÖR DIN PDF-MALL**
  // Mappning från OCR-datanyckel till nyckelord att leta efter i fältets <label>
  const ocrToLabelKeywords = {
    foretagsnamn: ["namn på betalningsmottagare"],
    gatuadress: ["fullständig adress mottagare rad 1"],
    postadress: ["fullständig adress mottagare rad 2"],
    bankgiro: ["bankgironummer"],
    orgnr: ["organisationsnummer"],
    kundnr: ["betalarkundnummer"],
    // 'plusgiro' och 'belopp' finns inte som fält i denna specifika mall, men vi låter dem vara kvar ifall du använder en annan mall.
    plusgiro: ["plusgironummer", "plusgiro"],
    belopp: ["belopp", "summa", "betala"],
  };

  // Hitta alla manuella input-fält i förhandsgranskningen
  const manualInputs = document.querySelectorAll('#pdfPreviewFormContainer [data-db-source^="manual_"]');

  // Gå igenom alla fält i formuläret
  manualInputs.forEach(input => {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (!label) return;

    const labelText = label.textContent.toLowerCase();
    let dataApplied = false;

    // Gå igenom vår mappning för att se om detta fält matchar någon datatyp
    for (const [dataKey, keywords] of Object.entries(ocrToLabelKeywords)) {
      if (keywords.some(keyword => labelText.includes(keyword))) {
        // Vi har en match! Fyll i värdet om det finns, annars "Hittades ej".
        input.value = ocrData[dataKey] || "Hittades ej";
        console.log(`Fält med label "${label.textContent}" matchade nyckel '${dataKey}'. Värde: ${input.value}`);
        dataApplied = true;
        break; // Gå vidare till nästa input-fält
      }
    }
  });

  const statusDiv = document.getElementById("ocrStatus");
  if (statusDiv) {
    statusDiv.textContent = "Data från faktura har klistrats in!";
    statusDiv.style.color = "green";
    setTimeout(() => {
      statusDiv.textContent = "";
    }, 4000);
  }
}

/**
 * Stänger OCR-resultatmodalen.
 */
function closeOcrResultModal() {
  const modal = document.getElementById("ocrResultModal");
  if (modal) modal.style.display = "none";
  document.getElementById("ocrFakturaInput").value = ""; // Rensa filvalet
  document.getElementById("ocrStatus").textContent = "";
}
/**
 * Körs varje gång fliken ”Koppla PDF-formulär” öppnas.
 * Sätter upp knapp-/input-lyssnare bara en gång.
 */
function initPdfMapperTab() {
  if (initPdfMapperTab._initialized) return; // kör inte dubbelt
  initPdfMapperTab._initialized = true;

  const uploadBtn = document.getElementById("btnUploadPdfTemplate");
  const saveBtn = document.getElementById("btnSavePdfMapping");

  uploadBtn?.addEventListener("click", handlePdfTemplateUpload);
  saveBtn?.addEventListener("click", savePdfMapping);
}

/**
 * 1. Validerar vald fil   2. POST:ar den till api/upload_pdf_template.php
 * 3. Får tillbaka {success: true, templateId, fields: [...] }
 * 4. Visar mapping-tabellen och fyller den med renderMappingTable().
 */
async function handlePdfTemplateUpload() {
  const fileInput = document.getElementById("pdfTemplateUpload");
  if (!fileInput || !fileInput.files.length) {
    alert("Välj en PDF-fil först.");
    return;
  }
  const file = fileInput.files[0];
  if (file.type !== "application/pdf") {
    alert("Filen måste vara en PDF.");
    return;
  }

  const formData = new FormData();
  formData.append("pdfTemplate", file);

  try {
    const res = await fetch("api/upload_pdf_template.php", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Uppladdningen misslyckades.");
    }

    console.log("[PDF-Mapper] Uppladdad mall-ID:", json.templateId);
    // Visa mapping-UI
    document.getElementById("pdfFieldMappingContainer").style.display = "block";

    // Spara templateId i knappen → används när kopplingen sparas
    document.getElementById("btnSavePdfMapping").dataset.templateId = json.templateId;

    // Bygg tabellen
    renderMappingTable(json.fields);
  } catch (err) {
    console.error("Upload error", err);
    alert("Kunde inte ladda upp PDF: " + err.message);
  }
}

/**
 * Samlar ihop alla <select> i tabellen och POST:ar { templateId, mappings:[...] }
 * till api/save_pdf_mapping.php
 */
async function savePdfMapping() {
  const btn = document.getElementById("btnSavePdfMapping");
  const tid = btn?.dataset?.templateId;
  if (!tid) {
    alert("Ingen uppladdad mall ännu.");
    return;
  }

  // 1. Samla alla valda kopplingar
  const mappings = [];
  document.querySelectorAll("#pdfFieldMappingTable select").forEach(sel => {
    if (sel.value) {
      mappings.push({ pdfField: sel.dataset.pdfField, dbColumn: sel.value });
    }
  });

  if (mappings.length === 0) {
    alert("Inga fält har valts – mappningen är tom.");
    return;
  }

  // 2. Skicka till servern
  try {
    const res = await fetch("api/save_pdf_mapping.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: tid, mappings }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      console.log("[PDF-MAP] Mappning sparad:", data);
      alert("PDF-mappning sparad!");
      // uppdatera ev. visning eller hämta om tabellen
      await loadPdfTemplateDetails(tid);
    } else {
      console.error("[PDF-MAP] Fel vid spar:", data);
      alert("Fel vid sparande av PDF-mappning. Se konsolen för detaljer.");
    }
  } catch (err) {
    console.error("[PDF-MAP] Undantag:", err);
    alert("Kunde inte spara PDF-mappning (nätverksfel?).");
  }
}

// --- LOGIK FÖR FAKTURABETALNING (UiPath-interaktion) ---

async function startRpaPaymentProcess() {
  const bank = document.getElementById("bankChoice").value;
  const statusDiv = document.getElementById("rpaStatus");
  const logTbody = document.querySelector("#fakturaLogTable tbody");

  statusDiv.textContent = `Skickar startsignal till robot för ${bank}...`;
  statusDiv.style.color = "orange";
  logTbody.innerHTML = '<tr><td colspan="5"><i>Väntar på svar från roboten...</i></td></tr>';

  const payload = {
    bank: bank,
    // Sökvägen skickas nu från PHP-filen, men vi kan skicka med den om vi vill
    // fakturaMapp: "C:\\Users\\lars-1\\OneDrive\\Skrivbord\\FakturaTest\\Nya"
  };

  try {
    // Detta är det RIKTIGA anropet till din server
    const response = await fetch("api/start_uipath_job.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success) {
      statusDiv.textContent = `Status: ${result.message}`;
      statusDiv.style.color = "green";
      // Här skulle du i framtiden kunna bygga logik för att hämta den riktiga loggen
      logTbody.innerHTML =
        '<tr><td colspan="5"><i>Roboten har startats. Kontrollera UiPath Assistant för att se förloppet.</i></td></tr>';
    } else {
      throw new Error(result.error || "Okänt fel från servern.");
    }
  } catch (error) {
    console.error("Fel vid start av RPA-process:", error);
    statusDiv.textContent = `Fel: ${error.message}`;
    statusDiv.style.color = "red";
    logTbody.innerHTML = '<tr><td colspan="5"><i>Kunde inte starta roboten.</i></td></tr>';
  }
}

// --- LOGIK FÖR LÄNKSAMLING ---

// Funktion för att hämta länkar från localStorage
function getLinks() {
  try {
    const linksJson = localStorage.getItem("godmanAppLinks");
    return linksJson ? JSON.parse(linksJson) : [];
  } catch (e) {
    console.error("Kunde inte hämta länkar från localStorage", e);
    return [];
  }
}

// Funktion för att spara länkar till localStorage
function saveLinks(links) {
  try {
    localStorage.setItem("godmanAppLinks", JSON.stringify(links));
  } catch (e) {
    console.error("Kunde inte spara länkar till localStorage", e);
  }
}

// Funktion för att rendera länkarna på sidan
function renderLinks() {
  const container = document.getElementById("linkCategoriesContainer");
  if (!container) return;

  const links = getLinks();
  container.innerHTML = "";

  if (links.length === 0) {
    container.innerHTML = "<p><i>Inga länkar har sparats ännu.</i></p>";
    return;
  }

  // Gruppera länkar efter kategori
  const categories = links.reduce((acc, link) => {
    const category = link.category || "Okategoriserat";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(link);
    return acc;
  }, {});

  // Sortera kategorierna alfabetiskt
  const sortedCategories = Object.keys(categories).sort((a, b) => a.localeCompare(b));

  sortedCategories.forEach(categoryName => {
    const section = document.createElement("div");
    section.className = "collapsible-section";

    const header = document.createElement("h3");
    header.className = "collapsible-header";
    header.innerHTML = `${categoryName} <span class="toggler">▼</span>`;

    const content = document.createElement("div");
    content.className = "collapsible-content hidden-content";

    const ul = document.createElement("ul");
    ul.className = "link-list";

    categories[categoryName].forEach(link => {
      const li = document.createElement("li");
      li.innerHTML = `
                <a href="${link.url}" target="_blank">${link.name}</a>
                <div class="link-actions">
                    <button class="small secondary" onclick="editLink('${link.id}')"><i class="fas fa-edit"></i></button>
                    <button class="small danger" onclick="deleteLink('${link.id}')"><i class="fas fa-trash"></i></button>
                </div>
            `;
      ul.appendChild(li);
    });

    content.appendChild(ul);
    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);
  });
}

// Funktion för att rensa länk-formuläret
function clearLinkForm() {
  document.getElementById("linkEditId").value = "";
  document.getElementById("linkName").value = "";
  document.getElementById("linkUrl").value = "";
  document.getElementById("linkCategory").value = "";
  document.getElementById("linkName").focus();
}

// Funktion för att hantera sparande/uppdatering av en länk
function handleSaveLink() {
  const id = document.getElementById("linkEditId").value;
  const name = document.getElementById("linkName").value.trim();
  const url = document.getElementById("linkUrl").value.trim();
  const category = document.getElementById("linkCategory").value.trim();

  if (!name || !url || !category) {
    alert("Alla fält (Namn, URL, Kategori) måste fyllas i.");
    return;
  }

  let links = getLinks();

  if (id) {
    // Uppdatera befintlig länk
    const linkIndex = links.findIndex(l => l.id === id);
    if (linkIndex > -1) {
      links[linkIndex] = { id, name, url, category };
    }
  } else {
    // Skapa ny länk
    const newLink = {
      id: `link_${Date.now()}`,
      name,
      url,
      category,
    };
    links.push(newLink);
  }

  saveLinks(links);
  renderLinks();
  clearLinkForm();
}

// Funktion för att redigera en länk
function editLink(id) {
  const links = getLinks();
  const linkToEdit = links.find(l => l.id === id);
  if (linkToEdit) {
    document.getElementById("linkEditId").value = linkToEdit.id;
    document.getElementById("linkName").value = linkToEdit.name;
    document.getElementById("linkUrl").value = linkToEdit.url;
    document.getElementById("linkCategory").value = linkToEdit.category;
    document.getElementById("linkName").focus();
  }
}

// Funktion för att ta bort en länk
function deleteLink(id) {
  if (confirm("Är du säker på att du vill ta bort denna länk?")) {
    let links = getLinks();
    links = links.filter(l => l.id !== id);
    saveLinks(links);
    renderLinks();
  }
}

// ============== KPI (Aktiva Huvudmän) ===============================
async function loadDashboardStats(ofId = null, includeInactive = true) {
  // Stöder både <div id="statsTotalHuvudman"> och <strong id="stats-total-huvudman">
  const elA = document.getElementById("statsTotalHuvudman");
  const elB = document.getElementById("stats-total-huvudman");
  if (elA) elA.textContent = ".";
  if (elB) elB.textContent = ".";

  try {
    const params = new URLSearchParams();
    if (ofId) params.set("of_id", ofId);
    if (includeInactive) params.set("include_inactive", "1");
    params.set("t", Date.now());

    const res = await fetch(`api/get_dashboard_stats.php?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();

    // Backend kan svara {stats:{total_huvudman}} eller {total_huvudman}
    const n = json?.stats?.total_huvudman ?? json?.total_huvudman ?? 0;
    if (elA) elA.textContent = String(n);
    if (elB) elB.textContent = String(n);
  } catch (e) {
    console.warn("[DASH/KPI] kunde inte hämta statistik:", e);
    if (elA) elA.textContent = "0";
    if (elB) elB.textContent = "0";
  }
}

function ensureBox(id, titleHtml) {
  const wrap = document.getElementById("huvudman-dashboard-content");
  if (!wrap) return null;
  let box = document.getElementById(id);
  if (!box) {
    box = document.createElement("div");
    box.id = id;
    box.className = "box dashboard-kort";
    wrap.appendChild(box);
  }
  if (titleHtml) box.innerHTML = titleHtml;
  return box;
}

/**
 * Ritar upp hela dashboard-innehållet, inklusive "Överblick", "Myndigheter" och "Budget".
 * Denna version är korrigerad för att använda de exakta kolumnnamnen (VERSALER) från databasen.
 * @param {object} details - Huvudmannens detaljer.
 * @param {array} documents - Lista med dokument.
 * @param {array} bankkonton - Lista med bankkonton.
 */
function renderDashboard(details, documents = [], bankkonton = []) {
  const wrap = document.getElementById(DASHBOARD_CONTAINER_ID);
  if (!wrap) return;

  // Töm & visa
  wrap.style.display = "block";
  wrap.innerHTML = "";

  const safe = v => (v === null || v === undefined ? "" : v);
  const $$ = id => document.getElementById(id);

  // --- Skapa och lägg till Översiktsrutan ---
  const overviewBox = document.createElement("div");
  overviewBox.className = "box dashboard-kort";
  overviewBox.id = "huvudman-overview-box";

  const pnr = getCaseInsensitive(details, "PERSONNUMMER");
  const fornamn = getCaseInsensitive(details, "FORNAMN");
  const efternamn = getCaseInsensitive(details, "EFTERNAMN");
  const adress = getCaseInsensitive(details, "ADRESS");
  const postnummer = getCaseInsensitive(details, "POSTNUMMER");
  const ort = getCaseInsensitive(details, "ORT");
  const telefon = getCaseInsensitive(details, "TELEFON");
  const mobil = getCaseInsensitive(details, "MOBIL");
  const epost = getCaseInsensitive(details, "EPOST");

  overviewBox.innerHTML = `
    <h3><i class="fas fa-user-circle"></i> Överblick</h3>
    <div class="overview-grid">
        <div><strong>Namn:</strong> ${safe(fornamn)} ${safe(efternamn)}</div>
        <div><strong>Personnummer:</strong> ${safe(pnr)}</div>
        <div><strong>Adress:</strong> ${safe(adress)}, ${safe(postnummer)} ${safe(ort)}</div>
        <div><strong>Telefon:</strong> ${safe(telefon) || safe(mobil)}</div>
        <div><strong>E-post:</strong> ${safe(epost)}</div>
    </div>
  `;
  wrap.appendChild(overviewBox);

  // --- Skapa och lägg till Myndigheter & Kontakter ---
  const myndigheterBox = document.createElement("div");
  myndigheterBox.id = "ov-myndigheter";
  myndigheterBox.className = "box dashboard-kort";
  myndigheterBox.innerHTML = `
      <h3><i class="fas fa-sitemap"></i> Myndigheter & Kontakter</h3>
      <div class="form-grid three-columns">
        <div class="form-column"><div class="input-group">
          <label>Överförmyndarenhet:</label>
          <input type="text" value="${safe(getCaseInsensitive(details, "OVERFORMYNDAR_NAMN"))}" disabled>
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Telefon (OFN):</label>
          <input type="text" value="${safe(getCaseInsensitive(details, "OVERFORMYNDAR_TELEFON"))}" disabled>
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Telefon (Kommunväxel):</label>
          <input type="text" value="${safe(getCaseInsensitive(details, "OVERFORMYNDAR_KOMMUN_VAXEL"))}" disabled>
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Annan Kontaktperson:</label>
          <input type="text" id="ov-KontaktpersonNamn" value="${safe(
            getCaseInsensitive(details, "KontaktpersonNamn")
          )}">
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Telefon Kontaktperson:</label>
          <input type="text" id="ov-KontaktpersonTel" value="${safe(getCaseInsensitive(details, "KontaktpersonTel"))}">
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Boende Kontaktperson:</label>
          <input type="text" id="ov-BoendeKontaktpersonNamn" value="${safe(
            getCaseInsensitive(details, "BoendeKontaktpersonNamn")
          )}">
        </div></div>
        <div class="form-column"><div class="input-group">
          <label>Telefon Boendekontakt:</label>
          <input type="text" id="ov-BoendeKontaktpersonTel" value="${safe(
            getCaseInsensitive(details, "BoendeKontaktpersonTel")
          )}">
        </div></div>
      </div>
    `;
  wrap.appendChild(myndigheterBox);

  // --- Skapa och lägg till Månadsbudget ---
  const budgetBox = document.createElement("div");
  budgetBox.id = "ov-budget";
  budgetBox.className = "box dashboard-kort";

  const row = (label, beloppKey, levKey, placeholder) => `
      <tr>
        <td><label>${label}</label></td>
        <td><input type="text" id="ov-${levKey}" class="budget-leverantor" placeholder="Leverantör..." value="${safe(
    getCaseInsensitive(details, levKey)
  )}"></td>
        <td><input type="number" step="0.01" id="ov-${beloppKey}" class="budget-belopp" placeholder="${placeholder}" value="${safe(
    getCaseInsensitive(details, beloppKey)
  )}"></td>
        <td>SEK / mån</td>
      </tr>
    `;

  const fickpengUnderdel = `
      <tr class="section-subrow">
        <td colspan="4" style="background:#fafafa">
          <details id="fickpengar-vecka" open>
            <summary style="cursor:pointer; font-weight:600">Specifikation per veckodag</summary>
            <div style="margin-top:8px">
              <table class="budget-table">
                <thead><tr><th>Dag</th><th>Belopp</th><th>Enhet</th></tr></thead>
                <tbody>
                  <tr><td>Måndag</td><td><input type="number" step="0.01" id="ov-FickpengMondag"  value="${safe(
                    getCaseInsensitive(details, "FickpengMondag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr><td>Tisdag</td><td><input type="number" step="0.01" id="ov-FickpengTisdag"  value="${safe(
                    getCaseInsensitive(details, "FickpengTisdag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr><td>Onsdag</td><td><input type="number" step="0.01" id="ov-FickpengOnsdag"  value="${safe(
                    getCaseInsensitive(details, "FickpengOnsdag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr><td>Torsdag</td><td><input type="number" step="0.01" id="ov-FickpengTorsdag" value="${safe(
                    getCaseInsensitive(details, "FickpengTorsdag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr><td>Fredag</td><td><input type="number" step="0.01" id="ov-FickpengFredag"  value="${safe(
                    getCaseInsensitive(details, "FickpengFredag")
                  )}"></td><td>SEK / dag</td></tr>
                  <tr class="section-header"><td colspan="3">Summering</td></tr>
                  <tr><td><strong>Totalt / vecka</strong></td><td><input type="number" step="0.01" id="ov-FickpengTotalVecka" value="${safe(
                    getCaseInsensitive(details, "FickpengTotalVecka")
                  )}" readonly></td><td>SEK / vecka</td></tr>
                  <tr><td><strong>≈ per månad</strong></td><td><input type="text" id="ov-FICKPENG_PER_MANAD_VIS" value="" readonly></td><td>SEK / mån (≈4,33 × v)</td></tr>
                </tbody>
              </table>
            </div>
          </details>
        </td>
      </tr>
    `;

  budgetBox.innerHTML = `
      <h3><i class="fas fa-chart-pie"></i> Månadsbudget</h3>
      <table class="budget-table">
        <thead><tr><th>Beskrivning</th><th>Leverantör / Notering</th><th>Belopp</th><th>Enhet</th></tr></thead>
        <tbody>
          <tr class="section-header"><td colspan="4">Inkomster</td></tr>
          ${row("Pension/Sjukersättning etc.", "PENSION_LIVRANTA_SJUK_AKTIVIVET", "PensionLeverantor", "Bruttoinkomst")}
          ${row("Bostadsbidrag / BTP", "BOSTADSBIDRAG", "BostadsbidragLeverantor", "Netto per månad")}
          <tr class="section-header"><td colspan="4">Utgifter</td></tr>
          <tr>
              <td><label for="ov-HYRA">Hyra</label></td>
              <td><input type="text" id="ov-HyraLeverantor" class="budget-leverantor" placeholder="Leverantör..." value="${safe(getCaseInsensitive(details, 'HyraLeverantor'))}"></td>
              <td>
                  <input type="number" step="0.01" id="ov-HYRA" class="budget-belopp" placeholder="Månadshyra" value="${safe(getCaseInsensitive(details, 'HYRA'))}" disabled>
                  <small style="display: block; text-align: right; color: #666; font-style: italic;">Hämtas från "Generella Kostnader".</small>
              </td>
              <td>SEK / mån</td>
          </tr>
          ${row("Omsorgsavgift", "Omsorgsavgift", "OmsorgsavgiftLeverantor", "Avgift till kommun")}
          ${row("El", "EL_KOSTNAD", "ElLeverantor", "Snitt per månad")}
          ${row("Hemförsäkring", "HEMFORSAKRING", "HemforsakringLeverantor", "Månadspremie")}
          ${row("Sjukvård", "LAKARVARDSKOSTNAD", "LakarvardskostnadLeverantor", "Snitt per månad")}
          ${row("Medicin", "MEDICIN_KOSTNAD", "MedicinLeverantor", "Snitt per månad")}
          ${row("Bredband/Telefoni", "BREDBAND", "BredbandLeverantor", "Månadskostnad")}
          ${row("Fickpengar / månad", "FickpengarManad", "FickpengarLeverantor", "Summa till huvudman")}
          ${fickpengUnderdel}
        </tbody>
      </table>
    `;
  wrap.appendChild(budgetBox);

  // --- Autosumma för fickpengar (kopplar lyssnare) ---
  const dayIds = [
    "ov-FickpengMondag",
    "ov-FickpengTisdag",
    "ov-FickpengOnsdag",
    "ov-FickpengTorsdag",
    "ov-FickpengFredag",
  ];
  const recalcFick = () => {
    const sum = dayIds.reduce((acc, id) => {
      const raw = $$(id)?.value ?? "";
      const num = parseFloat(String(raw).replace(",", "."));
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
    const v = $$("ov-FickpengTotalVecka");
    if (v) v.value = sum.toFixed(2);
    const m = $$("ov-FICKPENG_PER_MANAD_VIS");
    if (m) m.value = (sum * 4.3333).toFixed(2);
  };
  dayIds.forEach(id => $$(id)?.addEventListener("input", recalcFick));
  recalcFick(); // Kör en gång direkt för att visa initiala värden

  // --- Skapa och lägg till Dokumentlistan ---
  const docBox = document.createElement("div");
  docBox.className = "box dashboard-kort";
  const docTable = document.createElement("table");
  docTable.id = "ov-dokument-lista-table";
  docTable.className = "budget-table";
  docTable.innerHTML = `
        <thead><tr><th>Dokument</th><th>Åtgärder</th></tr></thead>
        <tbody></tbody>
    `;
  docBox.innerHTML = '<h3><i class="fas fa-folder-open"></i> Dokument</h3>';
  docBox.appendChild(docTable);
  wrap.appendChild(docBox);

  const tbody = docTable.tBodies[0];
  tbody.innerHTML =
    Array.isArray(documents) && documents.length
      ? documents
          .map(
            d => `
            <tr>
              <td><a href="${safe(d.StoredPath)}" target="_blank">${safe(d.DokumentTyp)}</a> (${safe(
              d.OriginalFilnamn || ""
            )})</td>
              <td class="actions">
                <button class="small danger" onclick="deleteArkivDokument(${d.ID}, '${safe(d.DokumentTyp)}', '${safe(
              details.PERSONNUMMER
            )}')"><i class="fas fa-trash"></i></button>
              </td>
            </tr>
          `
          )
          .join("")
      : `<tr><td colspan="2">Inga dokument.</td></tr>`;
}

// ===================================================================
// SLUT PÅ KOD FÖR NYA ÖVERSIKT-FLIKEN
// ===================================================================
// --- KPI updater ---
function updateStatsCount(n) {
  const el = document.getElementById("stats-total-huvudman");
  if (el) el.textContent = String(n ?? 0);
}

function normOF(o) {
  // Ditt API visar "ID" och "Namn"
  const id = o.id ?? o.ID ?? o.of_id ?? null;
  const namn = (o.namn ?? o.Namn ?? "").toString().trim();
  return { id, namn };
}

// ============== Överförmyndare -> uppdatera listor + KPI ===========
async function onOverformyndareChange() {
  const sel = document.getElementById(OVERFORMYNDARE_FILTER_ID);
  const ofId = sel ? sel.value || null : null;
  await loadHuvudmanOptions(ofId, true);
  await loadDashboardStats(ofId, true);
}

// ============== Ladda dashboard för vald huvudman ===================
async function loadHuvudmanDashboard(pnr) {
  // Använder konstanten som är definierad överst i filen
  const container = document.getElementById(DASHBOARD_CONTAINER_ID);
  if (!container) {
    // Om HTML-elementet inte finns, logga ett tydligt fel och avbryt.
    console.error(`[Dashboard Load] Fel: HTML-element med id '${DASHBOARD_CONTAINER_ID}' hittades inte.`);
    // Kasta felet så att den anropande funktionen (handleHuvudmanSelection) kan fånga det.
    throw new Error(`Kritiskt fel: DASH_CONTAINER_ID är inte definierad i HTML.`);
  }

  container.style.display = "block";
  container.innerHTML = '<div class="box"><p>Laddar dashboard-data, vänligen vänta…</p></div>';

  try {
    const res = await fetch("/api/get_huvudman_dashboard.php?pnr=" + encodeURIComponent(pnr), { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error || "HTTP " + res.status);
    }

    // Spara för andra flikar/sektioner
    if (window.currentHuvudmanFullData) {
      window.currentHuvudmanFullData.huvudmanDetails = {
        ...window.currentHuvudmanFullData.huvudmanDetails,
        ...json.details,
      };
    } else {
      window.currentHuvudmanFullData = { huvudmanDetails: json.details || {} };
    }

    // Rendera dashboarden
    if (typeof renderDashboard === "function") {
      renderDashboard(json.details || {}, json.documents || [], json.bankkonton || []);
    } else {
      container.innerHTML = '<pre style="white-space:pre-wrap">' + JSON.stringify(json, null, 2) + "</pre>";
    }

    return json;
  } catch (err) {
    console.error(`[Dashboard Load] API-fel för pnr ${pnr}:`, err);
    container.innerHTML = `
      <div class="box error-message">
        <p>Kunde inte ladda dashboard-data: ${err.message}</p>
      </div>`;
    // Kasta felet vidare så att anropande funktion (handleHuvudmanSelection) vet att något gick fel.
    throw err;
  }
}

// Fyll överförmyndare-filtret i Huvudmän-fliken
async function loadOverformyndareOptions(targetId = OVERFORMYNDARE_FILTER_ID) {
  try {
    const res = await fetch("/api/get_overformyndare.php", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const list = await res.json();

    const sel =
      document.getElementById(targetId) ||
      document.getElementById(OVERFORMYNDARE_FILTER_ID) ||
      document.getElementById("huvudmanFilterOF"); // sista fallback

    if (!sel) {
      console.warn("[OFN] Hittar inget <select> för överförmyndare.");
      return;
    }

    // Rensa & fyll
    sel.innerHTML = "";
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "Alla överförmyndare";
    sel.appendChild(optAll);

    (Array.isArray(list) ? list : []).forEach(ofn => {
      const o = document.createElement("option");
      o.value = ofn.ID ?? ofn.id ?? "";
      o.textContent = ofn.Namn ?? ofn.namn ?? "(namn saknas)";
      sel.appendChild(o);
    });

    // Filtrera huvudmanslistan när filtret ändras
    if (!sel.dataset._wired) {
      sel.addEventListener("change", () => {
        const ofnId = sel.value || null;
        // ladda/filtrera huvudmän baserat på OFN (om din backend stödjer det),
        // annars bara ladda om hela listan:
        loadHuvudmanOptions(null, true, HUVUDMAN_SELECT_ID, ofnId).catch(console.warn);
      });
      sel.dataset._wired = "1";
    }
  } catch (err) {
    console.error("[OFN] Fel vid hämtning av överförmyndare:", err);
  }
}

// separat liten handler för filtret
function handleOFfilterChange(e) {
  const ofId = e.target.value || "";
  // ladda om huvudmän med valt OF-filter
  loadHuvudmanOptions(ofId);
}
// LADDAR & RITAR ÖVERSIKTSDASHBOARDEN FÖR EN HUVUDMAN
async function loadDashboardData(pnr) {
  const contentEl = document.getElementById("huvudman-dashboard-content");
  const loadingEl = document.getElementById("huvudman-dashboard-loading");

  // safety: visa “laddar…”
  if (contentEl) contentEl.style.display = "none";
  if (loadingEl) loadingEl.style.display = "block";

  try {
    const url = `api/get_huvudman_dashboard.php?pnr=${encodeURIComponent(pnr)}`;
    const res = await fetch(url, { credentials: "include" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.success === false) {
      const msg = json.error || json.message || `Serverfel (${res.status})`;
      throw new Error(msg);
    }

    // Spara “globalt” om du behöver annat på sidan
    window.currentHuvudmanFullData = {
      huvudmanDetails: json.details || {},
      documents: json.documents || [],
      bankkonton: json.bankkonton || [],
    };

    // Rendera
    if (typeof renderDashboard === "function") {
      renderDashboard(json.details || {}, json.documents || [], json.bankkonton || []);
    }

    // Starta om sektionernas expand/veckla om funktionen finns
    if (typeof initializeCollapsibleEventListeners === "function") {
      initializeCollapsibleEventListeners();
    }
  } catch (err) {
    console.error("[Dashboard] Laddningsfel:", err);
    alert("Kunde inte ladda dashboard-data: " + (err.message || err));
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
    if (contentEl) contentEl.style.display = "block";
  }
}
// === Spara alla uppgifter i fliken "Huvudmän" ===============================
async function saveHuvudmanDetails(pnrRaw) {
  const pnr = (pnrRaw || window.currentHuvudmanFullData?.huvudmanDetails?.Personnummer || "").toString().trim();

  if (!pnr) {
    alert("Saknar personnummer.");
    return;
  }

  // Samla alla inputs/select/textarea med id som börjar på "hm-"
  const container = document.getElementById("huvudmanDetailsContainer") || document;
  const fields = container.querySelectorAll('input[id^="hm-"], select[id^="hm-"], textarea[id^="hm-"]');

  const details = {};
  fields.forEach(el => {
    const key = el.id.slice(3); // "hm-" bort
    let val = (el.value ?? "").toString().trim();
    details[key] = val === "" ? null : val;
  });

  // Sätt "Sparar..." på knappen om vi hittar den
  const saveBtn = document.querySelector(
    '#btnSaveAllHuvudman, #btnSaveHuvudmanAll, button[data-action="save-all-huvudman"]'
  );
  const oldHtml = saveBtn ? saveBtn.innerHTML : null;
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sparar…';
  }

  try {
    const res = await fetch(`api/save_huvudman_details.php?pnr=${encodeURIComponent(pnr)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ details }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) {
      throw new Error(json.error || json.message || `Serverfel (${res.status})`);
    }

    console.log("[HM] Sparat OK:", json);

    // Ladda om vyn så man ser sparat värde
    if (typeof window.loadHuvudmanFullDetails === "function") {
      await window.loadHuvudmanFullDetails(pnr);
    }
  } catch (err) {
    console.error("[HM] Spara-fel:", err);
    alert("Kunde inte spara huvudmannens uppgifter: " + (err.message || err));
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = oldHtml;
    }
  }
}

// === Koppla knapparna i toppbaren för fliken "Huvudmän" ====================
// KORRIGERAD VERSION
function setupHuvudmanActionButtons() {
  // Hämtar den valda huvudmannens pnr
  const pnr = window.currentHuvudmanFullData?.huvudmanDetails?.Personnummer || "";

  // --- SPARA-KNAPPEN ---
  // ANVÄNDER KORREKT ID: 'saveHuvudmanDetailsBtn'
  const saveBtn = document.getElementById("saveHuvudmanDetailsBtn");
  if (saveBtn) {
    // Ersätter knappen med en klon för att säkert ta bort gamla händelselyssnare
    const freshSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(freshSaveBtn, saveBtn);

    // Kopplar den korrekta spara-funktionen när man klickar
    freshSaveBtn.addEventListener("click", () => saveHuvudmanFullDetails());
  } else {
    console.warn("Kunde inte hitta spara-knappen med ID: saveHuvudmanDetailsBtn");
  }

  // --- LADDA OM-KNAPPEN ---
  // ANVÄNDER KORREKT ID: 'refreshHuvudmanDetailsBtn'
  const reloadBtn = document.getElementById("refreshHuvudmanDetailsBtn");
  if (reloadBtn && typeof window.loadHuvudmanFullDetails === "function") {
    // Samma teknik för att ersätta gamla lyssnare
    const freshReloadBtn = reloadBtn.cloneNode(true);
    reloadBtn.parentNode.replaceChild(freshReloadBtn, reloadBtn);

    // Kopplar omladdningsfunktionen när man klickar
    freshReloadBtn.addEventListener("click", () => window.loadHuvudmanFullDetails(true));
  } else {
    console.warn("Kunde inte hitta ladda-om-knappen med ID: refreshHuvudmanDetailsBtn");
  }
}

// Exportera till global scope om du behöver anropa från onclick=""
window.saveHuvudmanDetails = saveHuvudmanDetails;
window.setupHuvudmanActionButtons = setupHuvudmanActionButtons;

/**
 * GENERALISERAD VERSION: Kopplar lyssnare på alla .collapsible-header inuti en given container.
 */
function initializeCollapsibleEventListeners(container) {
  if (!container) return;
  const headers = container.querySelectorAll(".collapsible-header");
  if (!headers.length) return;
  console.log(
    `[Collapsible Gen] Hittade ${headers.length} rubriker att koppla lyssnare till i containern:`,
    container.id
  );
  headers.forEach(header => {
    header.removeEventListener("click", handleCollapsibleClick);
    header.addEventListener("click", handleCollapsibleClick);
  });
}

/**
 * Hanterar klicket från rubriken den är kopplad till.
 */
function handleCollapsibleClick() {
  const header = this;
  const content = header.nextElementSibling;
  if (content && content.classList.contains("collapsible-content")) {
    header.classList.toggle("active");
    content.classList.toggle("hidden-content");
  } else {
    console.error("Kunde inte hitta '.collapsible-content' direkt efter rubriken:", header);
  }
}

function fillGrunduppgifterForm(details = {}) {
  const set = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = getCaseInsensitive(details, key, getCaseInsensitive(details, id, ""));
  };

  // Person-id
  set("personnummer", "Personnummer");

  // Namn & ordinarie adress
  set("fornamn", "Fornamn");
  set("efternamn", "Efternamn");
  set("adress", "Adress"); // "Ordinarie Adress, LghNr" i din label
  set("postnummer", "Postnummer");
  set("ort", "Ort");

  // Kontakt
  set("telefon", "Telefon");
  set("mobil", "Mobil");
  set("epost", "Epost");

  // Övrigt (om de finns i details)
  set("medborgarskap", "Medborgarskap");
  set("civilstand", "Civilstand");
  set("sammanboende", "Sammanboende");
  set("forordnandeDatum", "ForordnandeDatum");
  set("saldoRakningskontoForordnande", "SaldoRakningskontoForordnande");

  // Vistelseadress
  set("vistelseadress", "Vistelseadress");
  set("vistelsepostnr", "VistelsePostnummer");
  set("vistelseort", "VistelseOrt");

  // Bank (räkningskonto)
  set("banknamn", "Banknamn");
  set("clearingnummer", "Clearingnummer");
  set("kontonummer", "Kontonummer");

  // Subheader namnruta om du använder den
  const nameSpan = document.getElementById("huvudmanNameDisplay");
  const pnrSpan = document.getElementById("huvudmanPnrDisplay");
  if (nameSpan)
    nameSpan.textContent = [getCaseInsensitive(details, "Fornamn", ""), getCaseInsensitive(details, "Efternamn", "")]
      .filter(Boolean)
      .join(" ");
  if (pnrSpan) pnrSpan.textContent = getCaseInsensitive(details, "Personnummer", "");
}

/* ======================== Hjälpare ======================== */
function getCaseInsensitive(obj, ...candidates) {
  if (!obj) return undefined;
  const keys = Object.keys(obj);
  for (const want of candidates) {
    const hit = keys.find(k => k.toLowerCase() === String(want).toLowerCase());
    if (hit) return obj[hit];
  }
  // sista chans: prova utan under/överstrykningar
  for (const k of keys) {
    const normK = k.toLowerCase().replace(/[_\s]/g, "");
    for (const want2 of candidates) {
      if (normK === String(want2).toLowerCase().replace(/[_\s]/g, "")) return obj[k];
    }
  }
  return undefined;
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

/* ================== Överförmyndare (OFN) ================== */
async function loadOverformyndareList(targetId = "huvudmanFilterOF") {
  const sel = document.getElementById(targetId);
  if (!sel) {
    console.warn("[OFN] Saknar select #" + targetId);
    return;
  }
  sel.innerHTML = '<option value="">Laddar...</option>';

  try {
    // STEG 1: Hämta listan från servern FÖRST.
    const list = await fetchJSON("/api/get_overformyndare.php");

    // STEG 2: Spara den hämtade listan i den globala variabeln för senare användning.
    allOverformyndare = Array.isArray(list) ? list : [];

    // STEG 3: Fyll i dropdown-menyn i gränssnittet.
    sel.innerHTML = '<option value="">Alla överförmyndare</option>';
    allOverformyndare.forEach(row => {
      const id = getCaseInsensitive(row, "ID", "Id", "id");
      const namn = getCaseInsensitive(row, "Namn", "namn", "NAME");
      if (id != null) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = namn || `OFN #${id}`;
        sel.appendChild(opt);
      }
    });
    console.log(`[OFN] Laddad: ${allOverformyndare.length} st`);
  } catch (err) {
    console.error("[OFN] Fel vid Laddning:", err); // Ändrad från console.warn för att matcha bilden
    sel.innerHTML = '<option value="">(Kunde inte ladda överförmyndare)</option>';
  }
}

/* ====================== Huvudmän ========================= */
async function loadHuvudmanOptions(includeInactive = null, reset = true, targetId = "huvudmanSelect", ofnId = null) {
  const sel = document.getElementById(targetId) || document.getElementById("huvudmanSelect");
  if (!sel) {
    console.warn("[HUV] Saknar select #" + targetId);
    return;
  }

  if (reset) sel.innerHTML = '<option value="">-- Välj en huvudman --</option>';
  else if (!sel.options.length) sel.innerHTML = '<option value="">-- Välj en huvudman --</option>';

  try {
    const qs = new URLSearchParams();
    if (includeInactive != null) qs.set("includeInactive", includeInactive ? "1" : "0");
    if (ofnId) qs.set("overformyndareId", ofnId); // backend får gärna stödja detta men vi filtrerar även klient-sida
    const url = "/api/get_all_huvudman.php" + (qs.toString() ? "?" + qs.toString() : "");
    const list = await fetchJSON(url);

    // Klientside-filtrering om backend inte gör det
    const filtered = (Array.isArray(list) ? list : []).filter(hm => {
      if (!ofnId) return true;
      const v = getCaseInsensitive(
        hm,
        "OVERFORMYNDARE_ID",
        "Overformyndare_ID",
        "overformyndare_id",
        "overformyndareId"
      );
      return String(v ?? "") === String(ofnId);
    });

    // Bygg options
    const frag = document.createDocumentFragment();
    filtered.forEach(hm => {
      const pnr = getCaseInsensitive(hm, "PERSONNUMMER", "Personnummer", "personnummer") || "";
      const fn = getCaseInsensitive(hm, "FORNAMN", "Fornamn", "fornamn") || "";
      const en = getCaseInsensitive(hm, "EFTERNAMN", "Efternamn", "efternamn") || "";
      const opt = document.createElement("option");
      opt.value = pnr;
      opt.textContent = getCaseInsensitive(hm, "HELT_NAMN") || (fn || en ? `${fn} ${en}`.trim() : pnr) || "(saknas)";
      frag.appendChild(opt);
    });

    // Skriv in
    sel.innerHTML = '<option value="">-- Välj en huvudman --</option>';
    sel.appendChild(frag);
    console.log(`[HUV] Laddad: ${filtered.length} st (total ${Array.isArray(list) ? list.length : 0})`);
    updateHuvudmanCountDisplay(filtered.length);
  } catch (err) {
    console.error("[HUV] Fel vid laddning:", err);
    sel.innerHTML = '<option value="">(Kunde inte ladda huvudmän)</option>';
  }
}

/* =========== Koppling: OFN-filter → Huvudmanlista =========== */
function bindHuvudmanFilterToList(ofnSelectId = "huvudmanFilterOF", hmSelectId = "huvudmanSelect") {
  const ofnSel = document.getElementById(ofnSelectId);
  if (!ofnSel) return;
  ofnSel.addEventListener("change", () => {
    const ofnId = ofnSel.value || null;
    loadHuvudmanOptions(null, true, hmSelectId, ofnId);
  });
}

/* ================== Snabbdiagnostik ==================
   Kör i devtools-konsolen vid behov: diagEndpoints();
====================================================== */
async function diagEndpoints() {
  try {
    const ofn = await fetchJSON("/api/get_overformyndare.php");
    console.log("[DIAG] OFN svar:", ofn);
  } catch (e) {
    console.error("[DIAG] OFN ERROR:", e);
  }
  try {
    const hm = await fetchJSON("/api/get_all_huvudman.php");
    console.log("[DIAG] Huvudmän svar:", hm);
  } catch (e) {
    console.error("[DIAG] HUV ERROR:", e);
  }
}

/**
 * =======================================================================
 * NY, CENTRALISERAD INITIALISERING OCH HÄNDELSEHANTERING
 * =======================================================================
 */

// Denna funktion körs en gång när hela sidan har laddats.
document.addEventListener("DOMContentLoaded", initializeApp);
async function initializeApp() {
  // ⚠️ GUARD: Förhindra dubbelkörning av initializeApp (säkerhet)
  if (appInitialized) {
    console.warn("[App Init] Applikationen har redan initialiserats - ignorerar dubblering");
    return;
  }
  appInitialized = true;

  console.log("[App Init] Startar applikationen...");

  // ---------- CENTRALISERADE ANROP TILL ALLA SETUP-FUNKTIONER ----------
  initializeNewNavigation();
  setupEventListeners(); // Din befintliga funktion för globala lyssnare
  setupLankarTabListeners(); // NYTT ANROP
  setupRpaTabListeners(); // NYTT ANROP
  // --------------------------------------------------------------------

  // ---------- KOPPLA CENTRALA HÄNDELSELYSSNARE (NYTT BLOCK) ----------
  // Kopplar dropdown-menyn för huvudmän till den centrala hanteringsfunktionen.
  const huvudmanSelect = document.getElementById("huvudmanSelect");
  if (huvudmanSelect) {
    huvudmanSelect.addEventListener("change", handleHuvudmanSelection);
  }

  // Kopplar knappen för Excel-export till sin funktion.
  const exportExcelBtn = document.getElementById("export-huvudman-excel-btn");
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", exportHuvudmanToExcel);
  }
  // --------------------------------------------------------------------

  // Fyll i alla kategori-dropdowns som används i appen
  initializeKategoriSelects();

  // Ladda initial data
  try {
    await loadAllGodManProfiles();
    await loadOverformyndareList(HUVUDMAN_FILTER_OF_ID);
    await loadHuvudmanOptions(null, true, HUVUDMAN_SELECT_ID, null);
    await loadDashboardStats();
  } catch (error) {
    console.error("[App Init] Ett allvarligt fel inträffade vid initial laddning av data:", error);
  }

  // Nollställ och förbered flikar
  setPeriodDatesForArsrakningTab();

  console.log("[App Init] Applikationen är färdiginitialiserad.");

  // Öppna standardfliken (eller en specifik flik från URL)
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "tab-huvudman";
  openTabDirect(initialTab);
}
/**
 * EN ENDA funktion som hanterar allt som ska hända när en huvudman väljs.
 * Denna funktion ersätter alla tidigare, separata hanterare.
 * @param {Event} event - Händelseobjektet från 'change'-eventet.
 */
async function handleHuvudmanSelection(event) {
  const pnr = event.target.value;
  const detailsContainer = document.getElementById("huvudmanDetailsContainer");
  const dashboardContainer = document.getElementById(DASHBOARD_CONTAINER_ID);
  const actionSubHeader = document.getElementById("huvudmanActionSubHeader");

  // Om användaren väljer "-- Välj en huvudman --"
  if (!pnr) {
    console.log("[Selection] Ingen huvudman vald. Rensar vyer.");
    if (detailsContainer) detailsContainer.style.display = "none";
    if (dashboardContainer)
      dashboardContainer.innerHTML =
        '<div class="box muted">Välj en huvudman från listan ovan för att se översikt.</div>';
    if (actionSubHeader) actionSubHeader.style.display = "none";
    currentHuvudmanFullData = null;
    // Nollställ även andra flikar som är beroende av en huvudman
    displayPersonInfoForArsrakning();
    populateRedogorelseTabWithDefaults();
    return;
  }

  console.log(`[Selection] Huvudman med pnr ${pnr} vald. Laddar all data...`);

  // NYTT: Hämta namn och uppdatera sub-header på ett säkert sätt
  const selectedOption = event.target.options[event.target.selectedIndex];
  const namn = selectedOption ? selectedOption.text : "";

  const subHeaderName = document.getElementById("subHeaderHuvudmanName");
  const subHeaderPnr = document.getElementById("subHeaderHuvudmanPnr");

  if (subHeaderName) {
    subHeaderName.textContent = namn.split(" (")[0];
  }
  if (subHeaderPnr) {
    subHeaderPnr.textContent = pnr;
  }
  // SLUT PÅ NY KOD

  // Visa en laddningsindikator
  if (dashboardContainer) dashboardContainer.innerHTML = '<div class="box muted">Laddar data, vänligen vänta...</div>';
  if (detailsContainer) detailsContainer.style.display = "none";
  if (actionSubHeader) actionSubHeader.style.display = "none"; // Dölj tills data är laddad

  try {
    // Kör båda datainhämtningarna parallellt för snabbare laddning
    await Promise.all([
      loadDashboardData(pnr),
      loadHuvudmanFullDetails(true), // 'true' tvingar en ny hämtning från servern
    ]);

    console.log(`[Selection] All data för ${pnr} har laddats och renderats.`);
  } catch (error) {
    console.error(`[Selection] Ett fel uppstod vid laddning av data för ${pnr}:`, error);
    if (dashboardContainer)
      dashboardContainer.innerHTML = `<div class="box error-message">Kunde inte ladda data för vald huvudman. Försök igen.</div>`;
  }
}
/**
 * Uppdaterar KPI-räknaren för antalet huvudmän som visas.
 */
function updateHuvudmanCountDisplay(count) {
  const countElement = document.getElementById("huvudman-count-display");
  if (countElement) {
    countElement.textContent = count;
  }
}
/**
 * Hämtar alla huvudmän från servern och exporterar dem till en Excel-fil.
 */
async function exportHuvudmanToExcel() {
  const exportButton = document.getElementById("export-huvudman-excel-btn");
  if (exportButton) {
    exportButton.disabled = true;
    exportButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Laddar...';
  }

  try {
    // Anropa det nya PHP-skriptet
    const response = await fetch("api/get_all_huvudman_for_export.php");
    if (!response.ok) {
      throw new Error("Kunde inte hämta data från servern för export.");
    }
    const data = await response.json();

    if (data.length === 0) {
      alert("Inga huvudmän att exportera.");
      return;
    }

    // Skapa ett nytt kalkylblad från datan
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Skapa en ny arbetsbok
    const workbook = XLSX.utils.book_new();

    // Lägg till kalkylbladet i arbetsboken
    XLSX.utils.book_append_sheet(workbook, worksheet, "Huvudmän");

    // Generera och ladda ner Excel-filen
    XLSX.writeFile(workbook, "Huvudman_Export.xlsx");
  } catch (error) {
    console.error("Fel vid Excel-export:", error);
    alert("Ett fel uppstod vid exporten: " + error.message);
  } finally {
    if (exportButton) {
      exportButton.disabled = false;
      exportButton.innerHTML = '<i class="fas fa-file-excel"></i> Exportera till Excel';
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const hyra = document.getElementById("hyra");
  const ovHyra = document.getElementById("ov-HYRA");
  if (hyra && ovHyra) {
    hyra.addEventListener("input", () => {
      ovHyra.value = hyra.value || "";
    });
  }
});
// --- Spegla Hyra mellan Generella kostnader och Månadsbudget ---
document.addEventListener("DOMContentLoaded", () => {
  const hyra = document.getElementById("hyra");
  const ovHyra = document.getElementById("ov-HYRA");

  if (!hyra || !ovHyra) return;

  // När man skriver i Generella kostnader → uppdatera Månadsbudget
  hyra.addEventListener("input", () => {
    ovHyra.value = hyra.value;
  });

  // När sidan laddas → visa samma värde i båda
  ovHyra.value = hyra.value;
});
document.addEventListener("DOMContentLoaded", () => {
  const hyra = document.getElementById("hyra");
  const ovHyra = document.getElementById("ov-HYRA");
  if (!hyra || !ovHyra) return;

  // Live-spegel: skriv i Generella kostnader → uppdatera Månadsbudget direkt
  hyra.addEventListener("input", () => {
    ovHyra.value = hyra.value;
  });

  // När sidan laddas: synka initialt
  ovHyra.value = hyra.value;
});

function setVal(id, val, isCheckbox = false, isRadioName = null, isNumeric = false, isFloat = false) {
  const el = document.getElementById(id);
  if (!el) return;

  if (isCheckbox) { el.checked = !!val; return; }
  if (isRadioName) {
    document.querySelectorAll(`input[name="${isRadioName}"]`)
      .forEach(r => r.checked = String(r.value) === String(val));
    return;
  }

  if (isNumeric) {
    if (val === null || val === undefined || val === "") { el.value = ""; return; }
    const str = String(val).replace(",", ".");                 // normalisera
    const num = isFloat ? parseFloat(str) : parseInt(str, 10); // till tal
    el.value = Number.isNaN(num) ? "" : String(num);           // skriv ALLTID med punkt
    return;
  }

  el.value = (val ?? "").toString();
}
document.addEventListener("DOMContentLoaded", () => {
  const hyra = document.getElementById("hyra");
  const ovHyra = document.getElementById("ov-HYRA");
  if (!hyra || !ovHyra) return;
  hyra.addEventListener("input", () => { ovHyra.value = hyra.value; });
  ovHyra.value = hyra.value; // initial sync vid laddning
});