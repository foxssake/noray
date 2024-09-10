# noray

A simple connection orchestrator and relay to bulletproof connectivity for your
online multiplayer games.

Forked from [Natty](https://github.com/foxssake/natty) that aims to cover an
extended scope.

## Why orchestration

If you're already familiar with the topic, noray can help with NAT punchthrough.

If you're not familiar with the issue, I'd highly recommend reading Keith
Johnston's [article] on the topic - it's very easy to follow and sums up the
topic really well.

But to give you a short summary:

* Most PC's online are behind a router
* Routers will only allow traffic to your PC if it's in response to something
  * i.e. Google can't just send you traffic out of nowhere, but your router
    will allow traffic from Google if you've already sent an HTTP request
* Similarly, if you host an online game, people won't be able to connect to
  your PC
* NAT punchthrough is the process of both parties sending traffic to eachother
  * The first packets will fail, as the router doesn't see it as response to
    something
  * The next packets should succeed, as the router sees that your PC is already
    trying to connect to the other part

*noray* helps by orchestrating the NAT punchthrough process 🔥

[article]: https://keithjohnston.wordpress.com/2014/02/17/nat-punch-through-for-multiplayer-games/

## Why relaying

Unfortunately, even NAT punchthrough is not always a viable solution, depending
on your players' NAT setup.

To make sure that your players can always connect to eachother, *noray* can act
as a relay 🔥

In essence, *noray* will dedicate a specific port to each player, at which
others can send data to them. Any data incoming on this dedicated port will be
transmitted as-is to the appropriate player.

*NOTE:* Relaying only supports UDP traffic.

## Dependencies

* [node](https://nodejs.org/en/download) v18.16 or newer
  * *NOTE:* Older versions may work, but are not explicitly supported
* [pnpm](https://pnpm.io/installation)

## Installation

After cloning the repository, run `pnpm install` to install all required packages.

## Configuration

*noray* can be configured through environment variables or a `.env` file. For available configuration keys and their purpose, please see the [example configuration](.env.example).

## Usage

To run *noray*, use `pnpm start` or `pnpm start:prod` for production use.

Upon startup, the application will allocate all the configured ports and start
listening for incoming connections. Logs are written to `stdout`.

### Usage with Docker

Create `.env` file based on `.env.example`.

Build and run docker:

```
docker build . -t noray
docker run -p 8890:8890 -p 8891:8891 -p 8809:8809/udp -p 49152-51200:49152-51200/udp --env-file=.env -t noray
```

Or run prebuilt docker:
```
docker run -p 8890:8890 -p 8891:8891 -p 8809:8809/udp -p 49152-51200:49152-51200/udp --env-file=.env -t ghcr.io/foxssake/noray:main
```

The above will expose the following ports:

* Port 8890 for clients to register and request connections
* Port 8891 to expose metrics over HTTP
* Port 8809 for the remote port registrar
* Ports 49152 to 51200 for relays
  * Make sure these are the same ports as configured in `.env`!

Note that exposing a lot of relay ports can severely impact deploy time.

In case of relays not working - i.e. clients can register and request
connections, but the handshake process fails -, Docker might be mapping ports
as data arrives from outside of the container. In these cases, try running
noray using the [host network]:

```
docker run --network host --env-file=.env -t noray
```

[host network]: https://docs.docker.com/engine/network/tutorials/host/

#### EADDRNOTAVAIL

If you get an `EADDRNOTAVAIL` error when trying to listen on an IPv6 address,
you either need to [enable IPv6 in Docker], or choose an IPv4 host address to
listen on, e.g. '0.0.0.0' or 'localhost'.

[enable IPv6 in Docker]: https://docs.docker.com/config/daemon/ipv6/

## Documentation

### Protocol

To keep things simple, data is transmitted through TCP as newline-separated
strings. Each line starts with a command, a space, and the rest of the line is
treated as data. Example:

```
connect-relay host-1
```

The protocol has no concept of replies, threads, correspondences or anything
similar. Think of it as a dumbed-down RPC without return values.

### Flows

#### Host registration

At first, each player has to register as host ( even clients ). This is done by
sending the following message to *noray* over TCP:

```
register-host
```

*noray* will reply with the host's OpenID and PrivateID ( oid and pid ):

```
set-oid [openid]
set-pid [privateid]
```

These ID's are needed for any subsequent exchanges with *noray*.

> Don't forget to end your messages with a newline character!

#### Remote address registration

To orchestrate connections, *noray* will need to know each host's external
address. This is done by creating a UDP socket and using that to send the
host's PrivateID. This operation is idempotent, so you're free to send multiple
packets until you receive a reply.

Upon successful registration, the reply will be `OK`, otherwise it will be an
error message.

#### Connecting

Connecting can be attempted either via NAT punchthrough or relay. Since *noray*
has a limited amount of ports to dedicate to relays, it makes sense to prefer
NAT punchthrough whenever possible.

Regardless of which approach is taken, you'll need to host's OpenID. At the
moment, sharing OpenID is not taken care of, you'll need a manual solution for
that.

Once you have the target's OpenID, you need to send one of the following
commands, depending on the approach being taken:

```
connect [openid]
```

```
connect-relay [openid]
```

The server will reply with the same command in both cases. For NAT
punchthrough, it will reply with the target address and port ( e.g.
`87.53.78.15:55759` ). For relaying, it will reply with the target port, since
the target machine will be the *noray* server itself.

Example responses:

```
connect 87.53.78.15:55759
```

```
connect-relay 49178
```

Note that both parties will receive the appropriate connect command. When this
happens, the parties should attempt a UDP handshake with eachother.

## License

*noray* is licensed under the [MIT license](LICENSE).

