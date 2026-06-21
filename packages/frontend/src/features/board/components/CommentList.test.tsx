import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BoardData, CommentThread } from "shared";

const h = vi.hoisted(() => ({
  queryData: {} as Record<string, unknown>,
  mutateCalls: {} as Record<string, unknown[]>,
  store: new Map<string, unknown>(),
  failCreate: false,
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
    mutate: (vars: unknown, runtime?: { onSuccess?: () => void; onError?: () => void }) => {
      (h.mutateCalls[opts._mutationKey] ??= []).push(vars);
      if (opts._mutationKey === "create" && h.failCreate) runtime?.onError?.();
      else runtime?.onSuccess?.();
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

const { CommentList } = await import("./CommentList");

function makeThreads(): CommentThread[] {
  const base = {
    cardId: "k1",
    authorId: "u1",
    parentId: null,
    author: { id: "u1", name: "bob", avatar: null },
    mentions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return [
    {
      ...base,
      id: "cm1",
      body: "top level",
      replies: [{ ...base, id: "cm2", parentId: "cm1", body: "a reply" }],
    },
  ];
}

function boardData(): BoardData {
  return { columns: [{ cards: [{ id: "k1", commentCount: 1 }] }] } as unknown as BoardData;
}

beforeEach(() => {
  h.queryData = { list: makeThreads() };
  h.mutateCalls = {};
  h.store = new Map([["getData", boardData()]]);
  h.failCreate = false;
});

function renderList() {
  return render(
    <CommentList
      boardId="b1"
      cardId="k1"
      editable
      members={[]}
      currentUserId="u1"
      isOwner={false}
    />,
  );
}

describe("CommentList", () => {
  it("renders top-level comments and threaded replies", () => {
    renderList();
    expect(screen.getByText("top level")).toBeInTheDocument();
    expect(screen.getByText("a reply")).toBeInTheDocument();
  });

  it("creating a comment optimistically bumps the card comment count", async () => {
    const u = userEvent.setup();
    renderList();
    const boxes = screen.getAllByLabelText("comment body");
    await u.type(boxes[0], "new one");
    await u.click(screen.getAllByRole("button", { name: "Comment" })[0]);
    expect(h.mutateCalls.create).toContainEqual({ cardId: "k1", body: "new one" });
    const data = h.store.get("getData") as BoardData;
    expect(data.columns[0].cards[0].commentCount).toBe(2);
  });

  it("replying passes parentId", async () => {
    const u = userEvent.setup();
    renderList();
    await u.click(screen.getByLabelText("reply"));
    const reply = screen.getByPlaceholderText("Write a reply...");
    await u.type(reply, "my reply");
    await u.click(screen.getByRole("button", { name: "Reply" }));
    expect(h.mutateCalls.create).toContainEqual({ cardId: "k1", body: "my reply", parentId: "cm1" });
  });

  it("rolls back the count when create fails", async () => {
    h.failCreate = true;
    const u = userEvent.setup();
    renderList();
    const boxes = screen.getAllByLabelText("comment body");
    await u.type(boxes[0], "boom");
    await u.click(screen.getAllByRole("button", { name: "Comment" })[0]);
    const data = h.store.get("getData") as BoardData;
    expect(data.columns[0].cards[0].commentCount).toBe(1);
  });
});
