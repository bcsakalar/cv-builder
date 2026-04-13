import { expect, type Page } from "@playwright/test";
import { E2E_API_BASE_URL } from "./env";

export async function createCv(page: Page, title: string): Promise<string> {
  await page.goto("/cv/new");
  await expect(page).toHaveURL(/\/cv\/new$/);

  await page.locator('input[name="title"]').fill(title);
  await page.locator('select[name="templateId"]').selectOption("modern-minimal");
  await page.getByRole("button", { name: "Create CV" }).click();

  await expect(page).toHaveURL(/\/cv\/[^/]+\/edit$/);

  const match = page.url().match(/\/cv\/([^/]+)\/edit$/);
  if (!match) {
    throw new Error(`Could not determine CV id from URL: ${page.url()}`);
  }

  return match[1]!;
}

export async function fillPersonalInfo(page: Page, data: {
  firstName: string;
  lastName: string;
  professionalTitle: string;
  email: string;
}): Promise<void> {
  await page.locator('input[name="firstName"]').fill(data.firstName);
  await page.locator('input[name="lastName"]').fill(data.lastName);
  await page.locator('input[name="professionalTitle"]').fill(data.professionalTitle);
  await page.locator('input[name="email"]').fill(data.email);
}

export async function openSummarySection(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Professional Summary" }).click();
  await expect(page.getByPlaceholder("Write a brief professional summary...")).toBeVisible();
}

export async function waitForAutoSave(page: Page): Promise<void> {
  await expect(page.getByText("Saving...")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText("✓ Saved")).toBeVisible({ timeout: 15_000 });
}

async function waitForApiMutation(page: Page, pathFragment: string, method: string, trigger: () => Promise<void>): Promise<void> {
  const responsePromise = page.waitForResponse((response) => {
    return response.url().includes(`${E2E_API_BASE_URL}${pathFragment}`) && response.request().method() === method && response.ok();
  });

  await trigger();
  await responsePromise;
}

export async function openSection(page: Page, sectionLabel: string): Promise<void> {
  await page.getByRole("button", { name: sectionLabel }).click();
  await expect(page.getByRole("heading", { name: sectionLabel }).first()).toBeVisible();
}

export async function addExperience(page: Page, cvId: string, data: {
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  description: string;
}): Promise<void> {
  await openSection(page, "Work Experience");
  await page.getByRole("button", { name: "Add Experience" }).click();
  await page.getByLabel("Job Title").fill(data.jobTitle);
  await page.getByLabel("Company").fill(data.company);
  await page.getByLabel("Location").fill(data.location);
  await page.getByLabel("Start Date").fill(data.startDate);
  await page.getByLabel("Description").fill(data.description);

  await waitForApiMutation(page, `/cv/${cvId}/experiences`, "POST", async () => {
    await page.getByRole("button", { name: "Save" }).click();
  });

  await expect(page.getByRole("heading", { name: data.jobTitle }).first()).toBeVisible();
}

export async function addEducation(page: Page, cvId: string, data: {
  degree: string;
  fieldOfStudy: string;
  institution: string;
  startDate: string;
}): Promise<void> {
  await openSection(page, "Education");
  await page.getByRole("button", { name: "Add Education" }).click();
  await page.getByLabel("Degree").fill(data.degree);
  await page.getByLabel("Field of Study").fill(data.fieldOfStudy);
  await page.getByLabel("Institution").fill(data.institution);
  await page.getByLabel("Start").fill(data.startDate);

  await waitForApiMutation(page, `/cv/${cvId}/educations`, "POST", async () => {
    await page.getByRole("button", { name: "Save" }).click();
  });

  await expect(page.getByRole("heading", { name: data.degree }).first()).toBeVisible();
  await expect(page.getByText(data.fieldOfStudy).first()).toBeVisible();
}

export async function addSkill(page: Page, cvId: string, data: {
  name: string;
  category?: string;
  proficiencyLevel?: string;
  yearsOfExperience?: number;
}): Promise<void> {
  await openSection(page, "Skills");
  await page.getByRole("button", { name: "Add Skill" }).click();
  await page.getByLabel("Skill Name").fill(data.name);

  if (data.category) {
    await page.getByLabel("Category").selectOption(data.category);
  }

  if (data.proficiencyLevel) {
    await page.getByLabel("Proficiency").selectOption(data.proficiencyLevel);
  }

  if (typeof data.yearsOfExperience === "number") {
    await page.getByLabel("Years").fill(String(data.yearsOfExperience));
  }

  await waitForApiMutation(page, `/cv/${cvId}/skills`, "POST", async () => {
    await page.getByRole("button", { name: "Add" }).click();
  });

  await expect(page.getByText(data.name).first()).toBeVisible();
}

