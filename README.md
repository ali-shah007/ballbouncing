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

## Planet Destruction mode

Open `/planet-destruction` or choose **Planet destruction** in the mode switcher. This separately loaded Three.js/WebGL 2 scene includes three worlds, terrain and atmosphere shading, local 2K Earth-like surface textures, ocean reflections, night lights, impact scars, emissive fractures, particles, shockwaves, bloom, and instanced debris.

Select Orbital laser, Meteor strike, or Antimatter; click a point on the planet or press Launch attack for a visible random target. Drag to rotate. Keys 1–3 select attacks and Space pauses. Impact power controls damage; at zero integrity, the world fragments. Reset rebuilds it. Auto barrage launches attacks every 1.65 simulation seconds.

Use cinema or browser fullscreen for a larger viewport. High quality enables bloom; Balanced reduces pixel density and disables postprocessing. Camera shake respects reduced-motion preferences and can be switched off. The original bouncing-ball workspace is wider and its Bigger view now expands to the available viewport instead of a 720px panel.

Planet recording captures only the 3D canvas and generated sound (not the interface), with up to 1920×1080 canvas pixels depending on viewport and quality. Stop manually or let the 30-second limit finish. Keep the tab visible. No account, external texture CDN, or API keys are needed. Surface textures and their upstream license are under `public/textures/`.

This is a fictional cinematic sandbox, not a physically accurate planetary fracture model. Damage, strike timing, and integrity are simulated; glow, scars, debris, and destruction are visual effects. Planet scenes do not use bouncing-ball episode checkpoints.

## Deployment and search

Canonical URLs and sitemap generation are intentionally omitted. `NEXT_PUBLIC_SITE_URL` is optional and only sets the base URL for social sharing metadata. Deploy to a Next.js-compatible host when ready.

## Vercel deployment

Import `ali-shah007/ballbouncing` and deploy branch `main` from the repository root (leave Root Directory empty). The checked-in `vercel.json` explicitly selects the Next.js framework, `npm ci`, `npm run build`, and the `.next` build output. No environment variables are required.

After a new commit, open the **latest Ready deployment** using Vercel’s Visit button or the project’s production domain. Older deployment-specific URLs continue to reference their original build. If a fresh deployment still returns a platform 404, inspect its build log and confirm the project points to this repository and root directory; these account settings cannot be changed by repository configuration.

## Current boundaries

Recording uses MediaRecorder and the browser's supported format, generally WebM; it is real-time and requires a visible tab. Output is 900×1125 or 900×1600, requested at 60fps (actual frame rate depends on hardware). The next-episode teaser appears during the final two seconds. Use desktop Chrome or Firefox for the broadest recording support. Background tabs may throttle rendering. Resizing the recording canvas is disabled during recording. Stories remain on the device; export JSON for backup.

Physics models ball-to-ring and equal-mass ball-to-ball collisions. The first five balls have recurring character identities. Audio trigger frequency and ball count are bounded. Checkpoints reproduce physical state, but transient particles and audio tails are not persisted. Individual character name editing, multi-ring seasons, fixed-frame export, and universal MP4 are future enhancements.

## Nation Rise

Open `/nation-rise` for the separate idle country-building game. Select a country, build and upgrade ten project types across six fictional development districts, balance food/power/housing, and grow employment and wellbeing. Research unlocks construction crews, trade terminals, and an automatic regional manager. Policies affect taxation and pollution; six milestones award treasury bonuses, and periodic economic events adjust reserves.

Local per-country campaigns autosave every five seconds. Offline simulation is capped at four hours, and JSON export/import supports backups and transfers. Browser storage is not an online account. Record the animated 1600×1000 map with its treasury, population, resource indicators, and explanatory captions for up to 60 seconds; output format depends on browser support. Nation recordings are silent. Time-lapse supports 1×, 2×, and 5× economy speed.

Country outlines come from Natural Earth (public domain), hosted locally. The largest mainland polygon is shown; islands and overseas territories are not fully represented in this development view. Buildings are stylized canvas dioramas, not street-level 3D reconstructions. Districts, population and economic values are fictional and balanced for gameplay. This is a single-player local game, without multiplayer, server accounts, real financial forecasts, or a global leaderboard.
