import * as dotenv from "dotenv";
import {
  boolean,
  byteSize,
  duration,
  integer,
  number,
  ports,
} from "./config.parsers.ts";
import logger, { getLogLevel } from "./logger.ts";
import { urlAlphabet } from "nanoid";
import { required } from "./utils.ts";

type ConfigEnv = Record<string, string | undefined>;

export function readConfig(env: ConfigEnv) {
  return {
    oid: {
      length: integer(env.NORAY_OID_LENGTH) ?? 21,
      charset: env.NORAY_OID_CHARSET ?? urlAlphabet,
    },

    wordsOid: {
      enabled: boolean(env.NORAY_ENABLE_WORDS_OID) ?? false,
      length: integer(env.NORAY_WORDS_OID_LENGTH) ?? 3,
    },

    pid: {
      length: integer(env.NORAY_PID_LENGTH) ?? 128,
      charset: env.NORAY_PID_CHARSET ?? urlAlphabet,
    },

    socket: {
      host: env.NORAY_SOCKET_HOST ?? "0.0.0.0",
      port: integer(env.NORAY_SOCKET_PORT) ?? 8890,
    },

    http: {
      host: env.NORAY_HTTP_HOST ?? "0.0.0.0",
      port: integer(env.NORAY_HTTP_PORT) ?? 8891,
    },

    udpRelay: {
      ports: required(ports(env.NORAY_UDP_RELAY_PORTS ?? "49152-51200")),
      timeout: required(duration(env.NORAY_UDP_RELAY_TIMEOUT ?? "30s")),
      cleanupInterval: required(
        duration(env.NORAY_UDP_RELAY_CLEANUP_INTERVAL ?? "30s"),
      ),
      registrarPort: number(env.NORAY_UDP_REGISTRAR_PORT) ?? 8809,

      maxIndividualTraffic: required(
        byteSize(env.NORAY_UDP_RELAY_MAX_INDIVIDUAL_TRAFFIC ?? "128kb"),
      ),
      maxGlobalTraffic: required(
        byteSize(env.NORAY_UDP_RELAY_MAX_GLOBAL_TRAFFIC ?? "1gb"),
      ),
      trafficInterval: required(
        duration(env.NORAY_UDP_RELAY_TRAFFIC_INTERVAL ?? "100ms"),
      ),
      maxLifetimeDuration: required(
        duration(env.NORAY_UDP_RELAY_MAX_LIFETIME_DURATION ?? "4hr"),
      ),
      maxLifetimeTraffic: required(
        byteSize(env.NORAY_UDP_RELAY_MAX_LIFETIME_TRAFFIC ?? "4gb"),
      ),
    },

    loglevel: getLogLevel(),
  };
}

export function readDefaultConfig() {
  return readConfig({});
}

export function readLiveConfig() {
  dotenv.config();
  return readConfig(process.env);
}

export type NorayConfig = ReturnType<typeof readConfig>;
export type OidConfig = NorayConfig["oid"];
export type WordsOidConfig = NorayConfig["wordsOid"];
export type PidConfig = NorayConfig["pid"];
export type SocketConfig = NorayConfig["socket"];
export type HttpConfig = NorayConfig["http"];
export type UdpRelayConfig = NorayConfig["udpRelay"];

dotenv.config();
export const config = readLiveConfig();
logger.info({ config }, "Loaded application config");
