---
status: active
last_updated: 2025-01-30
---

# Planning review

Review of the planning folder for inconsistencies, impossible or underspecified areas, accuracy vs industry standards, and opportunities to use stable libraries instead of custom implementation.

---

## 1. Inconsistencies

| Location | Issue | Fix |
|----------|--------|-----|
| [ascii-screenshots.md](ascii-screenshots.md) §4.4 | Diagram shows client request `timecode=45` and server response "chunk 30-40s". Timecode 45s lies in chunk **40–50s**, not 30–40s. | Change response label to "chunk 40-50s" (or "chunk containing 45s") so it matches the getChunk formula. |
| [feature-prototypes.yaml](feature-prototypes.yaml) `chunk_index` | Outputs include `byte range` but no other doc defines byte ranges; index uses `start_s`, `end_s`, `path`. | Either remove "byte range" from outputs or add byte-range to index when needed (e.g. for range requests later). For chunk-by-file, path is enough. |

---

## 2. Impossible or hard to execute

| Area | Issue | Recommendation |
|------|--------|-----------------|
| **Preprocess: "parse frames / sample rate to get byte positions per time"** | MP3 is frame-based and often VBR. Mapping time → byte offset requires parsing every frame (or using a binary search over frames). Doing this from scratch is complex and error-prone (ID3, LAME/Xing, frame sync, padding). | **Do not implement custom MP3 frame parsing.** Use **ffmpeg** (or **fluent-ffmpeg** in Node) to segment by time: `-ss`, `-t`, or segment filter. Industry standard and handles all MP3 variants. |
| **MSE with raw MP3** | Pseudocode says "append buffer to SourceBuffer" for MSE. MSE support for `audio/mpeg` is **Chromium-only**; Firefox does not support `addSourceBuffer('audio/mpeg')`. | Treat MSE+MP3 as **Chrome-only path**. Check `MediaSource.isTypeSupported('audio/mpeg')` and document fallback: decodeAudioData + AudioBufferSourceNode (or blob URL) for Firefox/Safari. |
| **Gapless playback** | Concatenating MP3 chunks and decoding separately often causes small gaps between chunks (scheduling and decode boundaries). | Either accept minor gaps for MVP, or use a library (e.g. **gapless.js**) or switch to a format that MSE handles gapless (e.g. fMP4/AAC). Document in Phase 2. |

---

## 3. Areas that need more context

| Area | Missing context | Suggestion |
|------|-----------------|------------|
| **Wire format for "request chunk"** | Client sends "timecode or next" but format is unspecified (JSON? `{ "timecode": 45 }` vs `{ "action": "next" }`?). | Define in [feature-prototypes.yaml](feature-prototypes.yaml) or [pseudocode.md](pseudocode.md): e.g. JSON text frame `{"t": 45}` for timecode and `{"next": true}` for next chunk; server responds with binary chunk only. |
| **Chunk "complete" on client** | "When chunk_0 complete" is ambiguous: single WebSocket binary frame per chunk vs multiple frames. | Specify: one chunk = one binary message (recommended for simplicity), or document multi-frame chunking and a length prefix / end marker. |
| **Buffered range for &lt;audio&gt;** | Client playback pseudocode uses `audio.buffered.end(...)`. For MSE or multiple buffers, buffered is per SourceBuffer; for a single &lt;audio&gt; with blob URL, buffered may not reflect WebSocket chunks. | Clarify: if using MSE, use `SourceBuffer.buffered`; if using decodeAudioData + single blob, buffered may be "all or nothing" until we implement custom buffered display from chunk list. |
| **Preprocess output path** | Index has `path` (e.g. `"chunk_1.bin"`). Server must resolve path relative to project root or a configured chunk directory. | Add to Phase 1.1/1.2: output directory (e.g. `music/chunks/` or `dist/chunks/`) and document that index paths are relative to that root. |

---

## 4. Accuracy and industry standards

