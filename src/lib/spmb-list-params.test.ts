import { describe, expect, it } from "vitest";
import {
  parseSpmbListParams,
  serializeSpmbListParams,
  SPMB_LIST_DEFAULTS,
} from "./spmb-list-params";

describe("spmb-list-params", () => {
  it("parse memakai default untuk nilai tak dikenal", () => {
    const p = parseSpmbListParams(new URLSearchParams("q=ahmad&status=x&page=-2&size=999&tab=bogus&sort=a"));
    expect(p.q).toBe("ahmad");
    expect(p.status).toBe("x");
    expect(p.page).toBe(1);
    expect(p.size).toBe(10);
    expect(p.tab).toBe("registrations");
    expect(p.sort).toBe("a");
  });

  it("serialize menghilangkan default dan round-trip", () => {
    const qs = serializeSpmbListParams({ ...SPMB_LIST_DEFAULTS });
    expect(qs).toBe("");
    const p = { ...SPMB_LIST_DEFAULTS, q: "smp", status: "pending", page: 2, tab: "pipeline" };
    expect(serializeSpmbListParams(p)).toBe("q=smp&status=pending&page=2&tab=pipeline");
    expect(parseSpmbListParams(new URLSearchParams(serializeSpmbListParams(p)))).toEqual(p);
  });
});
