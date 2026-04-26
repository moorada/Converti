let bigDictionary = {};
let smallDictionary = {};
let indexedDBInstance = null;
const NUMBER_WORDS_VIEW_MODE_KEY = "numberWordsViewMode";

let wordsLookupSet = new Set();

// DOM references
const helpIcon = document.getElementById("help-icon");
const helpPopup = document.getElementById("help-popup");
const settingsIcon = document.getElementById("settings-icon");
const settingsPopup = document.getElementById("settings-popup");
const overlay = document.getElementById("overlay");

const verifyWordsCheck = document.getElementById("check-words");
const useBigDictionaryForNumbersCheck = document.getElementById("check-big-dict-numbers");
const customAlert = document.getElementById("custom-alert");

const exportBigButton = document.getElementById("export-big");
const importBigButton = document.getElementById("import-big");
const importFileBig = document.getElementById("import-file-big");

const exportSmallButton = document.getElementById("export-small");
const importSmallButton = document.getElementById("import-small");
const importFileSmall = document.getElementById("import-file-small");

const loadingMessage = document.getElementById("loading-message");
const loadingMessageFirst = document.getElementById("loading-message-first");

const unifiedInput = document.getElementById("unified-input");
const convertButton = document.getElementById("convert-button");
const modeHint = document.getElementById("mode-hint");
const resultContainer = document.getElementById("result-container");

