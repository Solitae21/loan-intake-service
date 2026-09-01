import type { ApplicationStatus } from "../../generated/prisma/enums.js";

export type Status = ApplicationStatus;

export const TRANSITIONS: Record<Status, readonly Status[]> = {
  PENDING: ["IN_REVIEW", "APPROVED", "REJECTED", "NEEDS_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  NEEDS_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
};

export class InvalidTransitionError extends Error {
  readonly from: Status;
  readonly to: Status;

  constructor(from: Status, to: Status) {
    super(`Cannot transition application from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
    this.from = from;
    this.to = to;

    Error.captureStackTrace?.(this, InvalidTransitionError);
  }
}

export const assertTransition = (from: Status, to: Status): void => {
  if (!TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
};
