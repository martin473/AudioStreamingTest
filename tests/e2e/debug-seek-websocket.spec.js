/**
 * E2E: Seek past buffer with WebSocket and console capture; dump to file for debugging.
 * Requires server: npm run build && npm run preview (default port 4321).
 * Run: npx playwright test tests/e2e/debug-seek-websocket.spec.js
 *      or: npm run e2e:debug
 * Output: tests/e2e/debug-seek-output.txt
 */
/* eslint-disable no-undef -- callbacks run in browser via page.evaluate / waitForFunction */
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "debug-seek-output.txt");

const SEEK_WAIT_MS = 15_000;

function dump(lines) {
  const body = Array.isArray(lines) ? lines.join("\n") : String(lines);
  fs.writeFileSync(OUTPUT_PATH, body, "utf8");
}

test.describe("debug seek WebSocket", () => {
  test("seek past buffer and capture WS + console + status to file", async ({
    page,
  }) => {
    const consoleEntries = [];
    const wsEvents = [];

    page.on("console", (msg) => {
      consoleEntries.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    page.on("websocket", (ws) => {
      const url = ws.url();
      wsEvents.push({ event: "open", url });
      ws.on("close", () => wsEvents.push({ event: "close", url }));
      ws.on("socketerror", (err) =>
        wsEvents.push({ event: "socketerror", url, err: String(err) })
      );
    });

    await page.goto("/");
    await expect(page.locator("#status")).toBeVisible();

    await expect(page.locator("#status")).toContainText(/Ready/, {
      timeout: 10_000,
    });

    const wrap = page.locator("#progressWrap");
    await expect(wrap).toBeVisible();
    const box = await wrap.boundingBox();
    if (!box) throw new Error("progressWrap has no bounding box");
    await wrap.click({
      position: { x: box.width * 0.8, y: box.height / 2 },
    });

    await page.waitForFunction(
      () => {
        const el = document.getElementById("status");
        const t = el?.textContent?.trim() ?? "";
        return t === "Ready." || t === "Error loading audio.";
      },
      { timeout: SEEK_WAIT_MS }
    );

    const statusText = await page.locator("#status").textContent();
    const audioState = await page.evaluate(() => {
      const a = document.getElementById("audio");
      return {
        readyState: a?.readyState,
        networkState: a?.networkState,
        error: a?.error
          ? { code: a.error.code, message: a.error.message }
          : null,
      };
    });

    const errors = consoleEntries.filter((e) => e.type === "error");
    const warnings = consoleEntries.filter((e) => e.type === "warning");

    const lines = [
      "=== Debug seek output ===",
      new Date().toISOString(),
      "",
      "--- Status ---",
      statusText ?? "(null)",
      "",
      "--- Audio state ---",
      JSON.stringify(audioState, null, 2),
      "",
      "--- WebSocket events ---",
      ...wsEvents.map((e) => JSON.stringify(e)),
      "",
      "--- Console errors ---",
      ...errors.map((e) => `[${e.type}] ${e.text}`),
      "",
      "--- Console warnings ---",
      ...warnings.map((e) => `[${e.type}] ${e.text}`),
      "",
      "--- All console (last 50) ---",
      ...consoleEntries.slice(-50).map((e) => `[${e.type}] ${e.text}`),
    ];

    dump(lines);

    expect(
      statusText === "Ready." || statusText === "Error loading audio.",
      `Expected status "Ready." or "Error loading audio.", got: ${statusText}`
    ).toBeTruthy();
  });
});
