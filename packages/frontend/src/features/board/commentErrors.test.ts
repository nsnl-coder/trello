import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";
import { CommentError } from "shared";
import { commentErrorMessage } from "./commentErrors";

describe("commentErrorMessage", () => {
  it("maps every CommentError code to copy", () => {
    for (const code of Object.values(CommentError)) {
      const msg = commentErrorMessage(new TRPCClientError(code));
      expect(msg).not.toBe("Something went wrong. Please try again.");
    }
  });

  it("falls back for unknown errors", () => {
    expect(commentErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
