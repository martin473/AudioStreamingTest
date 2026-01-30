---
status: active
last_updated: 2025-01-30
---

# Rules reality check

Cross-reference between this feature set and the project Cursor rules. Adjust planning docs until Phase 1 is realistic and actionable.

---

## Rules references

- [.cursor/rules/planning-and-research.mdc](../../.cursor/rules/planning-and-research.mdc) – Planning document structure, version folders, markdown version control, critical thinking.
- [.cursor/rules/coding-and-operating.mdc](../../.cursor/rules/coding-and-operating.mdc) – Development mental modes (Test / Build), improvement workflow, TDD, cleanup, dev environment.

---

## Planning and research rules

| Rule | Application | Realistic? |
|------|-------------|------------|
| Planning in version folder | We use `/planning/alpha/` for this build. | Yes. |
| Context, decisions, dependencies | [features-by-phase.md](features-by-phase.md) has phases, dependencies, and optional Phase 1a/1b split. | Yes. |
| Deprecation | When a doc is superseded, move to `planning/alpha/deprecatedplanning/` with datetime suffix. | Yes; apply when iterating. |
| Commit strategy | Use small commits; reference planning in commits (e.g. `planning: implement Phase 1.1`). | Yes. |

**Verdict:** Planning docs in `/planning/alpha/` with context and dependencies are realistic. No change required for Phase 1.

---

## Coding and operating rules

| Rule | Application | Realistic? |
|------|-------------|------------|
| Test vs Build mode | TDD: tests in `tests/`; source in `src/`. This project is Node/Astro (no Python). | Yes; use Vitest (or equivalent) and one Node env. |
| Single environment | Rules mention single `.venv` for Python. Here: one Node project, one `node_modules`, one dev server. | Yes. |
| Improvement workflow | Lint → tokenize → refactor is Python-specific (Scraper linter, code_compiler). | For Node/Astro: use ESLint/Prettier and test runner; document “Node/Astro equivalent” in this doc. |
| Unstable branch | Use `unstable/[feature]-[date]` for experimental work; merge to main only with approval. | Yes. |
| Post-commit cleanup | Remove generated/temp files; consolidate docs; deprecate outdated planning. | Yes. |

**Node/Astro equivalent for “improvement workflow”:**

- **Lint:** ESLint (and optionally Prettier) on `src/` and config.
- **Test:** Vitest (or Astro’s test story) for unit/integration tests; keep Test mode = `tests/` (or `src/**/*.test.ts`), Build mode = `src/` implementation.
- **Single env:** One `package.json`, one `node_modules`, one dev command (e.g. `astro dev` with custom server for WS).

**Verdict:** Phase 1 is realistic. Document that TDD and cleanup apply with Node/Astro tooling; no change to feature scope.

---

## Known gaps and risks

| Risk | Mitigation |
|------|-------------|
| **MSE vs decodeAudioData** | MSE with `audio/mpeg` is **Chromium-only**; Firefox does not support it. Use `MediaSource.isTypeSupported('audio/mpeg')` and fallback to decodeAudioData + AudioBufferSourceNode (or blob URL) for Firefox/Safari. Document in Phase 2. |
| **Backpressure** | Server and client should respect backpressure when sending/receiving large binary frames (e.g. chunk size, flow control). Plan does not yet detail this; add to Phase 1.5 or Phase 2.1 when implementing. |
| **Wire format** | Define request format (e.g. JSON `{"t": 45}` or `{"next": true}`) in pseudocode or feature-prototypes. Metadata vs audio deferred (Phase 4). |
| **Phase 1 scope** | If 1.1–1.5 feels too large, use Phase 1a (preprocess + index) and Phase 1b (server + send chunks) as in [features-by-phase.md](features-by-phase.md). |
| **Libraries** | Preprocess: **fluent-ffmpeg** + ffmpeg (or @ffmpeg-installer/ffmpeg). WebSocket: **ws**. Optional gapless: **gapless.js**. Do not implement custom MP3 frame parsing. See [planning-review.md](planning-review.md). |

---

## Iterative updates

- If Phase 1 implementation reveals that backpressure or chunk framing is critical, add a short “Phase 1.6” or update [pseudocode.md](pseudocode.md) and [feature-prototypes.yaml](feature-prototypes.yaml).
- If MSE is chosen in Phase 2, add a “Phase 2.0” decision note in [features-by-phase.md](features-by-phase.md) and reference it from [rules-reality-check.md](rules-reality-check.md).

---

## Summary

- **Planning-and-research:** Aligned; version folder and deprecation flow are in place.
- **Coding-and-operating:** Aligned with Node/Astro (ESLint, Vitest, single project env; unstable branch and cleanup apply).
- **Phase 1:** First chunk + WebSocket + simple play/pause is a realistic first milestone. Preprocess and index (1.1–1.2) can be done before or in parallel with server work (1.3–1.5).

Enough context is in place to walk through Phase 1.
