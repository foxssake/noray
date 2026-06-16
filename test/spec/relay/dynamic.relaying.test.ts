import { beforeEach, afterEach, describe, test, expect } from "bun:test";
import sinon from "sinon";
import { UDPRelayHandler } from "../../../src/relay/udp.relay.handler.ts";
import { sleep } from "../../../src/utils.ts";
import { useDynamicRelay } from "../../../src/relay/dynamic.relaying.ts";
import { RelayEntry } from "../../../src/relay/relay.entry.ts";
import { NetAddress } from "../../../src/relay/net.address.ts";
import { UDPSocketPool } from "../../../src/relay/udp.socket.pool.ts";

describe("DynamicRelaying", () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  test("should create relay", async () => {
    // Given
    const socketPool = sinon.createStubInstance(UDPSocketPool);
    socketPool.getPort.returns(10000);

    const relayHandler = sinon.createStubInstance(UDPRelayHandler);
    relayHandler.on.callThrough();
    relayHandler.emit.callThrough();
    relayHandler.socketPool = socketPool;

    relayHandler.createRelay.resolves(true);
    useDynamicRelay(relayHandler);

    const senderRelay = undefined;
    const targetRelay = new RelayEntry({
      address: new NetAddress({ address: "87.54.0.16", port: 16752 }),
      port: 10007,
    });
    const senderAddress = new NetAddress({
      address: "97.32.4.16",
      port: 32775,
    });
    const targetPort = targetRelay.port;
    const messages = ["hello", "world", "use", "noray"].map((message) =>
      Buffer.from(message),
    );

    // When
    messages.forEach((message) =>
      relayHandler.emit(
        "drop",
        senderRelay,
        targetRelay,
        senderAddress,
        targetPort,
        message,
      ),
    );
    clock.restore();
    await sleep(0.05); // Wait for relay to be created
    // clock = sinon.useFakeTimers();

    // Then
    const createdRelay = relayHandler.createRelay.lastCall.args[0];
    expect(createdRelay, "Relay was not created!").not.toBeNil();
    expect(createdRelay.address).toBe(senderAddress);
    expect(createdRelay.port).toBe(10000);

    const sent = relayHandler.relay
      .getCalls()
      .map((call) => call.args[0]?.toString());
    messages.forEach((message) =>
      expect(
        sent.includes(message.toString()),
        `Message "${message.toString()}" was not sent!`,
      ).toBeTrue(),
    );
  });

  test("should ignore known sender", async () => {
    // Given
    const relayHandler = sinon.createStubInstance(UDPRelayHandler);
    relayHandler.on.callThrough();
    relayHandler.emit.callThrough();

    useDynamicRelay(relayHandler);

    const senderRelay = new RelayEntry({
      address: new NetAddress({ address: "87.54.0.16", port: 16752 }),
      port: 10007,
    });

    const targetRelay = undefined;
    const senderAddress = new NetAddress(senderRelay.address);
    const targetPort = 10057;
    const messages = ["hello", "world", "use", "noray"].map((message) =>
      Buffer.from(message),
    );

    // When
    messages.forEach((message) =>
      relayHandler.emit(
        "drop",
        senderRelay,
        targetRelay,
        senderAddress,
        targetPort,
        message,
      ),
    );
    clock.restore();
    await sleep(0.05); // Wait for relay to be created
    // clock = sinon.useFakeTimers();

    // Then
    expect(relayHandler.createRelay.notCalled).toBeTrue();
    expect(relayHandler.relay.notCalled).toBeTrue();
  });

  test("should ignore unknown target", async () => {
    // Given
    const relayHandler = sinon.createStubInstance(UDPRelayHandler);
    relayHandler.on.callThrough();
    relayHandler.emit.callThrough();

    useDynamicRelay(relayHandler);

    const senderRelay = undefined;
    const targetRelay = undefined;
    const senderAddress = new NetAddress({
      address: "87.54.0.16",
      port: 16752,
    });
    const targetPort = 10057;
    const messages = ["hello", "world", "use", "noray"].map((message) =>
      Buffer.from(message),
    );

    // When
    messages.forEach((message) =>
      relayHandler.emit(
        "drop",
        senderRelay,
        targetRelay,
        senderAddress,
        targetPort,
        message,
      ),
    );
    clock.restore();
    await sleep(0.05); // Wait for relay to be created
    // clock = sinon.useFakeTimers();

    // Then
    expect(relayHandler.createRelay.notCalled).toBeTrue();
    expect(relayHandler.relay.notCalled).toBeTrue();
  });

  afterEach(() => {
    clock.restore();
  });
});
