// Live Speech Translator — client-side only.
// Speech-to-text & text-to-speech: Web Speech API. Translation: MyMemory free API.

const LANGUAGES = [
  { speech: "en-US", code: "en", name: "English" },
  { speech: "vi-VN", code: "vi", name: "Vietnamese (Tiếng Việt)" },
  { speech: "ko-KR", code: "ko", name: "Korean" },
  { speech: "zh-CN", code: "zh-CN", name: "Chinese (Mandarin)" },
  { speech: "ru-RU", code: "ru", name: "Russian" },
  { speech: "ja-JP", code: "ja", name: "Japanese" },
  { speech: "fr-FR", code: "fr", name: "French" },
  { speech: "de-DE", code: "de", name: "German" },
  { speech: "es-ES", code: "es", name: "Spanish" },
  { speech: "th-TH", code: "th", name: "Thai" },
  { speech: "id-ID", code: "id", name: "Indonesian" },
  { speech: "hi-IN", code: "hi", name: "Hindi" },
  { speech: "it-IT", code: "it", name: "Italian" },
  { speech: "pt-PT", code: "pt", name: "Portuguese" },
  { speech: "nl-NL", code: "nl", name: "Dutch" },
  { speech: "ar-SA", code: "ar", name: "Arabic" },
];

const langBySpeech = (speech) => LANGUAGES.find((l) => l.speech === speech) || LANGUAGES[0];
const iso = (speech) => langBySpeech(speech).code;

const DEFAULTS = {
  sourceLang: "en-US",
  targetLang: "vi-VN",
  autoSpeak: true,
  autoRestart: true,
  speechRate: 1,
  email: "",
};

let settings = loadSettings();
let history = loadHistory();

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("lst_settings"));
    return { ...DEFAULTS, ...(saved || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveSettings() {
  localStorage.setItem("lst_settings", JSON.stringify(settings));
}
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("lst_history")) || [];
  } catch {
    return [];
  }
}
function saveHistory() {
  localStorage.setItem("lst_history", JSON.stringify(history.slice(0, 50)));
}

// ---------- DOM refs ----------
const $ = (id) => document.getElementById(id);
const sourceLangSel = $("sourceLang");
const targetLangSel = $("targetLang");
const swapLangBtn = $("swapLangBtn");
const banner = $("banner");

const modeTabs = document.querySelectorAll(".mode-tab");
const singleMode = $("singleMode");
const conversationMode = $("conversationMode");

const micBtn = $("micBtn");
const micStatus = $("micStatus");
const singleOriginal = $("singleOriginal");
const singleTranslated = $("singleTranslated");
const singleSrcLangLabel = $("singleSrcLangLabel");
const singleTgtLangLabel = $("singleTgtLangLabel");
const singleReplayBtn = $("singleReplayBtn");
const singleCopyBtn = $("singleCopyBtn");

const sourceMicBtn = $("sourceMicBtn");
const targetMicBtn = $("targetMicBtn");
const convoSourceText = $("convoSourceText");
const convoTargetText = $("convoTargetText");
const convoSourceLabel = $("convoSourceLabel");
const convoTargetLabel = $("convoTargetLabel");
const flipToggle = $("flipToggle");
const targetCard = $("targetCard");

const manualToggle = $("manualToggle");
const manualBody = $("manualBody");
const manualChevron = $("manualChevron");
const manualInput = $("manualInput");
const manualTranslateBtn = $("manualTranslateBtn");

const historyList = $("historyList");
const clearHistoryBtn = $("clearHistoryBtn");

const settingsBtn = $("settingsBtn");
const closeSettingsBtn = $("closeSettingsBtn");
const settingsDrawer = $("settingsDrawer");
const settingsOverlay = $("settingsOverlay");
const autoSpeakToggle = $("autoSpeakToggle");
const autoRestartToggle = $("autoRestartToggle");
const speechRateRange = $("speechRateRange");
const speechRateValue = $("speechRateValue");
const emailField = $("emailField");
const installBtn = $("installBtn");

