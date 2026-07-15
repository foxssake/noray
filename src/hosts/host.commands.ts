import { HostRepository } from "./host.repository.ts";
import { makeHost } from "./host.entity.ts";
import logger from "../logger.ts";
import * as prometheus from "prom-client";
import { metricsRegistry } from "../metrics/metrics.registry.ts";
import { NorayReactor } from "../noray.ts";
import { NorayEvents } from "../events.ts";

const activeHostsGauge = new prometheus.Gauge({
  name: "noray_active_hosts",
  help: "Number of currently active hosts",
  registers: [metricsRegistry],
});

export function handleRegisterHost(hostRepository: HostRepository) {
  return function(server: NorayReactor) {
    server.on("register-host", (__, exchange) => {
      const log = logger.child({ name: "cmd:register-host" });
      activeHostsGauge.inc();

      const socket = exchange.source;
      const host = makeHost(socket);
      hostRepository.add(host);

      exchange.send({ name: "set-oid", params: [host.oid] });
      exchange.send({ name: "set-pid", params: [host.pid] });

      log.info(
        { oid: host.oid, pid: host.pid },
        "Registered host from address %s:%d",
        socket.remoteAddress,
        socket.remotePort,
      );

      // TODO: Manage this via repo in `host.ts` or smth
      NorayEvents.on("connection-close", (closed) => {
        if (closed !== socket) return;

        log.info(
          { oid: host.oid, pid: host.pid },
          "Host disconnected, removing from repository",
        );
        hostRepository.removeItem(host);
        activeHostsGauge.dec();
      });
    });
  };
}
