import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
// These are 2D canvas captures. Use Chromium's default 2D backend rather than
// forcing the software 3D driver required by the separate planet WebGL tests.
test.use({
  launchOptions: {
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  },
});
test("private access rejects anonymous, wrong password and cross-origin requests", async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const p = await context.newPage();
  for (const path of [
    "/",
    "/shorts-lab",
    "/nation-state",
    "/planet-destruction",
    "/guides",
  ]) {
    await p.goto("http://127.0.0.1:3000" + path);
    await expect(p).toHaveURL(/login/);
  }
  await p.getByLabel("Username", { exact: true }).fill("wrong");
  await p.getByLabel("Password", { exact: true }).fill("wrong");
  await p.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(p.getByRole("alert")).toContainText("Incorrect");
  const r = await context.request.post("http://127.0.0.1:3000/login", {
    headers: { Origin: "https://evil.test" },
    form: { username: "wrong", password: "wrong" },
  });
  expect(r.status()).toBe(403);
  await context.close();
});
test("five reference modes render and record portrait video with sound", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/shorts-lab");
  for (const name of [
    "Four-Second Escape",
    "Growing Ball",
    "Neon Duel",
    "Splitter Overflow",
    "Collision Chase",
  ]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await expect(
      page.getByRole("button", { name: new RegExp(name) }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Play with sound" }).click();

  await page.getByRole("button", { name: "Record Shorts video" }).click();
  await expect(
    page.getByRole("button", { name: /Stop recording/ }),
  ).toBeVisible();
  await page.waitForTimeout(5500);
  await page.getByRole("button", { name: /Stop recording/ }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download your video/ }).click();
  const f = await dl;
  const path = "/tmp/" + f.suggestedFilename();
  await f.saveAs(path);
  const info = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_streams", path],
      { encoding: "utf8" },
    ),
  );
  const video = info.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  );
  expect([video.width, video.height]).toEqual([1080, 1920]);
  expect(
    info.streams.some((s: { codec_type: string }) => s.codec_type === "audio"),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("Shorts Lab fits a phone and logout revokes browser access", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shorts-lab");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "/tmp/shorts-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/nation-tycoon");
  await expect(page).toHaveURL(/login/);
});

test("reference presets animate cleanly and record population video with audio", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/shorts-lab");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByRole("button", { name: "Play with sound" }).click();
  for (const name of [
    "Crescent Crushers",
    "Hexagon Pop",
    "Collision Bloom",
    "Collision Mandalas",
    "Mushroom Multiplier",
    "Gravity Cascade",
  ]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await page.waitForTimeout(2200);
    await page.locator("canvas").screenshot({
      path: `/tmp/reference-${name.toLowerCase().replaceAll(" ", "-")}.png`,
    });
  }
  await page.getByRole("button", { name: /Collision Bloom/ }).click();
  await page.getByRole("button", { name: "Record Shorts video" }).click();
  await page.waitForTimeout(4500);
  await page.getByRole("button", { name: /Stop recording/ }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download your video/ }).click();
  const dl = await pending;
  const file =
    "/tmp/reference-bloom." +
    (dl.suggestedFilename().endsWith(".mp4") ? "mp4" : "webm");
  await dl.saveAs(file);
  const info = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_streams", file],
      { encoding: "utf8" },
    ),
  );
  const video = info.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  );
  expect([video.width, video.height]).toEqual([1080, 1920]);
  expect(
    info.streams.some((s: { codec_type: string }) => s.codec_type === "audio"),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("mobile export stays video when the preview scrolls away and a second recording works", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shorts-lab");
  await page.getByRole("button", { name: /Swinging Hammer/ }).click();
  for (let take = 0; take < 2; take++) {
    await page
      .getByRole("button", { name: "Record Shorts video", exact: false })
      .click();
    await page
      .getByRole("button", { name: /Stop recording/ })
      .scrollIntoViewIfNeeded();
    await page.waitForTimeout(3500);
    await page.getByRole("button", { name: /Stop recording/ }).click();

    const video = page.locator('video[aria-label="Recorded video preview"]');
    await expect(video).toBeVisible();
    await expect
      .poll(() => video.evaluate((v: HTMLVideoElement) => v.videoWidth))
      .toBe(1080);
    const pending = page.waitForEvent("download");
    await page.getByRole("link", { name: /Download your video/ }).click();
    const dl = await pending;
    const path =
      "/tmp/mobile-export-" +
      take +
      (dl.suggestedFilename().endsWith(".mp4") ? ".mp4" : ".webm");
    await dl.saveAs(path);
    const result = JSON.parse(
      execFileSync(
        "ffprobe",
        ["-v", "quiet", "-count_frames", "-show_streams", "-of", "json", path],
        { encoding: "utf8" },
      ),
    );
    const vs = result.streams.find(
      (s: { codec_type: string }) => s.codec_type === "video",
    );
    expect([vs.width, vs.height]).toEqual([1080, 1920]);
    expect(Number(vs.nb_read_frames)).toBeGreaterThan(20);
    expect(
      result.streams.some(
        (s: { codec_type: string }) => s.codec_type === "audio",
      ),
    ).toBe(true);
    execFileSync("ffmpeg", [
      "-v",
      "error",
      "-i",
      path,
      "-frames:v",
      "1",
      "-f",
      "null",
      "-",
    ]);
  }
});
test("material presets deform, crush and randomize without client errors", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/shorts-lab");
  await page.getByRole("button", { name: "Play with sound" }).click();
  for (const name of [
    "Slime Squish",
    "Jelly Rain",
    "Hydraulic Crush",
    "Kinetic Sand Press",
    "Rainbow Vortex",
    "Swinging Hammer",
  ]) {
    await page.getByRole("button", { name: new RegExp(name) }).click();
    await page.waitForTimeout(1300);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.locator("canvas").screenshot({
      path: "/tmp/material-" + name.replaceAll(" ", "-") + ".png",
    });
    await page.getByRole("button", { name: "Play with sound" }).click();
  }
  await page.getByRole("button", { name: /Surprise me/ }).click();
  expect(
    await page.locator(".shorts-modes button[aria-pressed=true]").count(),
  ).toBe(1);
  expect(errors).toEqual([]);
});

