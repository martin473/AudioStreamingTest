/**
 * Phase 1.2: Tests for chunk index lookup (Test mode – tests/ only).
 * getChunk(index, sec) and getChunkByIndex(index, i).
 */

import { describe, it, expect } from "vitest";
import { getChunk, getChunkByIndex } from "../server/chunkIndex.mjs";

const fixtureIndex = [
  { id: 0, start_s: 0, end_s: 30, path: "chunk_0.mp3" },
  { id: 1, start_s: 30, end_s: 40, path: "chunk_1.mp3" },
  { id: 2, start_s: 40, end_s: 50, path: "chunk_2.mp3" },
  { id: 3, start_s: 50, end_s: 55.5, path: "chunk_3.mp3" },
];

describe("getChunk", () => {
  it("returns chunk 0 for sec in [0, 30)", () => {
    expect(getChunk(fixtureIndex, 0)).toEqual(fixtureIndex[0]);
    expect(getChunk(fixtureIndex, 15)).toEqual(fixtureIndex[0]);
    expect(getChunk(fixtureIndex, 29.99)).toEqual(fixtureIndex[0]);
  });

  it("returns chunk 1 for sec in [30, 40)", () => {
    expect(getChunk(fixtureIndex, 30)).toEqual(fixtureIndex[1]);
    expect(getChunk(fixtureIndex, 35)).toEqual(fixtureIndex[1]);
    expect(getChunk(fixtureIndex, 39.99)).toEqual(fixtureIndex[1]);
  });

  it("returns chunk 2 for sec in [40, 50)", () => {
    expect(getChunk(fixtureIndex, 40)).toEqual(fixtureIndex[2]);
    expect(getChunk(fixtureIndex, 45)).toEqual(fixtureIndex[2]);
  });

  it("returns tail chunk for sec in [50, 55.5)", () => {
    expect(getChunk(fixtureIndex, 50)).toEqual(fixtureIndex[3]);
    expect(getChunk(fixtureIndex, 55)).toEqual(fixtureIndex[3]);
  });

  it("returns null for sec >= last end_s", () => {
    expect(getChunk(fixtureIndex, 55.5)).toBeNull();
    expect(getChunk(fixtureIndex, 100)).toBeNull();
  });

  it("returns null for negative or invalid sec", () => {
    expect(getChunk(fixtureIndex, -1)).toBeNull();
    expect(getChunk(fixtureIndex, NaN)).toBeNull();
  });
});

describe("getChunkByIndex", () => {
  it("returns entry at valid index", () => {
    expect(getChunkByIndex(fixtureIndex, 0)).toEqual(fixtureIndex[0]);
    expect(getChunkByIndex(fixtureIndex, 3)).toEqual(fixtureIndex[3]);
  });

  it("returns null for out-of-range index", () => {
    expect(getChunkByIndex(fixtureIndex, 4)).toBeNull();
    expect(getChunkByIndex(fixtureIndex, -1)).toBeNull();
  });
});
