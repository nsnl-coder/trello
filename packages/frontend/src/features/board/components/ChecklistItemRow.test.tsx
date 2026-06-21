import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ChecklistItem } from "shared";

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));
vi.mock("@dnd-kit/utilities", () => ({ CSS: { Translate: { toString: () => undefined } } }));

const { ChecklistItemRow } = await import("./ChecklistItemRow");

function makeItem(over: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: "i1",
    checklistId: "cl1",
    text: "Buy milk",
    isDone: false,
    position: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe("ChecklistItemRow", () => {
  it("toggling the checkbox calls onToggle with the new value", async () => {
    const u = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ChecklistItemRow
        item={makeItem()}
        editable
        onToggle={onToggle}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    await u.click(screen.getByLabelText("toggle Buy milk"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("editing the text and pressing Enter calls onRename", async () => {
    const u = userEvent.setup();
    const onRename = vi.fn();
    render(
      <ChecklistItemRow
        item={makeItem()}
        editable
        onToggle={vi.fn()}
        onRename={onRename}
        onDelete={vi.fn()}
      />,
    );
    await u.click(screen.getByText("Buy milk"));
    const input = screen.getByLabelText("item text");
    await u.clear(input);
    await u.type(input, "Buy bread{Enter}");
    expect(onRename).toHaveBeenCalledWith("Buy bread");
  });

  it("clicking delete calls onDelete", async () => {
    const u = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <ChecklistItemRow
        item={makeItem()}
        editable
        onToggle={vi.fn()}
        onRename={vi.fn()}
        onDelete={onDelete}
      />,
    );
    await u.click(screen.getByLabelText("delete Buy milk"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("hides controls when not editable", () => {
    render(
      <ChecklistItemRow
        item={makeItem()}
        editable={false}
        onToggle={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("delete Buy milk")).toBeNull();
    expect(screen.getByLabelText("toggle Buy milk")).toBeDisabled();
  });
});
