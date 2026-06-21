import { Readable } from "node:stream";
import { ProjectPermission } from "shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as attachmentRepo from "../../attachment/attachment.repo.js";
import { createAttachment, deleteAttachment } from "../../attachment/attachment.service.js";
import { fakeStorage, type FakeStorage } from "../../attachment/test/helpers.js";
import { deleteCard } from "../card.service.js";
import {
  authedCaller,
  newTestDb,
  seedBoard,
  seedBoardAccess,
  seedColumn,
  seedProject,
  seedUser,
  seedUserCaller,
  type TestDb,
} from "./helpers.js";

const ctx = (id: string) => ({ id, isSuperuser: false });

async function ownerSetup(db: TestDb) {
  const { user, caller } = await seedUserCaller(db, "owner@example.com");
  const project = await seedProject(db, { ownerId: user.id });
  const board = await seedBoard(db, { projectId: project.id, ownerId: user.id });
  const column = await seedColumn(db, { boardId: board.id, position: 1 });
  return { user, caller, project, board, column };
}

async function seedAttachment(
  db: TestDb,
  storage: FakeStorage,
  userId: string,
  cardId: string,
  opts: { filename?: string; mimeType?: string } = {},
) {
  return createAttachment(db, storage, ctx(userId), {
    cardId,
    filename: opts.filename ?? "a.png",
    mimeType: opts.mimeType ?? "image/png",
    stream: Readable.from(Buffer.from("x")),
  });
}

async function coverColumn(db: TestDb, cardId: string) {
  const row = await db
    .selectFrom("cards")
    .select(["cover_color", "cover_attachment_id"])
    .where("id", "=", cardId)
    .executeTakeFirstOrThrow();
  return row;
}

