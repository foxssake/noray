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
      
      context.log.info('Registering parties')
      host.write('register-host\n')
      client.write('register-host\n')

      // Grab data from responses
      const hostResult = await context.read(host)
      const clientResult = await context.read(client)

      const oid = hostResult
        .filter(cmd => cmd.startsWith('set-oid '))
        .map(cmd => cmd.split(' ')[1])
        .at(0) ?? assert.fail('No oid received!')

      const pid = hostResult
        .filter(cmd => cmd.startsWith('set-pid '))
        .map(cmd => cmd.split(' ')[1])
        .at(0) ?? assert.fail('No oid received!')

      const clientPid = clientResult
        .filter(cmd => cmd.startsWith('set-pid '))
        .map(cmd => cmd.split(' ')[1])
        .at(0) ?? assert.fail('No oid received!')

      // Register external addresses
      context.log.info('Registering external addresses')
      await Promise.all([
        context.registerExternal(pid),
        context.registerExternal(clientPid)
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
