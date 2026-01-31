/**
 * E2E: Chunk flow – first chunk, next requested at 5s, switch at boundary.
 * Requires server: npm run build && npm run preview (default port 4321).
 * Run: npx playwright test tests/e2e/chunk-flow.spec.js
 *      or: npm run e2e
 */
/* eslint-disable no-undef */
import { test, expect } from "@playwright/test";

test.describe("chunk flow", () => {
  test("loads first chunk and shows Ready", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toBeVisible();
    await expect(page.locator("#status")).toContainText(/Ready/, { timeout: 15_000 });
    await expect(page.locator("#playPauseBtn")).toBeEnabled();
  });

  test("first 30s plays; next requested at ~25s appears in debug log", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toContainText(/Ready/, { timeout: 15_000 });

    const debugDetails = page.locator("#debugDetails");
    await debugDetails.click();

    await page.locator("#playPauseBtn").click();
    await page.waitForTimeout(500);

    await expect(page.locator("#audio")).toHaveJSProperty("paused", false);

    await page.waitForFunction(
      () => {
        const el = document.getElementById("debugLog");
        return el?.textContent?.includes("next requested");
      },
      { timeout: 30_000 }
    );

    const logText = await page.locator("#debugLog").textContent();
    expect(logText).toMatch(/next requested at songTime=\d+\.\d+s/);
  });

  test("playing past 30s triggers switch or late switch; no Error switching chunk", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#status")).toContainText(/Ready/, { timeout: 15_000 });

    const debugDetails = page.locator("#debugDetails");
    await debugDetails.click();

    await page.locator("#playPauseBtn").click();

    await page.waitForFunction(
      () => {
        const el = document.getElementById("debugLog");
        return el?.textContent?.includes("switch at boundary") || el?.textContent?.includes("next received");
      },
      { timeout: 35_000 }
    );

    const statusText = await page.locator("#status").textContent();
    expect(statusText).not.toBe("Error switching chunk.");
  });

  test("current time never exceeds buffer end (no 3:20 jump)", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    await expect(page.locator("#status")).toContainText(/Ready/, { timeout: 15_000 });

    await page.locator("#playPauseBtn").click();
    await page.waitForTimeout(35_000);

    const currentTimeText = await page.locator("#currentTime").textContent();
    const totalTimeText = await page.locator("#totalTime").textContent();

    const parseMMSS = (s) => {
      const parts = String(s ?? "0:00").trim().split(":");
      const m = parseInt(parts[0] ?? "0", 10);
      const s_ = parseInt(parts[1] ?? "0", 10);
      return m * 60 + s_;
    };

    const currentSec = parseMMSS(currentTimeText);
    const totalSec = parseMMSS(totalTimeText);

    expect(Number.isFinite(currentSec), "current time parses as number").toBe(true);
    expect(Number.isFinite(totalSec), "total time parses as number").toBe(true);
    expect(currentSec, "current time must not exceed total + 5s (no 3:20 jump)").toBeLessThanOrEqual(totalSec + 5);
    expect(currentSec, "current time must not show absurd value (e.g. 200s)").toBeLessThanOrEqual(300);
  });
});
