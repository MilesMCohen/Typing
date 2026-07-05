# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server (`--host`, binds all interfaces). Reads `PORT` from the environment if set, otherwise defaults to 5173.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the built `dist/` output locally.

There is no test suite or linter configured in this project.

## Architecture

This is a static, vanilla-JS (no framework) Vite project deployed to GitHub Pages, with Firebase providing the only backend/data-persistence layer. There is no server of any kind — all Firebase calls happen directly from client-side JS in the browser.

- **Entry point**: `index.html` loads `main.js` as an ES module. `main.js` currently contains a minimal cloud-save proof-of-concept UI (sign in with Google, save/load a test score) rather than actual game code — the game itself has not been built yet.
- **Firebase**: `src/firebase.js` initializes the Firebase app and exports `auth` (Firebase Auth) and `db` (Firestore). The `firebaseConfig` object is hardcoded there intentionally — Firebase's web config is not a secret (security comes from Firestore/Auth rules, not from hiding this object), so there is deliberately no `.env`/env-var indirection for it.
- **Data model**: Firestore stores per-user data at `users/{uid}`, keyed by the Firebase Auth UID. `firestore.rules` restricts each document to `request.auth.uid == userId`. **Rules changes must be manually pasted into the Firebase console's Firestore Rules tab and published** — there is no CI/CD step or Firebase CLI deploy wired up for `firestore.rules`; the file in this repo is the source of truth but is not automatically applied.
- **Auth**: Google sign-in via `signInWithPopup`. Any new domain the app is served from must be added to Firebase Auth's Authorized domains list in the console, or sign-in will fail there (`localhost` is allowed by default; `milesmcohen.github.io` has been added for production).
- **Deployment**: `.github/workflows/deploy.yml` builds and deploys `dist/` to GitHub Pages on every push to `main`, via `actions/upload-pages-artifact` + `actions/deploy-pages`. `vite.config.js` sets `base: "/Typing/"` to match the GitHub Pages path (`https://milesmcohen.github.io/Typing/`). Pages itself is configured (once, via the GitHub API/console) to build from GitHub Actions rather than a branch.
- **GitHub account**: this repo lives under the `MilesMCohen` GitHub account, which is a different `gh` CLI account than the machine's default (`mcohen_adobe`). Running `gh`/`git` commands from this repo's directory picks up `MilesMCohen` automatically via `direnv` — `.envrc` (gitignored, holds `GH_TOKEN`) is loaded per-directory; see `.envrc.example` for the template. Run `direnv allow` after creating `.envrc` locally.
