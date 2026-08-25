# YT Transcriber Web

Frontend for YT Transcriber: paste a YouTube URL, pick a language, get the transcript and its translation.

## Overview

A single-page, no-login web app. It talks to `yt-transcriber-api` over a plain JSON contract and never touches provider API keys — those live only in the backend. Nothing gets stored client-side beyond what the browser needs to render the current result.

## Features

- Landing screen: URL input with client-side validation, target-language select, trust badges.
- Live progress: the backend streams its stage over SSE, shown as a step-by-step checklist.
- Result screen: transcript/translation tabs, per-segment search (accent-insensitive), copy to
  clipboard and `.txt` / `.srt` download.
- Embedded player: click any segment to jump to that moment, and the segment being spoken is
  highlighted and kept in view as the video plays.
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
                  ProcessingState, ErrorState, ResultView, VideoPlayer, SegmentList) plus the
                  static Header/Footer Astro partials. Styles live next to each component as
                  a *.module.css file.
  layouts/        BaseLayout.astro
  pages/          index.astro, como-funciona.astro, privacidad.astro
  services/       api.ts — SSE client for the transcription stream
  lib/            segments.ts — pure segment helpers (formatting, SRT, search folding,
                  active-segment lookup); unit-tested in isolation
  types/          api.ts — request/response/error DTOs, matching the backend exactly
                  youtube.d.ts — minimal typings for the YouTube IFrame Player API
  styles/         global.css — design tokens (colors, spacing) and reset
tests/            Vitest + Testing Library, mirroring src/
```

State lives in `TranscriptionApp` as a single `phase` (`idle` → `processing` → `success` |
`error`); every other component is driven by props, which keeps the interactive surface
testable without mounting the whole app.

## Related Repository

Backend: [yt-transcriber-api](https://github.com/rubenmtzb/yt-transcriber-api)

## Live Demo

Not deployed yet.

## License

[MIT](LICENSE)
