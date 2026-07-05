# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server (`--host`, binds all interfaces). Reads `PORT` from the environment if set, otherwise defaults to 5173.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the built `dist/` output locally.
- `npm run test` — run the Vitest unit test suite once (no watch mode).

There is no linter configured in this project.

## Architecture

This is a React + Vite project (migrated from an initial vanilla-JS scaffold) deployed to GitHub Pages, with Firebase providing the only backend/data-persistence layer. There is no server of any kind — all Firebase calls happen directly from client-side JS in the browser.

- **Entry point**: `index.html` mounts `src/main.jsx`, which renders `src/App.jsx`. `App.jsx` is a screen router (`menu` / `game` / `results`, animated with Framer Motion's `AnimatePresence`) between `src/Menu.jsx`, `src/Game.jsx`, and `src/Results.jsx`.
- **Game**: a progressive touch-typing game. `src/lessons.js` defines `LESSONS` (Home Row / Upper Row / Full Keyboard, each with a curated word list), plus `WORDS_PER_LINE` / `LINES_PER_ROUND` and `randomWords()` to sample a 3-line round. `src/typing.js` holds the pure scoring logic (`getCharStatuses`, `computeAccuracy`, `computeWpm`) used by `Game.jsx` to render live per-character feedback and compute results — kept separate from the component specifically so it's unit-testable without rendering React. `src/typing.test.js` and `src/lessons.test.js` cover this logic; expect these to need updating as the game design changes.
- **SnowLeopard animation**: `src/SnowLeopard.jsx` renders a PixiJS (`pixi.js`, imperative canvas API, not `@pixi/react`) side-scrolling scene — parallax mountain layers, falling snow, and a leopard that jumps crag-to-crag as a `progress` prop (0–1) advances, reaching a snow-capped peak with food at `progress === 1`. It manages its own `Application` lifecycle in a `useEffect` (async `app.init()`, manual `app.destroy()` on unmount) since Menu/Game/Results mount and unmount it repeatedly via `AnimatePresence`. Used decoratively (idle) in `Menu.jsx`, live-tied to typing progress in `Game.jsx`, and at `progress={1}` in `Results.jsx`. The deterministic terrain/jump math (`buildCrags`, `leopardPosition`) lives in `src/terrain.js`, split out from the Pixi drawing code specifically so it's unit-testable — same rationale as `typing.js` below.
- **Testing**: Vitest is configured with no separate config file (it reads `vite.config.js` automatically). Tests are colocated as `*.test.js` next to the module they cover, and only exercise plain functions (no component rendering, no jsdom) so the suite stays fast — this is the primary way to verify game-logic changes, faster than manually exercising the UI. `src/lessons.js`'s `splitIntoLines` (used by `Game.jsx` to break the flat typing target into display rows) and `src/terrain.js`'s crag/jump math are covered this way; when adding new non-visual logic (scoring, layout math, animation curves), prefer extracting a pure function and testing it here over relying on the browser preview.
- **Firebase**: `src/firebase.js` initializes the Firebase app and exports `auth` (Firebase Auth) and `db` (Firestore). The `firebaseConfig` object is hardcoded there intentionally — Firebase's web config is not a secret (security comes from Firestore/Auth rules, not from hiding this object), so there is deliberately no `.env`/env-var indirection for it.
- **Data model**: Firestore stores per-user data at `users/{uid}`, keyed by the Firebase Auth UID. `firestore.rules` restricts each document to `request.auth.uid == userId`. **Rules changes must be manually pasted into the Firebase console's Firestore Rules tab and published** — there is no CI/CD step or Firebase CLI deploy wired up for `firestore.rules`; the file in this repo is the source of truth but is not automatically applied.
- **Auth**: Google sign-in via `signInWithPopup`. Any new domain the app is served from must be added to Firebase Auth's Authorized domains list in the console, or sign-in will fail there (`localhost` is allowed by default; `milesmcohen.github.io` has been added for production).
- **Deployment**: `.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on every push to `main`, via `actions/upload-pages-artifact` + `actions/deploy-pages`. `vite.config.js` sets `base: "/Typing/"` to match the GitHub Pages path (`https://milesmcohen.github.io/Typing/`). Pages itself is configured (once, via the GitHub API/console) to build from GitHub Actions rather than a branch.
- **GitHub account**: this repo lives under the `MilesMCohen` GitHub account, which is a different `gh` CLI account than the machine's default (`mcohen_adobe`). Running `gh`/`git` commands from this repo's directory picks up `MilesMCohen` automatically via `direnv` — `.envrc` (gitignored, holds `GH_TOKEN`) is loaded per-directory; see `.envrc.example` for the template. Run `direnv allow` after creating `.envrc` locally.

## Verifying changes

Prefer `npm run test` over the Claude Code browser preview for verifying changes. Whenever logic can be expressed as a pure function (scoring, layout/offset math, animation curves like `terrain.js`'s crag/jump interpolation), extract it out of the component/rendering code and cover it with a Vitest test, per the pattern above — this is faster to run and keeps working even when a browser preview isn't available. Only spin up the preview for changes that are inherently visual/interactive and can't be meaningfully asserted on in a unit test (layout, animation feel, colors, click flows) — and even then, prefer the smallest check that answers the question (e.g. inspecting DOM/canvas state) over a full manual click-through.
