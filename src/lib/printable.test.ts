import { describe, it, expect } from "vitest";
import { messagesPrintHTML } from "./printable";
import { buildSeed } from "../state/seed";

describe("messagesPrintHTML", () => {
  it("produces a full HTML document with both parties and a certification", () => {
    const html = messagesPrintHTML(buildSeed());
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("Message Record");
    expect(html).toContain("Jordan");
    expect(html).toContain("cannot be edited or");
  });

  it("includes one row per message in chronological order", () => {
    const s = buildSeed();
    const html = messagesPrintHTML(s);
    const rowCount = (html.match(/<td class="ts">/g) || []).length;
    expect(rowCount).toBe(s.messages.length);
  });

  it("escapes HTML so message content can't inject markup", () => {
    const s = buildSeed();
    s.messages = [
      {
        id: "m", fromId: s.coParentId, body: "<script>alert('x')</script>",
        createdAt: new Date().toISOString(), readAt: null, tone: "calm", edited: false,
      },
    ];
    const html = messagesPrintHTML(s);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});
