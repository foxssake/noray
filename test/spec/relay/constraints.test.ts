import { describe, test, expect } from "bun:test";
import sinon from "sinon";
import { RelayEntry } from "../../../src/relay/relay.entry.ts";
import { NetAddress } from "../../../src/relay/net.address.ts";
import { UDPRelayHandler } from "../../../src/relay/udp.relay.handler.ts";
import { time } from "../../../src/utils.ts";
import {
  constrainGlobalBandwidth,
  constrainIndividualBandwidth,
  constrainLifetime,
  constrainTraffic,
} from "../../../src/relay/constraints.ts";

describe("Relay constraints", () => {
  describe("constrainIndividualBandwidth", () => {
    test("should pass", () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: "37.89.0.5", port: 32467 }),
          port: 10001,
        }),

        new RelayEntry({
          address: new NetAddress({ address: "57.13.0.9", port: 45357 }),
          port: 10002,
        }),
      ];

      const message = Buffer.from("a".repeat(16));

      const relayHandler = sinon.createStubInstance(UDPRelayHandler);
      relayHandler.on.callThrough();
      relayHandler.emit.callThrough();

      constrainIndividualBandwidth(relayHandler, 16);

      // When + Then
      expect(() =>
        relayHandler.emit("transmit", relayTable[0], relayTable[1], message),
      ).not.toThrow();
    });

    test("should throw on too much data", () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: "37.89.0.5", port: 32467 }),
          port: 10001,
        }),

        new RelayEntry({
          address: new NetAddress({ address: "57.13.0.9", port: 45357 }),
          port: 10002,
        }),
      ];

      const message = Buffer.from("a".repeat(32));

      const relayHandler = sinon.createStubInstance(UDPRelayHandler);
      relayHandler.on.callThrough();
      relayHandler.emit.callThrough();

      constrainIndividualBandwidth(relayHandler, 16);

      // When + Then
      expect(() =>
        relayHandler.emit("transmit", relayTable[0], relayTable[1], message),
      ).toThrow();
    });
  });

  describe("constrainGlobalBandwidth", () => {
    test("should pass", () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: "37.89.0.5", port: 32467 }),
          port: 10001,
        }),

        new RelayEntry({
          address: new NetAddress({ address: "57.13.0.9", port: 45357 }),
          port: 10002,
        }),
      ];

      const message = Buffer.from("a".repeat(4));

      const relayHandler = sinon.createStubInstance(UDPRelayHandler);
      relayHandler.on.callThrough();
      relayHandler.emit.callThrough();

      constrainGlobalBandwidth(relayHandler, 16);

      // When + Then
      expect(() =>
        relayHandler.emit("transmit", relayTable[0], relayTable[1], message),
      ).not.toThrow();
      expect(() =>
        relayHandler.emit("transmit", relayTable[1], relayTable[0], message),
      ).not.toThrow();
    });

    test("should throw", () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: "37.89.0.5", port: 32467 }),
          port: 10001,
        }),

        new RelayEntry({
          address: new NetAddress({ address: "57.13.0.9", port: 45357 }),
          port: 10002,
        }),
      ];

      const message = Buffer.from("a".repeat(12));

      const relayHandler = sinon.createStubInstance(UDPRelayHandler);
      relayHandler.on.callThrough();
      relayHandler.emit.callThrough();

      constrainGlobalBandwidth(relayHandler, 16);

      // When + Then
      expect(() =>
        relayHandler.emit("transmit", relayTable[0], relayTable[1], message),
      ).not.toThrow();
      expect(() =>
        relayHandler.emit("transmit", relayTable[1], relayTable[0], message),
      ).toThrow();
    });
  });

  describe("constrainLifetime", () => {
    test("should pass", () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: "37.89.0.5", port: 32467 }),
          port: 10001,
          created: time(),
        }),

        new RelayEntry({
          address: new NetAddress({ address: "57.13.0.9", port: 45357 }),
          port: 10002,
        }),
      ];

      const message = Buffer.from("a".repeat(4));

      const relayHandler = sinon.createStubInstance(UDPRelayHandler);
      relayHandler.on.callThrough();
      relayHandler.emit.callThrough();

      constrainLifetime(relayHandler, 4);

      // When + Then
      expect(() =>
        relayHandler.emit("transmit", relayTable[0], relayTable[1], message),
      ).not.toThrow();
    });

    test("should throw", () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: "37.89.0.5", port: 32467 }),
          port: 10001,
          created: time() - 16,
        }),

        new RelayEntry({
          address: new NetAddress({ address: "57.13.0.9", port: 45357 }),
          port: 10002,
        }),
      ];

      const message = Buffer.from("a".repeat(4));

      const relayHandler = sinon.createStubInstance(UDPRelayHandler);
      relayHandler.on.callThrough();
      relayHandler.emit.callThrough();

      constrainLifetime(relayHandler, 4);

      // When + Then
      expect(() =>
        relayHandler.emit("transmit", relayTable[0], relayTable[1], message),
      ).toThrow();
    });
  });

  describe("constrainTraffic", () => {
    test("should pass", () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: "37.89.0.5", port: 32467 }),
          port: 10001,
        }),

        new RelayEntry({
          address: new NetAddress({ address: "57.13.0.9", port: 45357 }),
          port: 10002,
        }),
      ];

      const message = Buffer.from("a".repeat(4));

      const relayHandler = sinon.createStubInstance(UDPRelayHandler);
      relayHandler.on.callThrough();
      relayHandler.emit.callThrough();

      constrainTraffic(relayHandler, 16);

      // When + Then
      expect(() =>
        relayHandler.emit("transmit", relayTable[0], relayTable[1], message),
      ).not.toThrow();
      expect(() =>
        relayHandler.emit("transmit", relayTable[1], relayTable[0], message),
      ).not.toThrow();
    });

    test("should throw", () => {
      // Given
      const relayTable = [
        new RelayEntry({
          address: new NetAddress({ address: "37.89.0.5", port: 32467 }),
          port: 10001,
        }),

        new RelayEntry({
          address: new NetAddress({ address: "57.13.0.9", port: 45357 }),
          port: 10002,
        }),
      ];

      const message = Buffer.from("a".repeat(12));

      const relayHandler = sinon.createStubInstance(UDPRelayHandler);
      relayHandler.on.callThrough();
      relayHandler.emit.callThrough();

      constrainTraffic(relayHandler, 16);

      // When + Then
      expect(() =>
        relayHandler.emit("transmit", relayTable[0], relayTable[1], message),
      ).not.toThrow();
      expect(() =>
        relayHandler.emit("transmit", relayTable[1], relayTable[0], message),
      ).not.toThrow();
      expect(() =>
        relayHandler.emit("transmit", relayTable[1], relayTable[0], message),
      ).toThrow();
    });
  });
});
