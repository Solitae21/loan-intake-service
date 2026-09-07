import { describe, expect, it } from "vitest";
import {
  amountCeiling,
  completeness,
  debtToIncome,
  incomeFloor,
  termLength,
} from "../../src/domain/applications/scoring.rules.js";
import type { ScoreInput } from "../../src/domain/applications/scoring.types.js";

const input: ScoreInput = {
  amount: 12_000,
  term: 12,
  monthlyIncome: 1_000,
  purpose: "home repairs",
};

describe("debt-to-income boundaries", () => {
  it.each([
    [1_799, 25], [1_800, 25], [1_801, 10],
    [3_599, 10], [3_600, 10], [3_601, 0],
    [5_399, 0], [5_400, 0], [5_401, -30],
  ])("scores amount %i as %i points", (amount, points) => {
    expect(debtToIncome({ ...input, amount }).points).toBe(points);
  });
});

describe("annual-income multiple boundaries", () => {
  it.each([
    [5_999, 15], [6_000, 15], [6_001, 5],
    [11_999, 5], [12_000, 5], [12_001, -10],
    [23_999, -10], [24_000, -10], [24_001, -25],
  ])("scores amount %i as %i points", (amount, points) => {
    expect(incomeFloor({ ...input, amount }).points).toBe(points);
  });
});

describe("amount ceiling boundaries", () => {
  it.each([
    [49_999, 10], [50_000, 10], [50_001, 0],
    [249_999, 0], [250_000, 0], [250_001, -20],
  ])("scores amount %i as %i points", (amount, points) => {
    expect(amountCeiling({ ...input, amount }).points).toBe(points);
  });
});

describe("term length boundaries", () => {
  it.each([
    [23, 10], [24, 10], [25, 5],
    [59, 5], [60, 5], [61, -5],
    [119, -5], [120, -5], [121, -15],
  ])("scores %i months as %i points", (term, points) => {
    expect(termLength({ ...input, term }).points).toBe(points);
  });
});

describe("purpose completeness boundaries", () => {
  it.each([
    ["", -5], [" \t\n ", -5], ["repairs", -5],
    ["home repairs", 3], ["repair my home", 3],
    ["repair my home roof", 3], ["repair my damaged home roof", 10],
    ["repair my badly damaged home roof", 10],
    ["  repair\tmy\n damaged   home roof  ", 10],
  ])("scores purpose %j as %i points", (purpose, points) => {
    expect(completeness({ ...input, purpose }).points).toBe(points);
  });
});
