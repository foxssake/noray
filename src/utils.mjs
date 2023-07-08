/**
* Return current time ( seconds since epoch ).
* @returns {number}
*/
export function time () {
  return (performance.now() + performance.timeOrigin) / 1000
}

/**
* Sleep.
* @param {number} seconds Time to sleep in seconds
* @param {T} [value=undefined] Value to resolve to
* @returns {Promise<T>} Promise
* @template T
*/
export function sleep (seconds, value) {
  return new Promise(resolve => setTimeout(() => resolve(value), seconds * 1000))
}

/**
* Wait for an event on event source.
* @param {any} source Event source
* @param {string} event Event name
* @returns {Promise} Promise
*/
export function promiseEvent (source, event) {
  return new Promise(resolve => {
    source.on(event, resolve)
  })
}

/**
* Wrap a function as a singleton factory.
*
* In practice, this will create a function that will cache the wrapped
* function's return value, assuming it always returns the same thing.
*
* NOTE: This will evaluate the method while wrapping.
*
* @param {function(): T} f Function to wrap
* @returns {function(): T} Singleton factory function
* @template T
*/
export function asSingletonFactory (f) {
  const value = f()
  return () => value
}

/**
* Memoize function.
*
* That is, for every set of input arguments, remember the result. The next time
* the same arguments are used, instead of calculating the result again, it will
* be recovered from cache.
*
* **NOTE** that the cache is not limited in any way, use only in cases where
* the possible number of parameters is limited.
*
* @param {function(): T} f Function
* @returns {function(): T} Memoized function
* @template T
*/
export function memoize (f) {
  const cache = new Map()
  return function () {
    const key = JSON.stringify(arguments)

    if (!cache.has(key)) {
      cache.set(key, f(...arguments))
    }

    return cache.get(key)
  }
}

/**
* Maps an input array into chunks of a given size. The last chunk might be
* smaller than the requested size.
*
* @param {T[]} data Data
* @param {number} size Chunk size
* @returns {T[][]} An array of chunks
* @template T
*/
export function chunks (data, size) {
  const count = Math.ceil(data.length / size)
  return [...new Array(count)]
    .map((_, i) => data.slice(i * size, (i + 1) * size))
}

/**
* Symbol for timeout.
*/
export const Timeout = Symbol('timeout')

/**
* Limit a promise run to a given timeout.
*
* If the promise doesn't resolve in time, the Timeout symbol will be returned.
* Otherwise, the promise's result will be passed through.
* @param {Promise<T>} promise Promise
* @param {number} timeout Timeout in seconds
* @returns {Promise<T | Symbol>} Promise result or Timeout symbol
* @template T
*/
export function withTimeout (promise, timeout) {
  return Promise.race([
    sleep(timeout, Timeout),
    promise
  ])
}

/**
* Generate an array of numbers 0..n
* @param {number} n Item count
* @returns {number[]} Numbers
*/
export function range (n) {
  return [...new Array(Math.max(~~n, 0))]
    .map((_, i) => i)
}

/**
* Generate all possible combinations of the values in the given arrays.
*
* For example:
* ```js
* console.log(['a', 'b'], [0, 1], [true, false])
* // ['a', 0, true]
* // ['a', 0, false]
* // ['a', 1, true]
* // ['a', 1, false]
* // ['b', 0, true]
* // ['b', 0, false]
* // ['b', 1, true]
* // ['b', 1, false]
* ```
* @param {...Array<T>} arrays Arrays to combine
* @returns {Array<Array<T>>} Array of combinations
* @template T
*/
export function combine (...arrays) {
  const count = arrays.map(a => a.length)
    .reduce((a, b) => a * b, 1)
  const dimensions = arrays.length

  const result = range(count)

  for (let i = 0; i < count; ++i) {
    const item = new Array(dimensions)
    let idx = i

    for (let d = 0; d < dimensions; ++d) {
      const divisor = arrays[d].length
      item[d] = arrays[d][idx % divisor]
      idx = ~~(idx / divisor)
    }

    result[i] = item
  }

  return result
}

/**
* Format a size in bytes to a human readable form.
*
* For example, 131072 becomes 128kb.
* @param {number} size Size in bytes
* @returns {string} Human readable size
*/
export function formatByteSize (size) {
  const postfixes = ['b', 'kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb']
  const pfi = (postfixes.length + postfixes.findIndex((_, i) => size < Math.pow(1024, i + 1))) %
    postfixes.length

  return (size / Math.pow(1024, pfi)) + postfixes[pfi]
}

/**
* Format a duration to a human readable form.
*
* For example, 720 becomes 12min.
* @param {number} seconds Duration in seconds
* @returns {string} Human readable duration
*/
export function formatDuration (seconds) {
  const units = Object.entries({
    us: 0.000001,
    ms: 0.001,
    sec: 1,
    min: 60,
    hr: 3600,
    day: 86400,
    wk: 604800,
    mo: 2592000,
    yr: 31536000
  }).reverse()

  const [unit, multiplier] = units.find(([_, f]) => seconds > f) ?? units.at(-1)

  return (seconds / multiplier) + unit
}
