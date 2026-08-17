// Live Speech Translator — client-side only.
// Speech-to-text & text-to-speech: Web Speech API. Translation: MyMemory free API.
//
// Interface: split-screen conversation view. The top card and bottom card each
// have their own independent language and mic — whatever one side says is
// transcribed in its own language and the translation is shown (and spoken)
// on the other side.

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
  topLang: "en-US",
  bottomLang: "vi-VN",
  autoSpeak: true,
  autoRestart: false,
  speechRate: 1,
  email: "",
};

let settings = loadSettings();
let history = loadHistory();

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("lst_settings")) || {};
    // migrate from the older single source/target layout, if present
    if (saved.sourceLang && !saved.topLang) saved.topLang = saved.sourceLang;
    if (saved.targetLang && !saved.bottomLang) saved.bottomLang = saved.targetLang;
    return { ...DEFAULTS, ...saved };
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

const topLangSelect = $("topLangSelect");
const bottomLangSelect = $("bottomLangSelect");
const swapLangBtn = $("swapLangBtn");
const banner = $("banner");

const topCard = $("topCard");
const topMicBtn = $("topMicBtn");
const topMicIcon = $("topMicIcon");
const topMicLabel = $("topMicLabel");
const topMicStatus = $("topMicStatus");
const topText = $("topText");
const topReplayBtn = $("topReplayBtn");
const topCopyBtn = $("topCopyBtn");
const flipToggle = $("flipToggle");

const bottomCard = $("bottomCard");
const bottomMicBtn = $("bottomMicBtn");
const bottomMicIcon = $("bottomMicIcon");
const bottomMicLabel = $("bottomMicLabel");
const bottomMicStatus = $("bottomMicStatus");
const bottomText = $("bottomText");
const bottomReplayBtn = $("bottomReplayBtn");
const bottomCopyBtn = $("bottomCopyBtn");

const manualToggle = $("manualToggle");
const manualBody = $("manualBody");
const manualChevron = $("manualChevron");
const manualInput = $("manualInput");
const manualTranslateBtn = $("manualTranslateBtn");
const manualSideTop = $("manualSideTop");
const manualSideBottom = $("manualSideBottom");

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

let manualSide = "bottom";

// ---------- Populate language selects ----------
function populateLangSelects() {
  [topLangSelect, bottomLangSelect].forEach((sel) => {
    sel.innerHTML = "";
    LANGUAGES.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.speech;
      opt.textContent = l.name;
      sel.appendChild(opt);
    });
  });
  topLangSelect.value = settings.topLang;
  bottomLangSelect.value = settings.bottomLang;
}

topLangSelect.addEventListener("change", () => {
  settings.topLang = topLangSelect.value;
  saveSettings();
});
bottomLangSelect.addEventListener("change", () => {
  settings.bottomLang = bottomLangSelect.value;
  saveSettings();
});
swapLangBtn.addEventListener("click", () => {
  [settings.topLang, settings.bottomLang] = [settings.bottomLang, settings.topLang];
  topLangSelect.value = settings.topLang;
  bottomLangSelect.value = settings.bottomLang;
  saveSettings();
});

document.querySelectorAll(".preset-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    settings.topLang = chip.dataset.top;
    settings.bottomLang = chip.dataset.bottom;
    topLangSelect.value = settings.topLang;
    bottomLangSelect.value = settings.bottomLang;
    saveSettings();
    document.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
  });
});

flipToggle.addEventListener("click", () => topCard.classList.toggle("flipped"));

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
let activeSide = null; // 'top' | 'bottom'
let manualStop = false;

if (!supportsRecognition) {
  showBanner(
    "Speech recognition isn't supported in this browser. Use Chrome, Edge, or Safari on iOS — or type below.",
    "info"
  );
  topMicBtn.disabled = true;
  bottomMicBtn.disabled = true;
}

function buildRecognition(speechLang) {
  const rec = new SpeechRecognitionCtor();
  rec.lang = speechLang;
  // Single utterance per tap: the browser auto-detects when the speaker
  // pauses and stops listening on its own — no second tap needed to stop.
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  return rec;
}

// 'idle' | 'listening' | 'translating', per side — drives button label/icon,
// status text, and whether the button is tappable.
const sideState = { top: "idle", bottom: "idle" };

