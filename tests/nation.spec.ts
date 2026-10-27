import { test, expect } from "@playwright/test";
test("country economy builds, saves, upgrades, and records its narrated map", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/nation-rise");
  await page.getByLabel("Choose your country").selectOption("Pakistan");
  await page.getByRole("button", { name: "Begin your chapter" }).click();
  await expect(page.locator(".nation-map-canvas")).toBeVisible();
  await page.getByLabel("Simulation speed").selectOption("5");
  await page
    .getByRole("button", { name: "Build Manufacturing", exact: true })
    .click();
  await expect(page.locator(".nation-queue")).toContainText("Manufacturing");
  await expect(page.locator(".nation-journal")).toContainText(
    "Building Manufacturing",
  );
  await expect(page.locator(".nation-journal")).toContainText(
    "Open for business achieved",
    { timeout: 15000 },
  );
  await page.getByLabel("Inspect a project").selectOption("1");
  await page.getByRole("button", { name: /Upgrade ·/ }).click();
  await expect(page.locator(".nation-inspect")).toContainText("Lv.3", {
    timeout: 15000,
  });
  await page.screenshot({ path: "/tmp/nation-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Policies", exact: true }).click();
  await page.getByRole("checkbox").check();
  await expect(page.locator(".nation-journal")).toContainText(
    "Green investment enabled",
  );
  await page.getByRole("button", { name: "Export campaign" }).click();
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.locator(".nation-map-canvas")).toBeVisible();
  await expect(page.locator(".nation-journal")).toContainText(
    "Open for business achieved",
  );
  await page.getByRole("button", { name: "Record story" }).click();
  await page.waitForTimeout(1200);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Stop & download" }).click();
  await (await download).saveAs("/tmp/nation-video.webm");
  expect(errors).toEqual([]);
});
test("country selection and mobile layout fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nation-rise");
  await page.getByLabel("Choose your country").selectOption("Japan");
  await page.getByRole("button", { name: "Begin your chapter" }).click();
  await expect(page.locator(".nation-map-canvas")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "/tmp/nation-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Toggle large nation view" }).click();
  await expect(page.locator(".nation-page")).toHaveClass(/nation-cinema/);
  await page.getByRole("button", { name: "Toggle large nation view" }).click();
  await page.getByRole("link", { name: "Planet destruction" }).click();
  await expect(page).toHaveURL(/planet-destruction/);
});
