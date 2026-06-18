import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TRPCClientError } from "@trpc/client";
import { ProjectError, type ProjectAccessEntry } from "shared";

const h = vi.hoisted(() => ({
  queryData: {} as Record<string, unknown>,
  mutateCalls: {} as Record<string, unknown[]>,
  mutationError: {} as Record<string, unknown>,
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

vi.mock("@tanstack/react-query", async (orig) => {
  const actual = await orig<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (opts: { queryKey: unknown[] }) => ({
      data: h.queryData[opts.queryKey[0] as string],
      isLoading: false,
      error: null,
    }),
    useMutation: (opts: { _mutationKey: string; onSuccess?: (r: unknown, v: unknown) => void }) => ({
      mutate: (vars: unknown, runtime?: { onSuccess?: (r: unknown, v: unknown) => void }) => {
        (h.mutateCalls[opts._mutationKey] ??= []).push(vars);
        opts.onSuccess?.(undefined, vars);
        runtime?.onSuccess?.(undefined, vars);
      },
      isPending: false,
      error: h.mutationError[opts._mutationKey] ?? null,
    }),
    useQueryClient: () => ({ invalidateQueries: () => {} }),
  };
});

const { AccessPanel } = await import("./AccessPanel");

const entries: ProjectAccessEntry[] = [
  { userId: "u2", email: "a@x.io", permission: "view" },
  { userId: "u3", email: "b@x.io", permission: "edit" },
];

beforeEach(() => {
  h.queryData = { accessList: entries };
  h.mutateCalls = {};
  h.mutationError = {};
});

describe("AccessPanel", () => {
  it("lists the current grants", () => {
    render(<AccessPanel projectId="p1" />);
    expect(screen.getByText("a@x.io")).toBeInTheDocument();
    expect(screen.getByText("b@x.io")).toBeInTheDocument();
  });

  it("grants access by email", async () => {
    const u = userEvent.setup();
    render(<AccessPanel projectId="p1" />);
    await u.type(screen.getByPlaceholderText("user@example.com"), "new@x.io");
    await u.click(screen.getByRole("button", { name: "Share" }));
    expect(h.mutateCalls.accessGrant).toEqual([
      { id: "p1", email: "new@x.io", permission: "view" },
    ]);
  });

  it("surfaces a CANNOT_GRANT_SELF error", () => {
    h.mutationError.accessGrant = new TRPCClientError(ProjectError.CANNOT_GRANT_SELF);
    render(<AccessPanel projectId="p1" />);
    expect(screen.getByText("You cannot grant access to yourself.")).toBeInTheDocument();
  });

  it("re-grants on a permission change", async () => {
    const u = userEvent.setup();
    render(<AccessPanel projectId="p1" />);
    await u.selectOptions(screen.getByLabelText("permission for a@x.io"), "edit");
    expect(h.mutateCalls.accessGrant).toContainEqual({
      id: "p1",
      email: "a@x.io",
      permission: "edit",
    });
  });

  it("revokes a grant", async () => {
    const u = userEvent.setup();
    render(<AccessPanel projectId="p1" />);
    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await u.click(removeButtons[0]);
    expect(h.mutateCalls.accessRevoke).toEqual([{ id: "p1", userId: "u2" }]);
  });
});
