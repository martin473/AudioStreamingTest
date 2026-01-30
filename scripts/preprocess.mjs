/**
 * Phase 1.1: Preprocess MP3 from /music into timecoded chunks.
 * Uses fluent-ffmpeg (requires ffmpeg on PATH or @ffmpeg-installer/ffmpeg).
 * Output: music/chunks/chunk_0.bin, chunk_1.bin, ... and chunk_index.json.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "fluent-ffmpeg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MUSIC_DIR = path.join(ROOT, "music");
const CHUNKS_DIR = path.join(MUSIC_DIR, "chunks");
const FIRST_CHUNK_SEC = 30;
const CHUNK_SEC = 10;

// Optional: use @ffmpeg-installer/ffmpeg and @ffprobe-installer/ffprobe if available
try {
  const { path: ffmpegPath } = (await import("@ffmpeg-installer/ffmpeg")).default;
  ffmpeg.setFfmpegPath(ffmpegPath);
} catch {
  // use system ffmpeg
}
try {
  const { path: ffprobePath } = (await import("@ffprobe-installer/ffprobe")).default;
  ffmpeg.setFfprobePath(ffprobePath);
} catch {
  // use system ffprobe
}

function getFirstMp3(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Music directory not found: ${dir}. Add an MP3 file to music/ and run again.`);
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const mp3 = entries.find((e) => e.isFile() && e.name.toLowerCase().endsWith(".mp3"));
  if (!mp3) throw new Error(`No .mp3 file found in ${dir}. Add an MP3 and run again.`);
  return path.join(dir, mp3.name);
}

function getDuration(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return reject(err);
      const duration = data.format.duration;
      if (duration == null) return reject(new Error("Could not get duration"));
      resolve(duration);
    });
  });
}

function extractSegment(inputPath, outputPath, startSec, durationSec) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startSec)
      .setDuration(durationSec)
      .outputOptions(["-c copy"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", reject)
      .run();
  });
}

async function main() {
  const inputPath = getFirstMp3(MUSIC_DIR);
  console.log("Input:", inputPath);

  if (!fs.existsSync(CHUNKS_DIR)) {
    fs.mkdirSync(CHUNKS_DIR, { recursive: true });
  }

  const duration = await getDuration(inputPath);
  console.log("Duration (s):", duration.toFixed(1));

  const index = [];

  // Chunk 0: 0–30s (use .mp3 so ffmpeg accepts; server sends as binary)
  const chunk0Path = path.join(CHUNKS_DIR, "chunk_0.mp3");
  const firstDuration = Math.min(FIRST_CHUNK_SEC, duration);
  await extractSegment(inputPath, chunk0Path, 0, firstDuration);
  index.push({ id: 0, start_s: 0, end_s: firstDuration, path: "chunk_0.mp3" });
  console.log("Wrote chunk_0.mp3 [0–" + firstDuration + "s]");

  let start = FIRST_CHUNK_SEC;
  let i = 1;
  while (start < duration) {
    const end = Math.min(start + CHUNK_SEC, duration);
    const segDuration = end - start;
    const chunkPath = path.join(CHUNKS_DIR, `chunk_${i}.mp3`);
    await extractSegment(inputPath, chunkPath, start, segDuration);
    index.push({ id: i, start_s: start, end_s: end, path: `chunk_${i}.mp3` });
    console.log(`Wrote chunk_${i}.mp3 [${start}–${end}s]`);
    start = end;
    i++;
  }

  const indexPath = path.join(CHUNKS_DIR, "chunk_index.json");
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  console.log("Wrote", indexPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
