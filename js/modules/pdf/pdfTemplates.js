// "C:\Users\lars-\gman-web\js\modules\pdf\pdfTemplates.js";
import state from "../../state.js";

export async function handleTemplateFileSelect(event) {
  const fileInput = event.target;
  const file = fileInput.files?.[0];
  const templateName = document.getElementById("templateNameInput")?.value?.trim();
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
    if (!uploadResponse.ok) throw new Error(uploadResult.error || "Okänt fel vid uppladdning.");

    state.currentTemplateId = uploadResult.templateId;
    statusDiv.textContent = `Mall '${templateName}' uppladdad! (ID: ${state.currentTemplateId}). Läser fält från PDF...`;
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

        await fetchMappableDbColumns(); // global via window eller importera från utils/api vid behov
        await renderMappingTable(pdfFieldNames);
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
    state.currentTemplateId = null;
  }
}

// Hämta DB-kolumner från servern (fallback om utils/api inte är laddad)
async function getDbColumnsCategorized() {
  try {
    const res = await fetch("api/get_db_columns.php");
    let data = await res.json();
    if (data && typeof data === "object" && "data" in data) data = data.data;

    if (!Array.isArray(data) && typeof data === "object") {
      return data; // redan kategoriserat
    } else if (Array.isArray(data)) {
      const categorized = {};
      data.forEach(col => {
        const [cat] = col.split(".");
        (categorized[cat] = categorized[cat] || []).push(col);
      });
      return categorized;
    }
    throw new Error("Oväntat format på kolumndata");
  } catch (err) {
    console.error("[getDbColumnsCategorized] Fel:", err);
    alert("Kunde inte hämta databaskolumner.");
    return {};
  }
}

export async function renderMappingTable(pdfFields, maybeSavedMappings) {
  const containerDiv = document.getElementById("mappingTableContainer");
  const tbodyElm = document.querySelector("#pdfFieldMappingTable tbody");

  if (!containerDiv && !tbodyElm) {
    console.warn("[renderMappingTable] Ingen målbehållare i DOM.");
    return;
  }
  if (containerDiv) containerDiv.innerHTML = "";
  if (tbodyElm) tbodyElm.innerHTML = "";

  let savedMappings = [];
  if (Array.isArray(maybeSavedMappings) && maybeSavedMappings.length && maybeSavedMappings[0].PdfFieldName) {
    savedMappings = maybeSavedMappings;
  }
  if (arguments.length === 3 && Array.isArray(arguments[2])) {
    savedMappings = arguments[2];
  }
  const mappingLookup = new Map(savedMappings.map(m => [m.PdfFieldName, m.DbColumnName]));

  const categorized = await getDbColumnsCategorized();

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

  pdfFields = [...new Set(pdfFields)].sort((a, b) => a.localeCompare(b));

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

  if (containerDiv) {
    const table = document.createElement("table");
    table.innerHTML = `<thead><tr><th>PDF-fält</th><th>Datakälla</th></tr></thead>`;
    const tbody = document.createElement("tbody");
    pdfFields.forEach(writeRow(tbody));
    table.appendChild(tbody);
    containerDiv.appendChild(table);
  }

  if (tbodyElm) {
    pdfFields.forEach(writeRow(tbodyElm));
  }
}

export async function savePdfMappings() {
  if (!state.currentTemplateId) {
    alert("Inget aktivt mall-ID. Ladda upp en mall först.");
    return;
  }

  const mappingSelects = document.querySelectorAll("#mappingTableContainer select");
  const mappings = [];
  mappingSelects.forEach(select => {
    const dbColumn = select.value;
    if (dbColumn) {
      mappings.push({ pdfField: select.dataset.pdfField, dbColumn });
    }
  });

  if (mappings.length === 0) {
    const go = confirm("Du har inte gjort några kopplingar. Spara tom mappning?");
    if (!go) return;
  }

  const payload = { templateId: state.currentTemplateId, mappings };
  try {
    const response = await fetch("/api/save_pdf_mapping.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Okänt fel vid sparande av kopplingar.");

    alert(result.message || "Kopplingar sparade!");
    document.getElementById("templateNameInput").value = "";
    document.getElementById("templateFileInput").value = "";
    document.getElementById("pdfUploadStatus").textContent = "";
    document.getElementById("mappingSection").style.display = "none";
    state.currentTemplateId = null;
    await loadAndDisplaySavedTemplates();
  } catch (error) {
    console.error("Fel vid sparande av kopplingar:", error);
    alert(`Kunde inte spara kopplingar: ${error.message}`);
  }
}

export async function editTemplate(templateId) {
  const mappingSection = document.getElementById("mappingSection");
  const statusDiv = document.getElementById("pdfUploadStatus");
  const uploadBox = document.querySelector("#tab-pdf-templates .box:nth-of-type(2)");

  if (uploadBox) uploadBox.style.display = "none";
  statusDiv.innerHTML =
    'Laddar befintlig mall och kopplingar... <button class="small secondary" onclick="cancelEditTemplate?.()">Avbryt</button>';
  statusDiv.style.color = "orange";
  mappingSection.style.display = "block";

  try {
    const detailsResponse = await fetch(`/api/get_pdf_template_details.php?id=${templateId}`);
    if (!detailsResponse.ok) {
      const errorResult = await detailsResponse.json();
      throw new Error(errorResult.error || "Kunde inte hämta malldetaljer.");
    }
    const templateDetails = await detailsResponse.json();

    state.currentTemplateId = templateId;
    statusDiv.innerHTML = `Redigerar mall: <strong>"${templateDetails.templateInfo.TemplateName}"</strong>`;
    statusDiv.style.color = "blue";

    const pdfResponse = await fetch(templateDetails.templateInfo.fileUrl);
    if (!pdfResponse.ok) throw new Error("Kunde inte hämta PDF-filen från servern.");
    const pdfBytes = await pdfResponse.arrayBuffer();

    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const pdfFieldNames = fields.map(f => f.getName());

    await renderMappingTable(pdfFieldNames, templateDetails.mappings);
    mappingSection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Fel vid redigering av mall:", error);
    alert(`Kunde inte ladda mall för redigering: ${error.message}`);
    state.currentTemplateId = null;
  }
}

export async function loadAndDisplaySavedTemplates() {
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

    if (!templates.length) {
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
      </thead>`;
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

export async function deletePdfTemplate(id, name = "") {
  if (!confirm(`Ta bort mallen "${name || id}"?`)) return;
  try {
    const res = await fetch(`/api/delete_pdf_template.php?id=${encodeURIComponent(id)}`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Okänt fel vid radering.");
    await loadAndDisplaySavedTemplates();
  } catch (e) {
    alert(`Kunde inte ta bort: ${e.message}`);
  }
}
