# Comments + Mentions — Backend Plan

Threaded comments on a card (one level of nesting via `parent_id`). `@mention`
a board member -> they get an email (reuse `features/email`; in-app
notifications future). Permission via the card chain
(`card.column_id -> column.board_id`): board `view` to read/comment, author or
board `owner` to delete; edit only by author.

Mirror `features/card` patterns.

## API endpoints
- [x] `GET /comments?cardId=` — list a card's comments (threaded) (board `view`)
- [x] `POST /comments` — create `{cardId, body, parentId?}` (board `view`)
- [x] `PATCH /comments/{id}` — edit own comment body (author only)
- [x] `DELETE /comments/{id}` — delete (author or board `owner`)

## 1. Database (migrations + db types)
- [x] `migrations/009.comment.ts` — `comments` table: `id uuid pk`,
  `card_id uuid fk cards.id cascade`, `author_id uuid fk users.id cascade`,
  `parent_id uuid fk comments.id cascade null`, `body text notnull`,
  `created_at/updated_at timestamptz default now()`. Indexes on `card_id`,
  `parent_id`.
- [x] same migration — `comment_mentions` table:
  `comment_id uuid fk comments.id cascade`,
  `user_id uuid fk users.id cascade`, pk `(comment_id, user_id)`,
  index on `user_id`.
- [x] `db/types.ts` — add `CommentsTable`, `CommentMentionsTable`; register in
  `Database`.
- [x] migration spec — up creates tables+indexes; down drops; deleting a card
  cascades comments -> mentions; deleting a parent cascades replies.

## 2. Shared schemas + errors (`packages/shared`)
- [x] `src/comment.schema.ts` — constants (`COMMENT_BODY_MAX`);
  `createCommentInput` (cardId, body, parentId?), `updateCommentInput` (body),
  `listCommentsInput` (cardId); outputs `commentSchema` (id, cardId, authorId,
  parentId, body, author {id,name,avatar?}, mentions [{id,name}], timestamps),
  `commentThreadSchema` (top-level comment + `replies[]`).
- [x] `src/card.schema.ts` — extend card payload with `commentCount`.
- [x] `src/errors/comment.error.ts` — `CommentError`: `FORBIDDEN`,
  `COMMENT_NOT_FOUND`, `CARD_NOT_FOUND`, `PARENT_NOT_FOUND`,
  `PARENT_NOT_TOP_LEVEL` (no nested replies), `NOT_AUTHOR`.
- [x] `src/index.ts` — export new schema + error modules.
- [x] mention parsing helper in `shared` (extract `@token`s) reused by FE/BE.

## 3. Comment feature (`features/comment`)
- [x] `comment.repo.ts` — `createComment`, `findCommentById`,
  `listByCard` (with author + mentions, ordered), `updateComment`,
  `deleteComment`, `insertMentions`, `countByCards(cardIds[])` for getData;
  `findBoardMembersByName/email` to resolve mentions.
- [x] `comment.service.ts` — resolve board via card chain; `view` to list/
  create, author for edit, author-or-owner for delete; validate `parentId`
  belongs to same card and is top-level; resolve mentions to board members
  (ignore non-members); build threaded output.
- [x] mention notifications — on create, email each mentioned member via
  `features/email` (card link, snippet); never email the author.
- [x] `comment.router.ts` — `list`, `create`, `update`, `delete` with OpenAPI
  meta; register `commentsRouter` as `comments`.
- [x] `features/board` getData — include card `commentCount` (batch, no N+1).

## 4. Tests (pg-mem, mirror `features/card/test`)
- [x] create top-level comment (board view); no access -> NOT_FOUND.
- [x] reply with `parentId`; reply to a reply -> PARENT_NOT_TOP_LEVEL.
- [x] parent on a different card -> PARENT_NOT_FOUND.
- [x] edit own comment ok; editing another's -> NOT_AUTHOR.
- [x] delete: author ok; board owner ok; other member -> FORBIDDEN.
- [x] list returns threaded structure with author + mentions.
- [x] mentions resolve only to board members; non-members ignored.
- [x] mention email sent to mentioned members, not the author (email mocked).
- [x] delete card cascades comments + mentions; delete parent cascades replies.
- [x] `commentCount` in card payload (batch, no N+1).
- [x] migration up/down + cascade specs.

## 5. Verify
- [x] `pnpm --filter shared build`
- [x] `pnpm --filter backend test` green (email mocked)
- [x] Swagger shows `/comments` routes.
