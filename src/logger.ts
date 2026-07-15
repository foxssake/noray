import pino from "pino";
import { enumerated } from "./config.parsers.ts";

export const loglevels = Object.freeze([
  "silent",
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

export function getLogLevel(): string {
  return enumerated(process.env.NORAY_LOGLEVEL, loglevels) ?? "info";
}

const logger = pino({
  name: "noray",
  level: getLogLevel(),
});

export default logger;
