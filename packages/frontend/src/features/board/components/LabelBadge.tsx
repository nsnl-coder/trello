import type { Label } from "shared";

interface Props {
  label: Label;
  compact?: boolean;
}

// Colored chip. When compact, renders a small dot; otherwise the name.
export function LabelBadge({ label, compact }: Props) {
  if (compact) {
    return (
      <span
        aria-label={label.name || "label"}
        title={label.name}
        style={{ backgroundColor: label.color }}
        className="inline-block h-2 w-8 rounded-full"
      />
    );
  }
  return (
    <span
      style={{ backgroundColor: label.color }}
      className="inline-flex max-w-full items-center truncate rounded px-2 py-0.5 text-xs font-medium text-white"
    >
      {label.name || " "}
    </span>
  );
}