function setSideUI(side, state) {
  sideState[side] = state;
  const btn = side === "top" ? topMicBtn : bottomMicBtn;
  const icon = side === "top" ? topMicIcon : bottomMicIcon;
  const label = side === "top" ? topMicLabel : bottomMicLabel;
  const status = side === "top" ? topMicStatus : bottomMicStatus;
  const card = side === "top" ? topCard : bottomCard;

  btn.classList.toggle("listening", state === "listening");
  card.classList.toggle("listening", state === "listening");
  btn.disabled = state === "translating";

  if (state === "listening") {
    icon.textContent = "⏺️";
    label.textContent = "Listening…";
    status.textContent = "Speak now — stops automatically when you pause";
  } else if (state === "translating") {
    icon.textContent = "⏳";
    label.textContent = "Translating…";
    status.textContent = "Translating your sentence…";
  } else {
    icon.textContent = "🎤";
    label.textContent = "Speak Now";
    status.textContent = "Tap to talk";
  }
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
  if (activeSide) setSideUI(activeSide, "idle");
  activeSide = null;
}

function startListening(side, speechLang) {
  if (!supportsRecognition) return;

  if (activeSide === side) {
    stopListening();
    return;
  }
  stopListening();
  manualStop = false;

  recognition = buildRecognition(speechLang);
  activeSide = side;
  setSideUI(side, "listening");

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
    if (interim) showOwnText(side, interim, true);
    if (finalChunk.trim()) {
      const text = finalChunk.trim();
      showOwnText(side, text, false);
      setSideUI(side, "translating");
      handleUtterance(side, text);
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
        setSideUI(side, "listening");
        return;
      } catch {
        /* fall through to idle state */
      }
    }
    if (activeSide === side) activeSide = null;
    // Don't clobber a still-in-flight translation's UI state.
    if (sideState[side] !== "translating") setSideUI(side, "idle");
  };

  try {
    recognition.start();
  } catch (err) {
    showBanner("Could not start microphone: " + err.message);
    setSideUI(side, "idle");
  }
}

function showOwnText(side, text, isInterim) {
  const el = side === "top" ? topText : bottomText;
  el.textContent = text;
  el.classList.remove("placeholder");
  el.style.opacity = isInterim ? 0.6 : 1;
}

topMicBtn.addEventListener("click", () => startListening("top", settings.topLang));
bottomMicBtn.addEventListener("click", () => startListening("bottom", settings.bottomLang));

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
  if (data && data.responseStatus && Number(data.responseStatus) >= 400) {
    throw new Error(data.responseDetails || "Translation failed");
  }
  if (!data || !data.responseData || !data.responseData.translatedText) {
    throw new Error("No translation returned");
  }
  return data.responseData.translatedText;
}

async function handleUtterance(side, text) {
  const fromSpeech = side === "top" ? settings.topLang : settings.bottomLang;
  const toSpeech = side === "top" ? settings.bottomLang : settings.topLang;
  const otherSide = side === "top" ? "bottom" : "top";
  const translatedEl = otherSide === "top" ? topText : bottomText;

  translatedEl.textContent = "Translating…";
  translatedEl.classList.remove("placeholder");
  translatedEl.style.opacity = 1;

  try {
    const translated = await translateText(text, iso(fromSpeech), iso(toSpeech));
    translatedEl.textContent = translated;

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
  } finally {
    // Only reset if nothing else (e.g. hands-free auto-restart) already moved
    // this side on to a new state while the request was in flight.
    if (sideState[side] === "translating") setSideUI(side, "idle");
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

topReplayBtn.addEventListener("click", () => speak(topText.textContent, settings.topLang));
bottomReplayBtn.addEventListener("click", () => speak(bottomText.textContent, settings.bottomLang));

async function copyCardText(el) {
  const text = el.textContent.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showBanner("Copied to clipboard.", "info");
  } catch {
    showBanner("Could not copy text.");
  }
}
topCopyBtn.addEventListener("click", () => copyCardText(topText));
bottomCopyBtn.addEventListener("click", () => copyCardText(bottomText));

// ---------- Manual fallback ----------
manualToggle.addEventListener("click", () => {
  manualBody.classList.toggle("hidden");
  manualChevron.textContent = manualBody.classList.contains("hidden") ? "▾" : "▴";
});

function setManualSide(side) {
  manualSide = side;
  manualSideTop.classList.toggle("active", side === "top");
  manualSideBottom.classList.toggle("active", side === "bottom");
}
manualSideTop.addEventListener("click", () => setManualSide("top"));
manualSideBottom.addEventListener("click", () => setManualSide("bottom"));

manualTranslateBtn.addEventListener("click", () => {
  const text = manualInput.value.trim();
  if (!text) return;
  showOwnText(manualSide, text, false);
  handleUtterance(manualSide, text);
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
setManualSide("bottom");

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
