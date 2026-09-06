import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import UsagePanel, { formatCountdown } from "../src/components/UsagePanel";
import type { UsageSnapshotDto } from "../src/types/api";

const FULL: UsageSnapshotDto = {
  requestsRemaining: 3,
  maxRequestsPerHour: 3,
  requestsResetInSeconds: null,
  audioMinutesRemaining: 60,
  maxAudioMinutesPerHour: 60,
  audioMinutesResetInSeconds: null,
  maxVideoDurationSeconds: 1200,
};

afterEach(() => vi.useRealTimers());

describe("formatCountdown", () => {
  it("reads as minutes for anything over a minute, rounded up so it never undersells the wait", () => {
    expect(formatCountdown(2400)).toBe("in 40 min");
    expect(formatCountdown(61)).toBe("in 2 min");
  });

  it("drops to seconds for the last minute", () => {
    expect(formatCountdown(45)).toBe("in 45 s");
  });

  it("splits hours out once past 60 minutes", () => {
    expect(formatCountdown(3600)).toBe("in 1 h 0 min");
  });

  it("says 'now' rather than a negative wait", () => {
    expect(formatCountdown(0)).toBe("now");
    expect(formatCountdown(-5)).toBe("now");
  });
});

describe("UsagePanel", () => {
  it("shows what is left of each budget and the per-video cap", () => {
    render(<UsagePanel lang="en" usage={FULL} onExpired={vi.fn()} />);

    expect(screen.getByText("Transcriptions")).toBeInTheDocument();
    expect(screen.getByLabelText("3 of 3 this hour left")).toBeInTheDocument();
    expect(screen.getByLabelText("60 of 60 min left")).toBeInTheDocument();
    expect(screen.getByText(/Up to 20 min per video/)).toBeInTheDocument();
  });

  it("says nothing is pending when no usage has been recorded", () => {
    render(<UsagePanel lang="en" usage={FULL} onExpired={vi.fn()} />);

    expect(screen.getAllByText("Nothing used in the last hour")).toHaveLength(2);
  });

  it("counts the reset down locally between refreshes", () => {
    vi.useFakeTimers();
    render(
      <UsagePanel lang="en"         usage={{ ...FULL, requestsRemaining: 1, requestsResetInSeconds: 125 }}
        onExpired={vi.fn()}
      />,
    );

    expect(screen.getByText("Back in 3 min")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.getByText("Back in 2 min")).toBeInTheDocument();
  });

  it("asks for fresh numbers instead of assuming the slot came back", () => {
    vi.useFakeTimers();
    const onExpired = vi.fn();
    render(<UsagePanel lang="en" usage={{ ...FULL, requestsRemaining: 0, requestsResetInSeconds: 3 }} onExpired={onExpired} />);

    expect(onExpired).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(3000));
    expect(onExpired).toHaveBeenCalled();
  });

  it("warns instead of inviting a new run once the budget is gone", () => {
    render(<UsagePanel lang="en" usage={{ ...FULL, requestsRemaining: 0, requestsResetInSeconds: 600 }} onExpired={vi.fn()} />);

    expect(screen.getByText(/You have used up this hour/)).toBeInTheDocument();
    expect(screen.getByLabelText("Remaining usage")).toHaveAttribute("data-exhausted", "true");
  });
});
