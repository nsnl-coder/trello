import { describe, it, expect } from "vitest";
import { TRPCClientError } from "@trpc/client";
import { CardCoverError } from "shared";
import { cardCoverErrorMessage } from "./cardCoverErrors";

describe("cardCoverErrorMessage", () => {
  it("maps every CardCoverError code to a non-empty string", () => {
    for (const code of Object.values(CardCoverError)) {
      expect(cardCoverErrorMessage(code).length).toBeGreaterThan(0);
      expect(cardCoverErrorMessage(code)).not.toBe("Something went wrong. Please try again.");
    }
  });

  it("falls back for an unknown code", () => {
    expect(cardCoverErrorMessage("NOPE")).toBe("Something went wrong. Please try again.");
    expect(cardCoverErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });

  it("accepts a TRPCClientError (reads .message)", () => {
    const err = new TRPCClientError(CardCoverError.COVER_CONFLICT);
    expect(cardCoverErrorMessage(err)).toBe("Choose either a color or an image, not both.");
  });
});
