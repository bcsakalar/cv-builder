import { expect, test } from "@playwright/test";

test("persists application theme and locale across reload @smoke", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("main").getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.getByTestId("settings-theme-dark").click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const localeSelect = page.getByTestId("settings-locale");
  await localeSelect.selectOption("tr");

  await expect(page.getByRole("main").getByRole("heading", { name: "Ayarlar" })).toBeVisible();
  await expect(localeSelect).toHaveValue("tr");

  await page.reload();

  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("main").getByRole("heading", { name: "Ayarlar" })).toBeVisible();
  await expect(page.getByTestId("settings-locale")).toHaveValue("tr");
});