# Live Speech Translator 🌊

A live, in-browser speech translator built for travel — made with a Phu Quoc, Vietnam
trip in mind, but works for any language pair.

Speak → your speech is transcribed live → translated → spoken back out loud, so you
can have a real conversation with someone who doesn't share your language.

**No install, no backend, no API keys required.** It's a static site that runs entirely
in the browser.

## Features

- **Live speech-to-text** using the browser's Web Speech API (continuous, streaming).
- **Automatic translation** via the free [MyMemory Translation API](https://mymemory.translated.net/).
- **Spoken-aloud translations** using the browser's text-to-speech engine.
- **Single Mic mode** — you speak, it shows and speaks the translation.
- **Conversation mode** — two mic buttons (you / them), with a "flip" button that
  rotates the other person's card 180° so it reads right-side-up when facing them
  across a table, like at a restaurant or market stall.
- **Typed fallback** — for noisy streets/markets or browsers without speech recognition.
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
