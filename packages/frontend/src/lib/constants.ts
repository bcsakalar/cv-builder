export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export const STATIC_BASE_URL =
  import.meta.env.VITE_API_URL?.replace("/api", "") ?? "http://localhost:3001";

export const APP_NAME = "CvBuilder";

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
