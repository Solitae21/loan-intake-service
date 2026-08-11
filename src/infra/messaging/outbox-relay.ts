import { prisma } from "../prisma.js";
import { logger } from "../logger.js";
import { publish } from "./rabbit.js";

const BATCH_SIZE = 50;
const POLL_INTERVAL_MS = 1_000;
const TX_TIMEOUT_MS = 30_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const ALERT_AFTER_ATTEMPTS = 10;

type ClaimedMessage = {
  id: string;
  exchange: string;
  routingKey: string;
  payload: unknown;
  attempts: number;
};

const backoffMs = (attempts: number) =>
  Math.min(MAX_BACKOFF_MS, 500 * 2 ** Math.min(attempts, 20));

const drainOnce = (): Promise<number> =>
  prisma.$transaction(
    async (tx) => {
      const batch = await tx.$queryRaw<ClaimedMessage[]>`
        SELECT "id", "exchange", "routingKey", "payload", "attempts"
        FROM "OutboxMessage"
        WHERE "publishedAt" IS NULL
          AND "availableAt" <= NOW()
        ORDER BY "createdAt"
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `;

      let published = 0;

      for (const message of batch) {
        try {
          await publish({
            exchange: message.exchange,
            routingKey: message.routingKey,
            body: message.payload,
            messageId: message.id,
          });

          await tx.outboxMessage.update({
            where: { id: message.id },
            data: { publishedAt: new Date(), lastError: null },
          });
          published += 1;
        } catch (err) {
          const attempts = message.attempts + 1;

          await tx.outboxMessage.update({
            where: { id: message.id },
            data: {
              attempts,
              lastError: err instanceof Error ? err.message : String(err),
              availableAt: new Date(Date.now() + backoffMs(attempts)),
            },
          });

          logger.error(
            { err, messageId: message.id, attempts },
            attempts >= ALERT_AFTER_ATTEMPTS
              ? "outbox message is stuck - investigate"
              : "outbox publish failed, will retry",
          );

          break;
        }
      }

      return published;
    },
    { timeout: TX_TIMEOUT_MS },
  );

export type OutboxRelay = { stop: () => Promise<void> };

let wake: (() => void) | null = null;

export const notifyOutbox = (): void => wake?.();

export const startOutboxRelay = (): OutboxRelay => {
  let stopped = false;

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        wake = null;
        resolve();
      }, ms);
      wake = () => {
        clearTimeout(timer);
        wake = null;
        resolve();
      };
    });

  const loop = (async () => {
    while (!stopped) {
      try {
        const published = await drainOnce();
        if (published === BATCH_SIZE) continue;
      } catch (err) {
        logger.error({ err }, "outbox relay tick failed");
      }
      await sleep(POLL_INTERVAL_MS);
    }
  })();

  logger.info("outbox relay started");

  return {
    stop: async () => {
      stopped = true;
      wake?.();
      await loop;
      logger.info("outbox relay stopped");
    },
  };
};
