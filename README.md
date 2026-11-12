# simple-string-interpolation

Parses JavaScript template literal bodies into literal segments and expression placeholders so you can implement your own interpolation.

```js
import { parseTemplate } from "simple-string-interpolation";

const segments = parseTemplate("Hello, ${name}! You have ${count} messages.");
// [
//   { type: "literal", value: "Hello, " },
//   { type: "expression", value: "name" },
//   { type: "literal", value: "! You have " },
//   { type: "expression", value: "count" },
//   { type: "literal", value: " messages." },
// ]
```

## Why this exists

`String.prototype.replace` and friends can substitute values, but they give you no structured view of the template. If you want to evaluate expressions in a sandbox, compile the template to a function, or translate it to another language, you need the parts. This library returns those parts and nothing else. The trade-off is that it does not evaluate anything: you get raw expression text, and you decide what to do with it. That keeps the library small and free of dependencies.

## The awkward edge

The parser is strict. An unterminated interpolation, an unterminated string inside an expression, or an unterminated block comment throws an `InterpolationError` with a `position` property. It does not try to guess where the expression ends. It also treats a backslash as an escape everywhere, so `\${` is a literal `$` followed by `{`, and the backslash is preserved in the literal segment because the input is the raw template body, not a cooked string. If you need cooked text, run the body through your own unescape step first.

## API

### `parseTemplate(source: string): Array<{ type: "literal" | "expression", value: string }>`

Returns a flat array of segments. Expression values are trimmed of surrounding whitespace. Nested braces, strings, line comments, and block comments inside expressions are handled so that `}` inside them does not close the interpolation.

### `InterpolationError`

Thrown on malformed input. Has `name`, `message`, and `position` (zero-based index in the source where the problem was detected).
