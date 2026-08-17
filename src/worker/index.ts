import type { ConsumeMessage } from "amqplib";
import { logger } from "../infra/logger.js";
import { prisma } from "../infra/prisma.js";
import {
  closeRabbit,
  connectRabbit,
  createChannel,
} from "../infra/messaging/rabbit.js";
import {
  assertScoringTopology,
  SCORING_QUEUE,
  MAX_ATTEMPTS,
  RETRY_HEADER,
  SCORING_DLQ,
} from "./topology.js";
import { handleSubmitted } from "./handlers/application-submitted.js";
import { ZodError } from "zod";

const log = logger.child({ component: "scoring-worker" });

await connectRabbit();

const channel = await createChannel();
await assertScoringTopology(channel);
await channel.prefetch(1);

let shuttingDown = false;
let inFlight: Promise<void> = Promise.resolve();

const settle = (action: () => void): void => {
  try {
    action();
  } catch (err) {
    log.error({ err }, "could not settle message - awaiting redelivery");
  }
};

const priorAttempts = (msg: ConsumeMessage): number => {
  const raw = msg.properties.headers?.[RETRY_HEADER];
  const n = Number(raw ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const isPermanent = (err: unknown): boolean =>
  err instanceof ZodError || err instanceof SyntaxError;

const republish = (msg: ConsumeMessage, attempts: number): void => {
  channel.sendToQueue(SCORING_QUEUE, msg.content, {
    persistent: true,
    contentType: msg.properties.contentType,
    messageId: msg.properties.messageId,
    correlationId: msg.properties.correlationId,
    timestamp: msg.properties.timestamp,
    headers: { ...msg.properties.headers, [RETRY_HEADER]: attempts },
  });
};

const onMessage = async (msg: ConsumeMessage): Promise<void> => {
  const messageId = msg.properties.messageId;
  const attempts = priorAttempts(msg) + 1;

  if (!messageId) {
    log.error("message has no messageId - cannot dedupe, dead lettering");
    settle(() => channel.nack(msg, false, false));
    return;
  }

  try {
    await handleSubmitted(messageId, JSON.parse(msg.content.toString()));
    settle(() => channel.ack(msg));
  } catch (err) {
    if (isPermanent(err)) {
      log.error({ err, messageId }, "unprocessable message - dead lettering");
      settle(() => channel.nack(msg, false, false));
      return;
    }

    if (attempts >= MAX_ATTEMPTS) {
      log.error(
        { err, messageId, attempts },
        "retried exhausted - dead lettering",
      );
      settle(() => channel.nack(msg, false, false));
      return;
    }

    log.warn({ err, messageId, attempts }, "scoring failed - retrying");
    settle(() => {
      republish(msg, attempts);
      channel.ack(msg);
    });
  }
};

const { consumerTag } = await channel.consume(
  SCORING_QUEUE,
  (msg) => {
    if (!msg) return;
    inFlight = onMessage(msg);
  },
  { noAck: false },
);

channel.on("error", (err) => log.error({ err }, "consumer channel error"));
log.info({ queue: SCORING_QUEUE, consumerTag }, "scoring worker started");

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, "shutting down ");

  try {
    await channel.cancel(consumerTag);
    await inFlight;
    await channel.close();
    await closeRabbit();
    await prisma.$disconnect();
  } catch (err) {
    log.error({ err }, "unclean shutdown");
  }

  process.exit(0);
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}
