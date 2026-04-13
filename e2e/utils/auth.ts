import { expect, type Page } from "@playwright/test";
import { DEMO_USER } from "./env";

function authForm(page: Page) {
  return page.locator("form");
}

export async function gotoAuth(page: Page): Promise<void> {
  await page.goto("/auth");
  await expect(page).toHaveURL(/\/auth$/);
}

export async function switchToRegister(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
}

export async function signIn(
  page: Page,
  credentials: { email: string; password: string } = DEMO_USER
): Promise<void> {
  await gotoAuth(page);
  await page.getByLabel("Email Address").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await authForm(page).getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("main").getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

export async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(authForm(page).getByRole("button", { name: "Sign In" })).toBeVisible();
}