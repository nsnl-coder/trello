import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChecklistProgressBadge } from "./ChecklistProgressBadge";

describe("ChecklistProgressBadge", () => {
  it("renders nothing when there are no items", () => {
    const { container } = render(
      <ChecklistProgressBadge progress={{ done: 0, total: 0 }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows done/total and an accessible label with percent width", () => {
    render(<ChecklistProgressBadge progress={{ done: 1, total: 4 }} />);
    expect(screen.getByText("1/4")).toBeInTheDocument();
    const wrap = screen.getByLabelText("Checklist 1/4");
    const fill = wrap.querySelector("[style]") as HTMLElement;
    expect(fill.style.width).toBe("25%");
  });
});
