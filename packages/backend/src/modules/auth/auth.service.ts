import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { AuthPayload, AuthResponse, User } from "@cvbuilder/shared";
import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";
import { authRepository } from "./auth.repository";
import type { LoginInput, RegisterInput } from "./auth.schema";

const PASSWORD_SALT_ROUNDS = 12;

function toSafeUser(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  githubUsername: string | null;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    githubUsername: user.githubUsername,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    const existingUser = await authRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);
    const user = await authRepository.create({
      email,
      name,
      passwordHash,
    });

    return {
      user: toSafeUser(user),
      token: signToken({ userId: user.id, email: user.email }),
    };
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await authRepository.findByEmail(email);

    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    return {
      user: toSafeUser(user),
      token: signToken({ userId: user.id, email: user.email }),
    };
  },

  async getCurrentUser(userId: string): Promise<User> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw ApiError.unauthorized("User account not found");
    }

    return toSafeUser(user);
  },

  verifyToken(token: string): AuthPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (
        !decoded ||
        typeof decoded !== "object" ||
        !("userId" in decoded) ||
        !("email" in decoded) ||
        typeof decoded.userId !== "string" ||
        typeof decoded.email !== "string"
      ) {
        throw ApiError.unauthorized("Invalid authentication token");
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch {
      throw ApiError.unauthorized("Invalid or expired authentication token");
    }
  },
};