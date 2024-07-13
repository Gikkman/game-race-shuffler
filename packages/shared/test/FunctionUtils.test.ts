import assert from "node:assert";
import { describe, it } from "node:test";

import * as FunctionUtils from "../src/FunctionUtils";

describe("Test FunctionUtils", () => {
  it("casts logical name to lower case", () => {
    const logical = FunctionUtils.calculateLogicalName("ABCDEF");
    assert.equal(logical, "abcdef");
  });

  it("removes all not-alphanumeric characters", () => {
    const logical = FunctionUtils.calculateLogicalName("a-b:c d   èf中文");
    assert.equal(logical, "abcdf");
  });

  it("retains underscores", () => {
    const logical = FunctionUtils.calculateLogicalName("AB_CD EF");
    assert.equal(logical, "ab_cdef");
  });

  it("converts numbers to roman", () => {
    assert.equal(FunctionUtils.calculateLogicalName("A12b c2D1"), "axiibciidi");
    assert.equal(FunctionUtils.calculateLogicalName("25x"), "xxvx");
    assert.equal(FunctionUtils.calculateLogicalName("1.1"), "ii");
    assert.equal(FunctionUtils.calculateLogicalName("2030"), "2030");
  });
});
