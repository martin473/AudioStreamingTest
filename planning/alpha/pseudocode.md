---
status: active
last_updated: 2025-01-30
---

# Pseudocode

High-level pseudocode for preprocessing, server, and client (load, playback, seek, cache).

---

## Preprocess (run once or on deploy)

Use **ffmpeg** (or **fluent-ffmpeg** in Node) for time-accurate splitting. Do not implement custom MP3 frame parsing (MP3 is frame-based and often VBR; byte-to-time mapping is complex).

```
INPUT: path to MP3 in /music
OUTPUT: chunk files + index file (e.g. in music/chunks/ or dist/chunks/)

1. Get duration (e.g. ffprobe or fluent-ffmpeg .duration()).
2. Chunk 0: ffmpeg -i input.mp3 -ss 0 -t 30 -c copy chunk_0.bin (optionally reserve header bytes at start).
3. start = 30
   WHILE start < duration:
     end = min(start + 10, duration)
     ffmpeg -i input.mp3 -ss start -t (end - start) -c copy chunk_i.bin
     Append to index: { id: i, start_s: start, end_s: end, path: "chunk_i.bin" }
     start = end
     i = i + 1
4. Write index to chunk_index.json: [{ id, start_s, end_s, path }, ...]
```

Index lookup: find chunk where `start_s <= sec < end_s` (handles tail chunk correctly). Formula `floor((sec-30)/10)+1` is only valid when all non-first chunks are exactly 10s.

---

## Server – HTTP and WebSocket

```
ON each incoming request:
  IF request is HTTP Upgrade to WebSocket:
    Accept WebSocket connection.
    Load chunk_0 from index; read file.
    Send chunk_0 bytes as binary frame(s) to client.
    ON message from client:
      Parse message (timecode_s or "next").
      getChunk(timecode_s) -> chunk_id, path
      Load chunk file; read bytes.
      Send chunk bytes as binary frame(s) to client.
  ELSE:
    Pass request to Astro middleware (serve HTML/assets).
```

**Wire format (client → server):** JSON text frame, e.g. `{"t": 45}` for timecode (seconds) or `{"next": true}` for next chunk. Server responds with binary chunk only (no JSON wrapper).

**getChunk(sec):**

```
  IF sec < 30:
    RETURN chunk_0 (id=0, path for 0-30s)
  ELSE:
    i = floor((sec - 30) / 10) + 1   // or index lookup by start_s <= sec < end_s
    RETURN chunk_i from index
```

---

## Client – Load

```
ON page load:
  1. Open WebSocket to server (e.g. wss://origin/ws or same-origin path).
  2. ON first binary message(s):
     Append received bytes to buffer for chunk_0.
     When chunk_0 complete (one chunk = one binary message, or use length prefix / end marker):
       Prepare playback:
         - If MediaSource.isTypeSupported('audio/mpeg'): use MSE (Chromium-only): create MediaSource, addSourceBuffer('audio/mpeg'), append buffer, set src.
         - Else (Firefox/Safari): use decodeAudioData + AudioBufferSourceNode (or blob URL) for playback.
  3. Mark "buffer ready"; enable Play button.
```

---

## Client – Playback

```
Play():
  audio.currentTime = currentTime   // already set on load or seek
  audio.play()

Pause():
  audio.pause()
  currentTime = audio.currentTime

ON timeupdate (or requestAnimationFrame / polling):
  currentTime = audio.currentTime
  duration = audio.duration
  playedWidthPercent = (currentTime / duration) * 100
  dotPositionPercent = playedWidthPercent
  bufferedEnd = audio.buffered.end(...)  // end of buffered range containing currentTime
  bufferedWidthPercent = (bufferedEnd / duration) * 100
  Update progress bar: [0, playedWidthPercent] white; dot at playedWidthPercent; [playedWidthPercent, bufferedWidthPercent] grey; rest unfilled.
  Display: currentLabel = formatMMSS(currentTime); totalLabel = formatMMSS(duration)
```

---

## Client – Seek

```
ON progress bar click (evt):
  ratio = evt.offsetX / progressBar.offsetWidth
  targetTime = ratio * duration
  seekTo(targetTime)

seekTo(targetTime):
  currentTime = targetTime
  chunk = getChunkForTime(targetTime)   // chunk_id or time range
  IF chunk in local cache:
    Load chunk from cache; prepare buffer for range containing targetTime; set audio.currentTime = targetTime; allow play.
  ELSE:
    Send request to server (timecode = targetTime).
    ON chunk received:
      Store in cache (key = chunk_id or time range).
      Prepare buffer; set audio.currentTime = targetTime; allow play.
```

---

## Client – Cache

```
getChunkBytes(chunk_id or timecode):
  key = makeCacheKey(chunk_id or timecode)
  cache = caches.open('audio')   // or IndexedDB / local storage
  match = await cache.match(key)
  IF match:
    RETURN response body (chunk bytes)
  ELSE:
    Request chunk via WebSocket (send timecode or chunk_id to server).
    ON receive binary:
      Store: cache.put(key, new Response(chunkBytes))
      RETURN chunkBytes
```

---

## Helpers

```
formatMMSS(seconds):
  m = floor(seconds / 60)
  s = floor(seconds % 60)
  RETURN pad(m) + ":" + pad(s)   // e.g. "3:22"
```
