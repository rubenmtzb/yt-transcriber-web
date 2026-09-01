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
    expect(formatCountdown(2400)).toBe("en 40 min");
    expect(formatCountdown(61)).toBe("en 2 min");
  });

  it("drops to seconds for the last minute", () => {
    expect(formatCountdown(45)).toBe("en 45 s");
  });

  it("splits hours out once past 60 minutes", () => {
    expect(formatCountdown(3600)).toBe("en 1 h 0 min");
  });

  it("says 'ya' rather than a negative wait", () => {
    expect(formatCountdown(0)).toBe("ya");
    expect(formatCountdown(-5)).toBe("ya");
  });
});

describe("UsagePanel", () => {
  it("shows what is left of each budget and the per-video cap", () => {
    render(<UsagePanel usage={FULL} onExpired={vi.fn()} />);

    expect(screen.getByText("Transcripciones")).toBeInTheDocument();
    expect(screen.getByLabelText("3 de 3 esta hora disponibles")).toBeInTheDocument();
    expect(screen.getByLabelText("60 de 60 min disponibles")).toBeInTheDocument();
    expect(screen.getByText(/Máximo 20 min por vídeo/)).toBeInTheDocument();
  });

  it("says nothing is pending when no usage has been recorded", () => {
    render(<UsagePanel usage={FULL} onExpired={vi.fn()} />);

    expect(screen.getAllByText("Sin consumo en la última hora")).toHaveLength(2);
  });

  it("counts the reset down locally between refreshes", () => {
    vi.useFakeTimers();
    render(
      <UsagePanel
        usage={{ ...FULL, requestsRemaining: 1, requestsResetInSeconds: 125 }}
        onExpired={vi.fn()}
      />,
    );

    expect(screen.getByText("Se recupera en 3 min")).toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.getByText("Se recupera en 2 min")).toBeInTheDocument();
  });

  it("asks for fresh numbers instead of assuming the slot came back", () => {
    vi.useFakeTimers();
    const onExpired = vi.fn();
    render(<UsagePanel usage={{ ...FULL, requestsRemaining: 0, requestsResetInSeconds: 3 }} onExpired={onExpired} />);

    expect(onExpired).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(3000));
    expect(onExpired).toHaveBeenCalled();
  });

  it("warns instead of inviting a new run once the budget is gone", () => {
    render(<UsagePanel usage={{ ...FULL, requestsRemaining: 0, requestsResetInSeconds: 600 }} onExpired={vi.fn()} />);

    expect(screen.getByText(/Has agotado el cupo de esta hora/)).toBeInTheDocument();
    expect(screen.getByLabelText("Uso disponible")).toHaveAttribute("data-exhausted", "true");
  });
});
