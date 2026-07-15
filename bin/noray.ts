import { Noray } from "../src/noray.ts";

let isShuttingDown = false;
const noray = new Noray();
noray.start();

function shutdown() {
  if (isShuttingDown) return;

  isShuttingDown = true;
  noray.shutdown();

  // HACK: noray keeps running after shutdown, maybe a shutdown hook runs
  // something async that doesn't finish?
  // TODO: Refactor similarly to nohub, expose a shutdown listener that can be
  // async, and await each individually with a timeout
  process.exit(1);
}

process.on("exit", shutdown);
process.on("SIGINT", shutdown);
