import { app } from "./app.js";
import { config } from "../infra/config.js";
import { prisma } from "../infra/prisma.js";
import { logger } from "../infra/logger.js";
import { connectRabbit, closeRabbit } from "../infra/messaging/rabbit.js";
import { startOutboxRelay } from "../infra/messaging/outbox-relay.js";

await connectRabbit();
const relay = startOutboxRelay();

const server = app.listen(config.PORT, () => {
  logger.info(`API Listening on http://localhost:${config.PORT}`);
});

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await relay.stop();
  await closeRabbit();
  await prisma.$disconnect();
  process.exit(0);
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}
