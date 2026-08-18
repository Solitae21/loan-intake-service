import type { Rule } from "./scoring.types.js";

export const debtToIncome: Rule = ({ amount, term, monthlyIncome }) => {
  const ratio = amount / term / monthlyIncome;
  const pct = Math.round(ratio * 100);

  if (ratio <= 0.15) return { points: 25, reason: `dti ${pct}% - comfortable` };
  if (ratio <= 0.3) return { points: 10, reason: `dti ${pct}% - manageable` };
  if (ratio <= 0.45) return { points: 0, reason: `dti ${pct}% - at the limit` };

  return { points: -30, reason: `dti ${pct}% - above the 45% limit` };
};

export const incomeFloor: Rule = ({ amount, monthlyIncome }) => {
  const multiple = amount / (monthlyIncome * 12);
  const label = `${multiple.toFixed(1)}x annual income`;

  if (multiple <= 0.5) return { points: 15, reason: `${label} - well covered` };
  if (multiple <= 1) return { points: 5, reason: `${label} - covered` };
  if (multiple <= 2) return { points: -10, reason: `${label} - stretched` };
  return { points: -25, reason: `${label} - beyond the 2x floor` };
};

export const amountCeiling: Rule = ({ amount }) => {
  if (amount <= 50_000)
    return { points: 10, reason: "within 50k fast-track ceiling" };
  if (amount <= 250_000)
    return { points: 0, reason: "within 250k standard ceiling" };
  return { points: -20, reason: "above the 250k ceiling" };
};

export const termLength: Rule = ({ term }) => {
  if (term <= 24) return { points: 10, reason: `${term} month term - short` };
  if (term <= 60) return { points: 5, reason: `${term} month term - standard` };
  if (term <= 120) return { points: -5, reason: `${term} month term - long` };
  return { points: -15, reason: `${term} month term - very long` };
};

export const completeness: Rule = ({ purpose }) => {
  const words = purpose.trim().split(/\s+/).filter(Boolean).length;

  if (words >= 5) return { points: 10, reason: "purpose described in detail" };
  if (words >= 2) return { points: 3, reason: "purpose briefly described" };
  return { points: -5, reason: "purpose is a single word" };
};

export const rules: Rule[] = [
  debtToIncome,
  incomeFloor,
  amountCeiling,
  termLength,
  completeness,
];
