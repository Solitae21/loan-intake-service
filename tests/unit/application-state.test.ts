import { describe, expect, it } from "vitest";
import {
  assertTransition,
  InvalidTransitionError,
  type Status,
} from "../../src/domain/applications/application-state.js";

// Independent expectations: do not derive the allowed pairs from TRANSITIONS.
const allowed: Record<Status, readonly Status[]> = {
  PENDING: ["IN_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  NEEDS_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
};
const statuses = Object.keys(allowed) as Status[];

describe("application transition guard", () => {
  for (const from of statuses) {
    for (const to of statuses) {
      if (allowed[from].includes(to)) {
        it(`allows ${from} -> ${to}`, () => {
          expect(() => assertTransition(from, to)).not.toThrow();
        });
      } else {
        it(`rejects ${from} -> ${to}`, () => {
          expect(() => assertTransition(from, to)).toThrow(InvalidTransitionError);
          expect(() => assertTransition(from, to)).toThrow(
            expect.objectContaining({
              name: "InvalidTransitionError",
              message: `Cannot transition application from ${from} to ${to}`,
              from,
              to,
            }),
          );
        });
      }
    }
  }
});
