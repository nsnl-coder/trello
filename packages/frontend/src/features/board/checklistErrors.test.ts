import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";
import { ChecklistError } from "shared";
import { checklistErrorMessage } from "./checklistErrors";

describe("checklistErrorMessage", () => {
  it("maps every ChecklistError code to copy", () => {
    for (const code of Object.values(ChecklistError)) {
      const msg = checklistErrorMessage(new TRPCClientError(code));
      expect(msg).not.toBe("Something went wrong. Please try again.");
    }
  });

  it("falls back for unknown errors", () => {
    expect(checklistErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
