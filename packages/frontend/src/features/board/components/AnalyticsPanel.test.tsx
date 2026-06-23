import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BoardSummary } from "shared";

const h = vi.hoisted(() => ({
  data: undefined as BoardSummary | undefined,
  isLoading: false,
}));

vi.mock("../../../lib/trpc", () => {
  const leaf = (path: string) => ({
    queryOptions: (input: unknown) => ({ queryKey: [path, input] }),
  });
  const proxy = new Proxy({}, { get: () => new Proxy({}, { get: (_t, ep: string) => leaf(ep) }) });
  return { useTRPC: () => proxy };
});

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: h.data, isLoading: h.isLoading, error: null }),
}));

const { AnalyticsPanel } = await import("./AnalyticsPanel");

beforeEach(() => {
  h.data = undefined;
  h.isLoading = false;
});

const summary: BoardSummary = {
  totalCards: 5,
  overdueCount: 2,
  completedLast7: 1,
  completedLast30: 3,
  cardsPerColumn: [
    { columnId: "c1", columnName: "Todo", count: 3 },
    { columnId: "c2", columnName: "Done", count: 2 },
  ],
  avgCycleTimeMs: 8 * 24 * 60 * 60 * 1000,
  avgCycleTimeDays: 8,
};

describe("AnalyticsPanel", () => {
  it("renders stats and per-column bars", () => {
    h.data = summary;
    render(<AnalyticsPanel boardId="b1" />);
    expect(screen.getByText("Total cards")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8d")).toBeInTheDocument();
    expect(screen.getByText("Todo")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("shows a dash when cycle time is null", () => {
    h.data = { ...summary, avgCycleTimeMs: null, avgCycleTimeDays: null };
    render(<AnalyticsPanel boardId="b1" />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    h.isLoading = true;
    render(<AnalyticsPanel boardId="b1" />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
