import { describe, it } from "node:test";
import assert from "node:assert";
import sinon from "sinon";
import dgram from "node:dgram";
import { UDPSocketPool } from "../../../src/relay/udp.socket.pool.ts";
import { RelayEntry } from "../../../src/relay/relay.entry.ts";
import { NetAddress } from "../../../src/relay/net.address.ts";
import { UDPRelayHandler } from "../../../src/relay/udp.relay.handler.ts";

// TODO: Refactor the relay, so it only decides what and where to send, without
// actually sending it

describe("UDPRelayHandler", () => {
  describe("createRelay", () => {
    it("should create relay", async () => {
      // Given
      const handler = sinon.stub();
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.returns(10001);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();

      const relay = new RelayEntry({
        port: 57789,
        address: new NetAddress({
          address: "88.57.0.107",
          port: 32279,
        }),
      });

      const relayHandler = new UDPRelayHandler({
        socketPool,
      });

      relayHandler.on("create", handler);

      // When
      relayHandler.createRelay(relay);

      // Then
      assert.deepEqual(relayHandler.relayTable, [relay]);
      assert(relay.port, "No port assigned to relay!");
      assert(handler.calledWith(relay), "Create event not emitted!");
    });

    it("should ignore if relay exists", async () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();

      const relay = new RelayEntry({
        port: 57789,
        address: new NetAddress({
          address: "88.57.0.107",
          port: 32279,
        }),
      });

      const relayHandler = new UDPRelayHandler({
        socketPool,
      });
      relayHandler.createRelay(relay);

      // When
      const result = relayHandler.createRelay(relay);

      // When
      assert.equal(result, relay);
      assert.deepEqual(relayHandler.relayTable, [relay]);
    });
  });

  describe("freeRelay", () => {
    it("should free relay", async () => {
      // Given
      const handler = sinon.stub();
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.returns(10001);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();

      const relay = new RelayEntry({
        port: 57789,
        address: new NetAddress({
          address: "88.57.0.107",
          port: 32279,
        }),
      });

      const relayHandler = new UDPRelayHandler({
        socketPool,
      });
      relayHandler.createRelay(relay);
      relayHandler.on("destroy", handler);

      // When
      const result = relayHandler.freeRelay(relay);

      // When
      assert.equal(result, true);
      assert(socketPool.returnPort.calledOnceWith(10001));
      assert.deepEqual(relayHandler.relayTable, []);
      assert(handler.calledWith(relay), "Destroy event not emitted!");
    });

    it("should ignore unknown", async () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();

      const relay = new RelayEntry({
        port: 57789,
        address: new NetAddress({
          address: "88.57.0.107",
          port: 32279,
        }),
      });

      const unknownRelay = new RelayEntry({
        port: 56537,
        address: new NetAddress({
          address: "89.45.0.109",
          port: 32279,
        }),
      });

      const relayHandler = new UDPRelayHandler({
        socketPool,
      });
      relayHandler.createRelay(relay);

      // When
      const result = relayHandler.freeRelay(unknownRelay);

      // When
      assert.equal(result, false);
      assert(socketPool.deallocatePort.notCalled);
      assert.deepEqual(relayHandler.relayTable, [relay]);
    });
  });

  describe("relay", () => {
    it("should relay", async () => {
      // Given
      const message = Buffer.from("Hello!", "utf-8");
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.onFirstCall().returns(10001);
      socketPool.getPort.onSecondCall().returns(10002);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();
      const handler = sinon.stub();

      const relayHandler = new UDPRelayHandler({
        socketPool,
      });
      relayHandler.on("transmit", handler);

      relayHandler.createRelay(
        new RelayEntry({
          port: 57789,
          address: new NetAddress({
            address: "88.57.0.17",
            port: 32279,
          }),
        }),
      );

      relayHandler.createRelay(
        new RelayEntry({
          port: 57789,
          address: new NetAddress({
            address: "88.59.62.107",
            port: 65227,
          }),
        }),
      );
      socketPool.getSocket.resetHistory();

      // When
      const success = relayHandler.relay(
        message,
        new NetAddress({
          address: "88.59.62.107",
          port: 65227,
        }),
        10001,
      );

      // Then
      assert(success, "Relay failed!");
      assert(socketPool.getSocket.calledOnceWith(10002), "Socket not queried!");
      assert(socket.send.calledWith(message), "Message not sent!");
      assert(handler.calledOnce, "Transmit event not emitted!");
    });

    it("should ignore unknown address", async () => {
      // Given
      const message = Buffer.from("Hello!", "utf-8");
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.onFirstCall().returns(10001);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();

      const dropHandler = sinon.spy();

      const relayHandler = new UDPRelayHandler({
        socketPool,
      });

      relayHandler.createRelay(
        new RelayEntry({
          port: 57789,
          address: new NetAddress({
            address: "88.57.0.17",
            port: 32279,
          }),
        }),
      );
      relayHandler.on("drop", dropHandler);
      socketPool.getSocket.resetHistory();

      // When
      const success = relayHandler.relay(
        message,
        new NetAddress({
          address: "88.59.62.107",
          port: 65227,
        }),
        10001,
      );

      // Then
      assert(!success, "Relay succeeded?");
      assert(socketPool.getSocket.notCalled, "Socket queried!");
      assert(socket.send.notCalled, "Message sent?");
      assert(dropHandler.calledOnce, "Drop event not emitted!");

      // The drop event carries a NetAddress reconstructed from the raw sender
      // address/port. It need not be the caller's instance, but must be
      // value-equal — dynamic relaying keys off this address by value.
      const droppedSender = dropHandler.firstCall.args[2];
      assert(
        droppedSender instanceof NetAddress,
        "Drop sender is not a NetAddress!",
      );
      assert(
        droppedSender.equals(new NetAddress({ address: "88.59.62.107", port: 65227 })),
        "Drop sender address does not match the packet's origin!",
      );
    });
    it("should ignore on missing socket", async () => {
      // Given
      const message = Buffer.from("Hello!", "utf-8");
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.onFirstCall().returns(10001);
      socketPool.getPort.onSecondCall().returns(10002);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();

      const relayHandler = new UDPRelayHandler({
        socketPool,
      });

      relayHandler.createRelay(
        new RelayEntry({
          port: 57789,
          address: new NetAddress({
            address: "88.57.0.17",
            port: 32279,
          }),
        }),
      );

      relayHandler.createRelay(
        new RelayEntry({
          port: 57789,
          address: new NetAddress({
            address: "88.59.62.107",
            port: 65227,
          }),
        }),
      );
      socketPool.getSocket.resetHistory();
      socketPool.getSocket.returns(undefined);

      // When
      const success = relayHandler.relay(
        message,
        new NetAddress({
          address: "88.59.62.107",
          port: 65227,
        }),
        10001,
      );

      // Then
      assert(!success, "Relay succeeded?");
      assert(socketPool.getSocket.called, "Socket not queried!");
      assert(socket.send.notCalled, "Message sent?");
    });
  });
  describe("relayRaw", () => {
    it("should relay through the raw hot path", async () => {
      // Given
      const message = Buffer.from("Hello!", "utf-8");
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.onFirstCall().returns(10001);
      socketPool.getPort.onSecondCall().returns(10002);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();
      const handler = sinon.stub();

      const relayHandler = new UDPRelayHandler({ socketPool });
      relayHandler.on("transmit", handler);

      // Sender, allocated local port 10001
      relayHandler.createRelay(
        new RelayEntry({
          port: 57789,
          address: new NetAddress({ address: "10.0.0.1", port: 1111 }),
        }),
      );
      // Target, allocated local port 10002
      relayHandler.createRelay(
        new RelayEntry({
          port: 57789,
          address: new NetAddress({ address: "10.0.0.2", port: 2222 }),
        }),
      );
      socketPool.getSocket.resetHistory();

      // When — call the shipped hot path directly, no NetAddress allocation
      const success = relayHandler.relayRaw(message, "10.0.0.1", 1111, 10002);

      // Then
      assert(success, "Relay failed!");
      assert(
        socketPool.getSocket.calledOnceWith(10001),
        "Sender socket not queried!",
      );
      assert(
        socket.send.calledWith(message, 2222, "10.0.0.2"),
        "Message not sent to target address!",
      );
      assert(handler.calledOnce, "Transmit event not emitted!");
    });

    it("should drop after the target is freed (deindexed from _byPort)", async () => {
      // Given
      const message = Buffer.from("Hello!", "utf-8");
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.onFirstCall().returns(10001);
      socketPool.getPort.onSecondCall().returns(10002);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();
      const dropHandler = sinon.spy();

      const relayHandler = new UDPRelayHandler({ socketPool });

      relayHandler.createRelay(
        new RelayEntry({
          port: 57789,
          address: new NetAddress({ address: "10.0.0.1", port: 1111 }),
        }),
      );
      const target = new RelayEntry({
        port: 57789,
        address: new NetAddress({ address: "10.0.0.2", port: 2222 }),
      });
      relayHandler.createRelay(target);

      // Sanity: routing to the target works while it exists
      assert(
        relayHandler.relayRaw(message, "10.0.0.1", 1111, 10002),
        "Precondition failed: target not routable",
      );

      relayHandler.freeRelay(target);
      relayHandler.on("drop", dropHandler);
      socketPool.getSocket.resetHistory();
      socket.send.resetHistory();

      // When — the target port is now gone from the index
      const success = relayHandler.relayRaw(message, "10.0.0.1", 1111, 10002);

      // Then
      assert(!success, "Relay succeeded after target freed?");
      assert(socket.send.notCalled, "Message sent to freed target?");
      assert(dropHandler.calledOnce, "Drop event not emitted!");
    });

    it("should keep a shared address routable after freeing one of its ports", async () => {
      // Given — two relays on the SAME address, different source ports
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.onFirstCall().returns(10001);
      socketPool.getPort.onSecondCall().returns(10002);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();

      const relayHandler = new UDPRelayHandler({ socketPool });

      const relayA = new RelayEntry({
        port: 57789,
        address: new NetAddress({ address: "10.0.0.1", port: 1111 }),
      });
      const relayB = new RelayEntry({
        port: 57789,
        address: new NetAddress({ address: "10.0.0.1", port: 2222 }),
      });
      relayHandler.createRelay(relayA);
      relayHandler.createRelay(relayB);

      // When — free only one of the two entries on this address
      relayHandler.freeRelay(relayA);

      // Then — the sibling on the same address is still indexed...
      assert(!relayHandler.hasRelay(relayA), "Freed entry still present!");
      assert(relayHandler.hasRelay(relayB), "Sibling entry was dropped!");
      // ...and the address bucket is retained while any port remains
      assert(
        (relayHandler as any)._byAddress.has("10.0.0.1"),
        "Address bucket removed while a port still exists!",
      );

      // When — free the last entry on the address
      relayHandler.freeRelay(relayB);

      // Then — the now-empty address bucket is cleaned up
      assert(!relayHandler.hasRelay(relayB), "Freed entry still present!");
      assert(
        !(relayHandler as any)._byAddress.has("10.0.0.1"),
        "Empty address bucket not cleaned up!",
      );
    });
  });
  describe("hasRelay", () => {
    it("should not have relay", async () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.returns(10001);
      socketPool.getPort.returns(10002);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();

      const createdRelay = new RelayEntry({
        port: 57789,
        address: new NetAddress({
          address: "88.57.0.107",
          port: 32279,
        }),
      });

      const testRelay = new RelayEntry({
        port: 57789,
        address: new NetAddress({
          address: "88.57.0.107",
          port: 49152,
        }),
      });

      const relayHandler = new UDPRelayHandler({
        socketPool,
      });

      relayHandler.createRelay(createdRelay);

      // When + Then
      assert(!relayHandler.hasRelay(testRelay));
    });
    it("should have relay", async () => {
      // Given
      const socket = sinon.createStubInstance(dgram.Socket);
      const socketPool = sinon.createStubInstance(UDPSocketPool);
      socketPool.getPort.onFirstCall().returns(10001);
      socketPool.getPort.onSecondCall().returns(10002);
      socketPool.getSocket.returns(socket);
      socket.removeAllListeners.returnsThis();

      const createdRelay = new RelayEntry({
        port: 57789,
        address: new NetAddress({
          address: "88.57.0.107",
          port: 32279,
        }),
      });

      const testRelay = new RelayEntry({
        port: 57789,
        address: new NetAddress({
          address: "88.57.0.107",
          port: 32279,
        }),
      });
      const relayHandler = new UDPRelayHandler({
        socketPool,
      });

      relayHandler.createRelay(createdRelay);

      // When + Then
      assert(relayHandler.hasRelay(testRelay));
    });
  });
});
