import { HostRepository } from "../hosts/host.repository.ts";
import { NodeSocketReactor } from "@foxssake/trimsock-node";
import { type RemoteInfo } from "node:dgram";
import assert from "node:assert";
import logger from "../logger.ts";
import { udpRelayHandler } from "../relay/relay.ts";
import { RelayEntry } from "../relay/relay.entry.ts";
import { NetAddress } from "../relay/net.address.ts";

export function handleConnect(hostRepository: HostRepository) {
  return function(server: NodeSocketReactor) {
    server.on("connect", (command, exchange) => {
      const log = logger.child({ name: "cmd:connect" });

      const socket = exchange.source;
      const oid = command.requireText();
      const host = hostRepository.find(oid);
      const client = hostRepository.findBySocket(socket);

      log.debug(
        { oid, client: socket.address() },
        "Client attempting to connect to host",
      );

      assert(host, "Unknown host oid: " + oid);
      assert(host.rinfo, "Host has no remote info registered!");
      assert(client, "Unknown client from address");
      assert(client.rinfo, "Client has no remote info registered!");

      const hostAddress = stringifyAddress(host.rinfo);
      const clientAddress = stringifyAddress(client.rinfo);

      server.send(socket, { name: "connect", params: [hostAddress] });
      server.send(host.socket, { name: "connect", params: [clientAddress] });

      log.debug(
        { client: clientAddress, host: hostAddress, oid },
        "Connected client to host",
      );
    });
  };
}

export function handleConnectRelay(hostRepository: HostRepository) {
  return function(server: NodeSocketReactor) {
    server.on("connect-relay", (command, exchange) => {
      const log = logger.child({ name: "cmd:connect-relay" });

      const socket = exchange.source;
      const oid = command.requireText();
      const host = hostRepository.find(oid);
      const client = hostRepository.findBySocket(socket);

      log.debug(
        { oid, client: `${socket.remoteAddress}:${socket.remotePort}` },
        "Client attempting to connect to host",
      );
      assert(host, "Unknown host oid: " + oid);
      assert(client, "Unknown client from address");

      log.debug("Ensuring relay for both parties");
      host.relay = getRelay(host.rinfo!);
      client.relay = getRelay(client.rinfo!);

      log.debug(
        { host: host.relay, client: client.relay },
        "Replying with relay",
      );
      server.send(socket, {
        name: "connect-relay",
        params: [host.relay!.toString()],
      });
      server.send(host.socket, {
        name: "connect-relay",
        params: [client.relay!.toString()],
      });
      log.debug(
        {
          client: `${socket.remoteAddress}:${socket.remotePort}`,
          relay: host.relay,
          oid,
        },
        "Connected client to host",
      );
    });
  };
}

function stringifyAddress(address: RemoteInfo) {
  return `${address.address}:${address.port}`;
}

function getRelay(rinfo: RemoteInfo) {
  // Attempt to create new relay on each connect
  // If there's a relay already, UDPRelayHandler will return that
  // If there's no relay, or it has expired, a new one will be created
  const log = logger.child({ name: "getRelay" });
  log.trace({ rinfo }, "Ensuring relay for remote");
  const relayEntry = udpRelayHandler.createRelay(
    new RelayEntry({ address: NetAddress.fromRinfo(rinfo), port: rinfo.port }),
  );

  log.trace(
    { relayEntry },
    "Created relay, returning with port %d",
    relayEntry.port,
  );
  return relayEntry.port;
}
