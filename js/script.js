let bigDictionary = {};
let smallDictionary = {};
const NUMBER_WORDS_VIEW_MODE_KEY = "numberWordsViewMode";
const USE_BIG_DICT_FOR_NUMBERS_KEY = "useBigDictForNumbers";
const LAB_DEFAULT_HINT = "Inserisci solo cifre per ottenere una tabella di parole. Inserisci testo per ottenere un solo numero.";
const LAB_MAX_INPUT_DIGITS = 24;
const LAB_FORCE_GRAPH_AFTER_DIGITS = 16;
let wordsLookupSet = new Set();
const dictionaryIndexCache = new WeakMap();
const REQUIRED_DICTIONARY_ENTRIES = [
  ["00","sasso"],["01","sedia"],["02","zaino"],["03","sim"],["04","zorro"],["05","sella"],["06","saggio"],["07","secchio"],["08","sofia"],["09","seppia"],
  ["10","tasso"],["11","dadi"],["12","tonno"],["13","dama"],["14","toro"],["15","tela"],["16","doccia"],["17","tacchi"],["18","duff"],["19","topo"],
  ["20","naso"],["21","nido"],["22","nonno"],["23","nemo"],["24","nero"],["25","anello"],["26","noci"],["27","nico"],["28","neve"],["29","nube"],
  ["30","mazza"],["31","moto"],["32","mina"],["33","mamma"],["34","muro"],["35","mela"],["36","mocio"],["37","mago"],["38","muffa"],["39","mappa"],
  ["40","razzo"],["41","rete"],["42","rana"],["43","ramo"],["44","orrore"],["45","rullo"],["46","riccio"],["47","riga"],["48","raf"],["49","rabbia"],
  ["50","lisa"],["51","latte"],["52","lana"],["53","lama"],["54","lira"],["55","lollo"],["55","lolla"],["56","luce"],["57","luca"],["58","lava"],["59","lupo"],
  ["60","cesso"],["61","cd"],["62","cina"],["63","gemma"],["64","gerry"],["65","jolly"],["66","ciccio"],["67","jack"],["68","ciuffo"],["69","giubba"],
  ["70","gas"],["71","gatto"],["72","cane"],["73","gomma"],["74","carro"],["75","gallo"],["76","cuccia"],["77","cacca"],["78","caffe"],["78","caffè"],["79","cubo"],
  ["80","vaso"],["81","fede"],["82","phon"],["83","fiamme"],["84","faro"],["85","vela"],["86","faccia"],["87","vacca"],["88","fave"],["89","fibbia"],
  ["90","pizza"],["91","piede"],["92","pane"],["93","piuma"],["94","pera"],["95","palla"],["96","buccia"],["97","pacco"],["98","puffo"],["99","papa"],["99","papà"],
  ["0","sci"],["1","te"],["1","tè"],["2","anna"],["3","amo"],["4","re"],["5","ali"],["6","ciao"],["7","oca"],["8","ufo"],["9","ape"]
];

let currentMode = "numbers";
let currentSection = "play";
let isGameOver = false;
let timerInterval = null;
const gameDuration = 120;
let timeLeft = gameDuration;
let correctCount = 0;

let digitsForNumbers = 1;  
let currentNumber = "";

let wordsCountForGame = 1; 
let currentWordsArray = [];

// DOM references
const helpIcon          = document.getElementById("help-icon");
const helpPopup         = document.getElementById("help-popup");
const settingsIcon      = document.getElementById("settings-icon");
const settingsPopup     = document.getElementById("settings-popup");
const overlay           = document.getElementById("overlay");
const labToggleBtn      = document.getElementById("lab-toggle");
const playSection       = document.getElementById("play-section");
const labSection        = document.getElementById("lab-section");
const playFooter        = document.getElementById("play-footer");

const btnNumbers        = document.getElementById("btn-numbers");
const btnWords          = document.getElementById("btn-words");
const startButton       = document.getElementById("start-button");
const wordInput         = document.getElementById("word-input");
const numberInput       = document.getElementById("number-input");
const infoText          = document.getElementById("info-text");
const timerElement      = document.getElementById("timer");
const boxElement        = document.getElementById("box");
const resultContainer   = document.getElementById("resoconto");
const verifyWordsCheck  = document.getElementById("check-words");
const useBigDictionaryForNumbersCheck = document.getElementById("check-big-dict-numbers");
const customAlert       = document.getElementById("custom-alert");
const gameContainer     = document.getElementById("game-container");
const labUnifiedInput   = document.getElementById("lab-unified-input");
const labConvertButton  = document.getElementById("lab-convert-button");
const labModeHint       = document.getElementById("lab-mode-hint");
const labResultContainer = document.getElementById("lab-result-container");

const exportBigButton   = document.getElementById("export-big");
const importBigButton   = document.getElementById("import-big");
const importFileBig     = document.getElementById("import-file-big");

const exportSmallButton = document.getElementById("export-small");
const importSmallButton = document.getElementById("import-small");
const importFileSmall   = document.getElementById("import-file-small");

const loadingMessage    = document.getElementById("loading-message");
const loadingMessageFirst    = document.getElementById("loading-message-first");
loadingMessageFirst.style.display = "none";


