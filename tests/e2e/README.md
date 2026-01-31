# E2E tests (Playwright)

Debug scripts for the seek-past-buffer path and "Error loading audio" issue.

## Prerequisites

1. **Build and start the server** (in one terminal):

   ```bash
   npm run build
   npm run preview
   ```

   Server runs at `http://localhost:4321` by default. Use `PORT=4322 npm run preview` if 4321 is in use.

2. **Run e2e** (in another terminal):

   ```bash
   npx playwright test
   ```

   Or with a different base URL:

   ```bash
   BASE_URL=http://localhost:4322 npx playwright test
   ```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run e2e` | Run all e2e tests |
| `npm run e2e:seek` | Seek-past-buffer repro: load first chunk, click progress at 80%, wait for "Ready." or "Error loading audio." |
| `npm run e2e:chunk-flow` | Chunk flow: first chunk Ready, next requested at ~25s, switch at boundary, no 3:20 jump |
| `npm run e2e:debug` | Same flow; capture WebSocket events, console, status, and audio state to `tests/e2e/debug-seek-output.txt` |

## Output

- **e2e:seek**: Logs status and audio state (and console errors) to the test run.
- **e2e:debug**: Writes a dump to `tests/e2e/debug-seek-output.txt` (status, audio error, WS events, console errors/warnings, last 50 console lines).

## Install browsers (first time)

Playwright needs a browser. Install Chromium (requires sufficient disk space, ~150MB):

```bash
npx playwright install chromium
```

Or install all browsers: `npx playwright install`. If you see "Executable doesn't exist", run the install command above.
