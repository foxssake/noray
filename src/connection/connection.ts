import { Noray } from "../noray.js";
import logger from "../logger";
import { handleConnect, handleConnectRelay } from "./connection.commands";
import { hostRepository } from "../hosts/host";

const log = logger.child({ name: "mod:connection" });

Noray.hook((noray: Noray) => {
  log.info("Registering connection commands");

  noray.reactor
    .configure(handleConnect(hostRepository))
    .configure(handleConnectRelay(hostRepository));
});