describe("card cover", () => {
  let db: TestDb;

  beforeEach(async () => {
    db = await newTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  describe("set cover color", () => {
    it("sets a valid palette color", async () => {
      const { caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const res = await caller.cards.update({ id: card.id, coverColor: "blue" });
      expect(res.cover).toEqual({ type: "color", color: "blue" });
      expect((await coverColumn(db, card.id)).cover_attachment_id).toBeNull();
    });

    it("rejects an invalid color at the router (zod)", async () => {
      const { caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      await expect(
        caller.cards.update({ id: card.id, coverColor: "fuchsia" as any }),
      ).rejects.toThrow();
    });

    it("setting a color clears an existing image cover", async () => {
      const { user, caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, card.id);
      await caller.cards.update({ id: card.id, coverAttachmentId: att.id });
      const res = await caller.cards.update({ id: card.id, coverColor: "red" });
      expect(res.cover).toEqual({ type: "color", color: "red" });
      expect((await coverColumn(db, card.id)).cover_attachment_id).toBeNull();
    });
  });

  describe("set cover image", () => {
    it("sets an image attachment on this card", async () => {
      const { user, caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, card.id);
      const res = await caller.cards.update({ id: card.id, coverAttachmentId: att.id });
      expect(res.cover).toEqual({
        type: "image",
        attachmentId: att.id,
        downloadUrl: `/api/attachments/${att.id}/download`,
      });
      expect((await coverColumn(db, card.id)).cover_color).toBeNull();
    });

    it("rejects an attachment on a DIFFERENT card -> COVER_ATTACHMENT_NOT_FOUND", async () => {
      const { user, caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const other = await caller.cards.create({ columnId: column.id, title: "B" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, other.id);
      await expect(
        caller.cards.update({ id: card.id, coverAttachmentId: att.id }),
      ).rejects.toThrow("COVER_ATTACHMENT_NOT_FOUND");
      expect(await coverColumn(db, card.id)).toEqual({
        cover_color: null,
        cover_attachment_id: null,
      });
    });

    it("rejects a non-existent attachment id -> COVER_ATTACHMENT_NOT_FOUND", async () => {
      const { caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      await expect(
        caller.cards.update({
          id: card.id,
          coverAttachmentId: "00000000-0000-0000-0000-000000000000",
        }),
      ).rejects.toThrow("COVER_ATTACHMENT_NOT_FOUND");
    });

    it("rejects a non-image attachment -> COVER_NOT_IMAGE", async () => {
      const { user, caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, card.id, {
        filename: "doc.pdf",
        mimeType: "application/pdf",
      });
      await expect(
        caller.cards.update({ id: card.id, coverAttachmentId: att.id }),
      ).rejects.toThrow("COVER_NOT_IMAGE");
      expect(await coverColumn(db, card.id)).toEqual({
        cover_color: null,
        cover_attachment_id: null,
      });
    });

    it("setting an image clears an existing color cover", async () => {
      const { user, caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      await caller.cards.update({ id: card.id, coverColor: "green" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, card.id);
      const res = await caller.cards.update({ id: card.id, coverAttachmentId: att.id });
      expect(res.cover?.type).toBe("image");
      expect((await coverColumn(db, card.id)).cover_color).toBeNull();
    });
  });

  describe("conflict + clear", () => {
    it("setting both color and image -> COVER_CONFLICT (cover unchanged)", async () => {
      const { user, caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, card.id);
      await expect(
        caller.cards.update({ id: card.id, coverColor: "blue", coverAttachmentId: att.id }),
      ).rejects.toThrow("COVER_CONFLICT");
      expect(await coverColumn(db, card.id)).toEqual({
        cover_color: null,
        cover_attachment_id: null,
      });
    });

    it("coverColor: null clears a color cover", async () => {
      const { caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      await caller.cards.update({ id: card.id, coverColor: "blue" });
      const res = await caller.cards.update({ id: card.id, coverColor: null });
      expect(res.cover).toBeNull();
    });

    it("coverAttachmentId: null clears an image cover", async () => {
      const { user, caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, card.id);
      await caller.cards.update({ id: card.id, coverAttachmentId: att.id });
      const res = await caller.cards.update({ id: card.id, coverAttachmentId: null });
      expect(res.cover).toBeNull();
    });

    it("a patch omitting cover fields leaves the cover untouched", async () => {
      const { caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      await caller.cards.update({ id: card.id, coverColor: "teal" });
      const res = await caller.cards.update({ id: card.id, title: "renamed" });
      expect(res.cover).toEqual({ type: "color", color: "teal" });
    });
  });

  describe("permission", () => {
    it("view-only member cannot set a cover -> FORBIDDEN/CARD_NOT_FOUND", async () => {
      const { user, column, board } = await ownerSetup(db);
      const card = await authedCaller(db, user.id).cards.create({
        columnId: column.id,
        title: "A",
      });
      const viewer = await seedUser(db, { email: "viewer@example.com", verified: true });
      await seedBoardAccess(db, board.id, viewer.id, ProjectPermission.View);
      const viewerCaller = authedCaller(db, viewer.id);
      await expect(
        viewerCaller.cards.update({ id: card.id, coverColor: "blue" }),
      ).rejects.toThrow();
    });

    it("a card on a board the caller cannot view -> CARD_NOT_FOUND", async () => {
      const { user, column } = await ownerSetup(db);
      const card = await authedCaller(db, user.id).cards.create({
        columnId: column.id,
        title: "A",
      });
      const stranger = await seedUser(db, { email: "stranger@example.com", verified: true });
      await expect(
        authedCaller(db, stranger.id).cards.update({ id: card.id, coverColor: "blue" }),
      ).rejects.toThrow("CARD_NOT_FOUND");
    });
  });

  describe("cover cleared on attachment delete", () => {
    it("deleting the cover attachment nulls cover_attachment_id and cover", async () => {
      const { user, caller, column, board } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, card.id);
      await caller.cards.update({ id: card.id, coverAttachmentId: att.id });

      await deleteAttachment(db, storage, ctx(user.id), { id: att.id });

      expect((await coverColumn(db, card.id)).cover_attachment_id).toBeNull();
      const data = await caller.boards.getData({ id: board.id });
      expect(data.columns[0].cards.find((c) => c.id === card.id)?.cover).toBeNull();
    });

    it("deleting the card cascades attachments with no error", async () => {
      const { user, caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, card.id);
      await caller.cards.update({ id: card.id, coverAttachmentId: att.id });
      await expect(deleteCard(db, storage, ctx(user.id), card.id)).resolves.toEqual({
        ok: true,
      });
    });
  });

  describe("enrichment / no N+1", () => {
    it("getData returns each card's cover (color + image)", async () => {
      const { user, caller, column, board } = await ownerSetup(db);
      const c1 = await caller.cards.create({ columnId: column.id, title: "color" });
      const c2 = await caller.cards.create({ columnId: column.id, title: "image" });
      await caller.cards.update({ id: c1.id, coverColor: "violet" });
      const storage = fakeStorage();
      const att = await seedAttachment(db, storage, user.id, c2.id);
      await caller.cards.update({ id: c2.id, coverAttachmentId: att.id });

      const data = await caller.boards.getData({ id: board.id });
      const cards = data.columns[0].cards;
      expect(cards.find((c) => c.id === c1.id)?.cover).toEqual({
        type: "color",
        color: "violet",
      });
      expect(cards.find((c) => c.id === c2.id)?.cover?.type).toBe("image");
    });

    it("image covers resolve via ONE batched findByIds query", async () => {
      const { user, caller, column, board } = await ownerSetup(db);
      const storage = fakeStorage();
      for (let i = 0; i < 3; i++) {
        const c = await caller.cards.create({ columnId: column.id, title: `c${i}` });
        const att = await seedAttachment(db, storage, user.id, c.id, {
          filename: `a${i}.png`,
        });
        await caller.cards.update({ id: c.id, coverAttachmentId: att.id });
      }
      const spy = vi.spyOn(attachmentRepo, "findByIds");
      await caller.boards.getData({ id: board.id });
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it("color-only covers add zero attachment queries (empty-guard)", async () => {
      const { caller, column, board } = await ownerSetup(db);
      const c = await caller.cards.create({ columnId: column.id, title: "c" });
      await caller.cards.update({ id: c.id, coverColor: "amber" });
      const spy = vi.spyOn(attachmentRepo, "findByIds");
      await caller.boards.getData({ id: board.id });
      // findByIds is called with an empty list -> short-circuits, but assert no
      // attachment row is ever fetched (called once with []).
      expect(spy.mock.calls.every((c2) => (c2[1] as string[]).length === 0)).toBe(true);
      spy.mockRestore();
    });
  });

  describe("description is markdown (backend no-op)", () => {
    it("stores and returns raw Markdown verbatim", async () => {
      const { caller, column } = await ownerSetup(db);
      const card = await caller.cards.create({ columnId: column.id, title: "A" });
      const md = "# Title\n**bold**";
      const res = await caller.cards.update({ id: card.id, description: md });
      expect(res.description).toBe(md);
    });
  });
});
