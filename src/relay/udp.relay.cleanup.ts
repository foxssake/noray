import { UDPRelayHandler } from "./udp.relay.handler.js";
import { time } from "../utils";
import * as prometheus from "prom-client";
import { metricsRegistry } from "../metrics/metrics.registry";
import { RelayEntry } from "./relay.entry";

const expiredRelayCounter = new prometheus.Counter({
  name: "noray_relay_expired",
  help: "Count of expired relays",
  registers: [metricsRegistry],
});

/**
 * Remove idle relays.
 * @param relayHandler Relay handler
 * @param timeout Maximum relay age in seconds
 */
export function cleanupUdpRelayTable(
  relayHandler: UDPRelayHandler,
  timeout: number,
) {
  const timeCutoff = time() - timeout;

  relayHandler.relayTable
    .filter((relay) => getRelayLastActivity(relay) <= timeCutoff)
    .forEach((relay) => {
      relayHandler.freeRelay(relay);
      expiredRelayCounter.inc();
    });
}

function getRelayLastActivity(relay: RelayEntry): number {
  return Math.max(relay.lastSent, relay.lastReceived);
}
