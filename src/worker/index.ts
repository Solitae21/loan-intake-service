import type { ConsumeMessage } from "amqplib";
import { logger } from "../infra/logger.js";
import { prisma } from "../infra/prisma.js";
import {
  closeRabbit,
  connectRabbit,
  createChannel,
} from "../infra/messaging/rabbit.js";
import { assertScoringTopology, SCORING_QUEUE } from "./topology.js";
import { handleSubmitted } from "./handlers/application-submitted.js";

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

const onMessage = async (msg: ConsumeMessage): Promise<void> => {
  const messageId = msg.properties.messageId;

  try {
    await handleSubmitted(JSON.parse(msg.content.toString()));
    settle(() => channel.ack(msg));
  } catch (err) {
    log.error({ err, messageId }, "scoring failed - dead lettering");
    settle(() => channel.nack(msg, false, false));
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
