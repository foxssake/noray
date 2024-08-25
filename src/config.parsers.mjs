import assert from 'node:assert'

/**
  * Parse config value as integer.
  *
  * @param {any} value Value
  * @returns {number?} Integer or undefined
  */
export function integer (value) {
  const result = parseInt(value)
  return isNaN(result) ? undefined : result
}

/**
* Parse config value as number
*
* @param {any} value Value
* @returns {number?} Number or undefined
*/
export function number (value) {
  const result = parseFloat(value)
  return isNaN(result) ? undefined : result
}

/**
  * Parse config value as enum.
  *
  * @param {any} value Value
  * @param {Array} values Allowed values
  * @returns {any?} Allowed value or undefined
  */
export function enumerated (value, values) {
  return values.includes(value)
    ? value
    : undefined
}

/**
* Split an input into nominator and unit
* @param {string} value
* @returns {number[]}
*/
function extractUnit (value) {
  const pattern = /^([0-9.,]+)([a-zA-Z]*)/

  const groups = pattern.exec(value)
  assert(groups, `Can't parse input "${value}"`)

  return [groups[1], groups[2]]
}

/**
* Parse config value as human-readable size
*
* @param {any} value Value
* @returns {number?} Number or undefined
*/
export function byteSize (value) {
  if (value === undefined) {
    return value
  }

  const postfixes = ['b', 'kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb']

  const [nominator, unit] = extractUnit(value)

  const idx = postfixes.findIndex(pf => pf === (unit || 'b').toLowerCase())
  assert(idx >= 0, `Unknown byte postfix "${unit}"!`)

  return number(nominator) * Math.pow(1024, idx)
}

/**
* Parse config value as human-readable duration
*
* @param {any} value Value
* @returns {number?} Number or undefined
*/
export function duration (value) {
  if (value === undefined) {
    return value
  }

  const units = {
    '': 1,
    us: 0.000001,
    ms: 0.001,
    s: 1,
    m: 60,
    h: 3600,
    hr: 3600,
    d: 86400,
    w: 604800,
    mo: 2592000,
    yr: 31536000
  }

  const [nominator, unit] = extractUnit(value.toLowerCase())
  assert(units[unit], `Unknown duration unit "${unit}"!`)

  return number(nominator) * units[unit]
}

/**
* Parse config value as port ranges.
*
* Three kinds of port ranges are parsed:
* 1. literal - e.g. '1007' becomes [1007]
* 1. absolute - e.g. '1024-1026' becomes [1024, 1025, 1026]
* 1. relative - e.g. '1024+2' becomes [1024, 1025, 1026]
*
* These ranges are separated by a comma, e.g.:
* `1007, 1024-1026, 2048+2`
*
* @param {string} value Value
* @returns {number[]} Ports
*/
export function ports (value) {
  if (value === undefined) {
    return undefined
  }

  const ranges = value.split(',').map(r => r.trim())

  const literals = ranges
    .filter(p => /^\d+$/.test(p))
    .map(integer)
    .filter(p => !!p)
    .map(p => [p, p])

  const absolutes = ranges
    .filter(r => r.includes('-'))
    .map(r => r.split('-').map(integer))
    .filter(r => !r.includes(undefined))

  const relatives = ranges
    .filter(r => r.includes('+'))
    .map(r => r.split('+').map(integer))
    .filter(r => !r.includes(undefined))
    .map(([from, offset]) => [from, from + offset])

  const result = [...literals, ...absolutes, ...relatives]
    .flatMap(([from, to]) =>
      [...new Array(to - from + 1)].map((_, i) => from + i)
    )
    .sort()
    .filter((v, i, a) => i === 0 || v !== a[i - 1]) // ensure every port is unique

  return result.length > 0 ? result : undefined
}
