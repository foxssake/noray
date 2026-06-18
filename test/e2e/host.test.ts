import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { End2EndContext } from "./context.ts";

describe("Hosts", () => {
  const context = new End2EndContext();

  beforeAll(async () => {
    await context.startup();
  });

  describe("register", () => {
    test("should respond with oid/pid", async () => {
      const client = await context.connect();

      client.write("register-host\n");

      // Read response
      const response = await context.read(client);

      // Check if we got both id's
      expect(
        response.find((cmd) => cmd.startsWith("set-oid")),
        "Missing open id!",
      ).not.toBeNil();
      expect(
        response.find((cmd) => cmd.startsWith("set-pid")),
        "Missing private id!",
      ).not.toBeNil();
    });
  });

  afterAll(() => {
    context.shutdown();
  });
});
