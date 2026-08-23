import { describe, expect, it } from "vitest";
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
});
