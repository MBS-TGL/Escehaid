import { describe, it, expect } from "vitest";
import { compareMetric } from "./catalog";

describe("alerts catalog: evaluator logika ambang batas", () => {
  it("gt (greater than) bekerja", () => {
    expect(compareMetric(10, "gt", 5)).toBe(true);
    expect(compareMetric(5, "gt", 5)).toBe(false);
    expect(compareMetric(2, "gt", 5)).toBe(false);
  });

  it("gte (greater than or equal) bekerja", () => {
    expect(compareMetric(5, "gte", 5)).toBe(true);
    expect(compareMetric(6, "gte", 5)).toBe(true);
    expect(compareMetric(4, "gte", 5)).toBe(false);
  });

  it("lt & lte bekerja", () => {
    expect(compareMetric(3, "lt", 5)).toBe(true);
    expect(compareMetric(5, "lte", 5)).toBe(true);
    expect(compareMetric(6, "lte", 5)).toBe(false);
  });

  it("eq & neq bekerja", () => {
    expect(compareMetric(5, "eq", 5)).toBe(true);
    expect(compareMetric(6, "neq", 5)).toBe(true);
  });
});
