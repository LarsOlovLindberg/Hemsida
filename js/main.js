// "C:\Users\lars-\gman-web\js\main.js";
// import "./polyfills.js"; // valfri, gör inget om du inte använder den
import state from "./state.js";
import { API, ALL_KATEGORIER, KATEGORI_POSTKOD_MAP, PDF_FIELD_MAP } from "./modules/constants.js";

import { initializeNewNavigation, openTabDirect, toggleMobileNav } from "./modules/ui/navigation.js";
import { setupEventListeners } from "./modules/ui/events.js";
import { renderAllCharts } from "./modules/charts/incomeChart.js";
import { renderBalanceChart } from "./modules/charts/balanceChart.js";
import {
  setupPdfDocument,
  fillAndDownloadPdf,
  buildPdfFieldValues,
  generateAndDownloadPdf,
} from "./modules/pdf/pdfUtils.js";
import {
  handleTemplateFileSelect,
  renderMappingTable,
  savePdfMappings,
  editTemplate,
  loadAndDisplaySavedTemplates,
  deletePdfTemplate,
} from "./modules/pdf/pdfTemplates.js";
import {
  normalizePnr,
  pnr10,
  pnr12,
  getRadioValue,
  setRadioValue,
  getPdfFieldName,
  val,
} from "./modules/utils/helpers.js";
import {
  fetchMappableDbColumns,
  populateOverformyndareSelect,
  openEditOverformyndareModal,
} from "./modules/domain/overformyndare.js";
import { populateRedogorelseTabWithDefaults } from "./modules/redogorelse/redogorelse.js";
import { generateHuvudmanSectionLinks, scrollToSection } from "./modules/ui/scroll.js";

// Exponera funktioner som din HTML redan använder via onclick/id
Object.assign(window, {
  openTabDirect,
  toggleMobileNav,
  renderAllCharts,
  renderBalanceChart,
  setupPdfDocument,
  fillAndDownloadPdf,
  buildPdfFieldValues,
  generateAndDownloadPdf,
  handleTemplateFileSelect,
  renderMappingTable,
  savePdfMappings,
  editTemplate,
  loadAndDisplaySavedTemplates,
  deletePdfTemplate,
  normalizePnr,
  pnr10,
  pnr12,
  getRadioValue,
  setRadioValue,
  getPdfFieldName,
  fetchMappableDbColumns,
  populateOverformyndareSelect,
  openEditOverformyndareModal,
  populateRedogorelseTabWithDefaults,
  generateHuvudmanSectionLinks,
  scrollToSection,
  state,
  API,
  ALL_KATEGORIER,
  KATEGORI_POSTKOD_MAP,
  PDF_FIELD_MAP,
});

document.addEventListener("DOMContentLoaded", () => {
  console.log("[Main] Initierar Godman-appen (ESM)...");
  initializeNewNavigation();
  setupEventListeners();
  loadAndDisplaySavedTemplates();
  // Om du vill landa på en viss flik:
  // openTabDirect("tab-huvudman");
});
