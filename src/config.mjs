import * as dotenv from 'dotenv'
import { byteSize, duration, integer, number, ports } from './config.parsers.mjs'
import logger, { getLogLevel } from './logger.mjs'
import { urlAlphabet } from 'nanoid'

dotenv.config()

const env = process.env

/**
* Noray configuration type.
*/
export class NorayConfig {
  oid = {
    length: integer(env.NORAY_OID_LENGTH) ?? 21,
    charset: env.NORAY_OID_CHARSET ?? urlAlphabet
  }

  pid = {
    length: integer(env.NORAY_PID_LENGTH) ?? 128,
    charset: env.NORAY_PID_CHARSET ?? urlAlphabet
  }

  socket = {
    host: env.NORAY_SOCKET_HOST ?? '0.0.0.0',
    port: integer(env.NORAY_SOCKET_PORT) ?? 8890
  }

  http = {
    host: env.NORAY_HTTP_HOST ?? '0.0.0.0',
    port: integer(env.NORAY_HTTP_PORT) ?? 8891
  }

  udpRelay = {
    ports: ports(env.NORAY_UDP_RELAY_PORTS ?? '49152-51200'),
    timeout: duration(env.NORAY_UDP_RELAY_TIMEOUT ?? '30s'),
    cleanupInterval: duration(env.NORAY_UDP_RELAY_CLEANUP_INTERVAL ?? '30s'),
    registrarPort: number(env.NORAY_UDP_REGISTRAR_PORT) ?? 8809,

    maxIndividualTraffic: byteSize(env.NORAY_UDP_RELAY_MAX_INDIVIDUAL_TRAFFIC ?? '128kb'),
    maxGlobalTraffic: byteSize(env.NORAY_UDP_RELAY_MAX_GLOBAL_TRAFFIC ?? '1gb'),
    trafficInterval: duration(env.NORAY_UDP_RELAY_TRAFFIC_INTERVAL ?? '100ms'),
    maxLifetimeDuration: duration(env.NORAY_UDP_RELAY_MAX_LIFETIME_DURATION ?? '4hr'),
    maxLifetimeTraffic: byteSize(env.NORAY_UDP_RELAY_MAX_LIFETIME_TRAFFIC ?? '4gb')
  }

  loglevel = getLogLevel()
}

export const config = new NorayConfig()
logger.info({ config }, 'Loaded application config')
