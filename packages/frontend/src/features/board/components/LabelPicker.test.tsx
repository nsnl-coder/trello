import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Label } from "shared";

const h = vi.hoisted(() => ({
  queryData: {} as Record<string, unknown>,
  mutateCalls: {} as Record<string, unknown[]>,
  store: new Map<string, unknown>(),
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
  useMutation: (opts: { _mutationKey: string }) => ({
    mutate: (vars: unknown, runtime?: { onSuccess?: (d: unknown) => void }) => {
      (h.mutateCalls[opts._mutationKey] ??= []).push(vars);
      runtime?.onSuccess?.([]);
    },
    isPending: false,
    error: null,
  }),
  useQueryClient: () => ({
    invalidateQueries: () => {},
    setQueryData: (key: unknown[], updater: unknown) => {
      const k = key[0] as string;
      const prev = h.store.get(k);
      const next = typeof updater === "function" ? (updater as (p: unknown) => unknown)(prev) : updater;
      h.store.set(k, next);
    },
    getQueryData: (key: unknown[]) => h.store.get(key[0] as string),
  }),
}));

const { LabelPicker } = await import("./LabelPicker");

const bug: Label = { id: "l1", boardId: "b1", name: "Bug", color: "#eb5a46", createdAt: new Date(), updatedAt: new Date() };
const feat: Label = { id: "l2", boardId: "b1", name: "Feature", color: "#61bd4f", createdAt: new Date(), updatedAt: new Date() };

beforeEach(() => {
  h.queryData = { list: [bug, feat] };
  h.mutateCalls = {};
  h.store = new Map([["getData", { columns: [{ cards: [{ id: "k1", labels: [bug] }] }] }]]);
});

describe("LabelPicker", () => {
  it("attaches an unselected label", async () => {
    const u = userEvent.setup();
    render(<LabelPicker boardId="b1" cardId="k1" labels={[bug]} editable />);
    await u.click(screen.getByLabelText("toggle label Feature"));
    expect(h.mutateCalls.attach).toContainEqual({ cardId: "k1", labelId: "l2" });
  });

  it("detaches a selected label", async () => {
    const u = userEvent.setup();
    render(<LabelPicker boardId="b1" cardId="k1" labels={[bug]} editable />);
    await u.click(screen.getByLabelText("toggle label Bug"));
    expect(h.mutateCalls.detach).toContainEqual({ cardId: "k1", labelId: "l1" });
  });

  it("hides toggles for view-only", () => {
    render(<LabelPicker boardId="b1" cardId="k1" labels={[bug]} editable={false} />);
    expect(screen.queryByLabelText("toggle label Feature")).toBeNull();
  });
});
