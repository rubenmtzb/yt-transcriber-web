import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SegmentList from "../src/components/SegmentList";
import type { SegmentDto } from "../src/types/api";

const SEGMENTS: SegmentDto[] = [
  { sequence: 0, startMs: 0, endMs: 1000, sourceText: "Hello everybody", translatedText: "Hola a todos" },
  { sequence: 1, startMs: 1000, endMs: 2000, sourceText: "How are you", translatedText: "Cómo estás" },
];

describe("SegmentList", () => {
  it("renders every segment's timestamp and text for the given mode", () => {
    render(<SegmentList segments={SEGMENTS} mode="translated" searchPlaceholder="Buscar..." />);

    expect(screen.getByText("Hola a todos")).toBeInTheDocument();
    expect(screen.getByText("Cómo estás")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("filters to matching segments as the user types, case-insensitively", async () => {
    const user = userEvent.setup();
    render(<SegmentList segments={SEGMENTS} mode="translated" searchPlaceholder="Buscar..." />);

    await user.type(screen.getByPlaceholderText("Buscar..."), "COMO");

    expect(screen.getByText("Cómo estás")).toBeInTheDocument();
    expect(screen.queryByText("Hola a todos")).not.toBeInTheDocument();
  });

  it("shows an empty-state message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<SegmentList segments={SEGMENTS} mode="translated" searchPlaceholder="Buscar..." />);

    await user.type(screen.getByPlaceholderText("Buscar..."), "xyzxyz");

    expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
  });

  it("calls onSegmentClick with the clicked segment", async () => {
    const user = userEvent.setup();
    const onSegmentClick = vi.fn();
    render(
      <SegmentList
        segments={SEGMENTS}
        mode="translated"
        searchPlaceholder="Buscar..."
        onSegmentClick={onSegmentClick}
      />,
    );

    await user.click(screen.getByText("Cómo estás"));

    expect(onSegmentClick).toHaveBeenCalledExactlyOnceWith(SEGMENTS[1]);
  });

  it("renders the seek buttons as disabled, non-clickable when no onSegmentClick is given", () => {
    render(<SegmentList segments={SEGMENTS} mode="translated" searchPlaceholder="Buscar..." />);

    expect(screen.getByText("Hola a todos").closest("button")).toBeDisabled();
    expect(screen.getByText("Cómo estás").closest("button")).toBeDisabled();
  });

  it("marks the segment matching activeSequence as the current one", () => {
    render(
      <SegmentList segments={SEGMENTS} mode="translated" searchPlaceholder="Buscar..." activeSequence={1} />,
    );

    expect(screen.getByText("Cómo estás").closest("li")).toHaveAttribute("data-active", "true");
    expect(screen.getByText("Hola a todos").closest("li")).toHaveAttribute("data-active", "false");
  });

  it("marks no row as active when nothing is playing", () => {
    render(
      <SegmentList segments={SEGMENTS} mode="translated" searchPlaceholder="Buscar..." activeSequence={null} />,
    );

    expect(document.querySelector('[data-active="true"]')).toBeNull();
  });
});
