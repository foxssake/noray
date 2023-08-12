import { describe, it } from 'node:test'
import assert from 'node:assert'
import { RelayEntry } from '../../../src/relay/relay.entry.mjs'
import { NetAddress } from '../../../src/relay/net.address.mjs'

describe('RelayEntry', () => {
  describe('equals', () => {
    const cases = [
      [
        'same should equal',
        new RelayEntry({ address: new NetAddress({ address: "host1", port: 1000 }), port: 2000 }),
        new RelayEntry({ address: new NetAddress({ address: "host1", port: 1000 }), port: 2000 }),
        true
      ],
      [
        'different port should equal',
        new RelayEntry({ address: new NetAddress({ address: "host1", port: 1000 }), port: 2000 }),
        new RelayEntry({ address: new NetAddress({ address: "host1", port: 1000 }), port: 2010 }),
        true
      ],
      [
        'different address host should not equal',
        new RelayEntry({ address: new NetAddress({ address: "host1", port: 1000 }), port: 2000 }),
        new RelayEntry({ address: new NetAddress({ address: "host2", port: 1000 }), port: 2000 }),
        false
      ],
      [
        'different address port should not equal',
        new RelayEntry({ address: new NetAddress({ address: "host1", port: 1000 }), port: 2000 }),
        new RelayEntry({ address: new NetAddress({ address: "host1", port: 1020 }), port: 2000 }),
        false
      ],
    ]

    cases.forEach(([name, a, b, expected]) => {
      it(name, () => { assert.equal(a.equals(b), expected) })
    })
  })
})
