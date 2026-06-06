import { Noray } from "../noray.ts";
import logger from "../logger.ts";
import { handleConnect, handleConnectRelay } from "./connection.commands.ts";
import { hostRepository } from "../hosts/host.ts";

const log = logger.child({ name: "mod:connection" });

Noray.hook((noray: Noray) => {
  log.info("Registering connection commands");

  noray.reactor
    .configure(handleConnect(hostRepository))
    .configure(handleConnectRelay(hostRepository));
});
