import type { ApplicationStatus } from "../../generated/prisma/enums.js";
import { rules } from "./scoring.rules.js";
import type {
  Rule,
  RuleResult,
  ScoreInput,
  ScoreResult,
} from "./scoring.types.js";

export type { Rule, RuleResult, ScoreInput, ScoreResult };

const BASE_SCORE = 50;
const APPROVE_AT = 70;
const REVIEW_AT = 40;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toStatus = (score: number): ApplicationStatus =>
  score >= APPROVE_AT
    ? "APPROVED"
    : score >= REVIEW_AT
      ? "NEEDS_REVIEW"
      : "REJECTED";

export const evaluate = (
  application: ScoreInput,
  applied: Rule[] = rules,
): ScoreResult => {
  const breakdown = applied.map((rule) => rule(application));
  const total = breakdown.reduce((sum, { points }) => sum + points, BASE_SCORE);
  const score = clamp(total, 0, 100);

  return { score, status: toStatus(score), breakdown };
};

export const scoreApplication = (application: ScoreInput): ScoreResult => {
  if (application.monthlyIncome <= 0) {
    return {
      score: 0,
      status: "REJECTED",
      breakdown: [{ points: 0, reason: "no declared income" }],
    };
  }

  return evaluate(application);
};
