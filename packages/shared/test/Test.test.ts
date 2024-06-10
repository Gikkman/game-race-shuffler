import assert from "node:assert";
import { describe, it } from "node:test";

import { FunctionUtils } from "@grs/shared";

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
    const numbers = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(i => ""+i);
    const roman = ["i","ii","iii","iv","v","vi","vii","viii","ix","x","xi","xii","xiii","xiv","xv"];
    for(const i in numbers) {
      const logical = FunctionUtils.calculateLogicalName("a "+ numbers[i] + " b");
      const expected = "a"+roman[i]+"b";
      assert.equal(logical, expected);
    }
  });
});