// Tables for phonetics
const VOWELS = ["a", "e", "i", "o", "u"];
const ITALIAN_ADJUSTMENTS = [
  { original: "a", variants: ["á", "à"] },
  { original: "e", variants: ["è", "é"] },
  { original: "i", variants: ["ì", "í", "y", "j"] },
  { original: "o", variants: ["ò", "ó"] },
  { original: "u", variants: ["ù", "ú"] },
  { original: "ks", variants: ["x"] }
];
const EXCEPTIONS = [
  { number: "756", words: ["glig", "glic"] },
  { number: "05", words: ["siglio", "ssigli"] },
  { number: "405", words: ["rsigli"] },
  { number: "205", words: ["msigli"] },
  { number: "075", words: ["sigli"] }
];
const CONVERSION_TABLE = [
  { number: "0", phonetics: ["ss", "zz", "sci", "sce", "s", "z"] },
  { number: "1", phonetics: ["tt", "dd", "t", "d"] },
  { number: "2", phonetics: ["nn", "gn", "n"] },
  { number: "3", phonetics: ["mm", "m"] },
  { number: "4", phonetics: ["rr", "r"] },
  { number: "5", phonetics: ["gli", "ll", "l"] },
  { number: "6", phonetics: ["cci", "ci", "cce", "ce", "ggi", "gi", "gge", "ge"] },
  { number: "7", phonetics: ["cc", "gg", "cq", "kk", "ck", "q", "k", "c", "g"] },
  { number: "8", phonetics: ["ff", "vv", "f", "v"] },
  { number: "9", phonetics: ["pp", "bb", "p", "b"] }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeInput(value) {
  return String(value).trim().replace(/\s+/g, " ");
}

function shouldUseBigDictionaryForNumbers() {
  return Boolean(useBigDictionaryForNumbersCheck && useBigDictionaryForNumbersCheck.checked);
}

function getNumberToWordsDictionary() {
  return shouldUseBigDictionaryForNumbers() ? bigDictionary : smallDictionary;
}

function getNumberToWordsDictionaryLabel() {
  return shouldUseBigDictionaryForNumbers() ? "dizionario grande" : "dizionario comune";
}

function buildWordsLookup(dict) {
  wordsLookupSet = new Set();
  Object.values(dict).forEach((list) => {
    list.forEach((word) => wordsLookupSet.add(word.toLowerCase()));
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("twoDictDB", 1);
    request.onupgradeneeded = (event) => {
      const dbRef = event.target.result;
      if (!dbRef.objectStoreNames.contains("dicts")) {
        dbRef.createObjectStore("dicts", { keyPath: "name" });
      }
    };
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

function getDictionaryFromDB(name) {
  return new Promise((resolve, reject) => {
    const tx = indexedDBInstance.transaction("dicts", "readonly");
    const store = tx.objectStore("dicts");
    const req = store.get(name);
    req.onsuccess = () => {
      if (req.result) {
        resolve(req.result.data);
      } else {
        resolve(null);
      }
    };
    req.onerror = (err) => reject(err);
  });
}

function saveDictionaryToDB(name, dataObj) {
  return new Promise((resolve, reject) => {
    const tx = indexedDBInstance.transaction("dicts", "readwrite");
    const store = tx.objectStore("dicts");
    const req = store.put({ name, data: dataObj });
    req.onsuccess = () => resolve();
    req.onerror = (err) => reject(err);
  });
}

function buildDictionaryFromWords(wordList) {
  const newDict = {};
  for (const rawWord of wordList) {
    const word = rawWord.trim().toLowerCase();
    if (!word) continue;
    const numKey = convertWord(word);
    if (!newDict[numKey]) {
      newDict[numKey] = [];
    }
    if (!newDict[numKey].includes(word)) {
      newDict[numKey].push(word);
    }
  }
  return newDict;
}

async function loadDictionaryFromTxt(txtUrl) {
  try {
    const response = await fetch(txtUrl);
    if (!response.ok) {
      console.warn(`Could not fetch ${txtUrl}:`, response.statusText);
      return {};
    }
    const textData = await response.text();
    const lines = textData
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "");
    return buildDictionaryFromWords(lines);
  } catch (err) {
    console.error("Error loading txt dictionary from:", txtUrl, err);
    return {};
  }
}

async function loadDictionaryFromJson(jsonUrl) {
  try {
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      console.warn(`Could not fetch ${jsonUrl}:`, response.statusText);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error("Error loading JSON dictionary from:", jsonUrl, err);
    return null;
  }
}

async function loadDictionaries() {
  loadingMessageFirst.style.display = "block";
  indexedDBInstance = await openDatabase();

  let loadedBigDict = await getDictionaryFromDB("big");
  if (!loadedBigDict) {
    let bigJson = await loadDictionaryFromJson("./dictionaries/bigDictionary.json");
    if (bigJson) {
      loadedBigDict = bigJson;
    } else {
      loadedBigDict = await loadDictionaryFromTxt("./dictionaries/bigDictionary.txt");
    }
    await saveDictionaryToDB("big", loadedBigDict);
  }
  bigDictionary = loadedBigDict;
  buildWordsLookup(bigDictionary);

  let loadedSmallDict = await getDictionaryFromDB("small");
  if (!loadedSmallDict) {
    let smallJson = await loadDictionaryFromJson("./dictionaries/smallDictionary.json");
    if (smallJson) {
      loadedSmallDict = smallJson;
    } else {
      loadedSmallDict = await loadDictionaryFromTxt("./dictionaries/smallDictionary.txt");
    }
    await saveDictionaryToDB("small", loadedSmallDict);
  }
  smallDictionary = loadedSmallDict;

  loadingMessageFirst.style.display = "none";
}

function exportDictionary(dict, fileName) {
  const allWords = Object.values(dict).flat();
  const uniqueWords = [...new Set(allWords)];
  const text = uniqueWords.join("\n");

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
}

function importDictionary(file, which) {
  loadingMessage.style.display = "block";

  const reader = new FileReader();
  reader.onload = async (event) => {
    const lines = event.target.result
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const newDict = buildDictionaryFromWords(lines);

    if (which === "big") {
      bigDictionary = newDict;
      await saveDictionaryToDB("big", bigDictionary);
      buildWordsLookup(bigDictionary);
      showCustomAlert("Import bigDictionary completato!");
    } else {
      smallDictionary = newDict;
      await saveDictionaryToDB("small", smallDictionary);
      showCustomAlert("Import smallDictionary completato!");
    }

    loadingMessage.style.display = "none";
  };

  reader.onerror = () => {
    loadingMessage.style.display = "none";
    showCustomAlert("Errore durante l'import del file.");
  };

  reader.readAsText(file);
}

function convertWord(input) {
  if (!input) return "99999999";
  let word = String(input).toLowerCase().trim();

  ITALIAN_ADJUSTMENTS.forEach((adj) => {
    adj.variants.forEach((variant) => {
      word = word.replace(new RegExp(variant, "g"), adj.original);
    });
  });

  EXCEPTIONS.forEach((ex) => {
    ex.words.forEach((w) => {
      word = word.replace(new RegExp(w, "g"), ex.number);
    });
  });

  CONVERSION_TABLE.forEach((entry) => {
    entry.phonetics.forEach((phonetic) => {
      word = word.replace(new RegExp(phonetic, "g"), entry.number);
    });
  });

  VOWELS.forEach((v) => {
    word = word.replace(new RegExp(v, "g"), "");
  });

  word = word.replace(/[^0-9]/g, "");
  return word === "" ? "99999999" : word;
}

function getSplit(s) {
  const combinations = [];
  if (s.length <= 1) {
    return combinations;
  }

  for (let i = 1; i < s.length; i++) {
    const s1 = s.slice(0, i);
    const s2 = s.slice(i);
    combinations.push([s1, s2]);

    const rest = getSplit(s2);
    rest.forEach((parts) => combinations.push([s1, ...parts]));
  }

  return combinations;
}

function getAllCombinations(s) {
  const combinations = [[s], ...getSplit(s)];
  combinations.sort((a, b) => a.length - b.length);
  return combinations;
}

function numberToWordPaths(number, dictionarySource) {
  const splitSets = getAllCombinations(number);
  const filtered = [];

  splitSets.forEach((parts) => {
    const wordsByPart = [];
    let ok = true;

    parts.forEach((part) => {
      const words = dictionarySource[part];
      if (!words || words.length === 0) {
        ok = false;
        return;
      }
      wordsByPart.push(words);
    });

    if (ok) {
      filtered.push({ parts, wordsByPart });
    }
  });

  return filtered;
}

function buildTableRowsFromPaths(paths) {
  return paths.map((path) => path.wordsByPart.map((words) => words.join(", ")));
}

function renderWordNumberResult(sourceText, number, warningText) {
  modeHint.textContent = `Modalità parole -> numeri. Input: ${sourceText}`;

  const warningHtml = warningText
    ? `<p class="conversion-warning">${escapeHtml(warningText)}</p>`
    : "";

  resultContainer.innerHTML = `
    <div class="result-number-wrap">
      <div class="result-title">Numero</div>
      <div class="result-big-number">${escapeHtml(number)}</div>
      ${warningHtml}
    </div>
  `;
}

function renderNoCombinations(number, dictionaryLabel) {
  modeHint.textContent = `Modalità numeri -> parole (${dictionaryLabel}). Nessuna combinazione per ${number}.`;
  resultContainer.innerHTML = `
    <div class="result-empty">
      Nessuna combinazione trovata per <strong>${escapeHtml(number)}</strong> usando il ${escapeHtml(dictionaryLabel)}.
    </div>
  `;
}

function renderNumberWordsResult(number, paths, dictionaryLabel) {
  const rows = buildTableRowsFromPaths(paths);
  const graphState = {
    selectedParts: [],
    selectedWords: []
  };

  modeHint.textContent = `Modalità numeri -> parole (${dictionaryLabel}). Combinazioni trovate: ${rows.length}.`;

  resultContainer.innerHTML = `
    <div class="result-table-wrap">
      <div class="result-head">
        <div class="result-title">Parole per ${escapeHtml(number)} (${escapeHtml(dictionaryLabel)})</div>
        <div class="result-view-toggle">
          <button type="button" class="result-mode-btn active" data-view-mode="table">Tabella</button>
          <button type="button" class="result-mode-btn" data-view-mode="graph">Modalità grafo</button>
        </div>
      </div>
      <div id="number-words-view"></div>
    </div>
  `;

  const viewNode = resultContainer.querySelector("#number-words-view");
  const tableBtn = resultContainer.querySelector('[data-view-mode="table"]');
  const graphBtn = resultContainer.querySelector('[data-view-mode="graph"]');
  const initialMode = localStorage.getItem(NUMBER_WORDS_VIEW_MODE_KEY) === "graph" ? "graph" : "table";

  function setActiveMode(mode) {
    const tableActive = mode === "table";
    tableBtn.classList.toggle("active", tableActive);
    graphBtn.classList.toggle("active", !tableActive);
    localStorage.setItem(NUMBER_WORDS_VIEW_MODE_KEY, tableActive ? "table" : "graph");
  }

  function renderTableView() {
    setActiveMode("table");

    let maxLen = 0;
    rows.forEach((row) => {
      if (row.length > maxLen) maxLen = row.length;
    });

    const normalizedRows = rows.map((row) => {
      const clone = [...row];
      while (clone.length < maxLen) {
        clone.push("--");
      }
      return clone;
    });

    const headers = Array.from({ length: maxLen }, (_, i) => `<th>Parte ${i + 1}</th>`).join("");
    const rowCount = normalizedRows.length;
    const hiddenCells = Array.from({ length: rowCount }, () => Array(maxLen).fill(false));
    const rowSpans = Array.from({ length: rowCount }, () => Array(maxLen).fill(1));

    // Auto-merge gerarchico come la tabella CLI:
    // stessa cella + stesso prefisso nelle colonne precedenti.
    for (let col = 0; col < maxLen; col++) {
      for (let row = 0; row < rowCount; row++) {
        if (hiddenCells[row][col]) continue;

        const value = normalizedRows[row][col];
        if (value === "--") continue;

        let span = 1;
        for (let next = row + 1; next < rowCount; next++) {
          if (normalizedRows[next][col] !== value) break;

          let samePrefix = true;
          for (let prevCol = 0; prevCol < col; prevCol++) {
            if (normalizedRows[next][prevCol] !== normalizedRows[row][prevCol]) {
              samePrefix = false;
              break;
            }
          }

          if (!samePrefix) break;

          span++;
          hiddenCells[next][col] = true;
        }

        rowSpans[row][col] = span;
      }
    }

    const body = normalizedRows.map((row, rowIndex) => {
      let cellsHtml = "";

      for (let col = 0; col < maxLen; col++) {
        if (hiddenCells[rowIndex][col]) continue;

        const cellValue = row[col];
        const span = rowSpans[rowIndex][col];
        const spanAttr = span > 1 ? ` rowspan="${span}"` : "";
        const cellClass = cellValue === "--" ? ' class="cell-empty"' : "";
        cellsHtml += `<td${spanAttr}${cellClass}>${escapeHtml(cellValue)}</td>`;
      }

      return `<tr>${cellsHtml}</tr>`;
    }).join("");

    viewNode.innerHTML = `
      <div class="table-scroll">
        <table class="result-table">
          <thead><tr>${headers}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  }

  function renderGraphView() {
    setActiveMode("graph");

    const selectedDepth = graphState.selectedParts.length;
    const matchingPaths = paths.filter((path) => {
      for (let i = 0; i < selectedDepth; i++) {
        if (path.parts[i] !== graphState.selectedParts[i]) return false;
      }
      return true;
    });

    const isCompleted = matchingPaths.some((path) => path.parts.length === selectedDepth);
    const candidateMap = new Map();

    matchingPaths.forEach((path) => {
      if (path.parts.length <= selectedDepth) return;
      const nextPart = path.parts[selectedDepth];
      const nextWords = path.wordsByPart[selectedDepth] || [];
      nextWords.forEach((word) => {
        const key = `${nextPart}|${word}`;
        const existing = candidateMap.get(key);
        if (!existing) {
          candidateMap.set(key, {
            part: nextPart,
            word,
            minTotalParts: path.parts.length
          });
          return;
        }

        if (path.parts.length < existing.minTotalParts) {
          existing.minTotalParts = path.parts.length;
        }
      });
    });

    const candidates = Array.from(candidateMap.values()).sort((a, b) => {
      if (a.minTotalParts !== b.minTotalParts) return a.minTotalParts - b.minTotalParts;
      if (a.part.length !== b.part.length) return b.part.length - a.part.length;
      return a.word.localeCompare(b.word, "it");
    });

    const selectedHtml = graphState.selectedWords.length === 0
      ? `<div class="graph-selected-placeholder">Seleziona una prima parola dal grafo.</div>`
      : graphState.selectedWords.map((word, index) => `
          <div class="graph-selected-step">
            <div class="graph-node graph-node-selected">
              <span class="graph-node-dot"></span>
              <span>${escapeHtml(word)}</span>
              <span class="graph-node-part">${escapeHtml(graphState.selectedParts[index])}</span>
            </div>
            ${index < graphState.selectedWords.length - 1 ? '<div class="graph-step-line"></div>' : ""}
          </div>
        `).join("");

    const candidatesHtml = candidates.length === 0
      ? `<div class="graph-end">Nessun nodo successivo disponibile.</div>`
      : candidates.map((candidate) => `
          <div class="graph-candidate-row">
            <button
              type="button"
              class="graph-node graph-node-candidate"
              data-next-part="${escapeHtml(candidate.part)}"
              data-next-word="${escapeHtml(candidate.word)}"
            >
              <span class="graph-node-dot"></span>
              <span>${escapeHtml(candidate.word)}</span>
              <span class="graph-node-part">${escapeHtml(candidate.part)}</span>
            </button>
          </div>
        `).join("");

    const selectedSummary = graphState.selectedWords.map((word) => escapeHtml(word)).join(" -> ");
    const completedHtml = isCompleted
      ? `<div class="graph-complete">Percorso completo: ${selectedSummary || "(vuoto)"}</div>`
      : "";

    viewNode.innerHTML = `
      <div class="graph-panel">
        <div class="graph-controls">
          <button type="button" id="graph-back-btn" class="graph-control-btn" ${graphState.selectedWords.length ? "" : "disabled"}>Indietro</button>
          <button type="button" id="graph-reset-btn" class="graph-control-btn" ${graphState.selectedWords.length ? "" : "disabled"}>Ricomincia</button>
        </div>
        <div class="graph-stage">
          <div class="graph-selected-track">${selectedHtml}</div>
          ${graphState.selectedWords.length ? '<div class="graph-bridge"></div>' : ""}
          <div class="graph-branch">${candidatesHtml}</div>
        </div>
        ${completedHtml}
      </div>
    `;

    const backBtn = viewNode.querySelector("#graph-back-btn");
    const resetBtn = viewNode.querySelector("#graph-reset-btn");

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (graphState.selectedWords.length > 0) {
          graphState.selectedWords.pop();
          graphState.selectedParts.pop();
          renderGraphView();
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        graphState.selectedWords = [];
        graphState.selectedParts = [];
        renderGraphView();
      });
    }

    viewNode.querySelectorAll(".graph-node-candidate").forEach((button) => {
      button.addEventListener("click", () => {
        const nextPart = button.dataset.nextPart;
        const nextWord = button.dataset.nextWord;
        graphState.selectedParts.push(nextPart);
        graphState.selectedWords.push(nextWord);
        renderGraphView();
      });
    });
  }

  tableBtn.addEventListener("click", renderTableView);
  graphBtn.addEventListener("click", renderGraphView);

  if (initialMode === "graph") {
    renderGraphView();
  } else {
    renderTableView();
  }
}

function runConversion() {
  const cleanInput = sanitizeInput(unifiedInput.value);

  if (!cleanInput) {
    resultContainer.innerHTML = "";
    modeHint.textContent = "Inserisci solo cifre per ottenere una tabella di parole. Inserisci testo per ottenere un solo numero.";
    return;
  }

  const compact = cleanInput.replace(/\s+/g, "");

  if (/^\d+$/.test(compact)) {
    const dictionaryForNumbers = getNumberToWordsDictionary();
    const dictionaryLabel = getNumberToWordsDictionaryLabel();
    const paths = numberToWordPaths(compact, dictionaryForNumbers);
    if (paths.length === 0) {
      renderNoCombinations(compact, dictionaryLabel);
    } else {
      renderNumberWordsResult(compact, paths, dictionaryLabel);
    }
    return;
  }

  const numberResult = convertWord(cleanInput);

  let warning = "";
  if (verifyWordsCheck.checked) {
    const words = cleanInput
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word !== "");

    const missing = words.filter((word) => !wordsLookupSet.has(word));
    if (missing.length > 0) {
      warning = `Parole non trovate nel dizionario: ${missing.join(", ")}`;
    }
  }

  renderWordNumberResult(cleanInput, numberResult, warning);
}

function showCustomAlert(msg) {
  customAlert.innerText = msg;
  customAlert.style.display = "block";
  setTimeout(() => {
    customAlert.style.display = "none";
  }, 2000);
}

document.addEventListener("DOMContentLoaded", async () => {
  loadingMessage.style.display = "block";
  await loadDictionaries();
  loadingMessage.style.display = "none";

  verifyWordsCheck.checked = (localStorage.getItem("checkWords") === "true");
  verifyWordsCheck.addEventListener("change", () => {
    localStorage.setItem("checkWords", verifyWordsCheck.checked);
  });

  useBigDictionaryForNumbersCheck.checked = (localStorage.getItem("useBigDictForNumbers") === "true");
  useBigDictionaryForNumbersCheck.addEventListener("change", () => {
    localStorage.setItem("useBigDictForNumbers", useBigDictionaryForNumbersCheck.checked);

    const cleanInput = sanitizeInput(unifiedInput.value);
    const compact = cleanInput.replace(/\s+/g, "");
    if (/^\d+$/.test(compact)) {
      runConversion();
    }
  });

  // Popup logic
  const popups = [helpPopup, settingsPopup];
  function togglePopup(popup) {
    const isVisible = popup.style.display === "block";
    popups.forEach((p) => {
      p.style.display = "none";
    });
    popup.style.display = isVisible ? "none" : "block";
    overlay.style.display = isVisible ? "none" : "block";
  }

  helpIcon.addEventListener("click", (event) => {
    event.preventDefault();
    togglePopup(helpPopup);
  });

  settingsIcon.addEventListener("click", (event) => {
    event.preventDefault();
    togglePopup(settingsPopup);
  });

  overlay.addEventListener("click", () => {
    popups.forEach((p) => {
      p.style.display = "none";
    });
    overlay.style.display = "none";
  });

  // Export / Import big
  exportBigButton.addEventListener("click", () => {
    exportDictionary(bigDictionary, "bigDictionary_export.txt");
  });

  importBigButton.addEventListener("click", () => {
    importFileBig.click();
  });

  importFileBig.addEventListener("change", () => {
    if (importFileBig.files[0]) {
      importDictionary(importFileBig.files[0], "big");
      importFileBig.value = "";
    }
  });

  // Export / Import small
  exportSmallButton.addEventListener("click", () => {
    exportDictionary(smallDictionary, "smallDictionary_export.txt");
  });

  importSmallButton.addEventListener("click", () => {
    importFileSmall.click();
  });

  importFileSmall.addEventListener("change", () => {
    if (importFileSmall.files[0]) {
      importDictionary(importFileSmall.files[0], "small");
      importFileSmall.value = "";
    }
  });

  convertButton.addEventListener("click", runConversion);
  unifiedInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      runConversion();
    }
  });
});
