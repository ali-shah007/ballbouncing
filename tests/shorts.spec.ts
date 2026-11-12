import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
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
  test.setTimeout(60000);
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
  await page.screenshot({ path: "/tmp/shorts-desktop.png", fullPage: true });
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