// Tables for phonetics
const VOWELS = ["a","e","i","o","u"];
const ITALIAN_ADJUSTMENTS = [
  { original:"a", variants:["á","à"] },
  { original:"e", variants:["è","é"] },
  { original:"i", variants:["ì","í","y","j"] },
  { original:"o", variants:["ò","ó"] },
  { original:"u", variants:["ù","ú"] },
  { original:"ks", variants:["x"] }
];
const EXCEPTIONS = [
  { number:"756", words:["glig","glic"] },
  { number:"05",  words:["siglio"] },
  { number:"405", words:["rsigli"] },
  { number:"205", words:["msigli"] },
  { number:"075", words:["sigli"] }
];
const CONVERSION_TABLE = [
  { number:"0", phonetics:["ss","zz","sci","sce","s","z"] },
  { number:"1", phonetics:["tt","dd","t","d"] },
  { number:"2", phonetics:["nn","gn","n"] },
  { number:"3", phonetics:["mm","m"] },
  { number:"4", phonetics:["rr","r"] },
  { number:"5", phonetics:["gli","ll","l"] },
  { number:"6", phonetics:["cci","ci","cce","ce","ggi","gi","gge","ge"] },
  { number:"7", phonetics:["cc","gg","cq","kk","ck","q","k","c","g"] },
  { number:"8", phonetics:["ff","vv","f","v"] },
  { number:"9", phonetics:["pp","bb","p","b"] }
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

function buildWordsLookup(dict) {
  wordsLookupSet = new Set();
  Object.values(dict).forEach((list) => {
    list.forEach((word) => wordsLookupSet.add(String(word).toLowerCase()));
  });
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

function ensureRequiredDictionaryEntries(dict) {
  let changed = false;

  REQUIRED_DICTIONARY_ENTRIES.forEach(([numberKey, wordValue]) => {
    if (!Array.isArray(dict[numberKey])) {
      dict[numberKey] = [];
      changed = true;
    }

    if (!dict[numberKey].includes(wordValue)) {
      dict[numberKey].push(wordValue);
      changed = true;
    }
  });

  return changed;
}

// IndexedDB variables
let indexedDBInstance = null;

/**
 * Open or create an IndexedDB named "twoDictDB" with an object store "dicts".
 */
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

/**
 * Retrieve a dictionary from the "dicts" store in IndexedDB.
 * @param {string} name - "big" or "small"
 */
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

/**
 * Save a dictionary to the "dicts" store in IndexedDB.
 * @param {string} name
 * @param {object} dataObj
 */
function saveDictionaryToDB(name, dataObj) {
  return new Promise((resolve, reject) => {
    const tx = indexedDBInstance.transaction("dicts", "readwrite");
    const store = tx.objectStore("dicts");
    const req = store.put({ name, data: dataObj });
    req.onsuccess = () => resolve();
    req.onerror = (err) => reject(err);
  });
}

/**
 * Build a dictionary object (number -> array of words) from an array of words
 * using the "convertWord" function.
 */
function buildDictionaryFromWords(wordList) {
  const newDict = {};
  for (const w of wordList) {
    const numKey = convertWord(w);
    if (!newDict[numKey]) {
      newDict[numKey] = [];
    }
    newDict[numKey].push(w);
  }
  return newDict;
}

/**
 * Load a .txt file from path, split lines, build dictionary with buildDictionaryFromWords.
 */
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
      .map(l => l.trim())
      .filter(l => l !== "");
    return buildDictionaryFromWords(lines);
  } catch (err) {
    console.error("Error loading txt dictionary from:", txtUrl, err);
    return {};
  }
}

/**
 * Load a .json file from path, parse it, and return it as an object {numberKey: [words]}
 * We assume the JSON is shaped like { "123": ["someWord"], ... } already.
 */
async function loadDictionaryFromJson(jsonUrl) {
  try {
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      console.warn(`Could not fetch ${jsonUrl}:`, response.statusText);
      return null;
    }
    const data = await response.json();
    // data is presumably already { "0123": [ "word1", "word2" ], ...}
    return data;
  } catch (err) {
    console.error("Error loading JSON dictionary from:", jsonUrl, err);
    return null;
  }
}

/**
 * loadDictionaries - tries to read big/small from IndexedDB,
 * if not present => tries bigDictionary.json, else fallback to bigDictionary.txt
 * same for smallDictionary.
 */
async function loadDictionaries() {
  loadingMessageFirst.style.display = "block";
  indexedDBInstance = await openDatabase();
  console.log("IndexedDB opened:", indexedDBInstance);

  // 1) Attempt big from IDB
  let loadedBigDict = await getDictionaryFromDB("big");
  if (!loadedBigDict) {
    // If not found => try bigDictionary.json
    let bigJson = await loadDictionaryFromJson("./dictionaries/bigDictionary.json");
    if (bigJson) {
      loadedBigDict = bigJson;
      console.log("Loaded bigDictionary.json with", Object.keys(loadedBigDict).length, "keys");
    } else {
      // If .json not found => fallback to bigDictionary.txt
      let bigTxt = await loadDictionaryFromTxt("./dictionaries/bigDictionary.txt");
      loadedBigDict = bigTxt;
      console.log("Loaded bigDictionary.txt with", Object.keys(loadedBigDict).length, "keys");
    }
    // Save in IDB
    await saveDictionaryToDB("big", loadedBigDict);
  }
  bigDictionary = loadedBigDict;
  const bigWasUpdated = ensureRequiredDictionaryEntries(bigDictionary);
  if (bigWasUpdated) {
    await saveDictionaryToDB("big", bigDictionary);
  }
  buildWordsLookup(bigDictionary);

  // 2) Attempt small from IDB
  let loadedSmallDict = await getDictionaryFromDB("small");
  if (!loadedSmallDict) {
    // If not found => try smallDictionary.json
    let smallJson = await loadDictionaryFromJson("./dictionaries/smallDictionary.json");
    if (smallJson) {
      loadedSmallDict = smallJson;
      console.log("Loaded smallDictionary.json with", Object.keys(loadedSmallDict).length, "keys");
    } else {
      // If .json not found => fallback to smallDictionary.txt
      let smallTxt = await loadDictionaryFromTxt("./dictionaries/smallDictionary.txt");
      loadedSmallDict = smallTxt;
      console.log("Loaded smallDictionary.txt with", Object.keys(loadedSmallDict).length, "keys");
    }
    // Save in IDB
    await saveDictionaryToDB("small", loadedSmallDict);
  }
  smallDictionary = loadedSmallDict;
  const smallWasUpdated = ensureRequiredDictionaryEntries(smallDictionary);
  if (smallWasUpdated) {
    await saveDictionaryToDB("small", smallDictionary);
  }
  loadingMessageFirst.style.display = "none";
}

