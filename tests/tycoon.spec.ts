import { test, expect } from "@playwright/test";
test("Green Valley construction, automation, supply chain, income, and saves", async ({
  page,
}) => {
  test.setTimeout(100000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/nation-tycoon");
  await expect(page.locator(".ty-world canvas")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator(".ty-loading")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/tycoon-desktop.png", fullPage: true });
  for (const name of ["Food factory", "Grocery market"]) {
    await page.getByRole("button", { name: "Open Build", exact: true }).click();
    await page
      .getByRole("button", { name: `Choose ${name}`, exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: /Confirm purchase/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Confirm purchase/ }).click();
  }
  await page
    .getByRole("button", { name: "Open Industry", exact: true })
    .click();
  await page.getByRole("button", { name: /Food factory · Lv.1/ }).click();
  await expect(page.locator(".ty-status")).not.toContainText(
    "Under construction",
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: /Hire \/ upgrade manager/ }).click();
  await page.getByRole("button", { name: "Close game panel" }).click();
  await page
    .getByRole("button", { name: "Open Industry", exact: true })
    .click();
  await page.getByRole("button", { name: /Grocery market · Lv.1/ }).click();
  await page.getByRole("button", { name: /Hire \/ upgrade manager/ }).click();
  await expect
    .poll(async () => await page.locator(".ty-detail-grid").textContent(), {
      timeout: 45000,
    })
    .toMatch(/Lifetime sales◈ (3[2-9]|[4-9][0-9]|[1-9][0-9]{2})/);
  await page.getByRole("button", { name: "Close game panel" }).click();
  await page.getByRole("button", { name: "Open Trade", exact: true }).click();
  await expect(page.locator(".ty-chain")).toContainText("completed deliveries");
  await page.getByRole("button", { name: "Close game panel" }).click();
  await page.waitForTimeout(5200);
  await page.reload();
  await expect(page.locator(".ty-loading")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open Industry", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Food factory · Lv.1/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test.describe("touch controls", () => {
  test.use({ hasTouch: true, isMobile: true });
  test("portrait touch layout and placement cancellation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/nation-tycoon");
    await expect(page.locator(".ty-world canvas")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator(".ty-loading")).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.screenshot({ path: "/tmp/tycoon-mobile.png" });
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 430, id: 0 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 260, y: 470, id: 0 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: 155, y: 430, id: 0 },
        { x: 230, y: 430, id: 1 },
      ],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 115, y: 430, id: 0 },
        { x: 270, y: 430, id: 1 },
      ],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "Open Build", exact: true }).tap();
    await page
      .getByRole("button", { name: "Choose Fountain park", exact: true })
      .tap();
    await page
      .getByRole("button", { name: "Cancel placement", exact: true })
      .tap();
    await expect(
      page.getByRole("button", { name: "Choose Fountain park", exact: true }),
    ).toBeVisible();
    await page.screenshot({ path: "/tmp/tycoon-mobile-build.png" });
    await page.getByRole("button", { name: "Close game panel" }).tap();
    await page.getByRole("button", { name: "Open Nation", exact: true }).tap();
    await page
      .getByRole("checkbox", { name: "Low graphics · 30 FPS", exact: true })
      .check();
    await page
      .getByRole("checkbox", { name: "Reduced motion", exact: true })
      .check();
  });
});
