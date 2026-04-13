import { expect, type APIRequestContext } from "@playwright/test";
import { DEMO_USER, E2E_API_BASE_URL } from "./env";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface LoginResponse {
  token: string;
}

interface CvListItem {
  id: string;
  title: string;
}

export async function loginByApi(
  request: APIRequestContext,
  credentials: { email: string; password: string } = DEMO_USER
): Promise<string> {
  const response = await request.post(`${E2E_API_BASE_URL}/auth/login`, {
    data: credentials,
  });

  expect(response.ok()).toBeTruthy();
  const json = (await response.json()) as ApiEnvelope<LoginResponse>;

  return json.data.token;
}

export async function listCvs(request: APIRequestContext, token: string): Promise<CvListItem[]> {
  const response = await request.get(`${E2E_API_BASE_URL}/cv`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.ok()).toBeTruthy();
  const json = (await response.json()) as ApiEnvelope<CvListItem[]>;
  return json.data;
}

export async function cleanupCvsByTitlePrefix(request: APIRequestContext, titlePrefix: string): Promise<void> {
  const token = await loginByApi(request);
  const cvs = await listCvs(request, token);

  for (const cv of cvs) {
    if (!cv.title.startsWith(titlePrefix)) continue;

    const response = await request.delete(`${E2E_API_BASE_URL}/cv/${cv.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
  }
}