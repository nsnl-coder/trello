import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CardCoverStrip } from "./CardCoverStrip";

describe("CardCoverStrip", () => {
  it("renders nothing for a null cover", () => {
    const { container } = render(<CardCoverStrip cover={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the mapped color class for a color cover", () => {
    const { container } = render(<CardCoverStrip cover={{ type: "color", color: "red" }} />);
    expect(container.querySelector(".bg-red-500")).not.toBeNull();
  });

  it("renders an img with the downloadUrl for an image cover", () => {
    const { container } = render(
      <CardCoverStrip
        cover={{ type: "image", attachmentId: "a1", downloadUrl: "/api/attachments/a1/download" }}
      />,
    );
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/api/attachments/a1/download");
  });
});
