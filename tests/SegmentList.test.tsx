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

    // Matched text is split across a <mark>, so the row is asserted as a whole.
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("listitem")).toHaveTextContent("Cómo estás");
  });

  it("highlights the matching run, ignoring case and accents", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SegmentList segments={SEGMENTS} mode="translated" searchPlaceholder="Buscar..." />,
    );

    await user.type(screen.getByPlaceholderText("Buscar..."), "COMO");

    const marks = [...container.querySelectorAll("mark")];
    expect(marks).toHaveLength(1);
    // The original accent survives: matching folds the text, the slice comes off the real string.
    expect(marks[0]).toHaveTextContent("Cómo");
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

  it("renders the timestamp seek buttons as disabled when no onSegmentClick is given", () => {
    render(<SegmentList segments={SEGMENTS} mode="translated" searchPlaceholder="Buscar..." />);

    expect(screen.getByRole("button", { name: "Saltar a 00:00" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saltar a 00:01" })).toBeDisabled();
  });

  it("seeks from the timestamp button, so the line is reachable by keyboard", async () => {
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

    await user.click(screen.getByRole("button", { name: "Saltar a 00:01" }));

    expect(onSegmentClick).toHaveBeenCalledExactlyOnceWith(SEGMENTS[1]);
  });

  it("does not seek when the click ends a text selection, so quotes can be copied", async () => {
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

    // Stubbed rather than driven through a real drag: jsdom does not model selection well enough
    // for a synthesised mouse drag to leave text selected.
    const selection = vi.spyOn(window, "getSelection");
    selection.mockReturnValue({ toString: () => "Cómo est" } as Selection);

    await user.click(screen.getByText("Cómo estás"));

    expect(onSegmentClick).not.toHaveBeenCalled();
    selection.mockRestore();
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
