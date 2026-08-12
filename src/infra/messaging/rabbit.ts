import {
  connect,
  type ConfirmChannel,
  type RecoveringChannelModel,
  type Channel,
} from "amqplib";
import { config } from "../config.js";
import { logger } from "../logger.js";

export const LOANS_EXCHANGE = "loans";
export const LOANS_DLX = "loans.dlx";

export type OutgoingMessage = {
  exchange: string;
  routingKey: string;
  body: unknown;
  messageId: string;
  correlationId?: string;
};

let model: RecoveringChannelModel | null = null;
let channel: Promise<ConfirmChannel> | null = null;

export const createChannel = async (): Promise<Channel> => {
  if (!model)
    throw new Error("RabbitMQ not connected - call connectRabbit() first");

  const ch = await model.createChannel();
  await ch.assertExchange(LOANS_EXCHANGE, "topic", { durable: true });
  return ch;
};

const openChannel = async (): Promise<ConfirmChannel> => {
  if (!model)
    throw new Error("RabbitMQ not connected - call connectRabbit() first");

  const ch = await model.createConfirmChannel();
  await ch.assertExchange(LOANS_EXCHANGE, "topic", { durable: true });

  const drop = () => {
    channel = null;
  };

  ch.on("close", drop);
  ch.on("error", (err: unknown) => {
    logger.error({ err }, "amqp channel error");
    drop();
  });

  return ch;
};

const getChannel = (): Promise<ConfirmChannel> => {
  channel ??= openChannel().catch((err: unknown) => {
    channel = null;
    throw err;
  });
  return channel;
};

export const connectRabbit = async (): Promise<void> => {
  if (model) return;

  model = await connect(config.RABBITMQ_URL, { recovery: true });
  model.on("connect", () => logger.info("amqp connected"));
  model.on("disconnect", (err) =>
    logger.warn({ err }, "amqp disconnected, recovering"),
  );
  model.on("error", (err) => logger.error({ err }, "amqp connection error"));

  await getChannel();
};

export const publish = async (message: OutgoingMessage): Promise<void> => {
  const ch = await getChannel();
  const content = Buffer.from(JSON.stringify(message.body));

  await new Promise<void>((resolve, reject) => {
    ch.publish(
      message.exchange,
      message.routingKey,
      content,
      {
        persistent: true,
        messageId: message.messageId,
        contentType: "application/json",
        timestamp: Date.now(),
        ...(message.correlationId
          ? { correlationId: message.correlationId }
          : {}),
      },
      (err: unknown) => (err ? reject(err) : resolve()),
    );
  });
};

export const closeRabbit = async (): Promise<void> => {
  const current = model;
  model = null;
  channel = null;
  if (current) await current.close();
};
