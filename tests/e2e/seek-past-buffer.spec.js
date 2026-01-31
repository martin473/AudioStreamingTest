/**
 * E2E: Seek past buffer – reproduce "Error loading audio" path.
 * Requires server: npm run build && npm run preview (default port 4321).
 * Run: npx playwright test tests/e2e/seek-past-buffer.spec.js
 *      or: npm run e2e:seek
 */
/* eslint-disable no-undef -- callbacks run in browser via page.evaluate / waitForFunction */
import { test, expect } from "@playwright/test";

const SEEK_WAIT_MS = 15_000;

test.describe("seek past buffer", () => {
  test("loads first chunk then seek past buffer; outcome is Ready or Error loading audio", async ({
    page,
  }) => {
    const consoleLogs = [];
    const consoleErrors = [];
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") consoleErrors.push(text);
      else consoleLogs.push({ type: msg.type(), text });
    });

    await page.goto("/");
    await expect(page.locator("#status")).toBeVisible();

    // Wait for first chunk: status shows "Ready" (Ready. Press Play. or Ready.)
    await expect(page.locator("#status")).toContainText(/Ready/, {
      timeout: 10_000,
    });

    // Click progress bar at 80% (past first 30s buffer)
    const wrap = page.locator("#progressWrap");
    await expect(wrap).toBeVisible();
    const box = await wrap.boundingBox();
    if (!box) throw new Error("progressWrap has no bounding box");
    await wrap.click({
      position: { x: box.width * 0.8, y: box.height / 2 },
    });

    // Wait for outcome: "Ready." or "Error loading audio."
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

    // Log for CI/debug
    console.log("Status after seek:", statusText);
    console.log("Audio state:", JSON.stringify(audioState, null, 2));
    if (consoleErrors.length) {
      console.log("Console errors:", consoleErrors);
    }

    // Regression: we expect either success or the known error message
    expect(
      statusText === "Ready." || statusText === "Error loading audio.",
      `Expected status "Ready." or "Error loading audio.", got: ${statusText}`
    ).toBeTruthy();
  });
});
