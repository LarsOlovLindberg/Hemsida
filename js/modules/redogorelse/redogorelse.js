// "C:\Users\lars-\gman-web\js\modules\redogorelse\redogorelse.js";
import state from "../../state.js";
import { getRadioValue, setRadioValue } from "../utils/helpers.js";

export function populateRedogorelseTabWithDefaults() {
  console.log("[Redogörelse] populateRedogorelseTabWithDefaults()");
  if (!state.currentHuvudmanFullData?.huvudmanDetails || !state.activeGodManProfile) {
    console.log("[Redogörelse] Nödvändig data saknas.");
    return;
  }
  const hm = state.currentHuvudmanFullData.huvudmanDetails;
  const gm = state.activeGodManProfile;
  const redogData = state.currentHuvudmanFullData.redogorelseData;

  const periodStartFromArsrakning = document.getElementById("periodStart_ars")?.value;
  const periodSlutFromArsrakning = document.getElementById("periodSlut_ars")?.value;
  document.getElementById("redogKalenderarStart").value =
    redogData?.redogKalenderarStart || periodStartFromArsrakning || "";
  document.getElementById("redogKalenderarSlut").value =
    redogData?.redogKalenderarSlut || periodSlutFromArsrakning || "";

  document.getElementById("redogHuvudmanNamnDisplay").value = `${hm.Fornamn || ""} ${hm.Efternamn || ""}`.trim();
  document.getElementById("redogHuvudmanPnrDisplay").value = hm.Personnummer || "";
  document.getElementById("redogGodManNamnDisplay").value = `${gm.Fornamn || ""} ${gm.Efternamn || ""}`.trim();
  document.getElementById("redogGodManPnrDisplay").value = gm.Personnummer || "";

  if (redogData) {
    for (const key in redogData) {
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
        if (radioGroup.length > 0) setRadioValue(key, redogData[key]);
      }
    }
  } else {
    setRadioValue("redogSlaktskap", "Nej");
    document.getElementById("redogOmfBevakaRatt").checked = true;
    document.getElementById("redogOmfForvaltaEgendom").checked = true;
    document.getElementById("redogOmfSorjaForPerson").checked = true;
    setRadioValue("redogBehovFortsatt", "Ja");
    setRadioValue("redogAnnanOmfattning", "Nej");

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

    setRadioValue("redogAntalBesokTyp", "1 - 2 gånger/månad");
    setRadioValue("redogVistelseUtanforHemmet", "Ja");

    document.getElementById("redogBetalningInternetbank").checked = true;
    document.getElementById("redogBetalningAutogiro").checked = true;
    document.getElementById("redogKontooverforingHm").checked = true;
    document.getElementById("redogKontanterHmKvitto").checked = false;
    document.getElementById("redogKontooverforingBoende").checked = true;
    document.getElementById("redogKontanterBoendeKvitto").checked = false;

    setRadioValue("redogForvaltningSaltKoptFastighet", "Nej");
    setRadioValue("redogForvaltningHyrtUtFastighet", "Nej");
    setRadioValue("redogForvaltningSaltKoptAktier", "Nej");
    setRadioValue("redogForvaltningAnnanVardepapper", "Nej");
    setRadioValue("redogForvaltningSoktSkuldsanering", "Nej");

    document.getElementById("redogArvodeBevakaRatt").checked = true;
    document.getElementById("redogArvodeForvaltaEgendom").checked = true;
    document.getElementById("redogArvodeSorjaForPerson").checked = true;
    setRadioValue("redogArbetsinsats", "Normal");
    setRadioValue("redogOnskarKostnadsersattning", "schablon");
    setRadioValue("redogKorjournalBifogas", "Nej");
  }
}
