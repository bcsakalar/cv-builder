import { expect, test } from "@playwright/test";
import { buildTestUser, DEMO_USER } from "./utils/env";
import { gotoAuth, signIn, signOut, switchToRegister } from "./utils/auth";

test("redirects unauthenticated users to auth @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.locator("form").getByRole("button", { name: "Sign In" })).toBeVisible();
});

test("shows an error for invalid login credentials @smoke", async ({ page }) => {
  await gotoAuth(page);
  await page.getByLabel("Email Address").fill(DEMO_USER.email);
  await page.getByLabel("Password").fill("WrongPassword123!");
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});

test("registers a new account and lands on the dashboard @smoke", async ({ page }) => {
  const user = buildTestUser();

  await gotoAuth(page);
  await switchToRegister(page);
  await page.getByLabel("Full Name").fill(user.name);
  await page.getByLabel("Email Address").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.locator("form").getByRole("button", { name: "Create Account" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main").getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(user.name)).toBeVisible();
});

test("persists the session across reload and allows logout @smoke", async ({ page }) => {
  await signIn(page);
  await page.reload();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main").getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(DEMO_USER.name)).toBeVisible();

  await signOut(page);
});