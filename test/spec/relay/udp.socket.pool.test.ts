import { describe, test, expect } from "bun:test";
import { UDPSocketPool } from "../../../src/relay/udp.socket.pool.ts";

describe("UDPSocketPool", () => {
  describe("allocatePort", () => {
    test("should allocate port", async () => {
      // Given
      const pool = new UDPSocketPool();

      // When + Then
      const port = await pool.allocatePort();

      // Finally
      pool.deallocatePort(port);
    });
  });

  describe("addSocket", () => {
    test("should save port", async () => {
      // Given
      const socket = await Bun.udpSocket({});
      const pool = new UDPSocketPool();

      // When
      pool.addSocket(socket);

      // Then
      expect(pool.ports).toEqual([socket.port]);
      expect(pool.getSocket(socket.port)).toBe(socket);
    });
  });

  describe("deallocatePort", () => {
    test("should call close", async () => {
      // Given
      const socket = await Bun.udpSocket({});
      const pool = new UDPSocketPool();
      pool.addSocket(socket);

      // When
      pool.deallocatePort(socket.port);

      // Then
      expect(socket.closed).toBeTrue();
      expect(pool.ports).not.toContain(socket.port);
    });

    test("should ignore unknown port", async () => {
      // Given
      const socket = await Bun.udpSocket({});
      const pool = new UDPSocketPool();
      pool.addSocket(socket);

      // When
      pool.deallocatePort(socket.port + 1);

      // Then
      expect(socket.closed).toBeFalse();
    });
  });

  describe("getPort", () => {
    test("should return allocated", async () => {
      // Given
      const pool = new UDPSocketPool();
      const expected = await pool.allocatePort();

      // When
      const actual = pool.getPort();

      // Then
      expect(pool.hasFreePort()).toBeFalse();
      expect(actual).toEqual(expected);

      // Finally
      pool.deallocatePort(expected);
    });

    test("should throw if none available", () => {
      // Given
      const pool = new UDPSocketPool();

      // When + Then
      expect(pool.hasFreePort()).toBeFalse();
      expect(() => pool.getPort()).toThrow();
    });
  });

  describe("returnPort", () => {
    test("should make port available", async () => {
      // Given
      const pool = new UDPSocketPool();
      await pool.allocatePort();
      const port = pool.getPort();

      // When
      pool.returnPort(port);

      // Then
      expect(pool.hasFreePort()).toBeTrue();

      // Finally
      pool.deallocatePort(port);
    });

    test("should ignore unknown", async () => {
      // Given
      const pool = new UDPSocketPool();

      // When + then
      expect(() => pool.returnPort(65575)).not.toThrow();
    });
  });
});
