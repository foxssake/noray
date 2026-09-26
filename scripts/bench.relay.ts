/**
 * Microbenchmark for the UDP relay hot path (`UDPRelayHandler`).
 *
 * Drives the real relay methods — same table lookups, prom-client metrics and
 * event emit as production — with a no-op socket injected in place of a real
 * UDP socket, so we measure the CPU cost of the relay logic itself rather than
 * loopback syscall throughput.
 *
 * Compares two entry points, apples-to-apples in one process:
 *   - relayRaw(...)   the shipped hot path: nested-map lookup, zero allocation
 *   - relay(NetAddr)  same lookup, but a NetAddress is allocated per packet
 * The gap between them is the per-packet allocation cost that the raw path saves.
 *
 * Run: bun scripts/bench.relay.ts
 */
import { UDPRelayHandler } from "../src/relay/udp.relay.handler.ts";
import { RelayEntry } from "../src/relay/relay.entry.ts";
import { NetAddress } from "../src/relay/net.address.ts";

const TABLE_SIZES = [10, 100, 1_000, 5_000, 10_000];
const ITERATIONS = 2_000_000;
const PACKET = Buffer.alloc(128, 0x61);

function buildHandler(n: number): UDPRelayHandler {
  const handler = new UDPRelayHandler();
  const pool = handler.socketPool as any;

  for (let i = 0; i < n; i++) {
    const port = 10_000 + i;
    pool.sockets.set(port, { port, send() {} });
    pool.freePorts.push(port);
  }

  for (let i = 0; i < n; i++) {
    handler.createRelay(
      new RelayEntry({
        address: new NetAddress({
          address: `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`,
          port: 30_000 + i,
        }),
        port: -1,
      }),
    );
  }

  return handler;
}

interface Pairs {
  addr: string[];
  port: number[];
  target: number[];
}

function buildPairs(handler: UDPRelayHandler, n: number): Pairs {
  const table = handler.relayTable;
  const P = 4096;
  const addr = new Array<string>(P);
  const port = new Array<number>(P);
  const target = new Array<number>(P);
  for (let i = 0; i < P; i++) {
    const s = (Math.random() * n) | 0;
    let t = (Math.random() * n) | 0;
    if (t === s) t = (t + 1) % n;
    addr[i] = table[s].address.address;
    port[i] = table[s].address.port;
    target[i] = table[t].port;
  }
  return { addr, port, target };
}

function benchRaw(handler: UDPRelayHandler, p: Pairs): number {
  for (let i = 0; i < 100_000; i++) {
    const k = i & 4095;
    handler.relayRaw(PACKET, p.addr[k], p.port[k], p.target[k]);
  }
  const start = Bun.nanoseconds();
  for (let i = 0; i < ITERATIONS; i++) {
    const k = i & 4095;
    handler.relayRaw(PACKET, p.addr[k], p.port[k], p.target[k]);
  }
  return 1e9 / ((Bun.nanoseconds() - start) / ITERATIONS);
}

function benchAlloc(handler: UDPRelayHandler, p: Pairs): number {
  for (let i = 0; i < 100_000; i++) {
    const k = i & 4095;
    handler.relay(
      PACKET,
      new NetAddress({ address: p.addr[k], port: p.port[k] }),
      p.target[k],
    );
  }
  const start = Bun.nanoseconds();
  for (let i = 0; i < ITERATIONS; i++) {
    const k = i & 4095;
    // Mirrors the OLD relay.ts: a fresh NetAddress per packet.
    handler.relay(
      PACKET,
      new NetAddress({ address: p.addr[k], port: p.port[k] }),
      p.target[k],
    );
  }
  return 1e9 / ((Bun.nanoseconds() - start) / ITERATIONS);
}

console.log(
  `relay() microbenchmark — ${ITERATIONS.toLocaleString()} calls per table size\n`,
);
console.log(
  "table size | relayRaw (no alloc) | relay (per-pkt alloc) | alloc cost",
);
console.log(
  "-----------+---------------------+-----------------------+-----------",
);

for (const n of TABLE_SIZES) {
  const handler = buildHandler(n);
  const pairs = buildPairs(handler, n);
  const raw = benchRaw(handler, pairs);
  const alloc = benchAlloc(handler, pairs);
  handler.clear();

  const nsRaw = 1e9 / raw;
  const nsAlloc = 1e9 / alloc;
  console.log(
    `${String(n).padStart(10)} | ${(Math.round(raw).toLocaleString() + " /s").padStart(19)} | ${(Math.round(alloc).toLocaleString() + " /s").padStart(21)} | ${(nsAlloc - nsRaw).toFixed(0).padStart(6)} ns`,
  );
}
