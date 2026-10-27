import { test, expect } from "@playwright/test";
test("mandate budgeting, diplomatic financing, debt service and audited saves", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/nation-state");
  await page
    .getByRole("button", { name: "Begin Nepal mandate", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nepal");
  await page.getByRole("button", { name: "Budget", exact: true }).click();
  await page
    .getByRole("slider", { name: "Health & care", exact: true })
    .fill("6");
  await expect(
    page.locator(".ns-budget-row").filter({
      has: page.getByRole("slider", { name: "Health & care", exact: true }),
    }),
  ).toContainText("6.0%");
  await page.getByRole("button", { name: "Diplomacy", exact: true }).click();
  await page
    .getByLabel("Your diplomatic message")
    .fill("Can you offer a 1 billion USD loan over 36 months?");
  await page.getByRole("button", { name: "Send to delegation" }).click();
  await expect(page.locator(".ns-deal")).toContainText("USD 1.00B financing");
  await page.getByRole("button", { name: "Accept reviewed proposal" }).click();
  await expect(page.locator(".ns-deal")).toContainText("SIGNED");
  await page
    .getByRole("button", { name: "Infrastructure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Fund electricity grid renewal" })
    .click();
  await expect(page.locator(".ns-project-list")).toContainText(
    "6 months remaining",
  );
  await page.getByRole("button", { name: "Advance one month" }).click();
  await expect(page.locator(".ns-time strong")).toHaveText("01");
  await expect(page.locator(".ns-project-list")).toContainText(
    "5 months remaining",
  );
  await page.getByRole("button", { name: "Ledger", exact: true }).click();
  await expect(page.locator(".ns-audits")).toContainText("cash balanced");
  await expect(page.locator(".ns-audits .fail")).toHaveCount(0);
  await expect(page.locator(".ns-table")).toHaveCount(2);
  await expect(page.locator(".ns-table").first()).toContainText(
    "Trade settlement",
  );
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: "/tmp/nation-state-desktop.png",
    fullPage: true,
  });
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator(".ns-time strong")).toHaveText("01");
  await page.getByRole("button", { name: "Model", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export mandate JSON", exact: true })
    .click();
  await (await download).saveAs("/tmp/nation-state-save.json");
  expect(errors).toEqual([]);
});
test("mobile scenario selection, projections and model disclosure", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nation-state");
  await expect(
    page.getByRole("button", { name: "Begin United States mandate" }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/nation-state-select.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Begin India mandate" }).click();
  await page.getByRole("button", { name: "Advance one month" }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "/tmp/nation-state-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Model", exact: true }).click();
  await expect(
    page.getByText(/Diplomatic agents use visible local decision rules/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Economy", exact: true }).click();
  await expect(page.locator(".ns-equation")).toContainText(
    "GDP = C + I + G + X − M",
  );
});

test("delegate personalities change actual deal terms and disclose patronage costs", async ({
  page,
}) => {
  await page.goto("/nation-state");
  await page
    .getByRole("button", { name: "Begin Nepal mandate", exact: true })
    .click();
  await page.getByRole("button", { name: "Diplomacy", exact: true }).click();
  const options = await page
    .getByLabel("Delegation", { exact: true })
    .locator("option")
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value),
    );
  let found = false;
  for (const partner of options.filter((p) => p !== "IMF")) {
    await page.getByLabel("Delegation", { exact: true }).selectOption(partner);
    if (
      (await page.locator(".ns-persona>span").textContent()) ===
      "Patronage-driven official"
    ) {
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
  await page
    .getByLabel("Your diplomatic message")
    .fill("Could we arrange a 0.5 billion USD loan over 36 months?");
  await page.getByRole("button", { name: "Send to delegation" }).click();
  await expect(page.locator(".ns-pricing")).toContainText(
    "Expected-loss spread",
  );
  await expect(page.locator(".ns-deal")).toContainText(
    "Public trust falls by 4",
  );
  await expect(page.locator(".ns-pricing")).toContainText("0.0075B");
  await page.screenshot({ path: "/tmp/nation-state-deal.png", fullPage: true });
  await page.getByRole("button", { name: "Accept reviewed proposal" }).click();
  await expect(page.locator(".ns-deal")).toContainText("SIGNED");
  await page.getByRole("button", { name: "Budget", exact: true }).click();
  await expect(page.locator(".ns-ledger-summary")).toContainText("61/100");
});
