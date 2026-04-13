import fs from "node:fs";
import path from "node:path";
import { test as setup } from "@playwright/test";
import { signIn } from "./utils/auth";

const authFile = path.join(__dirname, ".auth", "demo-user.json");

setup("authenticate demo user", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await signIn(page);
  await page.context().storageState({ path: authFile });
});