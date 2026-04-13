import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../../utils/api-error";
import { authRepository } from "./auth.repository";
import { authService } from "./auth.service";

jest.mock("./auth.repository");
jest.mock("../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));
jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));
jest.mock("../../config/env", () => ({
  env: {
    JWT_SECRET: "test-secret-value-12345",
    JWT_EXPIRES_IN: "7d",
  },
}));

const mockRepository = authRepository as jest.Mocked<typeof authRepository>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

const MOCK_USER = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "test@example.com",
  name: "Test User",
  passwordHash: "$2a$12$hashed",
  avatarUrl: null,
  githubUsername: null,
  githubToken: null,
  createdAt: new Date("2026-04-12T10:00:00.000Z"),
  updatedAt: new Date("2026-04-12T10:00:00.000Z"),
};

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue("signed-token" as never);
  });

  describe("register", () => {
    it("should create a user and return a signed token", async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("hashed-password" as never);
      mockRepository.create.mockResolvedValue({
        ...MOCK_USER,
        passwordHash: "hashed-password",
      } as never);

      const result = await authService.register({
        email: "TEST@example.com",
        name: " Test User ",
        password: "Password123!",
      });

      expect(mockRepository.findByEmail).toHaveBeenCalledWith("test@example.com");
      expect(mockRepository.create).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test User",
        passwordHash: "hashed-password",
      });
      expect(result.token).toBe("signed-token");
      expect(result.user.email).toBe("test@example.com");
    });

    it("should reject duplicate emails", async () => {
      mockRepository.findByEmail.mockResolvedValue(MOCK_USER as never);

      await expect(
        authService.register({
          email: "test@example.com",
          name: "Test User",
          password: "Password123!",
        })
      ).rejects.toThrow(ApiError);
    });
  });

  describe("login", () => {
    it("should return auth response for valid credentials", async () => {
      mockRepository.findByEmail.mockResolvedValue(MOCK_USER as never);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await authService.login({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(result.token).toBe("signed-token");
      expect(result.user.id).toBe(MOCK_USER.id);
    });

    it("should reject invalid credentials", async () => {
      mockRepository.findByEmail.mockResolvedValue(MOCK_USER as never);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        authService.login({
          email: "test@example.com",
          password: "bad-password",
        })
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getCurrentUser", () => {
    it("should return the current user without sensitive fields", async () => {
      mockRepository.findById.mockResolvedValue(MOCK_USER as never);

      const result = await authService.getCurrentUser(MOCK_USER.id);

      expect(result).toEqual({
        id: MOCK_USER.id,
        email: MOCK_USER.email,
        name: MOCK_USER.name,
        avatarUrl: null,
        githubUsername: null,
        createdAt: MOCK_USER.createdAt.toISOString(),
        updatedAt: MOCK_USER.updatedAt.toISOString(),
      });
    });
  });

  describe("verifyToken", () => {
    it("should decode a valid token", () => {
      mockJwt.verify.mockReturnValue({ userId: MOCK_USER.id, email: MOCK_USER.email } as never);

      const result = authService.verifyToken("signed-token");

      expect(result).toEqual({ userId: MOCK_USER.id, email: MOCK_USER.email });
    });

    it("should reject invalid tokens", () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error("invalid");
      });

      expect(() => authService.verifyToken("bad-token")).toThrow(ApiError);
    });
  });
});