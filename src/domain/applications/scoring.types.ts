import type { ApplicationStatus } from "../../generated/prisma/enums.js";

export type ScoreInput = {
  amount: number;
  term: number;
  monthlyIncome: number;
  purpose: string;
};

export type RuleResult = {
  points: number;
  reason: string;
};

export type Rule = (application: ScoreInput) => RuleResult;

export type ScoreResult = {
  score: number;
  status: ApplicationStatus;
  breakdown: RuleResult[];
};

