import * as dotenv from 'dotenv'
import { byteSize, duration, integer, number } from './config.parsers.mjs'
import logger, { getLogLevel } from './logger.mjs'

dotenv.config()

const env = process.env

/**
* Noray configuration type.
*/
export class NorayConfig {
  socket = {
    host: env.NORAY_SOCKET_HOST ?? '::1',
    port: integer(env.NORAY_SOCKET_PORT) ?? 8890
  }

  udpRelay = {
    maxSlots: number(env.NORAY_UDP_RELAY_MAX_SLOTS) ?? 16384,
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
