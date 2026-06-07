import { describe, it } from "node:test";
import assert from "node:assert";
import sinon from "sinon";
import { time } from "../../../src/utils.ts";
import { RelayEntry } from "../../../src/relay/relay.entry.ts";
import { NetAddress } from "../../../src/relay/net.address.ts";
import { UDPRelayHandler } from "../../../src/relay/udp.relay.handler.ts";
import { cleanupUdpRelayTable } from "../../../src/relay/udp.relay.cleanup.ts";

describe("cleanupUdpRelayTable", () => {
  it("should free old relays", () => {
    // Given
    const origin = time();
    const timeout = 2;
    const expired = origin - timeout - 1;

    console.log({
      origin,
      timeout,
      expired,
    });

    const freshRelay = new RelayEntry({
      address: new NetAddress({ address: "88.57.0.2", port: 32276 }),
      port: 10001,
      lastReceived: origin,
      lastSent: origin,
    });

    const oldSendRelay = new RelayEntry({
      address: new NetAddress({ address: "88.57.0.3", port: 32276 }),
      port: 10002,
      lastReceived: origin,
      lastSent: expired,
    });

    const oldReceiveRelay = new RelayEntry({
      address: new NetAddress({ address: "88.57.0.3", port: 32276 }),
      port: 10003,
      lastReceived: expired,
      lastSent: origin,
    });

    const expiredRelay = new RelayEntry({
      address: new NetAddress({ address: "88.57.0.4", port: 32276 }),
      port: 10004,
      lastReceived: expired,
      lastSent: expired,
    });

    const relayTable = [
      freshRelay,
      oldSendRelay,
      oldReceiveRelay,
      expiredRelay,
    ];
    const relayHandler = sinon.createStubInstance(UDPRelayHandler);
    sinon.stub(relayHandler, "relayTable").value(relayTable);

    // When
    cleanupUdpRelayTable(relayHandler, timeout);

    // Then
    assert(
      relayHandler.freeRelay.neverCalledWith(freshRelay),
      "Fresh relay was freed!",
    );
    assert(
      relayHandler.freeRelay.neverCalledWith(oldSendRelay),
      "Old send relay was freed!",
    );
    assert(
      relayHandler.freeRelay.neverCalledWith(oldReceiveRelay),
      "Old receive relay was freed!",
    );
    assert(
      relayHandler.freeRelay.calledWith(expiredRelay),
      "Expired relay was not freed!",
    );
  });
});
