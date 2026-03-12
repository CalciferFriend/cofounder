import { describe, it, expect } from "vitest";
import { coerceValue } from "./config.ts";

describe("coerceValue", () => {
  it('converts "true" to boolean true', () => {
    expect(coerceValue("true")).toBe(true);
  });

  it('converts "false" to boolean false', () => {
    expect(coerceValue("false")).toBe(false);
  });

  it('converts "42" to number 42', () => {
    expect(coerceValue("42")).toBe(42);
  });

  it('converts "3.14" to number 3.14', () => {
    expect(coerceValue("3.14")).toBe(3.14);
  });

  it('converts "hello" to string "hello"', () => {
    expect(coerceValue("hello")).toBe("hello");
  });

  it('converts \'{"a":1}\' to object {a: 1}', () => {
    expect(coerceValue('{"a":1}')).toEqual({ a: 1 });
  });

  it("converts negative number string", () => {
    expect(coerceValue("-5")).toBe(-5);
  });

  it("converts zero string", () => {
    expect(coerceValue("0")).toBe(0);
  });

  it("keeps numeric-looking strings with extra chars as strings", () => {
    expect(coerceValue("v1.2")).toBe("v1.2");
  });

  it("converts JSON array", () => {
    expect(coerceValue('["a","b"]')).toEqual(["a", "b"]);
  });

  it("keeps invalid JSON objects as strings", () => {
    expect(coerceValue("{bad json}")).toBe("{bad json}");
  });
});
