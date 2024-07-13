import assert from "node:assert";
import { describe, it } from "node:test";

import Main from '../src/Main';
import { FunctionUtils } from "@grs/shared";

describe("desc", () => {
  it("it", async () => {

    const main = new Main();
    await main.start();
    await FunctionUtils.sleep(1000);
    main.shutdown();

    assert.equal(true, true);
  });
});
