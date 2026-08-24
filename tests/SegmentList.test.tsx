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
  it("renders every segment's timestamp and text for the given field", () => {
    render(<SegmentList segments={SEGMENTS} field="translatedText" searchPlaceholder="Buscar..." />);

    expect(screen.getByText("Hola a todos")).toBeInTheDocument();
    expect(screen.getByText("Cómo estás")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("filters to matching segments as the user types, case-insensitively", async () => {
    const user = userEvent.setup();
    render(<SegmentList segments={SEGMENTS} field="translatedText" searchPlaceholder="Buscar..." />);

    await user.type(screen.getByPlaceholderText("Buscar..."), "COMO");

    expect(screen.getByText("Cómo estás")).toBeInTheDocument();
    expect(screen.queryByText("Hola a todos")).not.toBeInTheDocument();
  });

  it("shows an empty-state message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<SegmentList segments={SEGMENTS} field="translatedText" searchPlaceholder="Buscar..." />);

    await user.type(screen.getByPlaceholderText("Buscar..."), "xyzxyz");

    expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
  });

  it("calls onSegmentClick with the clicked segment", async () => {
    const user = userEvent.setup();
    const onSegmentClick = vi.fn();
    render(
      <SegmentList
        segments={SEGMENTS}
        field="translatedText"
        searchPlaceholder="Buscar..."
        onSegmentClick={onSegmentClick}
      />,
    );

    await user.click(screen.getByText("Cómo estás"));

    expect(onSegmentClick).toHaveBeenCalledExactlyOnceWith(SEGMENTS[1]);
  });

  it("renders rows as disabled, non-clickable buttons when no onSegmentClick is given", () => {
    render(<SegmentList segments={SEGMENTS} field="translatedText" searchPlaceholder="Buscar..." />);

    screen.getAllByRole("button").forEach((button) => expect(button).toBeDisabled());
  });
});
