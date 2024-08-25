import * as http from 'node:http'
import { Noray } from '../noray.mjs'
import logger from '../logger.mjs'
import * as prometheus from 'prom-client'
import { config } from '../config.mjs'
import { metricsRegistry } from './metrics.registry.mjs'

const log = logger.child({ name: 'mod:metrics' })

Noray.hook(noray => {
  log.info('Collecting default metrics')
  prometheus.collectDefaultMetrics({
    register: metricsRegistry
  })

  log.info('Starting HTTP server to serve metrics')

  const httpServer = new http.Server()
  httpServer.on('request', async (req, res) => {
    if (req.url !== '/metrics') {
      res.statusCode = 404
      res.end()
      return
    }

    res.write(await metricsRegistry.metrics())
    res.end()
  })

  httpServer.listen(config.http.port, config.http.host,
    () => log.info('Serving metrics over HTTP on port %s:%d', config.http.host, config.http.port)
  )

  noray.on('close', () => {
    log.info('noray closing, shutting down HTTP server')
    httpServer.close()
    httpServer.closeAllConnections()
  })
})