/**
 * Export a dictionary to a text file: flatten, unique, then join by newline.
 */
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

/**
 * Import a text file for big or small dictionary.
 */
function importDictionary(file, which) {
  loadingMessage.style.display = "block";

  const reader = new FileReader();
  reader.onload = async (event) => {
    const lines = event.target.result
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "");

    const newDict = buildDictionaryFromWords(lines);
    ensureRequiredDictionaryEntries(newDict);

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

  reader.onerror = (error) => {
    loadingMessage.style.display = "none";
    showCustomAlert("Errore durante l'import del file.");
    console.error(error);
  };
  reader.readAsText(file);
}

// On DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  loadingMessage.style.display = "block"; // Show loading while we open DB & load dicts
  await loadDictionaries();
  loadingMessage.style.display = "none";

  verifyWordsCheck.checked = (localStorage.getItem("checkWords") === "true");
  switchAppSection("play");
  showContent("numbers");
  labModeHint.textContent = LAB_DEFAULT_HINT;

  labToggleBtn.addEventListener("click", () => {
    const nextSection = (currentSection === "play") ? "lab" : "play";
    switchAppSection(nextSection);
  });

  verifyWordsCheck.addEventListener("change", () => {
    localStorage.setItem("checkWords", verifyWordsCheck.checked);
  });

  if (useBigDictionaryForNumbersCheck) {
    useBigDictionaryForNumbersCheck.checked = (localStorage.getItem(USE_BIG_DICT_FOR_NUMBERS_KEY) === "true");
    useBigDictionaryForNumbersCheck.addEventListener("change", () => {
      localStorage.setItem(USE_BIG_DICT_FOR_NUMBERS_KEY, useBigDictionaryForNumbersCheck.checked);
      const cleanInput = sanitizeInput(labUnifiedInput.value);
      const compact = cleanInput.replace(/\s+/g, "");
      if (/^\d+$/.test(compact)) {
        runLabConversion();
      }
    });
  }

  wordInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      checkNumbersAnswer();
    }
  });
  numberInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      checkWordsAnswer();
    }
  });

  labConvertButton.addEventListener("click", runLabConversion);
  labUnifiedInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      runLabConversion();
    }
  });

  // Popup logic
  const popups = [helpPopup, settingsPopup];
  function togglePopup(popup) {
    const isVisible = (popup.style.display === "block");
    popups.forEach((p) => { p.style.display = "none"; });
    popup.style.display = isVisible ? "none" : "block";
    overlay.style.display = isVisible ? "none" : "block";
  }
  helpIcon.addEventListener("click", () => togglePopup(helpPopup));
  settingsIcon.addEventListener("click", () => togglePopup(settingsPopup));
  overlay.addEventListener("click", () => {
    popups.forEach((p) => { p.style.display = "none"; });
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
    }
  });
});
const submitBtn = document.getElementById("submit-btn");

function updateSubmitButtonVisibility() {
  if (currentSection !== "play") {
    submitBtn.style.display = "none";
    return;
  }

  const wordVisible = wordInput.style.display !== "none";
  const numberVisible = numberInput.style.display !== "none";
  submitBtn.style.display = (wordVisible || numberVisible) ? "inline-block" : "none";
}

function switchAppSection(sectionName) {
  currentSection = sectionName;
  const isPlaySection = (sectionName === "play");

  playSection.classList.toggle("active", isPlaySection);
  labSection.classList.toggle("active", !isPlaySection);
  playFooter.style.display = isPlaySection ? "block" : "none";

  labToggleBtn.textContent = isPlaySection ? "LAB" : "GAME";
  labToggleBtn.classList.toggle("is-lab-open", !isPlaySection);
  labToggleBtn.setAttribute("aria-pressed", isPlaySection ? "false" : "true");

  if (!isPlaySection && timerInterval && !isGameOver) {
    endGame();
  }

  if (!isPlaySection) {
    labUnifiedInput.focus();
  }

  updateSubmitButtonVisibility();
}

// Wrappa showContent, initGame, endGame per aggiornare visibilità bottone
const originalShowContent = showContent;
showContent = function(mode) {
  originalShowContent(mode);
  updateSubmitButtonVisibility();
};

const originalInitGame = initGame;
initGame = function() {
  originalInitGame();
  updateSubmitButtonVisibility();
};

const originalEndGame = endGame;
endGame = function() {
  originalEndGame();
  updateSubmitButtonVisibility();
};

submitBtn.addEventListener("mousedown", (e) => {
  e.preventDefault(); // Evita il blur

  const wordVisible = wordInput.style.display !== "none";
  const numberVisible = numberInput.style.display !== "none";

  let targetInput = null;

  if (wordVisible && !wordInput.disabled) {
    targetInput = wordInput;
  } else if (numberVisible && !numberInput.disabled) {
    targetInput = numberInput;
  }

  if (targetInput) {
    // Dispatch finto evento 'Enter'
    const event = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    });
    targetInput.dispatchEvent(event);
  }
});
/**
 * Show the content for the given mode ("numbers" or "words").
 */
