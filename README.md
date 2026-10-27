# Orbit Studio

A browser-based bouncing ball video creator built with Next.js, React, TypeScript, PixiJS/WebGL, and Web Audio.

## Development

Use Node.js 22 or newer and npm. From the checkout:

```sh
npm ci --cache /tmp/orbit-npm-cache
npm run dev
```

Open the application on port 3000. The first Play interaction enables sound. No API keys, database, or backend services are required. Use the existing checkout; cloud tasks are already isolated and do not need Git worktrees.

```sh
npm test
npm run typecheck
npm run test:e2e # uses /usr/bin/chromium; override with CHROMIUM_PATH
npm run build
npm start
```

## Included

- Five presets, seeded fixed-step simulation, rotating ring, escape spawning, gravity modes, bounded population, pulsing openings.
- GPU-rendered layered glow, trails, particles, three palettes, portrait and 4:5 compositions.
- Pentatonic impact tones and escape chimes; browser video recording with generated audio.
- Story hooks, ending teasers, numbered episodes, IndexedDB checkpoints, continuation, JSON export/import.
- Server-rendered landing and distinct preset content, guide, page metadata, robots, generated social image, local fonts.

## Deployment and search

Canonical URLs and sitemap generation are intentionally omitted. `NEXT_PUBLIC_SITE_URL` is optional and only sets the base URL for social sharing metadata. Deploy to a Next.js-compatible host when ready.

## Current boundaries

Recording uses MediaRecorder and the browser's supported format, generally WebM; it is real-time and requires a visible tab. Output is 900×1125 or 900×1600, requested at 60fps (actual frame rate depends on hardware). The next-episode teaser appears during the final two seconds. Use desktop Chrome or Firefox for the broadest recording support. Background tabs may throttle rendering. Resizing the recording canvas is disabled during recording. Stories remain on the device; export JSON for backup.

Physics models ball-to-ring and equal-mass ball-to-ball collisions. The first five balls have recurring character identities. Audio trigger frequency and ball count are bounded. Checkpoints reproduce physical state, but transient particles and audio tails are not persisted. Individual character name editing, multi-ring seasons, fixed-frame export, and universal MP4 are future enhancements.
