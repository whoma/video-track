# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based real-time video object detection app built with React, TypeScript, Vite, and TensorFlow.js. UI text is in Chinese. Deployed to GitHub Pages at `/video-track/` base path.

## Commands

- **Dev server:** `npm run dev`
- **Build:** `npm run build` (runs `tsc -b && vite build`)
- **Lint:** `npm run lint`
- **Preview production build:** `npm run preview`
- **Install deps:** `npm ci --legacy-peer-deps` (needed due to peer dep conflicts)

No test framework is configured.

## Architecture

Single-page React app using three TensorFlow.js models for real-time detection:

- **coco-ssd** — general object detection (default)
- **blazeface** — face detection
- **posenet** — pose estimation

### Key hooks

- `src/hooks/useDetector.ts` — Loads TF.js models (lazy, cached in refs), runs `requestAnimationFrame` detection loop against a video element, tracks detection stats (count, latency, model type). Exposes `loadModel`, `switchModel`, `startDetection`, `stopDetection`.
- `src/hooks/useCamera.ts` — Manages `MediaStream` (camera) and file-based video sources. Handles camera enumeration, switching, and cleanup.

### Data flow

`App.tsx` orchestrates everything: connects camera hook to detector hook, wires up `DrawCallbacks` (created by `VideoPanel`) to the detection loop. Detection results are drawn onto a `<canvas>` overlay via `src/utils/drawDetections.ts`. Detection class names are broadcast via `CustomEvent('detection-classes')` for the `StatsChart` to consume.

### Components

All in `src/components/`, each with a co-located `.css` file:
- `VideoPanel` — video element + canvas overlay + loading state
- `Controls` — start/stop/capture buttons
- `ModelSelector` — model switching UI
- `SourceSelector` — camera picker + file upload
- `StatusBar` — detection count, latency, model info
- `StatsChart` — bar chart of detected classes + FPS (uses recharts)
- `SnapshotGallery` — captured frame thumbnails

### CI/CD

GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys to GitHub Pages on push to `main`. Uses Node 20 and `npm ci --legacy-peer-deps`.
