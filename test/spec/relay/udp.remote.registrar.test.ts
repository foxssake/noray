import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import * as net from "node:net";
import sinon from "sinon";
import dgram from "node:dgram";
import { UDPRemoteRegistrar } from "../../../src/relay/udp.remote.registrar.ts";
import { HostRepository } from "../../../src/hosts/host.repository.ts";
import { type HostEntity } from "../../../src/hosts/host.entity.ts";

describe("UDPRemoteRegistrar", () => {
  let clock: sinon.SinonFakeTimers;
  let hostRepository: sinon.SinonStubbedInstance<HostRepository>;
  let socket: sinon.SinonStubbedInstance<dgram.Socket>;
  let remoteRegistrar: UDPRemoteRegistrar;
  let host: HostEntity;

  beforeEach(() => {
    host = {
      oid: "h0001",
      pid: "p0001",
      socket: new net.Socket(),
      relay: undefined,
      rinfo: undefined,
    };
    clock = sinon.useFakeTimers();

    hostRepository = sinon.createStubInstance(HostRepository);
    socket = sinon.createStubInstance(dgram.Socket);

    hostRepository.findByPid.withArgs(host.pid).returns(host);
    socket.bind.callsArg(2); // Instantly resolve on bind
    socket.address.returns({
      address: "127.0.0.1",
      port: 32768,
      family: "ipv4",
    });

    remoteRegistrar = new UDPRemoteRegistrar({
      hostRepository,
      socket,
    });
  });

  it("should succeed", async () => {
    // Given
    const msg = Buffer.from(host.pid);
    const rinfo = { address: "88.57.0.3", port: 32745 };

    await remoteRegistrar.listen();
    const messageHandler = socket.on.lastCall.callback!!;

    // When
    await messageHandler(msg, rinfo);

    // Then
    assert.deepEqual(socket.send.lastCall?.args, [
      "OK",
      rinfo.port,
      rinfo.address,
    ]);
    assert.equal(host.rinfo, rinfo);
  });

  it("should fail on unknown pid", async () => {
    // Given
    const msg = Buffer.from(host.pid);
    const rinfo = { address: "88.57.0.3", port: 32745 };

    await remoteRegistrar.listen();
    const messageHandler = socket.on.lastCall.callback!!;

    hostRepository.findByPid.withArgs(host.pid).returns(undefined);

    // When
    await messageHandler(msg, rinfo);

    // Then
    assert.deepEqual(socket.send.lastCall?.args, [
      "Unknown host pid!",
      rinfo.port,
      rinfo.address,
    ]);
  });

  it("should fail on throw", async () => {
    // Given
    const msg = Buffer.from(host.pid);
    const rinfo = { address: "88.57.0.3", port: 32745 };

    await remoteRegistrar.listen();
    const messageHandler = socket.on.lastCall.callback!!;

    socket.send.onFirstCall().throws(new Error("Test"));

    // When
    await messageHandler(msg, rinfo);

    // Then
    assert.deepEqual(socket.send.lastCall?.args, [
      "Test",
      rinfo.port,
      rinfo.address,
    ]);
  });

  afterEach(() => {
    clock.restore();
  });
});
