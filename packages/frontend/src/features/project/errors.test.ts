import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";
import { ProjectError } from "shared";
import { projectErrorMessage } from "./errors";

describe("projectErrorMessage", () => {
  it("maps every ProjectError code to copy", () => {
    for (const code of Object.values(ProjectError)) {
      const msg = projectErrorMessage(new TRPCClientError(code));
      expect(msg).not.toBe("Something went wrong. Please try again.");
    }
  });

  it("falls back for unknown errors", () => {
    expect(projectErrorMessage(new Error("boom"))).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
