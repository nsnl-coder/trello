import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Label } from "shared";

const h = vi.hoisted(() => ({
  queryData: {} as Record<string, unknown>,
  mutateCalls: {} as Record<string, unknown[]>,
}));

vi.mock("../../../lib/trpc", () => {
  const leaf = (path: string) => ({
    queryOptions: (input: unknown) => ({ queryKey: [path, input] }),
    queryKey: (input?: unknown) => [path, input],
    mutationOptions: (opts: Record<string, unknown> = {}) => ({ ...opts, _mutationKey: path }),
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
  useMutation: (opts: { _mutationKey: string; onSettled?: () => void }) => ({
    mutate: (vars: unknown) => {
      (h.mutateCalls[opts._mutationKey] ??= []).push(vars);
    },
    isPending: false,
    error: null,
  }),
  useQueryClient: () => ({ invalidateQueries: () => {} }),
}));

const { LabelManager } = await import("./LabelManager");

const labels: Label[] = [
  { id: "l1", boardId: "b1", name: "Bug", color: "#eb5a46", createdAt: new Date(), updatedAt: new Date() },
];

beforeEach(() => {
  h.queryData = { list: labels };
  h.mutateCalls = {};
});

describe("LabelManager", () => {
  it("creates a label", async () => {
    const u = userEvent.setup();
    render(<LabelManager boardId="b1" editable />);
    await u.type(screen.getByLabelText("new label name"), "Feature{Enter}");
    expect(h.mutateCalls.create?.[0]).toMatchObject({ boardId: "b1", name: "Feature" });
  });

  it("renames a label on blur", async () => {
    const u = userEvent.setup();
    render(<LabelManager boardId="b1" editable />);
    const input = screen.getByLabelText("name for Bug");
    await u.clear(input);
    await u.type(input, "Defect");
    await u.tab();
    expect(h.mutateCalls.update).toContainEqual({ id: "l1", name: "Defect" });
  });

  it("deletes a label", async () => {
    const u = userEvent.setup();
    render(<LabelManager boardId="b1" editable />);
    await u.click(screen.getByLabelText("delete label Bug"));
    expect(h.mutateCalls.delete).toContainEqual({ id: "l1" });
  });

  it("hides controls for view-only", () => {
    render(<LabelManager boardId="b1" editable={false} />);
    expect(screen.queryByLabelText("new label name")).toBeNull();
    expect(screen.queryByLabelText("delete label Bug")).toBeNull();
  });
});
