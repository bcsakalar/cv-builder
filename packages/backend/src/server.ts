// ═══════════════════════════════════════════════════════════
// HTTP Server — Entry Point
// ═══════════════════════════════════════════════════════════

import { app } from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./lib/prisma";
import { disconnectRedis } from "./lib/redis";
import { closeQueues } from "./lib/queue";
import { logger } from "./lib/logger";
import { startPDFWorker } from "./workers/pdf.worker";
import { startGitHubAnalysisWorker } from "./workers/github-analysis.worker";
import { checkOllamaHealth, checkModelAvailable } from "./lib/ollama";
import { ollamaConfig } from "./config/ollama";

async function bootstrap(): Promise<void> {
  // Connect to database
  await connectDatabase();

  // Check Ollama availability (non-blocking)
  const ollamaUp = await checkOllamaHealth();
  if (ollamaUp) {
    const modelReady = await checkModelAvailable(ollamaConfig.defaultModel);
    if (modelReady) {
      logger.info("Ollama connected", { model: ollamaConfig.defaultModel });
    } else {
      logger.warn(`Ollama running but model "${ollamaConfig.defaultModel}" not found. Pull it with: ollama pull ${ollamaConfig.defaultModel}`);
    }
  } else {
    logger.warn("Ollama is not reachable. AI features will be unavailable until Ollama is started.");
  }

  // Start BullMQ workers
  startPDFWorker();
  startGitHubAnalysisWorker();

  // Start HTTP server
  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`, {
      environment: env.NODE_ENV,
      url: `http://localhost:${env.PORT}`,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received, starting graceful shutdown...`);

    server.close(async () => {
      logger.info("HTTP server closed");

      await closeQueues();
      await disconnectRedis();
      await disconnectDatabase();

      logger.info("Graceful shutdown complete");
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason });
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error: error.message, stack: error.stack });
    process.exit(1);
  });
}

bootstrap().catch((error: Error) => {
  logger.error("Failed to start server", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