export async function addCertification(page: Page, cvId: string, data: {
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string;
}): Promise<void> {
  await openSection(page, "Certifications");
  await page.getByLabel("Certification Name").fill(data.name);
  await page.getByLabel("Issuing Organization").fill(data.issuingOrganization);
  await page.getByLabel("Issue Date").fill(data.issueDate);

  if (data.expirationDate) {
    await page.getByLabel("Expiry Date").fill(data.expirationDate);
  }

  await waitForApiMutation(page, `/cv/${cvId}/certifications`, "POST", async () => {
    await page.getByRole("button", { name: "Add" }).click();
  });

  await expect(page.getByText(data.name).first()).toBeVisible();
}

export async function addLanguage(page: Page, cvId: string, data: {
  name: string;
  proficiency?: string;
}): Promise<void> {
  await openSection(page, "Languages");
  await page.getByLabel("Language").fill(data.name);
  await page.getByLabel("Proficiency").selectOption(data.proficiency ?? "PROFESSIONAL_WORKING");

  await waitForApiMutation(page, `/cv/${cvId}/languages`, "POST", async () => {
    await page.getByRole("button", { name: "Add" }).click();
  });

  await expect(page.getByText(data.name).first()).toBeVisible();
}

export async function addPublication(page: Page, cvId: string, data: {
  title: string;
  publisher: string;
  date: string;
  description?: string;
}): Promise<void> {
  await openSection(page, "Publications");
  await page.getByLabel("Title").fill(data.title);
  await page.getByLabel("Publisher").fill(data.publisher);
  await page.getByLabel("Publish Date").fill(data.date);

  if (data.description) {
    await page.getByLabel("Description").fill(data.description);
  }

  await waitForApiMutation(page, `/cv/${cvId}/publications`, "POST", async () => {
    await page.getByRole("button", { name: "Add" }).click();
  });

  await expect(page.getByText(data.title).first()).toBeVisible();
}

export async function addAward(page: Page, cvId: string, data: {
  title: string;
  issuer: string;
  date: string;
  description?: string;
}): Promise<void> {
  await openSection(page, "Awards & Honors");
  await page.getByLabel("Award Title").fill(data.title);
  await page.getByLabel("Issuing Organization").fill(data.issuer);
  await page.getByLabel("Date").fill(data.date);

  if (data.description) {
    await page.getByLabel("Description").fill(data.description);
  }

  await waitForApiMutation(page, `/cv/${cvId}/awards`, "POST", async () => {
    await page.getByRole("button", { name: "Add" }).click();
  });

  await expect(page.getByText(data.title).first()).toBeVisible();
}

export async function addReference(page: Page, cvId: string, data: {
  name: string;
  company: string;
  title: string;
  relationship: string;
  email?: string;
  phone?: string;
}): Promise<void> {
  await openSection(page, "References");
  await page.getByLabel("Full Name").fill(data.name);
  await page.getByLabel("Company").fill(data.company);
  await page.getByLabel("Position").fill(data.title);
  await page.getByLabel("Relationship").fill(data.relationship);

  if (data.email) {
    await page.getByLabel("Email").fill(data.email);
  }

  if (data.phone) {
    await page.getByLabel("Phone").fill(data.phone);
  }

  await waitForApiMutation(page, `/cv/${cvId}/references`, "POST", async () => {
    await page.getByRole("button", { name: "Add" }).click();
  });

  await expect(page.getByText(data.name).first()).toBeVisible();
}

export async function openThemeCustomizer(page: Page): Promise<void> {
  const toggle = page.getByTestId("editor-theme-toggle");
  await toggle.click();
  await expect(page.getByTestId("theme-color-primaryColor")).toBeVisible();
}

export async function updateThemeColor(page: Page, cvId: string, key: string, value: string): Promise<void> {
  const input = page.getByTestId(`theme-color-${key}`);

  await waitForApiMutation(page, `/cv/${cvId}/theme`, "PATCH", async () => {
    await input.evaluate((element, nextValue) => {
      const colorInput = element as HTMLInputElement;
      const prototype = Object.getPrototypeOf(colorInput) as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

      if (!valueSetter) {
        throw new Error("Could not find native value setter for color input");
      }

      valueSetter.call(colorInput, String(nextValue));
      colorInput.dispatchEvent(new Event("input", { bubbles: true }));
      colorInput.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);
  });

  await expect(input).toHaveValue(value);
}

export async function selectEditorTemplate(page: Page, cvId: string, label: string): Promise<void> {
  const select = page.getByTestId("editor-template-select");

  await waitForApiMutation(page, `/cv/${cvId}`, "PUT", async () => {
    await select.selectOption({ label });
  });

  await expect(select.locator("option:checked")).toHaveText(label);
}