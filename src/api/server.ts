import { app } from "./app.js";
import { config } from "../infra/config.js";
import { prisma } from "../infra/prisma.js";

const server = app.listen(config.PORT, () => {
  console.log(`API Listening on http://localhost:${config.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}
