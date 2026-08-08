import { app } from "./app.js";
import { config } from "../infra/config.js";

app.listen(config.PORT, () => {
  console.log(`API Listening on http://localhost:${config.PORT}`);
});
