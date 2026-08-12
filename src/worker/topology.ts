import type { Channel } from "amqplib";
import { LOANS_DLX, LOANS_EXCHANGE } from "../infra/messaging/rabbit.js";
import { APPLICATION_SUBMITTED } from "../domain/applications/application.service.js";

export const SCORING_QUEUE = "application.scoring";
export const SCORING_DLQ = "application.scoring.dlq";

export const assertScoringTopology = async (
  channel: Channel,
): Promise<void> => {
  await channel.assertExchange(LOANS_DLX, "topic", { durable: true });
  await channel.assertQueue(SCORING_DLQ, { durable: true });
  await channel.bindQueue(SCORING_DLQ, LOANS_DLX, SCORING_QUEUE);

  await channel.assertQueue(SCORING_QUEUE, {
    durable: true,
    deadLetterExchange: LOANS_DLX,
    deadLetterRoutingKey: SCORING_QUEUE,
  });
  await channel.bindQueue(SCORING_QUEUE, LOANS_EXCHANGE, APPLICATION_SUBMITTED);
};
