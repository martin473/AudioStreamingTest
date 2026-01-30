---
status: active
last_updated: 2025-01-30
---

# Features by phase

Context and rationale for the audio streaming feature set. Implementation order follows backend-first (chunking + WebSocket server), then frontend (playback + progress), then seeking and local cache.

## Phase 1 – Backend: chunking and WS server

| ID   | Feature | Description | Dependencies |
|------|---------|-------------|--------------|
| 1.1  | Preprocess MP3 | Single MP3 from `/music` → timecoded chunks: 30s first chunk (with header placeholder), then 10s chunks; tail chunk may be &lt; 10s. | None; run once or on deploy. |
| 1.2  | Chunk index | Start/end timestamps per chunk; backend maps requested timecode (seconds) → chunk id and file path. | 1.1 (chunk files and boundaries). |
| 1.3  | HTTP + WS server | Custom Node HTTP server with Astro middleware (`@astrojs/node`); handle WebSocket upgrade (e.g. `ws`). | Node, Astro, `ws`. |
| 1.4  | Send initial chunk | On client WebSocket connect, send first 30s chunk (binary). | 1.1, 1.2, 1.3. |
| 1.5  | Send chunk by request | On client message (timecode or “next chunk”), send corresponding chunk (binary). No metadata yet. | 1.2, 1.3. |

**Phase 1 timeline (optional split):**

- **Phase 1a**: 1.1 Preprocess + 1.2 Chunk index (offline/build step).
- **Phase 1b**: 1.3 Server + 1.4 Initial chunk + 1.5 Chunk by request (runtime).

---

## Phase 2 – Frontend: load, play, pause, progress

| ID   | Feature | Description | Dependencies |
|------|---------|-------------|--------------|
| 2.1  | WS connect + buffer | Connect WebSocket on page load; receive and buffer first chunk. Consider MSE for true streaming vs `decodeAudioData` limitation. | Backend 1.4; browser WS API. |
| 2.2  | Play / Pause | Play and Pause from UI; playback starts on Play from current time; Pause stops playback. | 2.1; Audio element or MSE. |
| 2.3  | Progress bar | Bar: played (white), current position (white dot), buffered (grey ahead of dot), rest (unfilled). Format: `[--played--o--loaded--rest--]`. | 2.2; currentTime, duration, buffered. |
| 2.4  | Timestamps | Total length (mm:ss) and current (mm:ss); update on timeupdate and seek. | 2.2; currentTime, duration. |

---

## Phase 3 – Seeking and local cache

| ID   | Feature | Description | Dependencies |
|------|---------|-------------|--------------|
| 3.1  | Seek on click | Click on progress bar → seek to that timecode; request chunk for that timecode; play from that position once chunk is available. | 2.x; backend 1.5. |
| 3.2  | Local cache | Before requesting a chunk: check Cache API (or local storage); if present, use it; else request via WebSocket and store. | 2.1, 3.1; Cache API or IndexedDB. |

---

## Phase 4 (later)

- **Metadata**: Deferred. Header in first chunk and parsing can be stubbed or skipped until needed.

---

## Decision points

- **Chunk sizes**: 30s first (fast start + header room), 10s thereafter (balance between request count and granularity).
- **Preprocess vs on-the-fly**: Preprocessing yields accurate timecodes and simpler server; on-the-fly slicing would require MP3 parsing at request time.
- **MSE vs decodeAudioData**: MSE with `audio/mpeg` is Chromium-only; use `MediaSource.isTypeSupported('audio/mpeg')` and fallback to decodeAudioData + AudioBufferSourceNode (or blob URL) for Firefox/Safari. Phase 2 will document which path is taken and why.
- **Preprocess implementation**: Use **fluent-ffmpeg** (or ffmpeg CLI) for time-based MP3 splitting; do not implement custom MP3 frame parsing. See [planning-review.md](planning-review.md).
