import type { CardCover } from "shared";
import { COVER_COLOR_CLASS } from "../coverColors";

interface Props {
  cover: CardCover | null;
}

export function CardCoverBanner({ cover }: Props) {
  if (!cover) return null;
  if (cover.type === "color") {
    return <div className={`mb-3 h-12 w-full rounded-lg ${COVER_COLOR_CLASS[cover.color]}`} />;
  }
  return (
    <img
      src={cover.downloadUrl}
      alt="Card cover"
      loading="lazy"
      className="mb-3 h-32 w-full rounded-lg object-cover"
    />
  );
}
