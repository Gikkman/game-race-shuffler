import assert from "node:assert";
import { describe, it } from "node:test";

import * as FunctionUtils from "../src/FunctionUtils";

describe("Test FunctionUtils.calculateLogicalName", () => {
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

describe("Test FunctionUtils.randomIntInRange", () => {
  it("can generate numbers in the range", () => {
    const set = new Set<number>();
    for(let i = 0; i < 10_000; i++) {
      const num = FunctionUtils.randomIntInRange(1,10);
      assert.ok(num >= 1 && num <= 10);
      set.add(num);
    }
    assert.equal(set.size, 10);
  })
  it("can handle when min and max is the same number", () => {
    const num = FunctionUtils.randomIntInRange(10,10);
    assert.equal(num, 10);
  })
  it("can handle negative numbers", () => {
    const set = new Set<number>();
    for(let i = 0; i < 10_000; i++) {
      const num = FunctionUtils.randomIntInRange(-5,-2);
      assert.ok(num >= -5 && num <= -2);
      set.add(num);
    }
    assert.equal(set.size, 4);
  })
})
