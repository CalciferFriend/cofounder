import { describe, it, expect } from "vitest";
import { TJMessage } from "./message.schema.ts";
import { randomUUID } from "node:crypto";

describe("TJMessage", () => {
  it("parses a valid task message", () => {
    const msg = TJMessage.parse({
      version: "0.1.0",
      id: randomUUID(),
      from: "Calcifer",
      to: "GLaDOS",
      turn: 0,
      type: "task",
      payload: "Generate an image of a cat chasing a mouse",
      timestamp: new Date().toISOString(),
    });

    expect(msg.from).toBe("Calcifer");
    expect(msg.to).toBe("GLaDOS");
    expect(msg.type).toBe("task");
    expect(msg.done).toBe(false);
    expect(msg.wake_required).toBe(false);
  });

  it("rejects invalid message type", () => {
    expect(() =>
      TJMessage.parse({
        id: randomUUID(),
        from: "A",
        to: "B",
        turn: 0,
        type: "invalid",
        payload: "",
        timestamp: new Date().toISOString(),
      }),
    ).toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => TJMessage.parse({})).toThrow();
  });
});
