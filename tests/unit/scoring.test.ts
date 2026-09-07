import { describe, expect, it } from "vitest";
import { evaluate, scoreApplication } from "../../src/domain/applications/scoring.js";
import type { ScoreInput } from "../../src/domain/applications/scoring.types.js";

const input: ScoreInput = {
  amount: 12_000,
  term: 12,
  monthlyIncome: 10_000,
  purpose: "repair my damaged home roof",
};

describe("score evaluation", () => {
  it.each([
    [39, "REJECTED"], [40, "NEEDS_REVIEW"], [41, "NEEDS_REVIEW"],
    [69, "NEEDS_REVIEW"], [70, "APPROVED"], [71, "APPROVED"],
    [-1, "REJECTED"], [0, "REJECTED"], [1, "REJECTED"],
    [99, "APPROVED"], [100, "APPROVED"], [101, "APPROVED"],
  ])("maps total %i to %s and clamps to 0–100", (total, status) => {
    const result = evaluate(input, [() => ({ points: total - 50, reason: "test rule" })]);
    expect(result.score).toBe(Math.min(100, Math.max(0, total)));
    expect(result.status).toBe(status);
  });

  it("starts at 50 when no rules are supplied", () => {
    expect(evaluate(input, [])).toEqual({ score: 50, status: "NEEDS_REVIEW", breakdown: [] });
  });

  it("passes the application to each rule and preserves ordered explanations", () => {
    const result = evaluate(input, [
      (application) => {
        expect(application).toBe(input);
        return { points: 25, reason: "positive factor" };
      },
      (application) => {
        expect(application).toBe(input);
        return { points: -10, reason: "negative factor" };
      },
    ]);
    expect(result).toEqual({
      score: 65,
      status: "NEEDS_REVIEW",
      breakdown: [
        { points: 25, reason: "positive factor" },
        { points: -10, reason: "negative factor" },
      ],
    });
  });
});

describe("application scoring with real rules", () => {
  it.each([0, -1])("rejects monthly income %i before evaluating rules", (monthlyIncome) => {
    expect(scoreApplication({ ...input, monthlyIncome })).toEqual({
      score: 0,
      status: "REJECTED",
      breakdown: [{ points: 0, reason: "no declared income" }],
    });
  });

  it("combines all five rules and caps a strong application at 100", () => {
    expect(scoreApplication(input)).toEqual({
      score: 100,
      status: "APPROVED",
      breakdown: [
        { points: 25, reason: "dti 10% - comfortable" },
        { points: 15, reason: "0.1x annual income - well covered" },
        { points: 10, reason: "within 50k fast-track ceiling" },
        { points: 10, reason: "12 month term - short" },
        { points: 10, reason: "purpose described in detail" },
      ],
    });
  });

  it("routes a borderline application to review", () => {
    const result = scoreApplication({ ...input, amount: 120_000, monthlyIncome: 10_000 });
    expect(result.score).toBe(45);
    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.breakdown.map(({ points }) => points)).toEqual([-30, 5, 0, 10, 10]);
  });

  it("floors a weak application at zero, including positive income", () => {
    const result = scoreApplication({ amount: 300_000, term: 121, monthlyIncome: 1, purpose: "repairs" });
    expect(result.score).toBe(0);
    expect(result.status).toBe("REJECTED");
    expect(result.breakdown.map(({ points }) => points)).toEqual([-30, -25, -20, -15, -5]);
  });
});
