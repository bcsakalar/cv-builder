// ═══════════════════════════════════════════════════════════
// User Types
// ═══════════════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  githubUsername: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithAuth extends User {
  passwordHash: string;
  githubToken: string | null;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
