# Live Speech Translator 🌊

A live, in-browser speech translator built for travel — made with a Phu Quoc, Vietnam
trip in mind, but works for any language pair.

Speak → your speech is transcribed live → translated → spoken back out loud, so you
can have a real conversation with someone who doesn't share your language.

**No install, no backend, no API keys required.** It's a static site that runs entirely
in the browser.

## Features

- **Split-screen conversation view** — the screen is divided into a top half and a
  bottom half, one per person. Each half has its own mic button, its own language
  picker, and shows the live transcript of whatever that person says.
- **Independent language per side** — the top and bottom don't share a single
  "source/target" pair; each side picks its own language (e.g. top = English,
  bottom = Vietnamese), and either side can change languages at any time with a
  swap button (⇅) to flip the pair in one tap.
- **Live speech-to-text** using the browser's Web Speech API (continuous, streaming).
- **Automatic translation** via the free [MyMemory Translation API](https://mymemory.translated.net/) —
  when one side speaks, the translation is shown (and spoken aloud) on the other side.
- **Spoken-aloud translations** using the browser's text-to-speech engine.
- **Face-to-face flip** — the top card is rotated 180° by default so it reads
  right-side-up to the person sitting across the table (like at a restaurant or
  market stall); toggle it off with 🔄 if you'd rather not rotate it.
- **Replay & copy** per side — 🔊 re-speaks and 📋 copies whatever's currently shown
  on that half of the screen.
- **Typed fallback** — for noisy streets/markets or browsers without speech recognition,
  pick which side you're typing for ("Typing as top/bottom") and it translates the
  same way a spoken utterance would.
- **Conversation history**, saved locally on your device.
- **Quick presets** for English → Vietnamese, Korean, Chinese, and Russian (the most
  common languages you'll run into around Phu Quoc), plus 16 languages total.
- **Installable as an app** (PWA) — "Add to Home Screen" so it opens full-screen with
  an icon, and the app shell still loads even on a weak hotel/beach wifi signal.

## Quick start

Just open `index.html` in Chrome, Edge, or Safari. That's it — no build step, no
`npm install`.

For microphone access to work outside of `localhost`, the page must be served over
**HTTPS** (browsers block mic access on plain HTTP). The easiest way:

### Option A — GitHub Pages (recommended, free)

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the repo settings → **Pages**, set the source to the branch you want to publish
   (e.g. `main`) and root folder.
3. Your app will be live at `https://<username>.github.io/<repo>/`.

### Option B — any static host

Netlify, Vercel, Cloudflare Pages, or `python3 -m http.server` (for local testing on
`localhost`, which is exempt from the HTTPS requirement) all work — it's just static
files.

## How it works

| Step | Technology |
|---|---|
| Speech → text | `SpeechRecognition` / `webkitSpeechRecognition` (Web Speech API) |
| Text → text (translation) | [MyMemory API](https://mymemory.translated.net/doc/spec.php) — free, no key needed |
| Text → speech | `speechSynthesis` (Web Speech API) |

Everything runs client-side. The only network calls are to the translation API and to
whatever speech-recognition backend your browser uses (in Chrome, that's Google's).

## Browser support

- **Chrome / Edge (desktop & Android):** full support, recommended.
- **Safari (iOS/macOS):** speech recognition works but is more limited; text-to-speech
  works well.
- **Firefox:** no built-in speech recognition — use the "Type instead" box to translate
  and still hear it spoken aloud.

If speech recognition isn't available, the app automatically shows a note and you can
use the typed-text fallback, which still translates and speaks the result.

## Translation quota

MyMemory's free tier allows ~5,000 words/day anonymously, or up to ~50,000 words/day if
you provide an email address for identification. There's an optional **email field in
Settings** (⚙️) for this — it's stored only in your browser's local storage and sent
only to the MyMemory API, never bundled into the app's source code or committed to the
repo.

## Privacy

- No accounts, no server, no analytics.
- Conversation history and settings are stored only in your browser (`localStorage`)
  and never leave your device except the two API calls described above.
- Clear your history anytime with the **Clear** button.

## Project structure

```
index.html        Main page/UI
css/style.css      Styling (mobile-first)
js/app.js          App logic: speech recognition, translation, speech synthesis
manifest.json      PWA manifest ("Add to Home Screen")
sw.js              Service worker — caches the app shell for flaky connections
icons/favicon.svg  App icon
```

## Chúc bạn đi du lịch vui vẻ! 🇻🇳

("Have a great trip!" in Vietnamese — try it in the app.)
