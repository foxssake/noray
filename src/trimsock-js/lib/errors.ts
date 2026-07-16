/**
 * Thrown when the internal buffer can't hold all the incoming data
 */
export class BufferOverflowError extends Error {}

/**
 * Thrown when the parser encounters any malformed content that cannot be
 * parsed
 */
export class ParserError extends Error {}

/**
 * Thrown when the parser encounters an unexpected character
 */
export class UnexpectedCharacterError extends ParserError {}
