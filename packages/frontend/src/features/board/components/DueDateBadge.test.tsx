import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DueDateBadge } from "./DueDateBadge";

describe("DueDateBadge", () => {
  it("renders nothing without a due date", () => {
    const { container } = render(<DueDateBadge card={{ dueAt: null, isOverdue: false }} />);
    expect(container.firstChild).toBeNull();
  });

  it("uses overdue styling", () => {
    render(<DueDateBadge card={{ dueAt: new Date(Date.now() - 1000), isOverdue: true }} />);
    expect(screen.getByText(/.+/, { selector: "[data-due-state]" })).toHaveAttribute(
      "data-due-state",
      "overdue",
    );
  });

  it("uses soon styling within a day", () => {
    render(
      <DueDateBadge card={{ dueAt: new Date(Date.now() + 3600 * 1000), isOverdue: false }} />,
    );
    expect(screen.getByText(/.+/, { selector: "[data-due-state]" })).toHaveAttribute(
      "data-due-state",
      "soon",
    );
  });

  it("uses upcoming styling far out", () => {
    render(
      <DueDateBadge
        card={{ dueAt: new Date(Date.now() + 5 * 24 * 3600 * 1000), isOverdue: false }}
      />,
    );
    expect(screen.getByText(/.+/, { selector: "[data-due-state]" })).toHaveAttribute(
      "data-due-state",
      "upcoming",
    );
  });
});
