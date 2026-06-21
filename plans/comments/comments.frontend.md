# Comments + Mentions — Frontend Plan

Depends on backend `comments` router, card payload `commentCount`, and shared
mention-parsing helper. Mirror `features/board` patterns; optimistic comment
add/edit/delete.

## 1. Feature scaffold (`features/board`)
- [x] `types.ts` — re-export `Comment`, `CommentThread` from `shared`.
- [x] `errors.ts` — `commentErrorMessage(code)` mapping `CommentError`.
- [x] `utils.ts` — `renderMentions(body, members)` -> highlight `@name`;
  `relativeTime(date)`.

## 2. Components (`features/board/components`)
- [x] `CommentCountBadge.tsx` — count icon on `CardTile` (hidden when 0).
- [x] `CommentList.tsx` — inside `CardEditor`: render threads (top-level +
  replies), newest-first; loading/empty states.
- [x] `CommentItem.tsx` — author, time, body with highlighted mentions; edit
  (author) and delete (author/owner) affordances; reply button.
- [x] `CommentComposer.tsx` — textarea with `@` autocomplete from board
  members; submit creates comment (with `parentId` when replying).
- [x] `CardTile.tsx` — render `CommentCountBadge`.
- [x] `CardEditor.tsx` — embed `CommentList` + `CommentComposer`.

## 3. Pages
- [x] `BoardDetailPage.tsx` — card opens editor that loads `comments.list`;
  `commentCount` shown on tiles from `boards.getData`.

## 4. Tests (vitest, mock trpc)
- [x] `CommentComposer.test.tsx` — submit calls `comments.create`; reply
  passes `parentId`; `@` autocomplete suggests board members.
- [x] `CommentItem.test.tsx` — edit only for author; delete for author/owner;
  mentions highlighted.
- [x] `CommentList` renders threaded replies under parents.
- [x] optimistic add/edit/delete update cache; rollback on error.
- [x] `commentErrorMessage` covers every code.

## 5. Verify
- [x] `pnpm --filter frontend test` green
- [x] `pnpm --filter frontend build` clean
- [x] manual: comment, reply, @mention a member, edit/delete, count updates.