function showContent(newMode) {
  resultContainer.innerHTML = "";
  resultContainer.style.display = "none";

  if (timerInterval && !isGameOver) {
    endGame();
  }
  currentMode = newMode;
  btnNumbers.classList.remove("active");
  btnWords.classList.remove("active");

  const oldShareBtn = document.getElementById("share-button");
  if (oldShareBtn) oldShareBtn.remove();

  if (currentMode === "numbers") {
    btnNumbers.classList.add("active");
    startButton.disabled = false;
    wordInput.style.display = "none";
    numberInput.style.display = "none";
    infoText.innerHTML = `
      ⏳<br>Hai 2 minuti per trasformare i numeri in parole!<br>
      🎯<br>Ogni 3 risposte giuste, il livello si alza e i numeri si allungano!<br>🚀
    `;
  } else {
    btnWords.classList.add("active");
    if (Object.keys(smallDictionary).length > 0) {
      startButton.disabled = false;
      infoText.innerHTML = `
        ⏳<br>Hai 2 minuti per convertire le parole in numeri!<br>
        🎯<br>Ogni 3 risposte corrette, aumentano le parole da convertire!<br>🚀
      `;
    } else {
      startButton.disabled = true;
      infoText.innerHTML = `
        <strong>Da parole</strong>: Caricamento smallDictionary in corso...
      `;
    }
    wordInput.style.display = "none";
    numberInput.style.display = "none";
  }

  boxElement.style.display = "none";
  boxElement.textContent = "";
  startButton.style.display = "inline-block";
}

/**
 * Initialize the game. Resets timers, counters, and sets up the first question.
 */
function initGame() {
  infoText.style.display = "none";

  const oldShareBtn = document.getElementById("share-button");
  if (oldShareBtn) oldShareBtn.remove();

  isGameOver = false;
  timeLeft = gameDuration;
  correctCount = 0;
  timerElement.style.display = "inline-block";
  timerElement.textContent = timeLeft;

  timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      endGame();
    } else {
      timeLeft--;
      timerElement.textContent = timeLeft;
    }
  }, 1000);

  resultContainer.innerHTML = "";
  resultContainer.style.display = "none";
  startButton.style.display = "none";

  if (currentMode === "numbers") {
    digitsForNumbers = 1;
    wordInput.value = "";
    wordInput.style.display = "inline-block";
    wordInput.disabled = false;
    wordInput.focus();
    nextQuestionNumbers();
  } else {
    wordsCountForGame = 1;
    numberInput.value = "";
    numberInput.style.display = "inline-block";
    numberInput.disabled = false;
    numberInput.focus();
    nextQuestionWords();
  }
}

/**
 * Generate a random number for "DA NUMERI" mode and display it.
 */
function nextQuestionNumbers() {
  const min = (digitsForNumbers === 1) ? 0 : Math.pow(10, digitsForNumbers - 1);
  const max = Math.pow(10, digitsForNumbers) - 1;
  const rnd = Math.floor(Math.random() * (max - min + 1)) + min;
  currentNumber = rnd.toString();
  boxElement.style.display = "block";
  boxElement.textContent = currentNumber;
}

/**
 * Check user answer for "DA NUMERI" mode.
 */
function checkNumbersAnswer() {
  if (isGameOver) return;
  const userAnswer = wordInput.value.trim().toLowerCase();
  const wordsArray = userAnswer.split(/\s+/);
  const convertedValue = convertWord(userAnswer);

  const onlyExistingWords = verifyWordsCheck.checked;
  let isExistingWord = true;

  if (onlyExistingWords) {
    // Validate each typed word in bigDictionary
    isExistingWord = wordsArray.every((w) =>
      Object.values(bigDictionary).some((list) => list.includes(w))
    );
  }

  if (convertedValue === currentNumber) {
    // Possibly correct
    if (onlyExistingWords && !isExistingWord) {
      // The phonetic match is correct, but the words are not in dictionary
      gameContainer.classList.add("incorrect");
      setTimeout(() => gameContainer.classList.remove("incorrect"), 500);
      updateScoreboard(currentNumber, userAnswer, false, true);
      wordInput.value = "";
      return;
    }
    // Fully correct
    gameContainer.classList.add("correct");
    setTimeout(() => gameContainer.classList.remove("correct"), 500);
    updateScoreboard(currentNumber, userAnswer, true, false);
    correctCount++;
    if (correctCount % 3 === 0) {
      digitsForNumbers++;
    }
    nextQuestionNumbers();
  } else {
    // Incorrect
    gameContainer.classList.add("incorrect");
    setTimeout(() => gameContainer.classList.remove("incorrect"), 500);
    updateScoreboard(currentNumber, userAnswer, false, false);
  }
  wordInput.value = "";
}

/**
 * Generate a random number string with given digit length.
 */
function generateRandomNumberString(digits) {
  if (digits === 1) {
    return Math.floor(Math.random() * 10).toString();
  } else {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const rnd = Math.floor(Math.random() * (max - min + 1)) + min;
    return rnd.toString();
  }
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Attempt to split a numberStr into segmentCount parts, each found in smallDictionary.
 */
function trySplitNumberIntoWordsSmall(numberStr, segmentCount) {
  if (segmentCount === 1) {
    if (smallDictionary[numberStr]) {
      const arr = smallDictionary[numberStr];
      const randomWord = arr[Math.floor(Math.random() * arr.length)];
      return [randomWord];
    } else {
      return null;
    }
  }
  for (let cut = 1; cut < numberStr.length; cut++) {
    const firstPart = numberStr.slice(0, cut);
    const remainder = numberStr.slice(cut);
    if (smallDictionary[firstPart]) {
      const partial = trySplitNumberIntoWordsSmall(remainder, segmentCount - 1);
      if (partial) {
        const arr = smallDictionary[firstPart];
        const randomWord = arr[Math.floor(Math.random() * arr.length)];
        return [randomWord, ...partial];
      }
    }
  }
  return null;
}

/**
 * Generate the next question in "DA PAROLE" mode.
 */
function nextQuestionWords() {
  if (Object.keys(smallDictionary).length === 0) {
    boxElement.textContent = "smallDictionary vuoto! Impossibile giocare.";
    return;
  }

  const possibleSegments = Array.from({ length: wordsCountForGame }, (_, i) => i + 1);
  const maxAttempts = 30;
  let foundWordCombo = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomNumStr = generateRandomNumberString(wordsCountForGame);
    shuffleArray(possibleSegments);

    for (const segCount of possibleSegments) {
      const splitted = trySplitNumberIntoWordsSmall(randomNumStr, segCount);
      if (splitted) {
        foundWordCombo = splitted;
        break;
      }
    }
    if (foundWordCombo) break;
  }

  if (!foundWordCombo) {
    console.warn("Could not find any word combination for digits =", wordsCountForGame);
    boxElement.style.display = "block";
    boxElement.textContent = "Nessuna combinazione trovata!";
    return;
  }

  currentWordsArray = foundWordCombo;
  boxElement.style.display = "block";
  boxElement.textContent = currentWordsArray.join(" ");
}