let lastTranslatedText = "";
let lastTranslatedLang = settings.targetLang;

// ---------- Populate language selects ----------
function populateLangSelects() {
  [sourceLangSel, targetLangSel].forEach((sel) => {
    sel.innerHTML = "";
    LANGUAGES.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.speech;
      opt.textContent = l.name;
      sel.appendChild(opt);
    });
  });
  sourceLangSel.value = settings.sourceLang;
  targetLangSel.value = settings.targetLang;
  updateLangLabels();
}

function updateLangLabels() {
  singleSrcLangLabel.textContent = `(${langBySpeech(settings.sourceLang).name})`;
  singleTgtLangLabel.textContent = `(${langBySpeech(settings.targetLang).name})`;
  convoSourceLabel.textContent = `You — ${langBySpeech(settings.sourceLang).name}`;
  convoTargetLabel.textContent = `Them — ${langBySpeech(settings.targetLang).name}`;
}

sourceLangSel.addEventListener("change", () => {
  settings.sourceLang = sourceLangSel.value;
  saveSettings();
  updateLangLabels();
});
targetLangSel.addEventListener("change", () => {
  settings.targetLang = targetLangSel.value;
  saveSettings();
  updateLangLabels();
});
swapLangBtn.addEventListener("click", () => {
  [settings.sourceLang, settings.targetLang] = [settings.targetLang, settings.sourceLang];
  sourceLangSel.value = settings.sourceLang;
  targetLangSel.value = settings.targetLang;
  saveSettings();
  updateLangLabels();
});

document.querySelectorAll(".preset-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    settings.sourceLang = chip.dataset.src;
    settings.targetLang = chip.dataset.tgt;
    sourceLangSel.value = settings.sourceLang;
    targetLangSel.value = settings.targetLang;
    saveSettings();
    updateLangLabels();
    document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
  });
});

// ---------- Mode tabs ----------
modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    modeTabs.forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
    stopListening();
    if (tab.dataset.mode === "single") {
      singleMode.classList.remove("hidden");
      conversationMode.classList.add("hidden");
    } else {
      singleMode.classList.add("hidden");
      conversationMode.classList.remove("hidden");
    }
  });
});

flipToggle.addEventListener("click", () => targetCard.classList.toggle("flipped"));

// ---------- Banner ----------
let bannerTimeout;
function showBanner(msg, type = "error") {
  banner.textContent = msg;
  banner.className = `banner ${type === "info" ? "info" : ""}`;
  banner.classList.remove("hidden");
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => banner.classList.add("hidden"), 6000);
}

// ---------- Speech recognition ----------
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
const supportsRecognition = !!SpeechRecognitionCtor;
const supportsSynthesis = "speechSynthesis" in window;

let recognition = null;
let activeButton = null; // which mic button is currently active
let activeSide = null; // 'single' | 'source' | 'target'
let manualStop = false;

if (!supportsRecognition) {
  showBanner(
    "Speech recognition isn't supported in this browser. Use Chrome, Edge, or Safari on iOS — or type below.",
    "info"
  );
  micBtn.disabled = true;
  sourceMicBtn.disabled = true;
  targetMicBtn.disabled = true;
}

function buildRecognition(speechLang) {
  const rec = new SpeechRecognitionCtor();
  rec.lang = speechLang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  return rec;
}

function setMicUI(button, listening) {
  if (!button) return;
  button.classList.toggle("listening", listening);
}

function stopListening() {
  manualStop = true;
  if (recognition) {
    try {
      recognition.stop();
    } catch {
      /* already stopped */
    }
  }
  setMicUI(activeButton, false);
  micStatus.textContent = "Tap to speak";
  activeButton = null;
  activeSide = null;
}

