import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../../utils/api-response";
import { authService } from "./auth.service";
import { requireAuthUser } from "../../middleware/auth";

export const authController = {
  async register(req: Request, res: Response) {
    const authResponse = await authService.register(req.body);
    sendCreated(res, authResponse, "Account created successfully");
  },

  async login(req: Request, res: Response) {
    const authResponse = await authService.login(req.body);
    sendSuccess(res, authResponse, "Signed in successfully");
  },

  async me(req: Request, res: Response) {
    const user = await authService.getCurrentUser(requireAuthUser(req).userId);
    sendSuccess(res, user, "User retrieved successfully");
  },

  async logout(_req: Request, res: Response) {
    sendSuccess(res, { loggedOut: true }, "Signed out successfully");
  },
};