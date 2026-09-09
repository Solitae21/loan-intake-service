import { readFileSync } from "node:fs";
import { parse } from "yaml";

const specificationUrl = new URL("../../openapi.yaml", import.meta.url);

export const openApiDocument = parse(
  readFileSync(specificationUrl, "utf8"),
) as Record<string, unknown>;
