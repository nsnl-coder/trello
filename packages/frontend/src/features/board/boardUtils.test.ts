import { describe, expect, it } from "vitest";
import {
  cardMatchesLabels,
  dueState,
  formatDueDate,
  renderMentions,
} from "./utils";
import type { Label } from "shared";

const label = (id: string): Label => ({
  id,
  boardId: "b1",
  name: id,
  color: "#61bd4f",
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("dueState", () => {
  it("returns none when no due date", () => {
    expect(dueState({ dueAt: null, isOverdue: false })).toBe("none");
  });
  it("returns overdue when flagged", () => {
    expect(dueState({ dueAt: new Date(Date.now() - 1000), isOverdue: true })).toBe("overdue");
  });
  it("returns soon when within a day", () => {
    expect(dueState({ dueAt: new Date(Date.now() + 60 * 60 * 1000), isOverdue: false })).toBe(
      "soon",
    );
  });
  it("returns upcoming when far in the future", () => {
    expect(
      dueState({ dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), isOverdue: false }),
    ).toBe("upcoming");
  });
});

describe("formatDueDate", () => {
  it("produces a non-empty string", () => {
    expect(formatDueDate(new Date("2030-01-02T10:30:00"))).toBeTruthy();
  });
});

describe("cardMatchesLabels", () => {
  it("matches when no filter", () => {
    expect(cardMatchesLabels({ labels: [] }, [])).toBe(true);
  });
  it("requires all selected labels present", () => {
    const card = { labels: [label("a"), label("b")] };
    expect(cardMatchesLabels(card, ["a"])).toBe(true);
    expect(cardMatchesLabels(card, ["a", "b"])).toBe(true);
    expect(cardMatchesLabels(card, ["a", "c"])).toBe(false);
  });
});

describe("renderMentions", () => {
  it("flags mentions that match a known member", () => {
    const segs = renderMentions("hi @alice and @bob", [{ name: "alice" }]);
    const mentions = segs.filter((s) => s.isMention).map((s) => s.text);
    expect(mentions).toContain("@alice");
    expect(mentions).not.toContain("@bob");
  });
  it("returns plain text when no mentions", () => {
    const segs = renderMentions("just text", [{ name: "alice" }]);
    expect(segs).toEqual([{ text: "just text", isMention: false }]);
  });
});
