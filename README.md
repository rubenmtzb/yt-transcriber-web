# YT Transcriber Web

Frontend for YT Transcriber: paste a YouTube URL, pick a language, get the transcript and its translation.

## Overview

A single-page, no-login web app. It talks to `yt-transcriber-api` over a plain JSON contract and never touches provider API keys — those live only in the backend. Nothing gets stored client-side beyond what the browser needs to render the current result.

## Features

**Implemented**

- Project scaffold (Astro + React + TypeScript), design tokens, base layout.
- Typed API client (`src/services/api.ts`) matching the backend's request/response/error contract exactly.

**Planned**

- Home/Landing screen (URL input, language select, trust badges).
- Processing screen (step-by-step progress).
- Result screen (transcript/translation tabs, copy/download actions).
- Error states mapped from the backend's error envelope.
- Responsive layout (desktop/tablet/mobile).

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
  components/     UrlForm, LanguageSelect, ProcessingState, TranscriptViewer, TranslationViewer, ErrorState (React)
  layouts/        BaseLayout.astro
  pages/          index.astro
  services/       api.ts — typed fetch client
  types/          api.ts — request/response/error DTOs, matching the backend exactly
  styles/         global.css — design tokens (colors, spacing) and reset
```

## Related Repository

Backend: [yt-transcriber-api](https://github.com/rubenmtzb/yt-transcriber-api)

## Live Demo

Not deployed yet.

## License

[MIT](LICENSE)
