import type { AnalyticsInput, BoardSummary, CycleTime } from "shared";
import { cache, cacheKeys } from "../../cache/cache.js";
import { ANALYTICS_TTL_SEC } from "../../config/const.config.js";
import type { CtxUser } from "../board/board.service.js";
import { loadBoardFor } from "../board/board.service.js";
import * as repo from "./analytics.repo.js";
import type { Db } from "./analytics.repo.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Cached payload: the summary plus the cycle-time sample size (so both the
// boardSummary and cycleTime procedures share one Redis entry).
interface Computed {
  summary: BoardSummary;
  sampleSize: number;
}

async function load(db: Db, boardId: string): Promise<Computed> {
  const key = cacheKeys.analytics(boardId);
  const cached = await cache.getJson<Computed>(key);
  if (cached) return cached;
  const computed = await compute(db, boardId);
  await cache.setJson(key, computed, ANALYTICS_TTL_SEC);
  return computed;
}

async function compute(db: Db, boardId: string): Promise<Computed> {
  const now = Date.now();
  const [columns, cards, moved] = await Promise.all([
    repo.listColumns(db, boardId),
    repo.listCards(db, boardId),
    repo.listCardMoved(db, boardId),
  ]);

  // "Done" = rightmost (highest-position) non-archived column.
  const doneColumn = columns.length ? columns[columns.length - 1] : null;
  const doneName = doneColumn?.name ?? null;
  const doneId = doneColumn?.id ?? null;

  const counts = new Map<string, number>(columns.map((c) => [c.id, 0]));
  for (const c of cards) counts.set(c.column_id, (counts.get(c.column_id) ?? 0) + 1);
  const cardsPerColumn = columns.map((col) => ({
    columnId: col.id,
    columnName: col.name,
    count: counts.get(col.id) ?? 0,
  }));

  const overdueCount = cards.filter(
    (c) => c.due_at != null && c.due_at.getTime() < now && c.column_id !== doneId,
  ).length;

  // Earliest time each card entered the Done column (activity-derived).
  const doneAt = new Map<string, number>();
  if (doneName) {
    for (const m of moved) {
      if (!m.card_id) continue;
      const to = (m.meta as { toColumn?: string }).toColumn;
      if (to !== doneName) continue;
      const ts = m.created_at.getTime();
      const prev = doneAt.get(m.card_id);
      if (prev == null || ts < prev) doneAt.set(m.card_id, ts);
    }
  }

  const cut7 = now - 7 * DAY_MS;
  const cut30 = now - 30 * DAY_MS;
  let completedLast7 = 0;
  let completedLast30 = 0;
  for (const ts of doneAt.values()) {
    if (ts >= cut7) completedLast7++;
    if (ts >= cut30) completedLast30++;
  }

  // Cycle time = created_at -> first Done entry. Cards created directly in Done
  // (no positive diff) are excluded from the average.
  const createdAt = new Map(cards.map((c) => [c.id, c.created_at.getTime()]));
  let sum = 0;
  let n = 0;
  for (const [cardId, ts] of doneAt) {
    const created = createdAt.get(cardId);
    if (created == null) continue;
    const diff = ts - created;
    if (diff <= 0) continue;
    sum += diff;
    n += 1;
  }
  const avgCycleTimeMs = n > 0 ? Math.round(sum / n) : null;
  const avgCycleTimeDays =
    avgCycleTimeMs == null ? null : Math.round((avgCycleTimeMs / DAY_MS) * 10) / 10;

  return {
    summary: {
      totalCards: cards.length,
      overdueCount,
      completedLast7,
      completedLast30,
      cardsPerColumn,
      avgCycleTimeMs,
      avgCycleTimeDays,
    },
    sampleSize: n,
  };
}

export async function boardSummary(
  db: Db,
  user: CtxUser,
  input: AnalyticsInput,
): Promise<BoardSummary> {
  await loadBoardFor(db, user, input.boardId, "view");
  return (await load(db, input.boardId)).summary;
}

export async function cycleTime(
  db: Db,
  user: CtxUser,
  input: AnalyticsInput,
): Promise<CycleTime> {
  await loadBoardFor(db, user, input.boardId, "view");
  const { summary, sampleSize } = await load(db, input.boardId);
  return {
    avgMs: summary.avgCycleTimeMs,
    avgDays: summary.avgCycleTimeDays,
    sampleSize,
  };
}
