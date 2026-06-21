import { COVER_COLORS, type CoverColor } from "shared";

// Single source of truth: palette key -> Tailwind bg class for swatches,
// banners and tile strips.
export const COVER_COLOR_CLASS: Record<CoverColor, string> = {
  slate: "bg-slate-400",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-400",
  green: "bg-green-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  pink: "bg-pink-500",
};

export const coverColorList: readonly CoverColor[] = COVER_COLORS;
