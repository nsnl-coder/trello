import type { CardCover } from "shared";
import { COVER_COLOR_CLASS } from "../coverColors";

interface Props {
  cover: CardCover | null;
}

export function CardCoverStrip({ cover }: Props) {
  if (!cover) return null;
  if (cover.type === "color") {
    return <div className={`h-8 w-full rounded-t-lg ${COVER_COLOR_CLASS[cover.color]}`} />;
  }
  return (
    <img
      src={cover.downloadUrl}
      alt="Card cover"
      loading="lazy"
      className="h-20 w-full rounded-t-lg object-cover"
    />
  );
}
