# 🎵 Melody Meadow — Rhythm English

> A four-lane rhythm game that teaches English vocabulary through musical beats.
> Each song is a structured listening journey: verses, chorus, letter reveals, and a reward finale.

四轨下落式英语节奏音游 —— 把单词学习编织进节拍里。每首曲目都是一段结构化的聆听旅程:主歌 → 副歌 → 字母揭示 → 奖励终曲。

**Live demo:** <https://english.wyccyw.com/game/music-words/>

---

## ✨ Features

- **Four-lane falling-note engine** — keyboard `A` / `S` / `D` / `F` or tap lanes on touch devices.
- **Sample-accurate timing & judgement** — a dedicated timing module computes Perfect / Great / Good / Miss windows; holds support long-press judging.
- **Web Audio scheduling** — no third-party audio libs; a custom audio engine + mixer drives playback, calibration, and click tracks.
- **Authored charts** — a v2 chart format (`chart-v2.js`) describes per-song, per-mode note patterns with validation and a legacy fallback path.
- **Replay system** — sessions are recordable and replayable (`replay.js`), so learners can review their runs.
- **Daily practice** — a curated daily song with tracked progress (`daily.js` + `progress.js`, persisted to `localStorage`).
- **Song library** — 6 shipped songs (Fruit Beat, Animal Parade, Body Boogie, Color Train, Sky Sparkle, Toy Box Bounce), each with its own cover and scene art.
- **Strict CSP + installable PWA** — `default-src 'self'`, service worker for offline play, web manifest, add-to-home-screen on iOS/Android.

## 🎮 Songs shipped

| Song | Theme |
|---|---|
| Fruit Beat | fruits |
| Animal Parade | animals |
| Body Boogie | body parts |
| Color Train | colors |
| Sky Sparkle | sky / weather |
| Toy Box Bounce | toys |

## 🧱 Project structure

```
music-words/
├── index.html          # Single-page app shell, lane layout, timeline
├── styles.css          # ~1.6k lines of design tokens + responsive layout
├── manifest.json       # PWA web manifest
├── sw.js               # Service worker (offline app shell + audio cache)
├── src/
│   ├── app.js          # Main app controller (~2.1k lines)
│   ├── rhythm.js       # Lane + note rendering, fall animation
│   ├── timing.js       # Judgement windows, hit detection
│   ├── audio.js        # Web Audio scheduling & sample playback
│   ├── audio-mix.js    # Mixer (music + sfx levels)
│   ├── chart-v2.js     # Authored chart format, validation, legacy fallback
│   ├── hold-judgement.js
│   ├── hit-effects.js  # Visual feedback on hits
│   ├── music-transport.js
│   ├── song-clock.js
│   ├── stage-director.js
│   ├── session.js      # Play session state
│   ├── replay.js       # Record / replay runs
│   ├── progress.js     # localStorage persistence
│   ├── practice.js
│   ├── daily.js        # Daily song rotation
│   ├── settings.js
│   ├── songs.js        # Song catalog & metadata
│   └── sw-register.js  # Service worker registration
└── assets/
    ├── audio/          # 6 m4a song tracks + manifest
    ├── *-cover.png     # Per-song cover art
    └── *-scene.png     # Per-song backdrop scenes
```

## 🚀 Run locally

No build step. Serve the directory with any static server:

```bash
# Python 3
python3 -m http.server 8080

# Or Node
npx serve .
```

Open <http://localhost:8080/>. Audio context requires a user gesture — click anywhere to start.

## 🔒 Security & privacy

- **Strict Content-Security-Policy**: `default-src 'self'`; no inline scripts, no remote origins, no `eval`.
- **No external trackers.** Cloudflare Insights is optional and disabled in this self-hosted copy.
- **No backend, no accounts, no analytics call home.** Progress is stored only in the browser's `localStorage`.

## 🛠️ Tech stack

Vanilla JS (ES modules), Web Audio API, CSS custom properties, PWA service worker. Zero runtime dependencies.

## 📜 License

[MIT](./LICENSE) — song audio and cover art included.

## 🙏 Acknowledgements

Built as a learning-by-building project for early English exposure through music. Inspired by the rhythm-game tradition (Beatmania / osu! mania / Friday Night Funkin') reimagined for young learners.
