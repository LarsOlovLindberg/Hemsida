// "C:\Users\lars-\gman-web\js\modules\ui\scroll.js"
import state from "../../state.js";

export function generateHuvudmanSectionLinks() {
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

    button.addEventListener("click", () => {
      const headerToOpen = section.querySelector(".collapsible-header");
      const contentToOpen = section.querySelector(".collapsible-content");
      if (headerToOpen && contentToOpen) {
        headerToOpen.classList.add("active");
        contentToOpen.classList.remove("hidden-content");
      }
      scrollToSection(sectionId);
      linksContainer.classList.remove("visible");
      document.getElementById("toggleSectionLinksDropdownBtn")?.setAttribute("aria-expanded", "false");
    });

    linksContainer.appendChild(button);
  });
}

export function scrollToSection(sectionId) {
  const targetSection = document.getElementById(sectionId);
  if (!targetSection) return;

  const targetHeader = targetSection.querySelector(".collapsible-header");
  if (!targetHeader) return;

  const scrollContainer = document.querySelector(".content-area");
  if (!scrollContainer) return;

  setTimeout(() => {
    const subHeader = document.getElementById("huvudmanActionSubHeader");
    const subHeaderHeight = subHeader && getComputedStyle(subHeader).display !== "none" ? subHeader.offsetHeight : 0;

    const containerTop = scrollContainer.getBoundingClientRect().top;
    const headerTop = targetHeader.getBoundingClientRect().top;
    const currentScrollTop = scrollContainer.scrollTop;

    const absoluteHeaderPosition = headerTop - containerTop + currentScrollTop;
    const finalScrollPosition = absoluteHeaderPosition - subHeaderHeight - 15;

    scrollContainer.scrollTo({ top: finalScrollPosition, behavior: "smooth" });
  }, 100);
}
