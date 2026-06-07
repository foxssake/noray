import { formatBandwidth, time } from "../utils.ts";

/**
 * Constructor options for [BandwidthLimiter]
 */
export interface BandwithLimiterOptions {
  /** Traffic limit in bytes/sec */
  maxTraffic: number;

  /** Traffic interval length in seconds */
  interval?: number;
}

export class BandwidthLimitExceededError extends Error { }

/**
 * Generic component to limit bandwidth usage.
 *
 * Internally, the bandwidth limiter divides chunks into time slices of
 * `interval` length. Every time slice is allocated a certain amount of data
 * transfer based on the max traffic specified in bytes/sec ( i.e. if interval
 * is 1/8th of a second, then the max traffic for a time slice is 1/8th of the
 * max traffic ).
 *
 * For any traffic that is within the limit, the counter is increased and the
 * validation passes. Once the time slice expires, the counter is reset and a
 * new one is started.
 */
export class BandwidthLimiter {
  private interval = 1;
  private maxTraffic: number;

  private traffic = 0;
  private lastInterval: number = time();

  /**
   * Construct instance.
   */
  constructor(options: BandwithLimiterOptions) {
    this.interval = options.interval ?? 1;
    this.maxTraffic = options.maxTraffic;
    this.traffic = 0;
    this.lastInterval = time();
  }

  /**
   * Validate that a given size of data fits into the bandwidth limit.
   * @throws if traffic is over limit
   */
  validate(size: number) {
    // If we're past the last interval, start a new one
    if (time() > this.lastInterval + this.interval) {
      this.lastInterval = time();
      this.traffic = size;
      return;
    }

    const limit = this.maxTraffic * this.interval;
    if (this.traffic + size > limit)
      // TODO: Optionally have a configurable `id` field on the class, which can
      // be displayed in this exception for readability
      throw new BandwidthLimitExceededError(
        `Bandwidth limit of ${formatBandwidth(this.maxTraffic)} exceeded!`,
      );

    this.traffic += size;
  }
}
