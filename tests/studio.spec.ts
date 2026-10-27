import { test, expect } from "@playwright/test";
test("creator runs, saves and continues a story, records video, and switches layouts", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page
      .locator("canvas")
      .evaluate((e) => e.getBoundingClientRect().width),
  ).toBeCloseTo(
    await page
      .locator(".scene")
      .evaluate((e) => e.getBoundingClientRect().width),
    0,
  );
  await page
    .getByRole("button", { name: "Play simulation", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Pause simulation" }),
  ).toBeVisible();
  await page.waitForTimeout(1800);
  await page.getByRole("button", { name: "Pause simulation" }).click();
  await page.getByRole("tab", { name: "Rules" }).click();
  await page.getByLabel("New balls per escape").fill("3");
  await page.getByRole("tab", { name: "Story" }).click();
  await expect(page.getByText("Pip", { exact: true })).toBeVisible();
  await page.getByLabel("Opening hook").fill("Will Pip find the way out?");
  await page.getByRole("button", { name: "Save episode checkpoint" }).click();
  await expect(
    page.getByRole("button", { name: "Continue story" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue story" }).click();
  await expect(page.getByText("EPISODE 02", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(page.getByText("EPISODE 01", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Story" }).click();
  await expect(
    page.getByRole("button", { name: "Restore", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "9:16", exact: true }).click();
  await expect(page.locator(".scene")).toHaveClass(/portrait/);
  await page.getByRole("button", { name: "Record video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop & download" }),
  ).toBeVisible();
  await page.waitForTimeout(3500);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Stop & download" }).click();
  const download = await downloadPromise;
  await download.saveAs("/tmp/orbit-recording.webm");
  expect(download.suggestedFilename()).toMatch(/orbit-episode-1\.(webm|mp4)/);
  await page.getByRole("button", { name: "Pause simulation" }).click();
  await page.getByRole("button", { name: "4:5", exact: true }).click();
  await page.getByRole("tab", { name: "Presets" }).click();
  await page.screenshot({ path: "/tmp/orbit-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("mobile layout and search content", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page
      .locator("canvas")
      .evaluate((e) => e.getBoundingClientRect().width),
  ).toBeCloseTo(
    await page
      .locator(".scene")
      .evaluate((e) => e.getBoundingClientRect().width),
    0,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "/tmp/orbit-mobile.png", fullPage: true });
  await page.goto("/guides");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "A little physics.",
  );
  await page.goto("/presets/gravity-dance");
  await expect(page).toHaveTitle(/Gravity dance/);
  await expect(page.locator(".preset-card.active")).toContainText(
    "Gravity dance",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("recording stops at the chosen episode length", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByLabel("Duration").selectOption("15");
  const downloadPromise = page.waitForEvent("download", { timeout: 35000 });
  await page.getByRole("button", { name: "Record video", exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs("/tmp/orbit-complete-episode.webm");
  await expect(
    page.getByRole("button", { name: "Record video", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".timeline")).toContainText("0:15");
});
