import { UDPRelayHandler } from "./udp.relay.handler.ts";
import { time } from "../utils.ts";
import * as prometheus from "prom-client";
import { metricsRegistry } from "../metrics/metrics.registry.ts";
import { RelayEntry } from "./relay.entry.ts";

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
