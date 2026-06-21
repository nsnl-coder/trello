import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";
import { LabelError } from "shared";
import { labelErrorMessage } from "./labelErrors";

describe("labelErrorMessage", () => {
  it("maps every LabelError code to copy", () => {
    for (const code of Object.values(LabelError)) {
      const msg = labelErrorMessage(new TRPCClientError(code));
      expect(msg).not.toBe("Something went wrong. Please try again.");
    }
  });

  it("falls back for unknown errors", () => {
    expect(labelErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
