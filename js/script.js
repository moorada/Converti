let bigDictionary = {};
let smallDictionary = {};

let currentMode = "numbers";
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
const customAlert       = document.getElementById("custom-alert");
const gameContainer     = document.getElementById("game-container");

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

    if (which === "big") {
      bigDictionary = newDict;
      await saveDictionaryToDB("big", bigDictionary);
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
  showContent("numbers");

  verifyWordsCheck.addEventListener("change", () => {
    localStorage.setItem("checkWords", verifyWordsCheck.checked);
  });

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
  const wordVisible = wordInput.style.display !== "none";
  const numberVisible = numberInput.style.display !== "none";
  submitBtn.style.display = (wordVisible || numberVisible) ? "inline-block" : "none";
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

  const gameUrl = `${window.location.origin}/Converti`;

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
