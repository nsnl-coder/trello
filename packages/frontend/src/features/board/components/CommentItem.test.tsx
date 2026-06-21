import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Comment } from "shared";
import { CommentItem } from "./CommentItem";

const members = [{ name: "alice" }];

function makeComment(over: Partial<Comment> = {}): Comment {
  return {
    id: "cm1",
    cardId: "k1",
    authorId: "u1",
    parentId: null,
    body: "hello @alice",
    author: { id: "u1", name: "bob", avatar: null },
    mentions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe("CommentItem", () => {
  it("highlights known mentions", () => {
    render(
      <CommentItem
        comment={makeComment()}
        members={members}
        currentUserId="other"
        isOwner={false}
        editable
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("@alice")).toBeInTheDocument();
  });

  it("shows edit only for the author", () => {
    const { rerender } = render(
      <CommentItem
        comment={makeComment()}
        members={members}
        currentUserId="u1"
        isOwner={false}
        editable
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByLabelText("edit comment cm1")).toBeInTheDocument();

    rerender(
      <CommentItem
        comment={makeComment()}
        members={members}
        currentUserId="other"
        isOwner={false}
        editable
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.queryByLabelText("edit comment cm1")).toBeNull();
  });

  it("shows delete for a non-author board owner", () => {
    render(
      <CommentItem
        comment={makeComment()}
        members={members}
        currentUserId="other"
        isOwner
        editable
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByLabelText("delete comment cm1")).toBeInTheDocument();
  });

  it("calls onEdit when saving an edit", async () => {
    const u = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <CommentItem
        comment={makeComment()}
        members={members}
        currentUserId="u1"
        isOwner={false}
        editable
        onEdit={onEdit}
        onDelete={() => {}}
      />,
    );
    await u.click(screen.getByLabelText("edit comment cm1"));
    const box = screen.getByLabelText("comment body");
    await u.clear(box);
    await u.type(box, "edited");
    await u.click(screen.getByRole("button", { name: "Save" }));
    expect(onEdit).toHaveBeenCalledWith("edited");
  });
});
