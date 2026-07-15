import { describe, test, beforeAll, afterAll, expect } from "bun:test";
import { ClientSocket, End2EndContext } from "./context.ts";
import { UDPSocket } from "../../src/relay/udp.socket.pool.ts";
import { sleep } from "../../src/utils.ts";

interface HostInfo {
  tcp: ClientSocket | undefined;
  udp: UDPSocket | undefined;

  oid: string;
  pid: string;
}

interface ClientInfo extends HostInfo {
  targetRelay: number | undefined;
}

describe("Connection", () => {
  const context = new End2EndContext();

  const host = {
    tcp: undefined,
    udp: undefined,

    oid: "",
    pid: "",
  } as HostInfo;

  const client = {
    tcp: undefined,
    udp: undefined,

    targetRelay: undefined,

    oid: "",
    pid: "",
  } as ClientInfo;

  beforeAll(async () => {
    await context.startup();

    context.log.info("Connecting to noray");
    host.tcp = await context.connect();
    client.tcp = await context.connect();

    context.log.info("Registering hosts...");
    [host.oid, host.pid] = await context.registerHost(host.tcp);
    [client.oid, client.pid] = await context.registerHost(client.tcp);

    context.log.info("Registering external ports...");
    host.udp = await context.registerExternal(host.pid, false);
    client.udp = await context.registerExternal(client.pid, false);

    context.log.info("Host bound to UDP port %d", host.udp.port);
    context.log.info("Client bound to UDP port %d", client.udp.port);

    context.log.info("Startup done");
  });

  test("should register host", async () => {
    // Register hosts
    [host.oid, host.pid] = await context.registerHost(host.tcp!);
    expect(host.oid, "Failed to get host oid!").not.toBeNil();
    expect(host.pid, "Failed to get host pid!").not.toBeNil();

    [client.oid, client.pid] = await context.registerHost(client.tcp!);
    expect(client.oid, "Failed to get client oid!").not.toBeNil();
    expect(client.pid, "Failed to get client pid!").not.toBeNil();
  });

  test("should reply with relay port", async () => {
    // Request to connect
    context.log.info("Connecting over relay");
    client.tcp!.write(`connect-relay ${host.oid}\n`);

    await sleep(0.1);

    client.targetRelay = (await context.read(client.tcp!))
      .filter((cmd) => cmd.startsWith("connect-relay"))
      .map((cmd) => cmd.split(" ")[1])
      .map((it) => parseInt(it))
      .at(0);
    expect(client.targetRelay, "Failed to get relay port!").not.toBeNil();

    context.log.info("Client received relay port %d", client.targetRelay);
  });

  test.todo("should relay data", () => {
    /* pass */
  });

  afterAll(() => {
    host.tcp?.close();
    client.tcp?.close();

    host.udp?.close();
    client.udp?.close();

    context.shutdown();
  });
});
