import { test } from "node:test";
import assert from "node:assert/strict";

import { parseTemplate, InterpolationError } from "../src/core.js";

test("plain text becomes a single literal segment", () => {
  assert.deepEqual(parseTemplate("hello world"), [
    { type: "literal", value: "hello world" },
  ]);
});

test("empty input yields no segments", () => {
  assert.deepEqual(parseTemplate(""), []);
});

test("a simple interpolation splits into literal and expression", () => {
  assert.deepEqual(parseTemplate("a ${name} b"), [
    { type: "literal", value: "a " },
    { type: "expression", value: "name" },
    { type: "literal", value: " b" },
  ]);
});

test("leading and trailing interpolations are preserved", () => {
  assert.deepEqual(parseTemplate("${a}${b}"), [
    { type: "expression", value: "a" },
    { type: "expression", value: "b" },
  ]);
});

test("expression whitespace is trimmed", () => {
  assert.deepEqual(parseTemplate("${  x + y  }"), [
    { type: "expression", value: "x + y" },
  ]);
});

test("nested braces inside an expression are tracked", () => {
  assert.deepEqual(parseTemplate("${ { a: 1 } }"), [
    { type: "expression", value: "{ a: 1 }" },
  ]);
});

test("braces inside a string literal do not close the expression", () => {
  assert.deepEqual(parseTemplate("${ '}' }"), [
    { type: "expression", value: "'}'" },
  ]);
});

test("braces inside a line comment are ignored", () => {
  assert.deepEqual(parseTemplate("${ a // }\n + b }"), [
    { type: "expression", value: "a // }\n + b" },
  ]);
});

test("braces inside a block comment are ignored", () => {
  assert.deepEqual(parseTemplate("${ /* } */ x }"), [
    { type: "expression", value: "/* } */ x" },
  ]);
});

test("escaped dollar sign does not start an interpolation", () => {
  assert.deepEqual(parseTemplate("cost: \\${amount}"), [
    { type: "literal", value: "cost: \\${amount}" },
  ]);
});

test("a backslash before a normal character is kept in the literal", () => {
  assert.deepEqual(parseTemplate("a\\nb"), [
    { type: "literal", value: "a\\nb" },
  ]);
});

test("unterminated interpolation throws with a position", () => {
  assert.throws(
    () => parseTemplate("${a"),
    (err) => err instanceof InterpolationError && err.position === 2,
  );
});

test("unterminated string inside an expression throws", () => {
  assert.throws(
    () => parseTemplate("${ 'a }"),
    (err) => err instanceof InterpolationError && err.position === 3,
  );
});

test("unterminated block comment throws", () => {
  assert.throws(
    () => parseTemplate("${ /* a }"),
    (err) => err instanceof InterpolationError && err.position === 3,
  );
});

test("non-string input is rejected", () => {
  assert.throws(() => parseTemplate(null), TypeError);
});
