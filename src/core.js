"use strict";

/**
 * Error thrown when a template literal cannot be parsed.
 *
 * The parser is deliberately strict: malformed input is a programming
 * mistake, not something callers should silently get partial results for.
 */
export class InterpolationError extends Error {
  /**
   * @param {string} message Human-readable description of the failure.
   * @param {number} position Zero-based index in the source string where the
   *   problem was detected.
   */
  constructor(message, position) {
    super(`${message} at position ${position}`);
    this.name = "InterpolationError";
    this.position = position;
  }
}

/**
 * Parse a JavaScript template literal body into literal and expression parts.
 *
 * The input is the *body* of a template literal: the text between the
 * backticks, with `\`` escapes already resolved by the JavaScript lexer if
 * you obtained it from a real template. This function does not evaluate
 * expressions; it only identifies where they start and end so a caller can
 * substitute values.
 *
 * The return value is a flat array of segments. Literal segments have
 * `{ type: "literal", value: string }`; expression segments have
 * `{ type: "expression", value: string }` where `value` is the raw source
 * text between the braces, trimmed of surrounding whitespace.
 *
 * @param {string} source The template literal body to parse.
 * @returns {Array<{type: "literal"|"expression", value: string}>}
 * @throws {InterpolationError} If braces are unbalanced or an interpolation
 *   is never closed.
 */
export function parseTemplate(source) {
  if (typeof source !== "string") {
    throw new TypeError("parseTemplate expects a string");
  }

  /** @type {Array<{type: "literal"|"expression", value: string}>} */
  const segments = [];
  let literalStart = 0;
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (ch === "\\") {
      // Skip the escaped character so a backslash before `${` does not start
      // an interpolation. The literal keeps the backslash because we return
      // the raw body, not a cooked string.
      i += 2;
      continue;
    }

    if (ch === "$" && source[i + 1] === "{") {
      if (i > literalStart) {
        segments.push({ type: "literal", value: source.slice(literalStart, i) });
      }

      const exprStart = i + 2;
      const exprEnd = findExpressionEnd(source, exprStart);
      const raw = source.slice(exprStart, exprEnd);
      segments.push({ type: "expression", value: raw.trim() });

      i = exprEnd + 1; // skip the closing brace
      literalStart = i;
      continue;
    }

    i += 1;
  }

  if (literalStart < source.length) {
    segments.push({ type: "literal", value: source.slice(literalStart) });
  }

  return segments;
}

/**
 * Find the index of the `}` that closes the interpolation starting at
 * `start`. Tracks nested braces, strings, and comments so that expressions
 * such as `${ { a: 1 } }` and `${ "}" }` are handled correctly.
 *
 * @param {string} source
 * @param {number} start Index of the first character inside the braces.
 * @returns {number} Index of the closing `}`.
 */
function findExpressionEnd(source, start) {
  let depth = 0;
  let i = start;

  while (i < source.length) {
    const ch = source[i];

    if (ch === "\\") {
      i += 2;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(source, i, ch);
      continue;
    }

    if (ch === "/" && source[i + 1] === "/") {
      i = skipLineComment(source, i + 2);
      continue;
    }

    if (ch === "/" && source[i + 1] === "*") {
      i = skipBlockComment(source, i);
      continue;
    }

    if (ch === "{") {
      depth += 1;
      i += 1;
      continue;
    }

    if (ch === "}") {
      if (depth === 0) {
        return i;
      }
      depth -= 1;
      i += 1;
      continue;
    }

    i += 1;
  }

  throw new InterpolationError("unterminated interpolation", start);
}

/**
 * Advance past a quoted string starting at `index`.
 *
 * @param {string} source
 * @param {number} index Index of the opening quote.
 * @param {string} quote The quote character (one of `"`, `'`, `` ` ``).
 * @returns {number} Index just after the closing quote.
 */
function skipString(source, index, quote) {
  let i = index + 1;

  while (i < source.length) {
    const ch = source[i];

    if (ch === "\\") {
      i += 2;
      continue;
    }

    if (ch === quote) {
      return i + 1;
    }

    i += 1;
  }

  throw new InterpolationError("unterminated string", index);
}

/**
 * Advance past a `//` comment starting at `index`.
 *
 * @param {string} source
 * @param {number} index Index just after the `//`.
 * @returns {number} Index of the newline, or `source.length`.
 */
function skipLineComment(source, index) {
  let i = index;
  while (i < source.length && source[i] !== "\n") {
    i += 1;
  }
  return i;
}

/**
 * Advance past a `/* ... *\/` comment starting at `index`.
 *
 * @param {string} source
 * @param {number} index Index of the opening `/`.
 * @returns {number} Index just after the closing `*\/`.
 */
function skipBlockComment(source, index) {
  let i = index + 2;
  while (i < source.length) {
    if (source[i] === "*" && source[i + 1] === "/") {
      return i + 2;
    }
    i += 1;
  }
  throw new InterpolationError("unterminated comment", index);
}