/**
 * Check the user's answer for "DA PAROLE" mode.
 */
function checkWordsAnswer() {
  if (isGameOver) return;
  const userNumber = numberInput.value.trim();
  const joinedWords = currentWordsArray.join(" ");
  const correctNumber = convertWord(joinedWords);

  if (userNumber === correctNumber) {
    gameContainer.classList.add("correct");
    setTimeout(() => gameContainer.classList.remove("correct"), 500);
    updateScoreboard(joinedWords, userNumber, true, false);
    correctCount++;
    if (correctCount % 3 === 0) {
      wordsCountForGame++;
    }
    nextQuestionWords();
  } else {
    gameContainer.classList.add("incorrect");
    setTimeout(() => gameContainer.classList.remove("incorrect"), 500);
    updateScoreboard(joinedWords, userNumber, false, false);
  }
  numberInput.value = "";
}

/**
 * Convert a string to its numeric code using phonetic rules.
 */
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
      const regex = new RegExp(phonetic, "g");
      word = word.replace(regex, entry.number);
    });
  });
  VOWELS.forEach((v) => {
    const rg = new RegExp(v, "g");
    word = word.replace(rg, "");
  });
  word = word.replace(/[^0-9]/g, "");
  return (word === "") ? "99999999" : word;
}

function getDictionaryIndex(dictionarySource) {
  const cached = dictionaryIndexCache.get(dictionarySource);
  if (cached) {
    return cached;
  }

  const keySet = new Set();
  const prefixSet = new Set();
  let maxKeyLength = 0;

  Object.keys(dictionarySource).forEach((key) => {
    if (!key) return;

    keySet.add(key);
    if (key.length > maxKeyLength) {
      maxKeyLength = key.length;
    }

    for (let i = 1; i <= key.length; i++) {
      prefixSet.add(key.slice(0, i));
    }
  });

  const indexData = { keySet, prefixSet, maxKeyLength };
  dictionaryIndexCache.set(dictionarySource, indexData);
  return indexData;
}

function numberToWordPaths(number, dictionarySource) {
  const { keySet, prefixSet, maxKeyLength } = getDictionaryIndex(dictionarySource);
  const paths = [];
  const currentParts = [];

  function dfs(startIndex) {
    if (startIndex === number.length) {
      paths.push({
        parts: [...currentParts],
        wordsByPart: currentParts.map((part) => dictionarySource[part] || [])
      });
      return;
    }

    let fragment = "";
    const maxEnd = Math.min(number.length, startIndex + maxKeyLength);
    for (let end = startIndex + 1; end <= maxEnd; end++) {
      fragment += number[end - 1];

      if (!prefixSet.has(fragment)) {
        break;
      }

      if (!keySet.has(fragment)) {
        continue;
      }

      currentParts.push(fragment);
      dfs(end);
      currentParts.pop();
    }
  }

  dfs(0);

  paths.sort((a, b) => a.parts.length - b.parts.length);
  return paths;
}

function createLabGraphEngine(number, dictionarySource) {
  const { keySet, prefixSet, maxKeyLength } = getDictionaryIndex(dictionarySource);
  const canFinishMemo = new Map();
  const minPartsMemo = new Map();

  function canFinishFrom(startIndex) {
    if (canFinishMemo.has(startIndex)) {
      return canFinishMemo.get(startIndex);
    }

    if (startIndex === number.length) {
      canFinishMemo.set(startIndex, true);
      return true;
    }

    let fragment = "";
    const maxEnd = Math.min(number.length, startIndex + maxKeyLength);
    for (let end = startIndex + 1; end <= maxEnd; end++) {
      fragment += number[end - 1];

      if (!prefixSet.has(fragment)) {
        break;
      }

      if (!keySet.has(fragment)) {
        continue;
      }

      if (canFinishFrom(end)) {
        canFinishMemo.set(startIndex, true);
        return true;
      }
    }

    canFinishMemo.set(startIndex, false);
    return false;
  }

  function minPartsFrom(startIndex) {
    if (minPartsMemo.has(startIndex)) {
      return minPartsMemo.get(startIndex);
    }

    if (startIndex === number.length) {
      minPartsMemo.set(startIndex, 0);
      return 0;
    }

    let best = Infinity;
    let fragment = "";
    const maxEnd = Math.min(number.length, startIndex + maxKeyLength);
    for (let end = startIndex + 1; end <= maxEnd; end++) {
      fragment += number[end - 1];

      if (!prefixSet.has(fragment)) {
        break;
      }

      if (!keySet.has(fragment)) {
        continue;
      }

      const tail = minPartsFrom(end);
      if (tail !== Infinity) {
        best = Math.min(best, 1 + tail);
      }
    }

    minPartsMemo.set(startIndex, best);
    return best;
  }

  function getCandidates(startIndex) {
    const candidates = [];
    let fragment = "";
    const maxEnd = Math.min(number.length, startIndex + maxKeyLength);

    for (let end = startIndex + 1; end <= maxEnd; end++) {
      fragment += number[end - 1];

      if (!prefixSet.has(fragment)) {
        break;
      }

      if (!keySet.has(fragment)) {
        continue;
      }

      if (!canFinishFrom(end)) {
        continue;
      }

      const minRemaining = minPartsFrom(end);
      const words = dictionarySource[fragment] || [];
      words.forEach((word) => {
        candidates.push({
          part: fragment,
          word,
          nextIndex: end,
          minTotalParts: minRemaining === Infinity ? Infinity : 1 + minRemaining
        });
      });
    }

    candidates.sort((a, b) => {
      if (a.minTotalParts !== b.minTotalParts) return a.minTotalParts - b.minTotalParts;
      if (a.part.length !== b.part.length) return b.part.length - a.part.length;
      return a.word.localeCompare(b.word, "it");
    });

    return candidates;
  }

  return { canFinishFrom, minPartsFrom, getCandidates };
}