| Area | Assessment | Recommendation |
|------|------------|----------------|
| **Time-based MP3 splitting** | Custom "read MP3, parse frames, emit bytes by time" is not industry standard. Standard approach is **ffmpeg** (or similar) for segmenting by time. | Use **fluent-ffmpeg** (Node) with `@ffmpeg-installer/ffmpeg` (optional) for portable binary; or shell out to `ffmpeg -i in.mp3 -ss START -t DURATION -c copy out.mp3` per chunk. |
| **WebSocket for binary chunks** | Using **ws** for binary frames is standard and appropriate. | Keep; no change. |
| **Cache for chunk storage** | Cache API with synthetic URLs (e.g. `chunk://1`) and `Response(blob)` is valid. IndexedDB is also standard for larger binary blobs. | Document: Cache API has size limits per origin; for many/large chunks, IndexedDB may be preferable. localStorage is not suitable (size limits, string encoding). |
| **getChunk(sec) formula** | `chunk_0` for sec &lt; 30; else `floor((sec-30)/10)+1` for chunk index. Correct for 30s first chunk and 10s subsequent. Last chunk (tail &lt; 10s) must be handled by index lookup (e.g. `start_s <= sec < end_s`) not formula. | In implementation, use **index lookup** (find chunk where `start_s <= sec < end_s`) so tail and any future chunk size changes are correct; keep formula only as illustration. |

---

## 5. Stable libraries vs custom implementation

| Feature | Custom approach in plan | Recommended library / approach |
|---------|-------------------------|---------------------------------|
| **MP3 split by time** | "Parse frames / sample rate to get byte positions" | **fluent-ffmpeg** + **ffmpeg** (or **@ffmpeg-installer/ffmpeg**). Use `setStartTime()` / `setDuration()` and output one file per chunk; build index from known start/end times. |
| **WebSocket server** | "ws" (already chosen) | **ws** – keep. |
| **HTTP server + Astro** | Custom Node server + Astro middleware | **@astrojs/node** adapter + custom server script that uses `http.createServer`, attaches Astro, then handles upgrade for **ws**. No extra library beyond **ws**. |
| **Gapless playback** | Not specified | For MVP, accept small gaps. If needed later: **gapless.js** (HTMLAudioElement + Web Audio) or design around MSE + fMP4. |
| **Client cache** | Cache API or IndexedDB (generic) | No specific library required. Use **Cache API** for simplicity; if hitting limits, use **idb** or native IndexedDB for chunk storage. |

---

## 6. Summary of changes to apply

1. **ascii-screenshots.md**: In §4.4, change server response from "chunk 30-40s" to "chunk 40-50s" (or "chunk containing 45s") when client requests timecode=45.
2. **feature-prototypes.yaml**: In `chunk_index.outputs`, drop "byte range" unless we add byte-range to the index; or add a note that byte range is optional for future range requests.
3. **pseudocode.md**: In Preprocess, replace "parse frames / sample rate" with "use ffmpeg (or fluent-ffmpeg) to segment by time; output one file per chunk; write index from segment start/end times." In Client – Load, add "Check MediaSource.isTypeSupported('audio/mpeg'); if false, use decodeAudioData + AudioBufferSourceNode (or blob URL) for Firefox/Safari."
4. **features-by-phase.md**: In Decision points (or new "Libraries" subsection), add: "Preprocess: use fluent-ffmpeg (or ffmpeg CLI) for time-based MP3 splitting; do not implement custom MP3 frame parsing."
5. **rules-reality-check.md**: In Known gaps, add row for "MSE + MP3: Chromium-only; use isTypeSupported and fallback." Add "Libraries" row: preprocessing = fluent-ffmpeg; WS = ws; optional gapless = gapless.js.
6. **Optional**: Add a short "Wire format" subsection to pseudocode or feature-prototypes describing the request/response format (JSON for requests, binary for chunk response).

These updates keep the plan executable and aligned with industry practice without changing the overall architecture.