function startListening(side, button, speechLang) {
  if (!supportsRecognition) return;

  if (activeSide === side) {
    stopListening();
    return;
  }
  stopListening();
  manualStop = false;

  recognition = buildRecognition(speechLang);
  activeButton = button;
  activeSide = side;
  setMicUI(button, true);
  micStatus.textContent = "Listening…";

  let interimBuffer = "";

  recognition.onresult = (event) => {
    let finalChunk = "";
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalChunk += transcript;
      } else {
        interim += transcript;
      }
    }
    if (interim) {
      interimBuffer = interim;
      showOriginal(side, interimBuffer, true);
    }
    if (finalChunk.trim()) {
      interimBuffer = "";
      showOriginal(side, finalChunk.trim(), false);
      handleUtterance(side, finalChunk.trim());
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "no-speech") return;
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      showBanner("Microphone access was blocked. Allow microphone permission in your browser settings.");
      manualStop = true;
    } else if (event.error === "network") {
      showBanner("Network error — speech recognition needs an internet connection.");
    } else {
      showBanner(`Speech recognition error: ${event.error}`);
    }
  };

  recognition.onend = () => {
    if (!manualStop && settings.autoRestart && activeSide === side) {
      try {
        recognition.start();
        return;
      } catch {
        /* fall through to stopped state */
      }
    }
    setMicUI(button, false);
    micStatus.textContent = "Tap to speak";
    if (activeSide === side) activeSide = null;
  };

  try {
    recognition.start();
  } catch (err) {
    showBanner("Could not start microphone: " + err.message);
  }
}

function showOriginal(side, text, isInterim) {
  const target =
    side === "single" ? singleOriginal : side === "source" ? convoSourceText : convoTargetText;
  target.textContent = text;
  target.classList.toggle("placeholder", false);
  target.style.opacity = isInterim ? 0.6 : 1;
}

micBtn.addEventListener("click", () => startListening("single", micBtn, settings.sourceLang));
sourceMicBtn.addEventListener("click", () =>
  startListening("source", sourceMicBtn, settings.sourceLang)
);
targetMicBtn.addEventListener("click", () =>
  startListening("target", targetMicBtn, settings.targetLang)
);

// ---------- Translation ----------
async function translateText(text, fromCode, toCode) {
  const langpair = `${fromCode}|${toCode}`;
  let url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text
  )}&langpair=${encodeURIComponent(langpair)}`;
  if (settings.email) url += `&de=${encodeURIComponent(settings.email)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Translation service unavailable");
  const data = await res.json();
  if (!data || !data.responseData || !data.responseData.translatedText) {
    throw new Error("No translation returned");
  }
  if (data.responseStatus && Number(data.responseStatus) >= 400) {
    throw new Error(data.responseDetails || "Translation failed");
  }
  return data.responseData.translatedText;
}

async function handleUtterance(side, text) {
  const fromSpeech = side === "target" ? settings.targetLang : settings.sourceLang;
  const toSpeech = side === "target" ? settings.sourceLang : settings.targetLang;

  const translatedEl =
    side === "single" ? singleTranslated : side === "source" ? convoTargetText : convoSourceText;

  translatedEl.textContent = "Translating…";
  translatedEl.classList.remove("placeholder");

  try {
    const translated = await translateText(text, iso(fromSpeech), iso(toSpeech));
    translatedEl.textContent = translated;

    lastTranslatedText = translated;
    lastTranslatedLang = toSpeech;

    if (settings.autoSpeak) speak(translated, toSpeech);
    addHistoryEntry({
      original: text,
      translated,
      from: langBySpeech(fromSpeech).name,
      to: langBySpeech(toSpeech).name,
      time: Date.now(),
    });
  } catch (err) {
    translatedEl.textContent = "Translation failed — try again.";
    showBanner("Translation failed: " + err.message);
  }
}

// ---------- Speech synthesis ----------
let voicesCache = [];
function refreshVoices() {
  if (supportsSynthesis) voicesCache = speechSynthesis.getVoices();
}
if (supportsSynthesis) {
  refreshVoices();
  speechSynthesis.onvoiceschanged = refreshVoices;
}

