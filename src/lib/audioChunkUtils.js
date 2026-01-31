/**
 * Pure helpers for client chunk/stream logic. Testable without DOM.
 * First chunk: 0–30s; then 10s chunks: 30–40, 40–50, …
 */

const FIRST_CHUNK_SEC = 30;
const CHUNK_SEC = 10;

/**
 * @param {number} timeSec - position in song (seconds)
 * @param {number} totalDuration - total song duration (seconds)
 * @returns {{ start_s: number, end_s: number } | null}
 */
export function getChunkRange(timeSec, totalDuration) {
  if (totalDuration <= 0) return null;
  const t = Math.max(0, Math.min(timeSec, totalDuration));
  const start_s = t < FIRST_CHUNK_SEC ? 0 : FIRST_CHUNK_SEC + CHUNK_SEC * Math.floor((t - FIRST_CHUNK_SEC) / CHUNK_SEC);
  const end_s = t < FIRST_CHUNK_SEC ? FIRST_CHUNK_SEC : Math.min(FIRST_CHUNK_SEC + CHUNK_SEC * (Math.floor((t - FIRST_CHUNK_SEC) / CHUNK_SEC) + 1), totalDuration);
  return { start_s, end_s };
}

/**
 * @param {number} start_s
 * @param {number} end_s
 * @param {string} [cacheName='audio-chunks']
 * @returns {string}
 */
export function cacheKey(start_s, end_s, cacheName = "audio-chunks") {
  return `/${cacheName}/chunk_${start_s}_${end_s}`;
}

/**
 * @param {number} sec
 * @returns {string} "M:SS"
 */
export function formatMMSS(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Clamp reported song time so we never show past buffer end (avoids wrong display when blob has bad duration).
 * @param {number} bufferStartTime
 * @param {number} currentTime - element currentTime
 * @param {number} bufferEndSec
 * @returns {number}
 */
export function getSongCurrentTimeClamped(bufferStartTime, currentTime, bufferEndSec) {
  const raw = bufferStartTime + currentTime;
  return bufferEndSec > bufferStartTime ? Math.min(raw, bufferEndSec) : raw;
}

/**
 * Should we request the next chunk? (5s before buffer end)
 * @param {number} songTime
 * @param {number} bufferEndSec
 * @param {number} totalDuration
 * @param {number} [bufferAheadSec=5]
 * @returns {boolean}
 */
export function shouldRequestNext(songTime, bufferEndSec, totalDuration, bufferAheadSec = 5) {
  return totalDuration > 0 && bufferEndSec < totalDuration && songTime >= bufferEndSec - bufferAheadSec && songTime < bufferEndSec;
}

/**
 * Should we switch to the pending next chunk? (0.05s before buffer end)
 * @param {number} songTime
 * @param {number} bufferEndSec
 * @param {number} [thresholdSec=0.05]
 * @returns {boolean}
 */
export function shouldSwitchAtBoundary(songTime, bufferEndSec, thresholdSec = 0.05) {
  return songTime >= bufferEndSec - thresholdSec;
}
