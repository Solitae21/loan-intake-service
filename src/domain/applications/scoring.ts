import type { ApplicationStatus } from "../../generated/prisma/enums.js";

export type ScoreInput = {
  amount: number;
  term: number;
  monthlyIncome: number;
};

export type ScoreResult = {
  score: number;
  status: ApplicationStatus;
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const scoreApplication = ({
  amount,
  term,
  monthlyIncome,
}: ScoreInput): ScoreResult => {
  if (monthlyIncome <= 0) return { score: 0, status: "REJECTED" };

  const monthlyPayment = amount / term;
  const debtToIncome = monthlyPayment / monthlyIncome;

  const base = Math.round((1 - debtToIncome / 0.5) * 100);
  const sizePenalty = amount > monthlyIncome * 12 ? 15 : 0;
  const termPenalty = term > 60 ? 10 : 0;

  const score = clamp(base - sizePenalty - termPenalty, 0, 100);

  const status: ApplicationStatus =
    score >= 70 ? "APPROVED" : score >= 40 ? "NEEDS_REVIEW" : "REJECTED";

  return { score, status };
};
