// ═══════════════════════════════════════════════════════════
// Prisma Client Singleton
// ═══════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
          ]
        : [{ emit: "event", level: "error" }],
  });

if (env.NODE_ENV === "development") {
  prisma.$on("query" as never, (e: unknown) => {
    const event = e as { query: string; duration: number };
    logger.debug("Prisma Query", {
      query: event.query,
      duration: `${event.duration}ms`,
    });
  });
}

prisma.$on("error" as never, (e: unknown) => {
  const event = e as { message: string };
  logger.error("Prisma Error", { message: event.message });
});

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Failed to connect to database", { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database disconnected");
}
