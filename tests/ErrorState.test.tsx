import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorState from "../src/components/ErrorState";
import type { ErrorCode } from "../src/types/api";

const ALL_CODES: ErrorCode[] = [
  "INVALID_REQUEST",
  "UNSUPPORTED_SOURCE",
  "VIDEO_TOO_LONG",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "TRANSLATION_QUOTA_EXCEEDED",
  "INTERNAL_ERROR",
];

describe("ErrorState", () => {
  it.each(ALL_CODES)("renders a non-empty title, description and action for %s", (code) => {
    render(<ErrorState code={code} onDismiss={() => {}} />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent?.trim().length).toBeGreaterThan(0);
    expect(screen.getByRole("button").textContent?.trim().length).toBeGreaterThan(0);
  });

  it("never leaks the raw backend error code as user-facing text", () => {
    render(<ErrorState code="PROVIDER_UNAVAILABLE" onDismiss={() => {}} />);

    expect(screen.queryByText("PROVIDER_UNAVAILABLE")).not.toBeInTheDocument();
  });

  it("calls onDismiss when the action button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorState code="VIDEO_TOO_LONG" onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button"));

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
