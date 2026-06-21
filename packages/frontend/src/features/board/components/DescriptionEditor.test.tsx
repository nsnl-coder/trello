import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CARD_DESCRIPTION_MAX } from "shared";
import { DescriptionEditor } from "./DescriptionEditor";

function Harness({ editable, initial = "" }: { editable: boolean; initial?: string }) {
  const [value, setValue] = useState(initial);
  return <DescriptionEditor value={value} onChange={setValue} editable={editable} />;
}

describe("DescriptionEditor", () => {
  it("Write/Preview toggle swaps textarea <-> rendered markdown", async () => {
    const u = userEvent.setup();
    render(<Harness editable initial="**bold**" />);
    expect(screen.getByLabelText("description")).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.queryByLabelText("description")).toBeNull();
    expect(document.querySelector("strong")?.textContent).toBe("bold");
  });

  it("typing in Write updates the preview", async () => {
    const u = userEvent.setup();
    render(<Harness editable />);
    await u.type(screen.getByLabelText("description"), "# Title");
    await u.click(screen.getByRole("button", { name: "Preview" }));
    expect(document.querySelector("h1")?.textContent).toBe("Title");
  });

  it("read-only mode shows rendered markdown and no textarea/toggle", () => {
    render(<DescriptionEditor value="**hi**" onChange={() => {}} editable={false} />);
    expect(screen.queryByLabelText("description")).toBeNull();
    expect(screen.queryByRole("button", { name: "Write" })).toBeNull();
    expect(document.querySelector("strong")?.textContent).toBe("hi");
  });

  it("enforces maxLength on the textarea", () => {
    render(<Harness editable />);
    expect(screen.getByLabelText("description")).toHaveAttribute(
      "maxlength",
      String(CARD_DESCRIPTION_MAX),
    );
  });
});
