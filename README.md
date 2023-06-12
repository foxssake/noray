# noray

A fork of [Natty](https://github.com/foxssake/natty) for open-source purposes.

## Motivation

While Natty is open-source, its scope becomes quite large from v1 onwards -
managing users, supporting multiple different games, different orchestration
strategies, multiple sessions per user, lobbies, etc. This can make Natty an
unwieldy solution for situations where you just want to get something running
online, or if you don't plan on running a whole platform for some individual
multiplayer games.

This is the niche noray intends to fill - a very simple server that manages
connectivity between players. Anything more than that is the responsibility of
the game or some other backend service unrelated to noray.

Thankfully, at the point of writing, Natty implements most of the features
needed for noray, so it can start its life as a stripped-down fork.

## Scope

To ensure connection, noray will support *NAT punchthrough orchestration* and
*UDP relays*.

A game would happen through the following flow:

- The host connects to noray and sends a host request
  - noray replies with the host's OpenID and PrivateID
- The host sends its PID to noray's UDP remote registrar port
  - noray saves the host's external address for UDP comms
  - noray allocates a relay for the host
- Clients connect to noray and send a register host request<sup>1</sup>
  - noray replies with the client's OpenID and PrivateID
- Clients send their PIDs to noray's UDP remote registrar port
  - noray saves the external addresses and allocates relays<sup>2</sup>
- Clients send a connect request to noray with the host's OID
- noray sends a handshake message to both parties
  - The host receives the client's external address
  - The client receives the host's external address
- If the handshake succeeds, the client connects to the host
- If the handshake fails, the client sends a relay connect request to noray
  - The client receives the host's relay address to connect to
  - The host receives the client's relay address to connect to
  - noray will relay the traffic

## Protocol

To keep things simple, data is transmitted through TCP as newline-separated
strings. Each line starts with a command, a space, and the rest of the line is
treated as data. Example:

```
connect-relay host-1
```

The protocol has no concept of replies, threads, correspondences or anything
similar. Think of it as a dumbed-down RPC without return values.
