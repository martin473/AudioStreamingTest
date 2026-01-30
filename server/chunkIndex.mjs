/**
 * Phase 1.2: Chunk index lookup. Pure functions for testability.
 * getChunk(index, sec) – find entry where start_s <= sec < end_s
 * getChunkByIndex(index, i) – entry at index i
 */

/**
 * @param {Array<{ id: number, start_s: number, end_s: number, path: string }>} index
 * @param {number} sec
 * @returns {typeof index[0] | null}
 */
export function getChunk(index, sec) {
  const s = Number(sec);
  if (!Number.isFinite(s) || s < 0) return null;
  const entry = index.find((c) => c.start_s <= s && s < c.end_s);
  return entry ?? null;
}

/**
 * @param {Array<{ id: number, start_s: number, end_s: number, path: string }>} index
 * @param {number} i
 * @returns {typeof index[0] | null}
 */
export function getChunkByIndex(index, i) {
  return index[i] ?? null;
}
