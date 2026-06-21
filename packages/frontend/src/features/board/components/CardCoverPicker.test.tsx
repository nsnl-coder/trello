import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Attachment, CardCover } from "shared";

const h = vi.hoisted(() => ({
  mutateCalls: [] as unknown[],
  mutationError: null as unknown,
  store: new Map<string, unknown>(),
  errorCb: undefined as ((e?: unknown) => void) | undefined,
}));

vi.mock("../../../lib/trpc", () => {
  const leaf = (path: string) => ({
    queryKey: (input?: unknown) => [path, input],
    mutationOptions: (opts: Record<string, unknown> = {}) => ({ ...opts, _mutationKey: path }),
  });
  const proxy = new Proxy({}, { get: () => new Proxy({}, { get: (_t, ep: string) => leaf(ep) }) });
  return { useTRPC: () => proxy };
});

vi.mock("@tanstack/react-query", () => ({
  useMutation: (opts: { _mutationKey: string }) => ({
    mutate: (vars: unknown, cbs?: { onError?: (e?: unknown) => void }) => {
      h.mutateCalls.push(vars);
      if (h.mutationError && cbs?.onError) cbs.onError(h.mutationError);
    },
    isPending: false,
    error: h.mutationError,
  }),
  useQueryClient: () => ({
    setQueryData: (key: unknown[], updater: unknown) => {
      const k = key[0] as string;
      const prev = h.store.get(k);
      const next =
        typeof updater === "function" ? (updater as (p: unknown) => unknown)(prev) : updater;
      h.store.set(k, next);
    },
    getQueryData: (key: unknown[]) => h.store.get(key[0] as string),
  }),
}));

const { CardCoverPicker } = await import("./CardCoverPicker");

function img(over: Partial<Attachment> = {}): Attachment {
  return {
    id: "a1",
    cardId: "k1",
    filename: "pic.png",
    mimeType: "image/png",
    sizeBytes: 100,
    uploaderId: "u1",
    downloadUrl: "/api/attachments/a1/download",
    createdAt: new Date(),
    ...over,
  } as Attachment;
}

function cardWithCover(cover: CardCover | null) {
  return { columns: [{ cards: [{ id: "k1", cover }] }] };
}

beforeEach(() => {
  h.mutateCalls = [];
  h.mutationError = null;
  h.store = new Map([["getData", cardWithCover(null)]]);
});

function activeCover() {
  const data = h.store.get("getData") as ReturnType<typeof cardWithCover>;
  return data.columns[0].cards[0].cover;
}

describe("CardCoverPicker", () => {
  it("clicking a color swatch calls update with coverColor + optimistically patches", async () => {
    const u = userEvent.setup();
    render(<CardCoverPicker boardId="b1" cardId="k1" cover={null} attachments={[]} editable />);
    await u.click(screen.getByLabelText("cover color red"));
    expect(h.mutateCalls).toContainEqual({ id: "k1", coverColor: "red" });
    expect(activeCover()).toEqual({ type: "color", color: "red" });
  });

  it("clicking an image thumb calls update with coverAttachmentId", async () => {
    const u = userEvent.setup();
    render(
      <CardCoverPicker boardId="b1" cardId="k1" cover={null} attachments={[img()]} editable />,
    );
    await u.click(screen.getByLabelText("cover image pic.png"));
    expect(h.mutateCalls).toContainEqual({ id: "k1", coverAttachmentId: "a1" });
    expect(activeCover()).toEqual({
      type: "image",
      attachmentId: "a1",
      downloadUrl: "/api/attachments/a1/download",
    });
  });

  it("Remove cover sends coverColor: null", async () => {
    const u = userEvent.setup();
    h.store = new Map([["getData", cardWithCover({ type: "color", color: "red" })]]);
    render(
      <CardCoverPicker
        boardId="b1"
        cardId="k1"
        cover={{ type: "color", color: "red" }}
        attachments={[]}
        editable
      />,
    );
    await u.click(screen.getByLabelText("remove cover"));
    expect(h.mutateCalls).toContainEqual({ id: "k1", coverColor: null });
    expect(activeCover()).toBeNull();
  });

  it("rolls back the optimistic cover on server error", async () => {
    const u = userEvent.setup();
    h.mutationError = { message: "COVER_NOT_IMAGE" };
    render(<CardCoverPicker boardId="b1" cardId="k1" cover={null} attachments={[]} editable />);
    await u.click(screen.getByLabelText("cover color blue"));
    expect(activeCover()).toBeNull();
  });

  it("hidden when not editable", () => {
    const { container } = render(
      <CardCoverPicker
        boardId="b1"
        cardId="k1"
        cover={null}
        attachments={[img()]}
        editable={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows empty-image hint when no image attachments", () => {
    render(<CardCoverPicker boardId="b1" cardId="k1" cover={null} attachments={[]} editable />);
    expect(
      screen.getByText("Upload an image attachment to use it as a cover."),
    ).toBeInTheDocument();
  });
});
