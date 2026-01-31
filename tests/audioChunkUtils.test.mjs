/**
 * Unit tests for client chunk/stream helpers (src/lib/audioChunkUtils.js).
 * Run: npm test
 */
import { describe, it, expect } from "vitest";
import {
  getChunkRange,
  cacheKey,
  formatMMSS,
  getSongCurrentTimeClamped,
  shouldRequestNext,
  shouldSwitchAtBoundary,
} from "../src/lib/audioChunkUtils.js";

const TOTAL = 251.4;

describe("getChunkRange", () => {
  it("returns first chunk 0–30 for time in [0, 30)", () => {
    expect(getChunkRange(0, TOTAL)).toEqual({ start_s: 0, end_s: 30 });
    expect(getChunkRange(15, TOTAL)).toEqual({ start_s: 0, end_s: 30 });
    expect(getChunkRange(29.99, TOTAL)).toEqual({ start_s: 0, end_s: 30 });
  });

  it("returns chunk 30–40 for time in [30, 40)", () => {
    expect(getChunkRange(30, TOTAL)).toEqual({ start_s: 30, end_s: 40 });
    expect(getChunkRange(35, TOTAL)).toEqual({ start_s: 30, end_s: 40 });
    expect(getChunkRange(39.99, TOTAL)).toEqual({ start_s: 30, end_s: 40 });
  });

  it("returns chunk 120–130 for time in [120, 130)", () => {
    expect(getChunkRange(120, TOTAL)).toEqual({ start_s: 120, end_s: 130 });
    expect(getChunkRange(125, TOTAL)).toEqual({ start_s: 120, end_s: 130 });
  });

  it("returns null when totalDuration <= 0", () => {
    expect(getChunkRange(10, 0)).toBeNull();
    expect(getChunkRange(10, -1)).toBeNull();
  });

  it("clamps time to [0, totalDuration]", () => {
    expect(getChunkRange(300, TOTAL)).toEqual({ start_s: 250, end_s: 251.4 });
    expect(getChunkRange(-5, TOTAL)).toEqual({ start_s: 0, end_s: 30 });
  });
});

describe("cacheKey", () => {
  it("returns path with start_s and end_s", () => {
    expect(cacheKey(0, 30)).toBe("/audio-chunks/chunk_0_30");
    expect(cacheKey(30, 40)).toBe("/audio-chunks/chunk_30_40");
  });

  it("accepts custom cache name", () => {
    expect(cacheKey(0, 30, "my-cache")).toBe("/my-cache/chunk_0_30");
  });
});

describe("formatMMSS", () => {
  it("formats seconds as M:SS", () => {
    expect(formatMMSS(0)).toBe("0:00");
    expect(formatMMSS(30)).toBe("0:30");
    expect(formatMMSS(65)).toBe("1:05");
    expect(formatMMSS(200)).toBe("3:20");
  });

  it("returns 0:00 for invalid or negative", () => {
    expect(formatMMSS(-1)).toBe("0:00");
    expect(formatMMSS(NaN)).toBe("0:00");
  });
});

describe("getSongCurrentTimeClamped", () => {
  it("returns bufferStartTime + currentTime when below buffer end", () => {
    expect(getSongCurrentTimeClamped(0, 10, 30)).toBe(10);
    expect(getSongCurrentTimeClamped(30, 5, 40)).toBe(35);
  });

  it("clamps to bufferEndSec when raw would exceed it", () => {
    expect(getSongCurrentTimeClamped(30, 200, 40)).toBe(40);
    expect(getSongCurrentTimeClamped(0, 100, 30)).toBe(30);
  });

  it("returns raw when bufferEndSec <= bufferStartTime (no clamp)", () => {
    expect(getSongCurrentTimeClamped(30, 5, 30)).toBe(35);
  });
});

describe("shouldRequestNext", () => {
  it("returns true when 5s before buffer end and more song exists", () => {
    expect(shouldRequestNext(25, 30, 100)).toBe(true);
    expect(shouldRequestNext(24.9, 30, 100)).toBe(false);
  });

  it("returns false when at or past buffer end", () => {
    expect(shouldRequestNext(30, 30, 100)).toBe(false);
  });

  it("returns false when buffer is full song", () => {
    expect(shouldRequestNext(95, 100, 100)).toBe(false);
  });

  it("respects custom bufferAheadSec", () => {
    expect(shouldRequestNext(28, 30, 100, 2)).toBe(true);
    expect(shouldRequestNext(27, 30, 100, 2)).toBe(false);
  });
});

describe("shouldSwitchAtBoundary", () => {
  it("returns true when songTime >= bufferEnd - 0.05", () => {
    expect(shouldSwitchAtBoundary(29.96, 30)).toBe(true);
    expect(shouldSwitchAtBoundary(30, 30)).toBe(true);
    expect(shouldSwitchAtBoundary(29.9, 30)).toBe(false);
  });

  it("respects custom thresholdSec", () => {
    expect(shouldSwitchAtBoundary(29.5, 30, 0.5)).toBe(true);
    expect(shouldSwitchAtBoundary(29.4, 30, 0.5)).toBe(false);
  });
});
