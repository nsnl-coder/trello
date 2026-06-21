import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentComposer } from "./CommentComposer";

const members = [{ name: "alice" }, { name: "bob" }];

describe("CommentComposer", () => {
  it("submits the typed body", async () => {
    const u = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentComposer members={members} editable onSubmit={onSubmit} />);
    await u.type(screen.getByLabelText("comment body"), "hello world");
    await u.click(screen.getByRole("button", { name: "Comment" }));
    expect(onSubmit).toHaveBeenCalledWith("hello world");
  });

  it("suggests board members after typing @", async () => {
    const u = userEvent.setup();
    render(<CommentComposer members={members} editable onSubmit={() => {}} />);
    await u.type(screen.getByLabelText("comment body"), "hi @al");
    expect(screen.getByLabelText("mention alice")).toBeInTheDocument();
    expect(screen.queryByLabelText("mention bob")).toBeNull();
  });

  it("inserts a mention when a suggestion is clicked", async () => {
    const u = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CommentComposer members={members} editable onSubmit={onSubmit} />);
    await u.type(screen.getByLabelText("comment body"), "hi @al");
    await u.click(screen.getByLabelText("mention alice"));
    await u.click(screen.getByRole("button", { name: "Comment" }));
    expect(onSubmit).toHaveBeenCalledWith("hi @alice");
  });

  it("renders nothing for view-only", () => {
    const { container } = render(
      <CommentComposer members={members} editable={false} onSubmit={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
