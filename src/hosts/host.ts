import { Noray } from "../noray.mjs";
import logger from "../logger";
import { handleRegisterHost } from "./host.commands";
import { HostRepository } from "./host.repository";

const log = logger.child({ name: "mod:host" });

export const hostRepository = new HostRepository();

Noray.hook((noray: Noray) => {
  log.info("Registering host commands");

  noray.reactor.configure(handleRegisterHost(hostRepository));
});
