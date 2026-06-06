import { Noray } from "../noray.ts";
import logger from "../logger.ts";
import { handleRegisterHost } from "./host.commands.ts";
import { HostRepository } from "./host.repository.ts";

const log = logger.child({ name: "mod:host" });

export const hostRepository = new HostRepository();

Noray.hook((noray: Noray) => {
  log.info("Registering host commands");

  noray.reactor.configure(handleRegisterHost(hostRepository));
});
