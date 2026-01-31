# Chunk changeover fix plan

## Goal
Playback should continue seamlessly when crossing from one chunk to the next (no pause at 30s). Current behavior: switch happens but playback does not auto-resume because `wasPlaying` is read **after** `ended` fires (when `audio.paused` is already true).

---

## Phase 1: Force resume (try first)

**Cause:** In `switchToPendingNextChunk()`, `wasPlaying = !audio.paused` is evaluated when the element may already be paused (e.g. when called from the `ended` handler), so we never call `audio.play()`.

**Fix:**
- **Option A:** When calling `switchToPendingNextChunk()` from the `ended` handler, we know the user was playing (we wouldn’t have reached end otherwise). Pass an explicit flag, e.g. `switchToPendingNextChunk({ forceResume: true })`, and in the function use `forceResume || !audio.paused` (or equivalent) so that after switching we always call `audio.play()` when invoked from `ended`.
- **Option B:** Track “user was playing” before we hit the boundary: e.g. in `timeupdate`, when we’re near the boundary (`songTime >= bufferEnd - 0.5`) and `!audio.paused`, set a variable `userWasPlayingBeforeBoundary = true`; clear it when we switch or when we’re not near the boundary. In `switchToPendingNextChunk()` use that variable (or the passed flag from `ended`) to decide whether to call `audio.play()`.

**Files:** `src/pages/index.astro` — `switchToPendingNextChunk`, `ended` handler, optionally `timeupdate`.

---

## Phase 2 (if Phase 1 is insufficient): Stitch / rolling concatenation

**Clarification (what “#2” means):**
- We load **30s (chunk 1) + 10s (chunk 2)** and stitch them into one blob → user hears 40s.
- When playback passes the 30s mark, we want the next segment ready. So we **preload the next 10s (chunk 3)** and stitch **chunk 2 + chunk 3** into a second blob (10s + 10s = 20s).
- So we have: **blob A = [30s][10s]**, **blob B = [10s][10s]** (chunks 2 and 3 stitched). When 30s finishes we don’t swap blobs mid-stream; we either:
  - **Variant A:** Switch to a single `<audio>` whose `src` is blob B, and set `currentTime` to 0 (equivalent to “we’re at the start of the 10s+10s segment”). So we still do one “switch” but the next segment is already 20s long (chunks 2+3 stitched), reducing the number of switches.
  - **Variant B:** Keep one growing blob: start with [30s][10s]; when we approach 30s we append [10s] → [30s][10s][10s]. Then when we cross 30s we “logically” advance the window so we’re playing from 10s into the blob (chunks 2+3). That requires either a second element or MSE (see Phase 3), because a single `<audio>` + Blob URL can’t “slide” the start time.

So “30s + 10s, then 30s + 10s + 10s and stitch the last two (2 and 3)” is the idea: we keep **current + next** (and optionally next+next) stitched so that at the boundary we have a longer run of contiguous audio (e.g. 10s+10s) and do one switch to that, instead of switching every 10s. Stitching must use re-encoded chunks (as now) so concatenation is valid; we already have standalone MP3 chunks.

**Implementation sketch:**
- When we request “next”, we could request the next **two** chunks (or server sends “next” as a longer segment). Client stitches chunk N + chunk N+1 into one blob. On boundary we switch from “blob of chunk N-1+N” to “blob of chunk N+N+1”. So we still do a single `src` change and `currentTime = 0`, but each blob is two chunks stitched, reducing switch frequency and possibly making transitions smoother (one switch per 20s instead of per 10s, if chunk size is 10s).

---

## Phase 3 (if needed): Media Source Extensions (MSE)

Use **MSE** so the browser handles seamless playback:
- Create `MediaSource`, attach to `<audio src="blob:...">` or use a dedicated MSE URL.
- Append received chunks (as `ArrayBuffer`) into a `SourceBuffer` (e.g. `audio/mpeg` if supported, or re-encode to a container/codec that MSE supports well, e.g. fMP4).
- No manual “switch” of `audio.src` at boundaries; we just append the next chunk. Playback continues as long as the buffer has data.

**Caveats:**
- MSE support for raw MP3 is limited (e.g. not in Safari). Often you use fMP4 (AAC) or similar. So this may require a different preprocessing pipeline (e.g. output fMP4 segments) and possibly a different MIME/codec on the server.
- Larger change than Phase 1 or the stitch variant; treat as a more robust long-term option.

---

## Order of implementation

1. **Phase 1 — Force resume:** ✅ Implemented. Option A (forceResume from ended) + isSwitching guard.
2. **Phase 2 — Stitch:** ✅ Implemented. Client requests `count: 2`, server sends two chunks; client stitches into one 20s blob and switches at boundary (fewer switches).
3. **Phase 3 — MSE:** ✅ Implemented. When `MediaSource.isTypeSupported('audio/mpeg')` we use MediaSource + SourceBuffer; append chunks (count: 1) for seamless playback without switching. Fallback: blob mode (Phase 2).

---

## Summary

- **#2 (stitch)** = load 30s+10s, stitch; when 30s finishes we have 30s+10s+10s and we stitch the last two (chunk 2 and 3) so the next “segment” is 10s+10s; we then switch to that segment (one `src` change). Repeat for subsequent chunks.
- **MSE** = add as a potential fix in the plan (Phase 3); use SourceBuffer append for seamless playback (may require fMP4/codec changes).
- **Force resume** = try first (Phase 1): when switching at `ended`, force resume by passing a flag or tracking “was playing” so we always call `audio.play()` after the switch.
