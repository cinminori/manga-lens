# MangaLens

> Chrome extension for translating manga and manhwa — select a panel, get instant translation.
> Primarily designed for Traditional Chinese readers; translations are output in Traditional Chinese.

**[繁體中文說明](README.zh-TW.md)**

MangaLens lets you select any area on a manga/manhwa page to automatically OCR and translate Korean or Japanese text into Traditional Chinese. Works on desktop Chrome and Android mobile browsers.

---

## Features

- **Select & Translate** — Draw a rectangle over any manga panel to OCR + translate in one step
- **7 Translation Engines** — Gemini Vision, OpenAI-compatible, Groq Vision + LLM, Cloud Vision + LLM, Local API Proxy, OCR Space, or pure OCR mode
- **Continuous Selection** — Keep translating panel after panel without restarting
- **Interactive Results** — Drag to reposition, long-press for transparency, retry or copy with one click
- **Mobile Support** — Touch-friendly on Android browsers with extension support (e.g. Kiwi Browser)
- **Customizable Shortcut** — Default `Alt+S`, fully configurable

---

## Installation

### Desktop Chrome
1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `manga-lens` folder
5. Done! A floating toolbar appears on every webpage

### Android (Kiwi Browser, etc.)
1. Zip the `manga-lens` folder
2. Import the zip in your browser's extension page
3. Use touch gestures to select and translate

> After updating the extension, **refresh the webpage** (F5) for changes to take effect.

---

## Supported Engines

| # | Engine | How it works | Best for |
|---|--------|-------------|----------|
| 1 | **Gemini Vision** | Single model does OCR + translation | General use (recommended) |
| 2 | **Local API Proxy** | Your own OpenAI-compatible proxy | Self-hosted / custom models |
| 3 | **OpenAI Compatible** | Any OpenAI-format API (Groq, OpenRouter...) | Flexible model choice |
| 4 | **Groq Vision + LLM** | Llama 4 Scout OCR, then separate LLM translates | Free & fast |
| 5 | **Cloud Vision + LLM** | Google Cloud Vision OCR, then Gemini/LLM translates | Best OCR accuracy (printed text) |
| 6 | **Pure OCR** | Text recognition only, no translation | Proofreading original text |
| 7 | **OCR Space + Translation** | OCR Space, then Google Translate/Gemini/LLM | Free OCR option |

### Engine Comparison

| Engine | Handwritten | Printed Text | Translation | Speed | Cost |
|--------|-----------|-------------|------------|-------|------|
| Gemini Vision | ★★★ | ★★★ | ★★★ | ★★☆ | Free tier |
| Local API Proxy | ★★★ | ★★★ | ★★★ | ★★☆ | Self-hosted |
| OpenAI Compatible | ★★☆ | ★★★ | ★★☆ | ★★★ | Varies |
| Groq Vision + LLM | ★★☆ | ★★☆ | ★★☆ | ★★★ | Free |
| Cloud Vision + LLM | ★☆☆ | ★★★ | ★★★ | ★★☆ | Free tier |
| OCR Space + Translation | ★☆☆ | ★★☆ | ★★☆ | ★★☆ | Free |

> **Note:** Traditional OCR engines (Cloud Vision, OCR Space) cannot recognize handwritten or stylized text common in manga. Use Gemini or Groq Vision for those.
>
> **Note:** OCR Space does not support vertical text (common in Japanese manga). For vertical Japanese text, use Gemini Vision, Groq Vision, or Cloud Vision instead.

---

## Getting API Keys

| Service | Where to get | Cost |
|---------|-------------|------|
| Gemini | [Google AI Studio](https://aistudio.google.com/apikey) | Free tier |
| Groq | [Groq Console](https://console.groq.com/keys) | Free tier |
| Cloud Vision | [GCP Console](https://console.cloud.google.com/apis/library/vision.googleapis.com) | 1,000 free/month |
| OCR Space | [ocr.space](https://ocr.space/ocrapi/freekey) | Free (or leave blank for public key) |

---

## Usage Guide

### Basic Workflow
1. Click the floating toolbar button, press `Alt+S`, or use the popup button
2. A semi-transparent overlay with crosshair cursor appears
3. Click and drag to select the area you want to translate
4. Release — OCR and translation happen automatically
5. Press `Esc` to cancel selection

### Result Box Controls
| Action | Desktop | Mobile |
|--------|---------|--------|
| Move result | Drag the box | Touch drag |
| See original text | Long-press (0.4s) for transparency | Long-press |
| Retry translation | Hover, then click "Retry" | Tap, then "Retry" |
| Copy translation | Hover, then click "Copy" | Tap, then "Copy" |
| Close | Hover, then click "Close" | Tap, then "Close" |
| Clear all results | Toolbar "Clear" button | Toolbar "Clear" button |

### Continuous Mode
Enable "Continuous" in the toolbar or popup settings. After each translation, the button changes to "Continue" — scroll to the next panel, then click to select again.

---

## Settings

Open the extension popup to configure:

- **Source Language** — Korean or Japanese
- **Text Direction** — Auto-detect, vertical, or horizontal
- **Translation Engine** — Choose from 7 engines
- **Shortcut Key** — Click the input and press your preferred key combination
- **Show Toolbar** — Toggle the floating toolbar on webpages
- **Continuous Mode** — Stay in selection mode between translations

---

## Troubleshooting

| Error | Solution |
|-------|---------|
| API Key invalid or expired | Check your key, or generate a new one |
| Permission denied, enable API | Enable the corresponding API in GCP Console |
| Model not found | Verify the model name is correct for your service |
| Too many requests | Wait and retry, or use a different API key |
| Screenshot failed (mobile) | Mobile browsers can't capture tabs — ensure visible image elements on page |
| Connection failed | Check network, or verify proxy URL is correct and running |

---

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JavaScript (no frameworks)
- Content script with document-level capture phase events
- Offscreen document for image cropping
- AbortController-based event lifecycle management

---

## License

MIT

---

## Changelog

### v2.0.0
- 7 translation engines (Gemini, Local Proxy, OpenAI, Groq Vision+LLM, Cloud Vision+LLM, Pure OCR, OCR Space)
- Continuous selection mode
- Draggable result boxes with transparency on long-press
- Unified action buttons (Close/Retry/Copy)
- Mobile touch support with DOM capture fallback
- 429 auto-retry for all backends
- Localized error messages
- High-resolution DOM capture for better OCR
- Event listener leak fix with AbortController

### v1.0.0
- Initial release with Gemini Vision, basic selection and translation
