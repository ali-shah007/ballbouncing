import { test as setup, expect } from "@playwright/test";
setup("sign into the private workspace", async ({ page }) => {
  await page.goto("/login");
  await page
    .getByLabel("Username", { exact: true })
    .fill(process.env.STUDIO_LOGIN_USER || "test-owner");
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.STUDIO_LOGIN_PASSWORD || "test-only-password-long");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/shorts-lab/);
  await page.context().storageState({ path: "test-results/auth.json" });
});