function speak(text, speechLang) {
  if (!supportsSynthesis || !text) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = speechLang;
  utter.rate = settings.speechRate || 1;
  const base = speechLang.split("-")[0];
  const match =
    voicesCache.find((v) => v.lang === speechLang) ||
    voicesCache.find((v) => v.lang.startsWith(base));
  if (match) utter.voice = match;
  speechSynthesis.speak(utter);
}

singleReplayBtn.addEventListener("click", () => speak(lastTranslatedText, lastTranslatedLang));
singleCopyBtn.addEventListener("click", async () => {
  if (!lastTranslatedText) return;
  try {
    await navigator.clipboard.writeText(lastTranslatedText);
    showBanner("Copied to clipboard.", "info");
  } catch {
    showBanner("Could not copy text.");
  }
});

// ---------- Manual fallback ----------
manualToggle.addEventListener("click", () => {
  manualBody.classList.toggle("hidden");
  manualChevron.textContent = manualBody.classList.contains("hidden") ? "▾" : "▴";
});
manualTranslateBtn.addEventListener("click", () => {
  const text = manualInput.value.trim();
  if (!text) return;
  showOriginal("single", text, false);
  handleUtterance("single", text);
  manualInput.value = "";
});
manualInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    manualTranslateBtn.click();
  }
});

// ---------- History ----------
function addHistoryEntry(entry) {
  history.unshift(entry);
  history = history.slice(0, 50);
  saveHistory();
  renderHistory();
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<li class="history-empty">No translations yet — your conversation log will show up here.</li>';
    return;
  }
  historyList.innerHTML = "";
  history.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";
    const time = new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    li.innerHTML = `
      <div class="h-original">🗣️ ${escapeHtml(item.original)} <span style="color:#9ab3b0">(${escapeHtml(item.from)})</span></div>
      <div class="h-translated">➡️ ${escapeHtml(item.translated)} <span style="color:#9ab3b0">(${escapeHtml(item.to)})</span></div>
      <div class="h-time">${time}</div>
    `;
    historyList.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
});

// ---------- Settings drawer ----------
function openSettings() {
  settingsDrawer.classList.remove("hidden");
  settingsOverlay.classList.remove("hidden");
}
function closeSettings() {
  settingsDrawer.classList.add("hidden");
  settingsOverlay.classList.add("hidden");
}
settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);
settingsOverlay.addEventListener("click", closeSettings);

autoSpeakToggle.addEventListener("change", () => {
  settings.autoSpeak = autoSpeakToggle.checked;
  saveSettings();
});
autoRestartToggle.addEventListener("change", () => {
  settings.autoRestart = autoRestartToggle.checked;
  saveSettings();
});
speechRateRange.addEventListener("input", () => {
  settings.speechRate = parseFloat(speechRateRange.value);
  speechRateValue.textContent = `${settings.speechRate.toFixed(1)}×`;
  saveSettings();
});
emailField.addEventListener("change", () => {
  settings.email = emailField.value.trim();
  saveSettings();
});

if (!supportsSynthesis) {
  autoSpeakToggle.checked = false;
  autoSpeakToggle.disabled = true;
}

// ---------- Init ----------
function initSettingsUI() {
  autoSpeakToggle.checked = settings.autoSpeak && supportsSynthesis;
  autoRestartToggle.checked = settings.autoRestart;
  speechRateRange.value = settings.speechRate;
  speechRateValue.textContent = `${Number(settings.speechRate).toFixed(1)}×`;
  emailField.value = settings.email || "";
}

populateLangSelects();
initSettingsUI();
renderHistory();

// ---------- PWA install prompt ----------
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installBtn.classList.remove("hidden");
});
installBtn.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installBtn.classList.add("hidden");
});

// ---------- Service worker (app-shell caching for spotty connections) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* offline caching is a nice-to-have; ignore registration failures */
    });
  });
}
