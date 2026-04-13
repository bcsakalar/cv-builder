import type { AuthResponse, User } from "@cvbuilder/shared";
import { api, unwrap } from "@/lib/api";

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (payload: RegisterPayload) => api.post("/auth/register", payload).then(unwrap<AuthResponse>),
  login: (payload: LoginPayload) => api.post("/auth/login", payload).then(unwrap<AuthResponse>),
  me: () => api.get("/auth/me").then(unwrap<User>),
  logout: () => api.post("/auth/logout").then(unwrap<{ loggedOut: boolean }>),
};