import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownView } from "./MarkdownView";

describe("MarkdownView", () => {
  it("renders **bold** as <strong>", () => {
    const { container } = render(<MarkdownView source="**bold**" />);
    expect(container.querySelector("strong")?.textContent).toBe("bold");
  });

  it("renders a gfm table", () => {
    const md = "| a | b |\n| - | - |\n| 1 | 2 |";
    const { container } = render(<MarkdownView source={md} />);
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelectorAll("td").length).toBe(2);
  });

  it("renders a gfm task list", () => {
    const { container } = render(<MarkdownView source={"- [x] done\n- [ ] todo"} />);
    const boxes = container.querySelectorAll('input[type="checkbox"]');
    expect(boxes.length).toBe(2);
  });

  it("drops a javascript: href (XSS)", () => {
    const { container } = render(<MarkdownView source="[click](javascript:alert(1))" />);
    const a = container.querySelector("a");
    const href = a?.getAttribute("href") ?? "";
    expect(href.startsWith("javascript:")).toBe(false);
  });

  it("does not render raw <script> as an executable element", () => {
    const { container } = render(
      <MarkdownView source={"hello <script>alert(1)</script> world"} />,
    );
    // skipHtml strips the raw HTML so it is never parsed into a <script> node.
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("hello");
    expect(container.textContent).toContain("world");
  });

  it("hardens external links with rel + target", () => {
    render(<MarkdownView source="[site](https://example.com)" />);
    const a = screen.getByRole("link");
    expect(a.getAttribute("target")).toBe("_blank");
    expect(a.getAttribute("rel")).toBe("noopener noreferrer nofollow");
  });

  it("shows a placeholder for empty source", () => {
    render(<MarkdownView source="   " />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });
});
