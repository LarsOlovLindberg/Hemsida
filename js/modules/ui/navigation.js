// "C:\Users\lars-\gman-web\js\modules\ui\navigation.js"
import state from "../../state.js";
import { generateHuvudmanSectionLinks } from "./scroll.js";

export function openTabDirect(tabId) {
  console.log(`[TabSwitch] Öppnar flik: ${tabId}`);

  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".side-nav .nav-item").forEach(item => item.classList.remove("active"));

  const tabEl = document.getElementById(tabId);
  if (tabEl) {
    tabEl.classList.add("active");
  } else {
    console.warn(`[TabSwitch] Saknar flik '${tabId}', faller tillbaka till 'tab-huvudman'`);
    document.getElementById("tab-huvudman")?.classList.add("active");
  }

  const menuItem = document.querySelector(`.side-nav .nav-item[data-tab="${tabId}"]`);
  if (menuItem) menuItem.classList.add("active");

  const contentArea = document.querySelector(".content-area");
  if (contentArea) contentArea.scrollTop = 0;

  const safe = (fn, ...args) => {
    try {
      typeof fn === "function" && fn(...args);
    } catch (e) {
      console.warn("[Safe Call]", e);
    }
  };

  const actionSubHeader = document.getElementById("huvudmanActionSubHeader");
  const hasHuvudmanData = !!(
    window.currentHuvudmanFullData ||
    (state.currentHuvudmanFullData &&
      state.currentHuvudmanFullData.huvudmanDetails &&
      state.currentHuvudmanFullData.huvudmanDetails.Personnummer)
  );

  if (tabId === "tab-huvudman") {
    if (actionSubHeader) actionSubHeader.style.display = hasHuvudmanData ? "flex" : "none";

    const huvSel = document.getElementById("huvudmanSelect");
    const pnr = huvSel?.value || null;

    if (!hasHuvudmanData && pnr && typeof window.loadHuvudmanFullDetails === "function") {
      window.loadHuvudmanFullDetails(true).finally(() => {
        const detailsContainer = document.getElementById("huvudmanDetailsContainer");
        if (detailsContainer) detailsContainer.style.display = "block";
        if (actionSubHeader) actionSubHeader.style.display = "flex";
        safe(generateHuvudmanSectionLinks);
        setTimeout(() => initializeCollapsibleEventListeners(detailsContainer), 0);
      });
    } else if (hasHuvudmanData) {
      const detailsContainer = document.getElementById("huvudmanDetailsContainer");
      if (detailsContainer) detailsContainer.style.display = "block";
      safe(generateHuvudmanSectionLinks);
      setTimeout(() => initializeCollapsibleEventListeners(detailsContainer), 0);
    }
    safe(window.setupHuvudmanActionButtons);
  } else if (tabId === "tab-lankar") {
    safe(window.renderLinks);
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
}

export function initializeNewNavigation() {
  console.log("[NavInit] Initierar navigering (ESM)");

  const navItems = document.querySelectorAll(".side-nav .nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const tabId = item.dataset.tab;
      if (tabId) {
        openTabDirect(tabId);
        if (state.isMobileNavOpen && window.innerWidth <= 768) toggleMobileNav();
      } else {
        console.warn("[NavInit] nav-item utan data-tab", item);
      }
    });
  });

  const topNav = document.querySelector(".top-nav");
  if (topNav) {
    window.addEventListener("scroll", () => {
      document.body.classList.toggle("scrolled", window.scrollY > 30);
    });
  }

  const toggleBtnDesktop = document.getElementById("toggleSideNavDesktop");
  const sideNavEl = document.querySelector(".side-nav");
  const contentAreaEl = document.querySelector(".content-area");

  if (toggleBtnDesktop && sideNavEl && contentAreaEl) {
    try {
      const saved = localStorage.getItem("sideNavCollapsed");
      state.isSideNavCollapsed = saved === "true";
    } catch (e) {
      state.isSideNavCollapsed = false;
    }

    sideNavEl.classList.toggle("collapsed", state.isSideNavCollapsed);
    if (window.innerWidth > 768) {
      contentAreaEl.style.marginLeft = state.isSideNavCollapsed
        ? "var(--side-nav-width-collapsed)"
        : "var(--side-nav-width-expanded)";
    }
    const iconDesktop = toggleBtnDesktop.querySelector("i");
    if (iconDesktop) {
      iconDesktop.classList.toggle("fa-chevron-right", state.isSideNavCollapsed);
      iconDesktop.classList.toggle("fa-chevron-left", !state.isSideNavCollapsed);
    }

    toggleBtnDesktop.addEventListener("click", () => {
      state.isSideNavCollapsed = !state.isSideNavCollapsed;
      sideNavEl.classList.toggle("collapsed", state.isSideNavCollapsed);
      if (window.innerWidth > 768) {
        contentAreaEl.style.marginLeft = state.isSideNavCollapsed
          ? "var(--side-nav-width-collapsed)"
          : "var(--side-nav-width-expanded)";
      }
      if (iconDesktop) {
        iconDesktop.classList.toggle("fa-chevron-right", state.isSideNavCollapsed);
        iconDesktop.classList.toggle("fa-chevron-left", !state.isSideNavCollapsed);
      }
      try {
        localStorage.setItem("sideNavCollapsed", state.isSideNavCollapsed);
      } catch {}
    });
  }

  const toggleBtnMobile = document.getElementById("toggleSideNavMobile");
  if (toggleBtnMobile && sideNavEl) {
    toggleBtnMobile.addEventListener("click", toggleMobileNav);
  }

  document.addEventListener("click", function (event) {
    const dropdownContent = document.getElementById("sectionLinksDropdownContent");
    const toggleDropdownBtnElement = document.getElementById("toggleSectionLinksDropdownBtn");
    if (dropdownContent && toggleDropdownBtnElement && dropdownContent.classList.contains("visible")) {
      if (!toggleDropdownBtnElement.contains(event.target) && !dropdownContent.contains(event.target)) {
        dropdownContent.classList.remove("visible");
        toggleDropdownBtnElement.setAttribute("aria-expanded", "false");
      }
    }
  });
}

export function toggleMobileNav() {
  const sideNavEl = document.querySelector(".side-nav");
  const toggleBtnMobile = document.getElementById("toggleSideNavMobile");
  if (!sideNavEl || !toggleBtnMobile) return;

  state.isMobileNavOpen = !state.isMobileNavOpen;
  sideNavEl.classList.toggle("open", state.isMobileNavOpen);

  const iconMobile = toggleBtnMobile.querySelector("i");
  if (iconMobile) {
    iconMobile.classList.toggle("fa-bars", !state.isMobileNavOpen);
    iconMobile.classList.toggle("fa-times", state.isMobileNavOpen);
  }
}
