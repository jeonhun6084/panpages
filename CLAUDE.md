# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PanPages is a streamer fan page app — a React SPA with an Express backend. The frontend is deployed to GitHub Pages; the backend runs locally only and is required for the Gallery feature.

## Commands

### Frontend (React, port 3000)
```bash
npm install        # install dependencies
npm start          # dev server
npm run build      # production build
npm run deploy     # build + push to gh-pages branch
npm test           # run tests
```

### Backend (Express, port 3001)
```bash
cd server
cp .env.example .env   # set SOOP_ID, SOOP_PW
npm install
npm start              # production
npm run dev            # dev with nodemon
```

The frontend dev server proxies `/api/*` to `http://localhost:3001` (configured in `package.json` `"proxy"` field).

## Architecture

### Two-process design
- **Frontend** (`src/`) — React 18 SPA, HashRouter (required for GitHub Pages), no build-time env vars needed.
- **Backend** (`server/`) — Express on port 3001. Only handles SOOP scraping; the frontend talks directly to SOOP's BJ API for live status (`bjapi.afreecatv.com`) — no server proxy needed there.

### State persistence
All user data (videos, channels, BJ ID) lives in `localStorage` with `fp-` prefixed keys. There is no database.

### Theming
`ThemeContext` in `App.js` provides `theme` / `toggleTheme`. The active theme is set as a `data-theme` attribute on `<html>`. All colors are CSS variables in `App.css` scoped under `[data-theme="dark"]` and `[data-theme="light"]`.

### Routing
Three routes via `HashRouter`:
- `/` → `Videos` — YouTube collection, tag filter, drag-and-drop reorder (drag only works on "전체" tab)
- `/live` → `Live` — SOOP multi-channel monitor, 60s polling, browser push notifications
- `/gallery` → `Gallery` — SOOP board posts via local backend, infinite scroll, lightbox

### Backend: SOOP scraping (`server/soop.js`)
- Uses Puppeteer + Chrome (`/Applications/Google Chrome.app/...`) to log in once, saves cookies to `server/cookies.json`.
- Subsequent requests use saved cookies + direct HTTPS calls to `api-channel.sooplive.com/v1.1/channel`.
- Cookie validity is checked via `chapi.sooplive.com/api/authentication` before each request; stale cookies trigger a re-login.
- `SOOP_PW2` env var handles optional secondary password prompt.
- Posts prefixed with `[캐치]`, `[클립]`, `[Catch]`, `[CATCH]` are filtered out.
- Images are extracted from post HTML using two patterns: `data-url` (new format) and `<img src>` (old format); GIFs are preferred as thumbnails.

### Backend API
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/boards/:bjId` | Returns board list for a BJ |
| GET | `/api/posts/:bjId?bbsNo=&page=` | Returns paginated posts |
| DELETE | `/api/cookies` | Deletes `cookies.json` to force re-login |

### Gallery infinite scroll pattern
`Gallery.js` uses a `useRef`-based approach to avoid stale closures: `pageRef`, `hasMoreRef`, `selectedBoardRef`, `currentBjIdRef` are kept in sync alongside React state. An `IntersectionObserver` watches a sentinel `<div>` at the bottom and calls `loadMore()` which reads from refs, not state.

## Environment Variables (server/.env)
```
SOOP_ID=your_soop_id
SOOP_PW=your_soop_password
SOOP_PW2=your_secondary_password   # optional
```

## Deployment
The frontend deploys to `https://jeonhun6084.github.io/panpages` via `npm run deploy` (gh-pages). The backend is never deployed — Gallery only works locally.
