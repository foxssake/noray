import { Noray } from "../noray.ts";
import logger from "../logger.ts";
import { config } from "../config.ts";
import { metricsRegistry } from "./metrics.registry.ts";

const log = logger.child({ name: "mod:metrics" });

Noray.hook((noray: Noray) => {
  // Not supported in Bun (yet)
  // log.info("Collecting default metrics");
  // prometheus.collectDefaultMetrics({
  //   register: metricsRegistry,
  // });

  log.info("Starting HTTP server to serve metrics");

  const server = Bun.serve({
    routes: {
      "/metrics": async () => new Response(await metricsRegistry.metrics()),
    },

    fetch: () => new Response("Not found", { status: 404 }),
    hostname: config.http.host,
    port: config.http.port,
  });

  log.info("Serving metrics over HTTP at %s", server.url);

  noray.on("close", () => {
    log.info("noray closing, shutting down HTTP server");
    server.stop();
  });
});
