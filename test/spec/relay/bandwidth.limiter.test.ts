import { describe, it } from "node:test";
import assert from "node:assert";
import { BandwidthLimiter } from "../../../src/relay/bandwidth.limiter.ts";
import { sleep } from "../../../src/utils.ts";

describe("BandwidthLimiter", () => {
  it("should pass", () => {
    // Given
    const limiter = new BandwidthLimiter({ maxTraffic: 16 });
    limiter.validate(8);

    // When + Then
    assert.doesNotThrow(() => limiter.validate(8));
  });

  it("should pass after interval", async () => {
    // Given
    const limiter = new BandwidthLimiter({ maxTraffic: 160, interval: 0.1 });
    limiter.validate(16);

    await sleep(0.15);

    // When + Then
    assert.doesNotThrow(() => limiter.validate(8));
  });

  it("should throw", () => {
    // Given
    const limiter = new BandwidthLimiter({ maxTraffic: 16 });
    limiter.validate(12);

    // When + Then
    assert.throws(() => limiter.validate(8));
  });
});
