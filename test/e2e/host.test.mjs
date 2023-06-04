import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { End2EndContext } from './context.mjs'

describe('Hosts', () => {
  const context = new End2EndContext()

  before(async () => {
    await context.startup()
  })

  describe('register', () => {
    it('should respond with oid/pid', async () => {
      const client = await context.connect()
      
      client.write('register-host\n')

      // Read response
      const response = await context.read(client)

      // Check if we got both id's
      assert(response.find(cmd => cmd.startsWith('set-oid')), 'Missing open id!')
      assert(response.find(cmd => cmd.startsWith('set-pid')), 'Missing private id!')
    })
  })

  after(() => {
    context.shutdown()
  })
})
