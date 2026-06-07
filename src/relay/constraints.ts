import { BandwidthLimiter } from "./bandwidth.limiter.ts";
import { UDPRelayHandler } from "./udp.relay.handler.ts";
import assert from "node:assert";
import { time } from "../utils.ts";

/**
 * Limit the bandwidth on every relay individually.
 *
 * @param relayHandler Relay handler
 * @param traffic Traffic limit in bytes/sec
 * @param interval Limit interval in seconds
 */
export function constrainIndividualBandwidth(
  relayHandler: UDPRelayHandler,
  traffic: number,
  interval = 1,
) {
  const limiters = new Map();

  relayHandler.on("transmit", (source, _target, message) => {
    if (!limiters.has(source.id)) {
      limiters.set(
        source.id,
        new BandwidthLimiter({
          maxTraffic: traffic,
          interval: interval ?? 1,
        }),
      );
    }

    const limiter = limiters.get(source.id);
    limiter.validate(message.length);
  });

  relayHandler.on("destroy", (relay) => {
    limiters.delete(relay.id);
  });
}

/**
 * Limit the bandwidth on every relay globally.
 *
 * @param relayHandler Relay handler
 * @param traffic Traffic limit in bytes/sec
 * @param interval Limit interval in seconds
 */
export function constrainGlobalBandwidth(
  relayHandler: UDPRelayHandler,
  traffic: number,
  interval = 1,
) {
  const limiter = new BandwidthLimiter({
    maxTraffic: traffic,
    interval: interval ?? 1,
  });

  relayHandler.on("transmit", (_source, _target, message) => {
    limiter.validate(message.length);
  });
}

/**
 * Block all traffic on relays after they've been active for a given duration.
 * @param relayHandler Relay handler
 * @param duration Duration in seconds
 */
export function constrainLifetime(
  relayHandler: UDPRelayHandler,
  duration: number,
) {
  relayHandler.on("transmit", (source) => {
    // TODO: Prefer custom exception
    assert(
      time() - source.created < duration,
      "Relay has hit lifetime duration limit!",
    );
  });
}

/**
 * Block all traffic on relays after they reached a given amount of traffic.
 * @param relayHandler Relay handler
 * @param traffic Maximum traffic in bytes
 */
export function constrainTraffic(
  relayHandler: UDPRelayHandler,
  traffic: number,
) {
  const relayTraffic = new Map();

  relayHandler.on("transmit", (source, _target, message) => {
    const id = source.id;
    relayTraffic.set(id, (relayTraffic.get(id) ?? 0) + message.byteLength);
    // TODO: Prefer custom exception
    assert(
      relayTraffic.get(id) < traffic,
      "Relay has hit lifetime traffic limit!",
    );
  });

  relayHandler.on("destroy", (relay) => {
    relayTraffic.delete(relay.id);
  });
}
