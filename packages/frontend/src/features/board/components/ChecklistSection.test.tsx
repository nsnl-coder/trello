import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DragEndEvent } from "@dnd-kit/core";
import type { Checklist } from "shared";

const h = vi.hoisted(() => ({
  queryData: {} as Record<string, unknown>,
  queryError: {} as Record<string, unknown>,
  mutateCalls: {} as Record<string, unknown[]>,
  store: new Map<string, unknown>(),
  dragEnd: null as ((e: DragEndEvent) => void) | null,
}));

vi.mock("../../../lib/trpc", () => {
  const leaf = (path: string) => ({
    queryOptions: (input: unknown) => ({ queryKey: [path, input] }),
    queryKey: (input?: unknown) => [path, input],
    mutationOptions: (opts: Record<string, unknown> = {}) => ({ ...opts, _mutationKey: path }),
  });
  const proxy = new Proxy(
    {},
    { get: () => new Proxy({}, { get: (_t, ep: string) => leaf(ep) }) },
  );
  return { useTRPC: () => proxy };
});

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: unknown;
    onDragEnd: (e: DragEndEvent) => void;
  }) => {
    h.dragEnd = onDragEnd;
    return children as never;
  },
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}));
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: unknown }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}));
vi.mock("@dnd-kit/utilities", () => ({ CSS: { Translate: { toString: () => undefined } } }));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey: unknown[] }) => ({
    data: h.queryData[opts.queryKey[0] as string],
    isLoading: false,
    error: h.queryError[opts.queryKey[0] as string] ?? null,
  }),
  useMutation: (opts: { _mutationKey: string; onSettled?: () => void }) => ({
    mutate: (vars: unknown, runtime?: { onSettled?: () => void }) => {
      (h.mutateCalls[opts._mutationKey] ??= []).push(vars);
      opts.onSettled?.();
      runtime?.onSettled?.();
    },
    isPending: false,
    error: null,
  }),
  useQueryClient: () => ({
    invalidateQueries: () => {},
    setQueryData: (key: unknown[], updater: unknown) => {
      const k = key[0] as string;
      const prev = h.store.get(k);
      const next =
        typeof updater === "function" ? (updater as (p: unknown) => unknown)(prev) : updater;
      h.store.set(k, next);
      h.queryData[k] = next;
    },
    getQueryData: (key: unknown[]) => h.store.get(key[0] as string),
  }),
}));

const { ChecklistSection } = await import("./ChecklistSection");

function makeChecklists(): Checklist[] {
  return [
    {
      id: "cl1",
      cardId: "card1",
      title: "Steps",
      position: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [
        {
          id: "i1",
          checklistId: "cl1",
          text: "First",
          isDone: false,
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "i2",
          checklistId: "cl1",
          text: "Second",
          isDone: false,
          position: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
  ];
}

beforeEach(() => {
  const data = makeChecklists();
  h.queryData = { listByCard: data };
  h.queryError = {};
  h.mutateCalls = {};
  h.store = new Map([["listByCard", data]]);
  h.dragEnd = null;
});

describe("ChecklistSection", () => {
  it("adds a checklist via the input", async () => {
    const u = userEvent.setup();
    render(<ChecklistSection cardId="card1" editable />);
    await u.type(screen.getByLabelText("add checklist"), "Groceries{Enter}");
    expect(h.mutateCalls.create).toContainEqual({ cardId: "card1", title: "Groceries" });
  });

  it("deletes a checklist", async () => {
    const u = userEvent.setup();
    render(<ChecklistSection cardId="card1" editable />);
    await u.click(screen.getByLabelText("delete checklist Steps"));
    expect(h.mutateCalls.delete).toContainEqual({ id: "cl1" });
  });

  it("adds an item to a checklist", async () => {
    const u = userEvent.setup();
    render(<ChecklistSection cardId="card1" editable />);
    await u.type(screen.getByLabelText("add item"), "Third{Enter}");
    expect(h.mutateCalls.create).toContainEqual({ checklistId: "cl1", text: "Third" });
  });

  it("toggling an item calls update with isDone and optimistically reflects progress", async () => {
    const u = userEvent.setup();
    render(<ChecklistSection cardId="card1" editable />);
    await u.click(screen.getByLabelText("toggle First"));
    expect(h.mutateCalls.update).toContainEqual({ id: "i1", isDone: true });
    const data = h.store.get("listByCard") as Checklist[];
    expect(data[0].items.find((i) => i.id === "i1")?.isDone).toBe(true);
  });

  it("renames an item text", async () => {
    const u = userEvent.setup();
    render(<ChecklistSection cardId="card1" editable />);
    await u.click(screen.getByText("First"));
    const input = screen.getByLabelText("item text");
    await u.clear(input);
    await u.type(input, "First!{Enter}");
    expect(h.mutateCalls.update).toContainEqual({ id: "i1", text: "First!" });
  });

  it("deletes an item", async () => {
    const u = userEvent.setup();
    render(<ChecklistSection cardId="card1" editable />);
    await u.click(screen.getByLabelText("delete Second"));
    expect(h.mutateCalls.delete).toContainEqual({ id: "i2" });
  });

  it("reordering an item calls checklistItems.move with neighbour ids", () => {
    render(<ChecklistSection cardId="card1" editable />);
    h.dragEnd!({
      active: { id: "i2", data: { current: { type: "checklist-item" } } },
      over: { id: "i1" },
    } as unknown as DragEndEvent);
    expect(h.mutateCalls.move).toContainEqual({ id: "i2", beforeId: "i1" });
  });

  it("hides all controls for view-only users", () => {
    render(<ChecklistSection cardId="card1" editable={false} />);
    expect(screen.queryByLabelText("add checklist")).toBeNull();
    expect(screen.queryByLabelText("add item")).toBeNull();
    expect(screen.queryByLabelText("delete checklist Steps")).toBeNull();
    expect(screen.getByLabelText("toggle First")).toBeDisabled();
  });
});
