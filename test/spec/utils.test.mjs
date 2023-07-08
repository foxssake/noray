import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import sinon from 'sinon'
import { Timeout, combine, formatByteSize, formatDuration, memoize, range, sleep, withTimeout } from '../../src/utils.mjs'

describe('utils', () => {
  describe('memoized', () => {
    it('should not call again with same params', () => {
      // Given
      const expected = 4
      const fn = sinon.mock()
      fn.returns(expected)

      const mfn = memoize(fn)

      // When
      mfn(16)
      const actual = mfn(16)

      // Then
      assert.equal(actual, expected)
      assert(fn.calledOnce)
      assert(fn.calledOnceWith(16))
    })

    it('should call through on unknown', () => {
      // Given
      const fn = sinon.mock()
      fn.twice().returns()
      const mfn = memoize(fn)

      // When
      mfn(16)
      mfn(32)

      // Then
      assert(fn.calledTwice)
      assert(fn.calledWith(16))
      assert(fn.calledWith(32))
    })
  })

  describe('withTimeout', () => {
    /** @type {sinon.SinonFakeTimers} */
    let clock

    before(() => {
      clock = sinon.useFakeTimers()
    })

    it('should return on resolve', async () => {
      // Given
      const expected = 42
      const promise = Promise.resolve(expected)

      // When
      const actual = await withTimeout(promise, 8)

      // Then
      assert.equal(actual, expected)
    })

    it('should throw on reject', () => {
      // Given
      const promise = Promise.reject(new Error())

      // When + Then
      assert.rejects(
        () => withTimeout(promise, 8)
      )
    })

    it('should return symbol on timeout', async () => {
      // Given
      const expected = Timeout
      const promise = sleep(16)

      // When
      const actual = withTimeout(promise, 8)

      // Then
      clock.tick(16100)
      assert.equal(await actual, expected)
    })

    after(() => {
      clock.restore()
    })
  })

  describe('range', () => {
    it('should return numbers', () => {
      // Given
      const expected = [0, 1, 2, 3]

      // When
      const actual = range(4)

      // Then
      assert.deepEqual(actual, expected)
    })

    it('should return empty on 0', () => {
      // Given
      const expected = []

      // When
      const actual = range(0)

      // Then
      assert.deepEqual(actual, expected)
    })

    it('should return empty on negative', () => {
      // Given
      const expected = []

      // When
      const actual = range(-4)

      // Then
      assert.deepEqual(actual, expected)
    })
  })

  describe('combine', () => {
    it('should return expected', () => {
      // Given
      const arrays = [
        ['a', 'b'],
        [0, 1],
        ['foo', 'bar']
      ]

      const expected = [
        ['a', 0, 'foo'],
        ['a', 0, 'bar'],
        ['a', 1, 'foo'],
        ['a', 1, 'bar'],
        ['b', 0, 'foo'],
        ['b', 0, 'bar'],
        ['b', 1, 'foo'],
        ['b', 1, 'bar'],
      ]

      // When
      const actual = combine(...arrays)

      // Then
      // Compare sorted, since order doesn't matter
      assert.deepEqual(actual.sort(), expected.sort())
    })
  })

  describe('formatByteSize', () => {
    const cases = [
      [128 * Math.pow(1024, 0), '128b'],
      [128 * Math.pow(1024, 1), '128kb'],
      [128 * Math.pow(1024, 2), '128Mb'],
      [128 * Math.pow(1024, 3), '128Gb'],
      [128 * Math.pow(1024, 4), '128Tb'],
      [128 * Math.pow(1024, 5), '128Pb'],
      [128 * Math.pow(1024, 6), '128Eb'],
      [128 * Math.pow(1024, 7), '128Zb'],
      [128 * Math.pow(1024, 8), '128Yb'],
      [8 * Math.pow(1024, 9), '8192Yb'],
    ]

    cases.forEach(([input, expected]) => it(`should format ${expected}`, () =>
      assert.equal(formatByteSize(input), expected)
    ))
  })

  describe('formatDuration', () => {
    const cases = [
      [0.0000002, '0.2us'],
      [0.000002, '2us'],
      [0.002, '2ms'],
      [2, '2sec'],
      [120, '2min'],
      [7200, '2hr'],
      [172800, '2day'],
      [1814400, '3wk'],
      [10368000, '4mo'],
      [378432000, '12yr']
    ]

    cases.forEach(([input, expected]) => it(`should format ${expected}`, () =>
      assert.equal(formatDuration(input), expected)
    ))
  })
})
