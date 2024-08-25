import { describe, it } from 'node:test'
import assert from 'node:assert'
import { byteSize, duration, enumerated, integer, number, ports } from '../../src/config.parsers.mjs'

function Case(name, input, expected) {
  return { name, input, expected }
}

const cases = {
  integer: {
    method: value => integer(value),
    cases: [
      Case('should parse valid', '42', 42),
      Case('should return undefined on invalid', 'asd', undefined),
      Case('should return undefined on empty', '', undefined),
      Case('should return undefined on undefined', undefined, undefined)
    ]
  },

  number: {
    method: value => number(value),
    cases: [
      Case('should parse valid integer', '42', 42),
      Case('should parse valid number', '420.69', 420.69),
      Case('should return undefined on invalid', 'asd', undefined),
      Case('should return undefined on empty', '', undefined),
      Case('should return undefined on undefined', undefined, undefined)
    ]
  },

  enumerated: {
    method: ([value, known]) => enumerated(value, known),
    cases: [
      Case('should return known', ['a', ['a', 'b', 'c']], 'a'),
      Case('should return undefined on unknown', ['f', ['a', 'b']], undefined),
      Case('should return undefined on empty', ['', ['a', 'b']], undefined),
      Case('should return undefined on undefined', [undefined, ['a']], undefined)
    ]
  }
}

Object.entries(cases).forEach(([name, entry]) => {
  describe(name, () => {
    entry.cases.forEach(kase => {
      it(kase.name, () => {
        // Given
        const expected = kase.expected

        // When
        const actual = entry.method(kase.input)

        // Then
        assert.deepEqual(actual, expected)
      })
    })
  })
})

describe('byteSize', () => {
  const validCases = [
    Case('should pass through undefined', undefined, undefined),
    Case('should parse without postfix', '64', 64),
    Case('should parse kb', '64kb', 64 * 1024),
    Case('should parse Mb', '64Mb', 64 * Math.pow(1024, 2)),
    Case('should parse Gb', '64Gb', 64 * Math.pow(1024, 3)),
    Case('should parse Gb', '64Tb', 64 * Math.pow(1024, 4)),
    Case('should parse Pb', '6.4Pb', 6.4 * Math.pow(1024, 5)),
    Case('should parse Eb', '6.4Eb', 6.4 * Math.pow(1024, 6)),
    Case('should parse Zb', '64Zb', 64 * Math.pow(1024, 7)),
    Case('should parse Yb', '64Yb', 64 * Math.pow(1024, 8)),
  ]

  const throwCases = [
    Case('should throw on invalid format', 'no6'),
    Case('should throw on invalid postfix', '64Bb')
  ]

  validCases.forEach(kase =>
    it(kase.name, () => assert.equal(byteSize(kase.input), kase.expected))
  )

  throwCases.forEach(kase =>
    it(kase.name, () => assert.throws(() =>
      byteSize(kase.input)
    ))
  )
})

describe('duration', () => {
  const validCases = [
    Case('should pass through undefined', undefined, undefined),
    Case('should parse without postfix', '64', 64),
    Case('should parse usec', '64us', 0.000064),
    Case('should parse msec', '64ms', 0.064),
    Case('should parse sec', '64s', 64),
    Case('should parse minute', '10m', 600),
    Case('should parse hour', '4h', 14400),
    Case('should parse hour', '4hr', 14400),
    Case('should parse day', '2d', 172800),
    Case('should parse week', '2w', 1209600),
    Case('should parse month', '3mo', 7776000),
    Case('should parse year', '4yr', 126144000),
  ]

  const throwCases = [
    Case('should throw on invalid format', 'no6'),
    Case('should throw on invalid postfix', '64mh')
  ]

  validCases.forEach(kase =>
    it(kase.name, () => assert.equal(duration(kase.input), kase.expected))
  )

  throwCases.forEach(kase =>
    it(kase.name, () => assert.throws(() =>
      duration(kase.input)
    ))
  )
})

describe('ports', () => {
  const cases = [
    Case('should parse literal', '1024', [1024]),
    Case('should parse absolute', '1024-1026', [1024, 1025, 1026]),
    Case('should parse relative', '2048+3', [2048, 2049, 2050, 2051]),
    Case('should parse single absolute', '1024-1024', [1024]),
    Case('should parse single relative', '1024+0', [1024]),
    Case('should return sorted', '2048+1, 1024-1025', [1024, 1025, 2048, 2049]),
    Case('should return unique', '1-4, 2, 2-6', [1, 2, 3, 4, 5, 6])
  ]

  cases.forEach(kase =>
    it(kase.name, () => assert.deepEqual(ports(kase.input), kase.expected))
  )
})
