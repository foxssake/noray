import { describe, it, afterAll, beforeAll } from "bun:test";
import assert from "node:assert";
import { End2EndContext } from "./context.ts";
import dgram from "node:dgram";
import { UDPRelayHandler } from "../../src/relay/udp.relay.handler.ts";
import { RelayEntry } from "../../src/relay/relay.entry.ts";
import { NetAddress } from "../../src/relay/net.address.ts";
import { sleep } from "../../src/utils.ts";
import { UDPSocket, UDPSocketPool } from "../../src/relay/udp.socket.pool.ts";
import { udpRelayHandler, udpSocketPool } from "../../src/relay/relay.ts";

class ClientUDPSocket {
  static async create(): Promise<ClientUDPSocket> {
    const result = new ClientUDPSocket(
      await Bun.udpSocket({
        hostname: "127.0.0.1",
        socket: {
          data(_socket, data) {
            result.inbox = Buffer.concat([result.inbox, data]);
          },
        },
      }),
    );

    return result;
  }

  public inbox: Buffer = Buffer.from([]);

  constructor(public socket: UDPSocket) { }
}

describe("UDP Relay", async () => {
  const context = new End2EndContext();

  let sendSocket: ClientUDPSocket;
  let recvSocket: ClientUDPSocket;

  beforeAll(async () => {
    await context.startup();

    sendSocket = await ClientUDPSocket.create();
    recvSocket = await ClientUDPSocket.create();
  });

  it("should relay traffic", async () => {
    // Given
    const message = Buffer.from("Hello!", "utf8");

    context.log.info(
      "Allocated ports %d and %d",
      sendSocket.socket.port,
      recvSocket.socket.port,
    );

    context.log.info("Creating relay");

    udpRelayHandler.createRelay(
      new RelayEntry({
        address: new NetAddress({
          address: sendSocket.socket.hostname,
          port: sendSocket.socket.port,
        }),
        port: -1,
      }),
    );

    udpRelayHandler.createRelay(
      new RelayEntry({
        address: new NetAddress({
          address: recvSocket.socket.hostname,
          port: recvSocket.socket.port,
        }),
        port: -1,
      }),
    );

    context.log.info(
      { table: udpRelayHandler.relayTable },
      "Updated relay table",
    );

    // When
    sendSocket.socket.send(
      message,
      udpRelayHandler.relayTable[1].port,
      "127.0.0.1",
    );
    context.log.info(
      "Sent message to 127.0.0.1:%d",
      udpRelayHandler.relayTable[1].port,
    );
    await sleep(0.25);

    // Then
    const recvData = recvSocket.inbox;
    context.log.info({ recvData }, "Received data");
    assert.deepEqual(recvData, message);
    // assert.equal(recvData[0].rinfo.address, "127.0.0.1");
    // assert.equal(recvData[0].rinfo.port, relayHandler.relayTable[0].port);
  });

  afterAll(() => {
    sendSocket.socket.close();
    recvSocket.socket.close();
    udpRelayHandler.clear();

    context.shutdown();
  });
});

/**
 * Bind socket but with promise.
 */
function bindSocket(socket: dgram.Socket, port?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.bind(port, "127.0.0.1", resolve);
    socket.once("error", reject);
  });
}
