import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { End2EndContext } from './context.mjs'

describe('Connection', () => {
  const context = new End2EndContext()

  before(async () => {
    await context.startup()
  })

  describe('connect', () => {
    it('should respond with external address', async () => {
      const host = await context.connect()
      const client = await context.connect()
      
      // Grab data from responses
      context.log.info('Registering parties')
      const [oid, pid] = await context.registerHost(host)
      const [_, clientPid] = await context.registerHost(client)

      assert(oid, 'No oid received!')
      assert(pid, 'No pid received!')
      assert(clientPid, 'No client pid received!')

      // Register external addresses
      context.log.info('Registering external addresses')
      await Promise.all([
        context.registerExternal(undefined, pid),
        context.registerExternal(undefined, clientPid)
      ])

      // Send connect request
      client.write(`connect ${oid}\n`)

      // Assert responses
      assert(
        (await context.read(client)).find(cmd => cmd.startsWith('connect ')),
        'No handshake received by client!'
      )

      assert(
        (await context.read(host)).find(cmd => cmd.startsWith('connect ')),
        'No handshake received by host!'
      )
    })
  })

  after(() => {
    context.shutdown()
  })
})
