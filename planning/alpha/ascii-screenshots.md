---
status: active
last_updated: 2025-01-30
---

# ASCII screenshots

ASCII mockups of the UI and key sections of the implementation.

---

## 4.1 UI – Progress bar and timestamps

```
+------------------------------------------------------------------+
|  [======= white =======] o [== grey ==] [-------- rest ---------] |
|  current 0:45 / 3:22                                            |
+------------------------------------------------------------------+
  played --^     ^dot   buffered
```

- **White section**: Already played.
- **White dot (o)**: Current playback position.
- **Grey section**: Buffered (loaded) ahead of current position.
- **Rest**: Unfilled; not yet loaded.
- **Timestamps**: Current time (0:45) and total duration (3:22).

---

## 4.2 Backend – Chunk index lookup

```
+------------------+
| getChunk(sec)    |
|  if sec < 30     |
|    return chunk0 |
|  else            |
|    i = (sec-30)/10|
|    return chunk_i|
+------------------+
```

Maps a requested timecode (seconds) to the chunk that contains that time. Chunk 0 covers 0–30s; subsequent chunks are 10s each (30–40, 40–50, …); last chunk may be shorter.

---

## 4.3 Frontend – Progress bar click to timecode

```
+----------------------------------------+
| barClick(evt)                          |
|  ratio = evt.offsetX / bar.offsetWidth |
|  seekTo(ratio * duration)              |
|  requestChunkForTime(ratio * duration) |
+----------------------------------------+
```

Click position on the bar is converted to a ratio; target time = ratio × duration. Client seeks to that time and requests the chunk that contains it.

---

## 4.4 WebSocket message flow

```
Client                    Server
  | connect                 |
  |------------------------>|
  |     first 30s chunk      |
  |<------------------------|
  | "request" timecode=45    |
  |------------------------>|
  |     chunk 40-50s         |
  |<------------------------|
```

1. Client connects; server sends first 30s chunk (binary).
2. Client sends a request (e.g. timecode=45); server responds with the chunk that contains 45s (chunk 40–50s).

---

## 4.5 Preprocess – Chunk layout on disk

```
/music/
  song.mp3                    (source)

/chunks/  (or equivalent)
  chunk_0.bin                 [0s -------- 30s]  (header placeholder + audio)
  chunk_1.bin                 [30s --- 40s]
  chunk_2.bin                 [40s --- 50s]
  ...
  chunk_N.bin                 [tail, may be < 10s]

chunk_index.json              [{ id, start_s, end_s, path }, ...]
```

Preprocess step reads the source MP3 and writes timecoded chunk files plus an index used by the server for lookups.
