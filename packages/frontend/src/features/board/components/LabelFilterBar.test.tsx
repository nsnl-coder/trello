import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Label } from "shared";

const h = vi.hoisted(() => ({ queryData: {} as Record<string, unknown> }));

vi.mock("../../../lib/trpc", () => {
  const leaf = (path: string) => ({
    queryOptions: (input: unknown) => ({ queryKey: [path, input] }),
    queryKey: (input?: unknown) => [path, input],
  });
  const proxy = new Proxy({}, { get: () => new Proxy({}, { get: (_t, ep: string) => leaf(ep) }) });
  return { useTRPC: () => proxy };
});

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: unknown[] }) => ({
    data: h.queryData[opts.queryKey[0] as string],
    isLoading: false,
    error: null,
  }),
}));

const { LabelFilterBar } = await import("./LabelFilterBar");

const labels: Label[] = [
  { id: "l1", boardId: "b1", name: "Bug", color: "#eb5a46", createdAt: new Date(), updatedAt: new Date() },
  { id: "l2", boardId: "b1", name: "Feature", color: "#61bd4f", createdAt: new Date(), updatedAt: new Date() },
];

beforeEach(() => {
  h.queryData = { list: labels };
});

describe("LabelFilterBar", () => {
  it("selecting a label calls onChange with its id", async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    render(<LabelFilterBar boardId="b1" selected={[]} onChange={onChange} />);
    await u.click(screen.getByLabelText("filter Bug"));
    expect(onChange).toHaveBeenCalledWith(["l1"]);
  });

  it("clear resets selection", async () => {
    const u = userEvent.setup();
    const onChange = vi.fn();
    render(<LabelFilterBar boardId="b1" selected={["l1"]} onChange={onChange} />);
    await u.click(screen.getByLabelText("clear label filter"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("renders nothing when there are no labels", () => {
    h.queryData = { list: [] };
    const { container } = render(<LabelFilterBar boardId="b1" selected={[]} onChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