function buildTableRowsFromPaths(paths) {
  return paths.map((path) => path.wordsByPart.map((words) => words.join(", ")));
}

function renderLabWordNumberResult(sourceText, number, warningText) {
  labModeHint.textContent = `Modalita parole -> numeri. Input: ${sourceText}`;

  const warningHtml = warningText
    ? `<p class="lab-conversion-warning">${escapeHtml(warningText)}</p>`
    : "";

  labResultContainer.innerHTML = `
    <div class="lab-result-number-wrap">
      <div class="lab-result-title">Numero</div>
      <div class="lab-result-big-number">${escapeHtml(number)}</div>
      ${warningHtml}
    </div>
  `;
}

function renderLabNoCombinations(number, dictionaryLabel) {
  labModeHint.textContent = `Modalita numeri -> parole (${dictionaryLabel}). Nessuna combinazione per ${number}.`;
  labResultContainer.innerHTML = `
    <div class="lab-result-empty">
      Nessuna combinazione trovata per <strong>${escapeHtml(number)}</strong> usando il ${escapeHtml(dictionaryLabel)}.
    </div>
  `;
}

function renderLabNumberWordsResult(number, paths, dictionaryLabel, dictionarySource, options = {}) {
  const forceGraphOnly = Boolean(options.forceGraphOnly);
  const rows = forceGraphOnly ? [] : buildTableRowsFromPaths(paths);
  const graphEngine = createLabGraphEngine(number, dictionarySource);
  const graphState = {
    selectedParts: [],
    selectedWords: [],
    currentIndex: 0
  };

  const graphOnlyMessage = forceGraphOnly
    ? ` Numero lungo (${number.length} cifre): usa la modalita grafo.`
    : "";
  labModeHint.textContent = `Modalita numeri -> parole (${dictionaryLabel}).${graphOnlyMessage}`;

  const viewToggleHtml = forceGraphOnly
    ? `<div class="lab-result-view-toggle"><button type="button" class="lab-result-mode-btn active" data-view-mode="graph">Modalita grafo</button></div>`
    : `<div class="lab-result-view-toggle">
          <button type="button" class="lab-result-mode-btn active" data-view-mode="graph">Modalita grafo</button>
          <button type="button" class="lab-result-mode-btn" data-view-mode="table">Tabella</button>
        </div>`;

  labResultContainer.innerHTML = `
    <div class="lab-result-table-wrap">
      <div class="lab-result-head">
        <div class="lab-result-title">Parole per ${escapeHtml(number)} (${escapeHtml(dictionaryLabel)})</div>
        ${viewToggleHtml}
      </div>
      <div id="lab-number-words-view"></div>
    </div>
  `;

  const viewNode = labResultContainer.querySelector("#lab-number-words-view");
  const tableBtn = labResultContainer.querySelector('[data-view-mode="table"]');
  const graphBtn = labResultContainer.querySelector('[data-view-mode="graph"]');
  const initialMode = "graph";

  function setActiveMode(mode) {
    const tableActive = mode === "table";
    if (tableBtn) {
      tableBtn.classList.toggle("active", tableActive);
    }
    if (graphBtn) {
      graphBtn.classList.toggle("active", !tableActive);
    }
    if (!forceGraphOnly) {
      localStorage.setItem(NUMBER_WORDS_VIEW_MODE_KEY, tableActive ? "table" : "graph");
    }
  }

  function renderTableView() {
    setActiveMode("table");
    const FIRST_COLUMN_ROWS_PER_PAGE = 5;

    function buildFirstColumnGroups(rowsForGrouping) {
      const groups = [];
      let index = 0;

      while (index < rowsForGrouping.length) {
        const value = rowsForGrouping[index][0];
        let end = index + 1;
        while (end < rowsForGrouping.length && rowsForGrouping[end][0] === value) {
          end++;
        }
        groups.push({ start: index, end });
        index = end;
      }

      return groups;
    }

    function renderMergedTable(rowsForTable, columnCount) {
      const rowCount = rowsForTable.length;
      const hiddenCells = Array.from({ length: rowCount }, () => Array(columnCount).fill(false));
      const rowSpans = Array.from({ length: rowCount }, () => Array(columnCount).fill(1));

      for (let col = 0; col < columnCount; col++) {
        for (let row = 0; row < rowCount; row++) {
          if (hiddenCells[row][col]) continue;

          const value = rowsForTable[row][col];
          if (value === "--") continue;

          let span = 1;
          for (let next = row + 1; next < rowCount; next++) {
            if (rowsForTable[next][col] !== value) break;

            let samePrefix = true;
            for (let prevCol = 0; prevCol < col; prevCol++) {
              if (rowsForTable[next][prevCol] !== rowsForTable[row][prevCol]) {
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

      return rowsForTable.map((row, rowIndex) => {
        let cellsHtml = "";

        for (let col = 0; col < columnCount; col++) {
          if (hiddenCells[rowIndex][col]) continue;

          const cellValue = row[col];
          const span = rowSpans[rowIndex][col];
          const spanAttr = span > 1 ? ` rowspan="${span}"` : "";
          cellsHtml += `<td${spanAttr}>${escapeHtml(cellValue)}</td>`;
        }

        return `<tr>${cellsHtml}</tr>`;
      }).join("");
    }

    const firstColumnGroups = buildFirstColumnGroups(rows);
    const totalGroupCount = firstColumnGroups.length;
    const totalPages = Math.max(1, Math.ceil(totalGroupCount / FIRST_COLUMN_ROWS_PER_PAGE));
    let currentPage = 0;

    function renderTablePage(pageIndex) {
      currentPage = Math.min(Math.max(pageIndex, 0), totalPages - 1);

      const groupStartIndex = currentPage * FIRST_COLUMN_ROWS_PER_PAGE;
      const groupEndIndexExclusive = Math.min(groupStartIndex + FIRST_COLUMN_ROWS_PER_PAGE, totalGroupCount);

      const firstRowIndex = firstColumnGroups[groupStartIndex].start;
      const lastRowIndexExclusive = firstColumnGroups[groupEndIndexExclusive - 1].end;
      const pageRowsRaw = rows.slice(firstRowIndex, lastRowIndexExclusive);
      let pageMaxLen = 0;
      pageRowsRaw.forEach((row) => {
        if (row.length > pageMaxLen) pageMaxLen = row.length;
      });

      const pageRows = pageRowsRaw.map((row) => {
        const clone = [...row];
        while (clone.length < pageMaxLen) {
          clone.push("--");
        }
        return clone;
      });

      const headers = Array.from({ length: pageMaxLen }, (_, i) => `<th>Parte ${i + 1}</th>`).join("");
      const body = renderMergedTable(pageRows, pageMaxLen);

      const shownStart = groupStartIndex + 1;
      const shownEnd = groupEndIndexExclusive;

      viewNode.innerHTML = `
        <div class="lab-table-scroll">
          <table class="lab-result-table">
            <thead><tr>${headers}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        <div class="lab-table-pagination">
          <button type="button" class="lab-table-page-btn" id="lab-table-prev" ${currentPage === 0 ? "disabled" : ""}>Indietro</button>
          <div class="lab-table-page-info">Righe prima colonna ${shownStart}-${shownEnd} di ${totalGroupCount}</div>
          <button type="button" class="lab-table-page-btn" id="lab-table-next" ${currentPage >= totalPages - 1 ? "disabled" : ""}>Avanti</button>
        </div>
      `;

      const prevBtn = viewNode.querySelector("#lab-table-prev");
      const nextBtn = viewNode.querySelector("#lab-table-next");

      if (prevBtn) {
        prevBtn.addEventListener("click", () => renderTablePage(currentPage - 1));
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", () => renderTablePage(currentPage + 1));
      }
    }

    renderTablePage(0);
  }

  function renderGraphView() {
    setActiveMode("graph");

    const isCompleted = graphState.currentIndex === number.length;
    const candidates = graphEngine.getCandidates(graphState.currentIndex);

    function getIndexAfterStep(stepIndex) {
      let index = 0;
      for (let i = 0; i <= stepIndex; i++) {
        index += graphState.selectedParts[i].length;
      }
      return index;
    }

    const selectedHtml = graphState.selectedWords.length === 0
      ? `<div class="lab-graph-selected-placeholder">Seleziona una prima parola dal grafo.</div>`
      : graphState.selectedWords.map((word, index) => `
          <div class="lab-graph-selected-step">
            <button
              type="button"
              class="lab-graph-node lab-graph-node-selected lab-graph-node-selected-jump"
              data-selected-index="${index}"
              title="Torna a questo punto"
            >
              <span class="lab-graph-node-dot"></span>
              <span>${escapeHtml(word)}</span>
              <span class="lab-graph-node-part">${escapeHtml(graphState.selectedParts[index])}</span>
            </button>
            ${index < graphState.selectedWords.length - 1 ? '<div class="lab-graph-step-line"></div>' : ""}
          </div>
        `).join("");

    const candidatesHtml = candidates.length === 0
      ? `<div class="lab-graph-end">Nessun nodo successivo disponibile.</div>`
      : candidates.map((candidate) => `
          <div class="lab-graph-candidate-row">
            <button
              type="button"
              class="lab-graph-node lab-graph-node-candidate"
              data-next-part="${escapeHtml(candidate.part)}"
              data-next-word="${escapeHtml(candidate.word)}"
            >
              <span class="lab-graph-node-dot"></span>
              <span>${escapeHtml(candidate.word)}</span>
              <span class="lab-graph-node-part">${escapeHtml(candidate.part)}</span>
            </button>
          </div>
        `).join("");

    const selectedSummary = graphState.selectedWords.map((word) => escapeHtml(word)).join(" -> ");
    const completedHtml = isCompleted
      ? `<div class="lab-graph-complete">Percorso completo: ${selectedSummary || "(vuoto)"}</div>`
      : "";

    viewNode.innerHTML = `
      <div class="lab-graph-panel">
        <div class="lab-graph-controls">
          <button type="button" id="lab-graph-back-btn" class="lab-graph-control-btn" ${graphState.selectedWords.length ? "" : "disabled"}>Indietro</button>
          <button type="button" id="lab-graph-reset-btn" class="lab-graph-control-btn" ${graphState.selectedWords.length ? "" : "disabled"}>Ricomincia</button>
        </div>
        <div class="lab-graph-stage">
          <div class="lab-graph-selected-track">${selectedHtml}</div>
          ${graphState.selectedWords.length ? '<div class="lab-graph-bridge"></div>' : ""}
          <div class="lab-graph-branch">${candidatesHtml}</div>
        </div>
        ${completedHtml}
      </div>
    `;

    const backBtn = viewNode.querySelector("#lab-graph-back-btn");
    const resetBtn = viewNode.querySelector("#lab-graph-reset-btn");

    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (graphState.selectedWords.length > 0) {
          const removedPart = graphState.selectedParts[graphState.selectedParts.length - 1];
          graphState.selectedWords.pop();
          graphState.selectedParts.pop();
          graphState.currentIndex -= removedPart.length;
          renderGraphView();
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        graphState.selectedWords = [];
        graphState.selectedParts = [];
        graphState.currentIndex = 0;
        renderGraphView();
      });
    }

    viewNode.querySelectorAll(".lab-graph-node-candidate").forEach((button) => {
      button.addEventListener("click", () => {
        const nextPart = button.dataset.nextPart;
        const nextWord = button.dataset.nextWord;
        graphState.selectedParts.push(nextPart);
        graphState.selectedWords.push(nextWord);
        graphState.currentIndex += nextPart.length;
        renderGraphView();
      });
    });

    viewNode.querySelectorAll(".lab-graph-node-selected-jump").forEach((button) => {
      button.addEventListener("click", () => {
        const selectedIndex = Number(button.dataset.selectedIndex);
        if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
          return;
        }

        graphState.selectedParts = graphState.selectedParts.slice(0, selectedIndex + 1);
        graphState.selectedWords = graphState.selectedWords.slice(0, selectedIndex + 1);
        graphState.currentIndex = getIndexAfterStep(selectedIndex);
        renderGraphView();
      });
    });
  }

  if (!forceGraphOnly && tableBtn) {
    tableBtn.addEventListener("click", renderTableView);
  }
  if (graphBtn) {
    graphBtn.addEventListener("click", renderGraphView);
  }

  if (forceGraphOnly || initialMode === "graph") {
    renderGraphView();
  } else {
    renderTableView();
  }
}

function runLabConversion() {
  const cleanInput = sanitizeInput(labUnifiedInput.value);

  if (!cleanInput) {
    labResultContainer.innerHTML = "";
    labModeHint.textContent = LAB_DEFAULT_HINT;
    return;
  }

  const compact = cleanInput.replace(/\s+/g, "");

  if (/^\d+$/.test(compact)) {
    if (compact.length > LAB_MAX_INPUT_DIGITS) {
      labResultContainer.innerHTML = "";
      labModeHint.textContent = `Numero troppo lungo (${compact.length} cifre). Massimo consigliato: ${LAB_MAX_INPUT_DIGITS}.`;
      return;
    }

    const dictionaryForNumbers = getNumberToWordsDictionary();
    const dictionaryLabel = getNumberToWordsDictionaryLabel();

    if (compact.length > LAB_FORCE_GRAPH_AFTER_DIGITS) {
      const graphEngine = createLabGraphEngine(compact, dictionaryForNumbers);
      if (!graphEngine.canFinishFrom(0)) {
        renderLabNoCombinations(compact, dictionaryLabel);
      } else {
        renderLabNumberWordsResult(compact, [], dictionaryLabel, dictionaryForNumbers, { forceGraphOnly: true });
      }
      return;
    }

    const paths = numberToWordPaths(compact, dictionaryForNumbers);
    if (paths.length === 0) {
      renderLabNoCombinations(compact, dictionaryLabel);
    } else {
      renderLabNumberWordsResult(compact, paths, dictionaryLabel, dictionaryForNumbers);
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

    const missingWords = words.filter((word) => !wordsLookupSet.has(word));
    if (missingWords.length > 0) {
      warning = `Parole non trovate nel dizionario: ${missingWords.join(", ")}`;
    }
  }

  renderLabWordNumberResult(cleanInput, numberResult, warning);
}

/**
 * Update scoreboard with user attempt.
 */
function updateScoreboard(correctValue, userValue, isCorrect, notExistingWord) {
  if (resultContainer.style.display === "none") {
    resultContainer.style.display = "block";
  }
  const p = document.createElement("p");
  if (isCorrect) {
    p.innerHTML = `
      <strong style="color: green;">✅</strong>
      <strong>${correctValue}</strong>
      ➜ <strong>${userValue}</strong>
    `;
  } else {
    if (!notExistingWord) {
      p.innerHTML = `
        <strong style="color:red;">❌</strong>
        <strong>${correctValue}</strong>
        ➜ <strong>${userValue}</strong>
      `;
    } else {
      p.innerHTML = `
        <strong style="color:red;">⁉️</strong>
        <strong>${correctValue}</strong>
        ➜ <strong>${userValue}</strong>
      `;
    }
  }
  resultContainer.prepend(p);
}

/**
 * End the game and show the final result.
 */
function endGame() {
  isGameOver = true;
  clearInterval(timerInterval);
  timerInterval = null;
  timerElement.style.display = "none";

  wordInput.disabled = true;
  wordInput.style.display = "none";
  numberInput.disabled = true;
  numberInput.style.display = "none";

  startButton.style.display = "inline-block";
  startButton.disabled = false;

  boxElement.style.display = "none";

  infoText.style.display = "block";
  infoText.innerHTML = `Tempo scaduto! Hai totalizzato ${correctCount} punti.`;

  const shareBtn = document.createElement("button");
  shareBtn.id = "share-button";
  shareBtn.textContent = "Condividi il risultato";
  shareBtn.classList.add("share-button");
  shareBtn.onclick = shareResult;
  gameContainer.appendChild(shareBtn);
}

/**
 * Share the final result or copy to clipboard if no Web Share API
 */
function shareResult() {
  const paragraphs = resultContainer.querySelectorAll("p");
  let textContent = "";
  paragraphs.forEach((p) => {
    textContent += p.innerText + "\n";
  });

  const gameUrl = `${window.location.origin}/Converti/`;

  const finalText = `Ho totalizzato ${correctCount} punti giocando a \n🔢 CONVERTI 🔡!

Ecco il mio resoconto:
${textContent}

Mettiti alla prova con la conversione fonetica:
${gameUrl}
`;

  if (navigator.share) {
    navigator.share({ text: finalText })
      .catch((err) => console.error("Share canceled:", err));
  } else {
    navigator.clipboard.writeText(finalText)
      .then(() => showCustomAlert("Testo copiato negli appunti!"))
      .catch((err) => console.error("Clipboard error:", err));
  }
}

/**
 * Show a brief toast message.
 */
function showCustomAlert(msg) {
  customAlert.innerText = msg;
  customAlert.style.display = "block";
  setTimeout(() => {
    customAlert.style.display = "none";
  }, 2000);
}
