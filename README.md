# Audio Streaming Test (WebSocket)

Phase 1: Backend chunking and WebSocket server. Streams MP3 in timecoded chunks (30s first, then 10s) over WebSocket.

## Prerequisites

- **Node.js** 18+
- **ffmpeg** and **ffprobe** on PATH, or install optional packages: `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe` (included in optionalDependencies)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Add an MP3**  
   Put a single `.mp3` file in the `music/` folder (e.g. `music/song.mp3`).

3. **Preprocess (build chunks and index)**

   ```bash
   npm run preprocess
   ```

   This writes `music/chunks/chunk_0.mp3` (0–30s), `chunk_1.mp3`, … and `music/chunks/chunk_index.json`.

4. **Build and run**

   ```bash
   npm run build
   npm run preview
   ```

   Or in one step: `npm start`

   - Site: http://localhost:4321  
   - WebSocket: ws://localhost:4321/ws  

## WebSocket API (Phase 1)

- **Connect** → server sends the first 30s chunk (binary).
- **Send JSON**  
  - `{"t": 45}` → server sends the chunk that contains 45s (binary).  
  - `{"next": true}` → server sends the next chunk after the last one sent (binary).

Server always responds with raw binary chunk data (no JSON wrapper).

## Scripts

| Script        | Description                                  |
|---------------|----------------------------------------------|
| `npm run preprocess` | Split MP3 in `music/` into chunks; run once or when you change the file. |
| `npm run build`      | Build Astro (output in `dist/`).             |
| `npm run preview`    | Run custom server (HTTP + WS). Requires `npm run build` first. |
| `npm start`          | Build then run server.                       |
| `npm run dev`       | Astro dev server on **port 4325** (no WebSocket; use `preview` for full app on 4321). |
| `npm run e2e`       | Run Playwright e2e tests (requires server; see [tests/e2e/README.md](tests/e2e/README.md)). |
| `npm run e2e:seek`  | Seek-past-buffer repro test. |
| `npm run e2e:debug`| Same + dump WebSocket/console to `tests/e2e/debug-seek-output.txt`. |

## Phase 1 checklist

- [x] 1.1 Preprocess: fluent-ffmpeg, 30s first chunk, 10s chunks, `chunk_index.json`
- [x] 1.2 Chunk index: getChunk(sec) via index lookup `start_s <= sec < end_s`
- [x] 1.3 HTTP + WS server: Node server, Astro middleware, WebSocket at `/ws`
- [x] 1.4 Send initial chunk on WS connect
- [x] 1.5 Send chunk by request (`{"t": N}` or `{"next": true}`)
