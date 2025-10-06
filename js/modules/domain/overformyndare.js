// "C:\Users\lars-\gman-web\js\modules\domain\overformyndare.js";
import state from "../../state.js";

export function populateOverformyndareSelect(list, selectedId, targetId) {
  const sel = document.getElementById(targetId);
  if (!sel) return;

  sel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "";
  optAll.textContent = "Alla överförmyndare";
  sel.appendChild(optAll);

  list.forEach(ofn => {
    const id = ofn.ID ?? ofn.Id ?? ofn.id ?? "";
    const namn = ofn.Namn ?? ofn.OverformyndareNamn ?? "#" + id;
    const o = document.createElement("option");
    o.value = id;
    o.textContent = namn || "#" + id;
    if (selectedId && String(selectedId) === String(id)) o.selected = true;
    sel.appendChild(o);
  });
}

export function openEditOverformyndareModal() {
  const select = document.getElementById("overformyndareSelect");
  const ofId = select?.value;
  if (!ofId) {
    alert("Välj en överförmyndare från listan för att redigera den.");
    return;
  }
  const ofData = (state.allOverformyndare || []).find(of => String(of.ID) === String(ofId));
  if (!ofData) {
    alert("Kunde inte hitta data för den valda överförmyndaren.");
    return;
  }

  document.getElementById("ofnModalTitle").textContent = "Redigera Överförmyndare";
  document.getElementById("editOfnId").value = ofData.ID;
  document.getElementById("newOfnNamn").value = ofData.Namn || "";
  document.getElementById("newOfnAdress").value = ofData.Adress || "";
  document.getElementById("newOfnPostnummer").value = ofData.Postnummer || "";
  document.getElementById("newOfnPostort").value = ofData.Postort || "";
  document.getElementById("newOfnTelefon").value = ofData.Telefon || "";
  document.getElementById("newOfnEpost").value = ofData.Epost || "";
  document.getElementById("overformyndareModal").style.display = "block";
}

export async function fetchMappableDbColumns() {
  if (Object.keys(state.mappableDbColumns || {}).length > 0) return;
  try {
    const response = await fetch("/api/get_db_columns.php");
    if (!response.ok) throw new Error(`Serverfel: ${response.statusText}`);
    state.mappableDbColumns = await response.json();
    if (state.mappableDbColumns?.data) state.mappableDbColumns = state.mappableDbColumns.data;
    if (Array.isArray(state.mappableDbColumns)) {
      const categorized = {};
      state.mappableDbColumns.forEach(col => {
        const [cat] = col.split(".");
        (categorized[cat] = categorized[cat] || []).push(col);
      });
      state.mappableDbColumns = categorized;
    }
    console.log("Hämtade DB-kolumner:", state.mappableDbColumns);
  } catch (e) {
    console.error("Kunde inte hämta databaskolumner:", e);
    alert("Kunde inte ladda listan med databaskolumner.");
    state.mappableDbColumns = {};
  }
}