test("an encoder returning audio-only data never gets a download link", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = MediaRecorder;
    window.MediaRecorder = class extends Native {
      constructor(stream: MediaStream) {
        super(new MediaStream(stream.getAudioTracks()), {
          mimeType: "audio/webm;codecs=opus",
        });
      }
    };
  });
  await page.goto("/shorts-lab");
  await page.getByRole("button", { name: "Record Shorts video" }).click();
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: /Stop recording/ }).click();
  await expect(page.locator(".shorts-error")).toContainText("No valid video");
  await expect(
    page.getByRole("link", { name: /Download your video/ }),
  ).toHaveCount(0);
});

test("a recording whose picture stops before its audio is rejected", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = MediaRecorder;
    window.MediaRecorder = class extends Native {
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        const cloned = stream.clone();
        super(cloned, options);
        this.addEventListener("start", () => {
          setTimeout(
            () => cloned.getVideoTracks().forEach((t) => t.stop()),
            800,
          );
        });
        this.addEventListener("stop", () =>
          cloned.getTracks().forEach((t) => t.stop()),
        );
      }
    };
  });
  await page.goto("/shorts-lab");
  await page.getByRole("button", { name: "Record Shorts video" }).click();
  await page.waitForTimeout(3500);
  await page.getByRole("button", { name: /Stop recording/ }).click();
  await expect(page.locator(".shorts-error")).toContainText("through the end", {
    timeout: 25000,
  });
  await expect(
    page.getByRole("link", { name: /Download your video/ }),
  ).toHaveCount(0);
});

test("a full targeted episode ends in a downloadable 45-second video", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/shorts-lab");
  await expect(page.getByLabel("Episode duration")).toHaveValue("45");
  await page.getByRole("button", { name: /Slime Squish/ }).click();
  await page.getByRole("button", { name: "Record Shorts video" }).click();
  await expect(
    page.getByRole("link", { name: /Download your video/ }),
  ).toBeVisible({ timeout: 65000 });
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: /Download your video/ }).click();
  const download = await pending;
  const path =
    "/tmp/story-45." +
    (download.suggestedFilename().endsWith(".mp4") ? "mp4" : "webm");
  await download.saveAs(path);
  const info = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "quiet", "-show_format", "-show_streams", "-of", "json", path],
      { encoding: "utf8" },
    ),
  );
  const video = info.streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  );
  expect([video.width, video.height]).toEqual([1080, 1920]);
  const packets = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "quiet",
        "-select_streams",
        "v:0",
        "-show_entries",
        "packet=pts_time",
        "-of",
        "json",
        path,
      ],
      { encoding: "utf8" },
    ),
  ).packets;
  const times = packets.map((p: { pts_time: string }) => Number(p.pts_time));
  expect(Math.max(...times) - Math.min(...times)).toBeGreaterThanOrEqual(44);
  if (existsSync("/tmp/story-45-ending.png"))
    unlinkSync("/tmp/story-45-ending.png");
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-ss",
    "42",
    "-i",
    path,
    "-frames:v",
    "1",
    "-y",
    "/tmp/story-45-ending.png",
  ]);
  expect(existsSync("/tmp/story-45-ending.png")).toBe(true);
});
