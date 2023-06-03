import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import * as net from 'node:net'
import { End2EndContext } from './context.mjs'
import { sleep } from '../../src/utils.mjs'

describe('Hosts', () => {
  const context = new End2EndContext()

  before(async () => {
    await context.startup()
  })

  describe('register', () => {
    it('should respond with oid/pid', async () => {
      const client = await context.connect()
      
      client.write('register-host\n')

      // Wait a bit for response
      await sleep(0.25)

      // Read response
      const lines = []
      for (let line = ''; line != null; line = client.read()) {
        lines.push(line)
      }
      const response = lines.join('\n')

      // Check if we got both id's
      assert(response.includes('set-oid '), 'Missing open id!')
      assert(response.includes('set-pid '), 'Missing private id!')
    })
  })

  after(() => {
    context.shutdown()
  })
})
