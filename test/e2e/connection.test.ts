import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { End2EndContext } from "./context.ts";
import { sleep } from "../../src/utils.ts";

describe("Connection", () => {
  const context = new End2EndContext();

  beforeAll(async () => {
    await context.startup();
  });

  describe("connect", () => {
    test("should respond with external address", async () => {
      const host = await context.connect();
      const client = await context.connect();

      // Grab data from responses
      context.log.info("Registering parties");
      const [oid, pid] = await context.registerHost(host);
      const clientPid = (await context.registerHost(client))[1];

      expect(oid, "No oid received!").not.toBeNil();
      expect(pid, "No pid received!").not.toBeNil();
      expect(clientPid, "No client pid received!").not.toBeNil();

      // Register external addresses
      context.log.info("Registering external addresses");
      await Promise.all([
        context.registerExternal(pid),
        context.registerExternal(clientPid),
      ]);

      // Send connect request
      client.write(`connect ${oid}\n`);
      await sleep(0.1);

      // Assert responses
      expect(
        (await context.read(client)).find((cmd) => cmd.startsWith("connect ")),
        "No handshake received by client!",
      ).not.toBeNil();

      expect(
        (await context.read(host)).find((cmd) => cmd.startsWith("connect ")),
        "No handshake received by host!",
      ).not.toBeNil();
    });
  });

  afterAll(() => {
    context.shutdown();
  });
});
