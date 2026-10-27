import { test, expect } from "@playwright/test";
test("planet attacks, destruction, rebuilding, world switching, and recording", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/planet-destruction");
  await expect(page.locator(".planet-canvas canvas")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator(".planet-loading")).toHaveCount(0);
  await expect(page.locator(".integrity-value strong")).toHaveText("100");
  await page.screenshot({ path: "/tmp/planet-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Launch attack" }).click();
  await expect(page.locator(".integrity-value strong")).toHaveText("88", {
    timeout: 15000,
  });
  await page.getByRole("button", { name: /Meteor strike A visitor/ }).click();
  await page.getByRole("button", { name: "Launch attack" }).click();
  await expect(page.locator(".integrity-value strong")).toHaveText("66", {
    timeout: 15000,
  });
  await page.getByRole("button", { name: /Antimatter Beautifully/ }).click();
  await page.getByLabel("Impact power").fill("2");
  await page.getByRole("button", { name: "Launch attack" }).click();
  await expect(page.locator(".integrity-value strong")).toHaveText("0", {
    timeout: 15000,
  });
  await expect(page.getByText("Nothing lasts forever.")).toBeVisible();
  await page.screenshot({ path: "/tmp/planet-destroyed.png", fullPage: true });
  await page.getByRole("button", { name: "Rebuild this world" }).click();
  await expect(page.locator(".integrity-value strong")).toHaveText("100");
  await page.getByLabel("WORLD", { exact: true }).selectOption("ember");
  await expect(page.locator(".world-ident h2")).toContainText("Ember");
  await page.getByRole("button", { name: "Pause planet simulation" }).click();
  await expect(
    page.getByRole("button", { name: "Launch attack" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Resume planet simulation" }).click();
  await page.getByRole("button", { name: "Record scene" }).click();
  await expect(
    page.getByRole("button", { name: "Stop & download" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Launch attack" }).click();
  await page.waitForTimeout(1800);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Stop & download" }).click();
  const download = await downloadPromise;
  await download.saveAs("/tmp/orbit-planet-recording.webm");
  expect(download.suggestedFilename()).toMatch(
    /orbit-planet-ember\.(webm|mp4)/,
  );
  expect(errors).toEqual([]);
});
test("planet mobile layout, targeting, cinema, and mode navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/planet-destruction");
  await expect(page.locator(".planet-canvas canvas")).toBeVisible({
    timeout: 20000,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "/tmp/planet-mobile.png", fullPage: true });
  const canvas = page.locator(".planet-canvas canvas");
  const bounds = await canvas.boundingBox();
  if (!bounds) throw Error("Canvas missing");
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await expect(page.locator(".integrity-value strong")).toHaveText("88", {
    timeout: 15000,
  });
  await page.getByLabel("Graphics quality").selectOption("balanced");
  await page.getByRole("button", { name: "Auto barrage", exact: true }).click();
  await expect
    .poll(
      async () =>
        Number(await page.locator(".integrity-value strong").textContent()),
      { timeout: 15000 },
    )
    .toBeLessThan(88);
  await page
    .getByRole("button", { name: "Barrage active", exact: true })
    .click();
  const normalHeight = await page
    .locator(".planet-view")
    .evaluate((el) => el.clientHeight);
  await page.getByRole("button", { name: "Toggle cinema view" }).click();
  await expect(page.locator(".planet-page")).toHaveClass(/planet-cinema/);
  await expect
    .poll(() => page.locator(".planet-view").evaluate((el) => el.clientHeight))
    .toBeGreaterThan(normalHeight);
  await page.getByRole("button", { name: "Toggle cinema view" }).click();
  await page.getByRole("link", { name: "Bouncing balls", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Small balls.",
  );
  const ballHeight = await page
    .locator(".scene")
    .evaluate((el) => el.clientHeight);
  await page.getByRole("button", { name: "Bigger view" }).click();
  await expect(page.locator(".studio-shell")).toHaveClass(/focus-mode/);
  await expect
    .poll(() => page.locator(".scene").evaluate((el) => el.clientHeight))
    .toBeGreaterThan(ballHeight);
});
