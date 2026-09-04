# YT Transcriber Web

Frontend for YT Transcriber: paste a YouTube URL, pick a language, get the transcript and its translation.

## Overview

A single-page, no-login web app. It talks to `yt-transcriber-api` over a plain JSON contract and never touches provider API keys — those live only in the backend. Nothing gets stored client-side beyond what the browser needs to render the current result.

## Features

- Landing screen: URL input with client-side validation, target-language select, trust badges.
- Live progress: the backend streams its stage over SSE, shown as a step-by-step checklist.
- Result screen: transcript / translation / dual-language tabs, per-segment search
  (accent-insensitive), copy to clipboard and `.txt` / `.srt` download.
- Embedded player with custom controls (play/pause, seek bar, playback speed, mute) — the
  segment being spoken is highlighted and kept in view as the video plays, and clicking any
  segment jumps the player to that moment.
- Per-segment actions: loop a line, copy a deep link to that exact moment
  (`?v=<id>&t=<seconds>&lang=<code>`, auto-plays and seeks on open), or export it as a shareable
  quote-card image.
- Keyboard shortcuts while viewing a result: space to play/pause, ←/→ to seek, ↑/↓ to jump a
  segment, M to mute, L to loop the current line.
- Recent-history strip (kept in `localStorage`, last 5 videos) for reopening a result instantly
  without re-spending the session's rate-limit budget.
- Error states mapped one-to-one from the backend's error envelope.
- Responsive layout (desktop/tablet/mobile) and a reduced-motion path throughout.

## Architecture

```text
Browser
   |
Astro (static) + React islands
   | fetch, JSON
Spring Boot API (yt-transcriber-api)
```

Astro renders the static shell; React is used only for the interactive parts (the form, the processing state, the result viewer). The frontend has no server-side logic of its own — everything it shows comes from the backend's HTTP contract.

## Tech Stack

- Astro 7 (static output)
- React 19 (islands)
- TypeScript (strict)
- Plain CSS with design tokens (no CSS framework — the design system is intentionally small)

## Getting Started

```bash
npm install
npm run dev       # http://localhost:4321
npm run check     # type-check
npm run test      # unit + component tests
npm run build     # static output to dist/
```

### Docker

```bash
docker build -t yt-transcriber-web .
docker run -p 8080:80 yt-transcriber-web
```

## Configuration

Copy `.env.example` to `.env`:

| Variable                 | Default                  | Description                          |
|---------------------------|---------------------------|----------------------------------------|
| `PUBLIC_API_BASE_URL`     | `http://localhost:8080`  | Base URL of the `yt-transcriber-api` backend |

`PUBLIC_`-prefixed variables are the only ones exposed to the browser bundle (Astro/Vite convention) — never put a secret behind this prefix.

## Project Structure

```text
src/
  components/     React islands (TranscriptionApp orchestrates the phases; UrlForm,
                  ProcessingState, ErrorState, ResultView, VideoPlayer, SegmentList,
                  TranscriptViewer / TranslationViewer / DualViewer, RecentHistory) plus the
                  static Header/Footer Astro partials. Styles live next to each component as
                  a *.module.css file.
  layouts/        BaseLayout.astro
  pages/          index.astro, como-funciona.astro, privacidad.astro
  services/       api.ts — SSE client for the transcription stream
  lib/            segments.ts — pure segment helpers (formatting, SRT, search folding)
                  history.ts — localStorage-backed recent-history cache
                  quoteCard.ts — canvas-rendered shareable quote-card image
                  each unit-tested in isolation
  types/          api.ts — request/response/error DTOs, matching the backend exactly
                  youtube.d.ts — typings for the YouTube IFrame Player API surface this app uses
  styles/         global.css — design tokens (colors, spacing) and reset
tests/            Vitest + Testing Library, mirroring src/
```

State lives in `TranscriptionApp` as a single `phase` (`idle` → `processing` → `success` |
`error`), plus the recent-history list and an optional deep-link prefill; every other component
is driven by props, which keeps the interactive surface testable without mounting the whole app.
`ResultView` owns per-result UI state (active tab, loop segment, playback position) and the
keyboard-shortcut listener.

## Related Repository

Backend: [yt-transcriber-api](https://github.com/rubenmtzb/yt-transcriber-api)

## Live Demo

<https://yt.rubenitx.me> — a static build on Cloudflare Pages, deployed from `main` on every push.
It talks to <https://yt-api.rubenitx.me>.

The API host is pinned in **two** places and both have to agree, or the browser blocks every call
while the code reads as perfectly correct:

- `PUBLIC_API_BASE_URL`, the build variable the bundle inlines (see the table above);
- the `connect-src` directive in [`public/_headers`](public/_headers), which Pages serves as the
  Content-Security-Policy.

A mismatch fails only in a browser — `curl` against the API keeps working — so it is worth checking
the deployed response headers rather than the source after moving the backend.

## License

[MIT](LICENSE)
