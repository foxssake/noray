import { describe, test, expect } from "bun:test";
import {
  BandwidthLimiter,
  BandwidthLimitExceededError,
} from "../../../src/relay/bandwidth.limiter.ts";
import { sleep } from "../../../src/utils.ts";

describe("BandwidthLimiter", () => {
  test("should pass", () => {
    // Given
    const limiter = new BandwidthLimiter({ maxTraffic: 16 });
    limiter.validate(8);

    // When + Then
    expect(() => limiter.validate(8)).not.toThrow();
  });

  test("should pass after interval", async () => {
    // Given
    const limiter = new BandwidthLimiter({ maxTraffic: 160, interval: 0.1 });
    limiter.validate(16);

    await sleep(0.15);

    // When + Then
    expect(() => limiter.validate(8)).not.toThrow();
  });

  test("should throw", () => {
    // Given
    const limiter = new BandwidthLimiter({ maxTraffic: 16 });
    limiter.validate(12);

    // When + Then
    expect(() => limiter.validate(8)).toThrow(BandwidthLimitExceededError);
  });
});
