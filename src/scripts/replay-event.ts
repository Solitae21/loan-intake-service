import { prisma } from "../infra/prisma.js";
import {
  closeRabbit,
  connectRabbit,
  publish,
} from "../infra/messaging/rabbit.js";

const [outboxMessageId] = process.argv.slice(2);

if (!outboxMessageId) {
  console.error("usage: npm run replay -- <outboxMessageId>");
  process.exit(1);
}

const row = await prisma.outboxMessage.findUnique({
  where: { id: outboxMessageId },
});

if (!row) {
  console.error(`no outbox message ${outboxMessageId}`);
  process.exit(1);
}

await connectRabbit();

await publish({
  exchange: row.exchange,
  routingKey: row.routingKey,
  body: row.payload,
  messageId: row.id,
});

console.log(`replayed ${row.routingKey} messageId=${row.id}`);

await closeRabbit();
await prisma.$disconnect();
