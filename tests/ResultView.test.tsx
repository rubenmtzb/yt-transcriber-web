import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultView from "../src/components/ResultView";
import type { TranscriptionResponseDto } from "../src/types/api";

const { renderQuoteCard, downloadBlob } = vi.hoisted(() => ({
  renderQuoteCard: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock("../src/components/VideoPlayer", () => ({ default: () => null }));
vi.mock("../src/lib/quoteCard", () => ({ renderQuoteCard }));
vi.mock("../src/lib/segments", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/lib/segments")>(),
  downloadBlob,
}));

const result: TranscriptionResponseDto = {
  video: { id: "abcdefghijk", title: "Demo", durationSeconds: 10 },
  sourceLanguage: "en",
  targetLanguage: "es",
  segments: [{ sequence: 0, startMs: 0, endMs: 1000, sourceText: "Hello", translatedText: "Hola" }],
};

// Rendered in Spanish on purpose: this is the one place a whole view is exercised end to end, so
// running it in the non-default language is what would catch a string that reads the dictionary
// but was never handed the language -- including the downloaded file's own name.
describe("ResultView quote export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("renders a quote only on demand and preserves the selected dual mode", async () => {
    const user = userEvent.setup();
    const blob = new Blob(["image"], { type: "image/png" });
    renderQuoteCard.mockResolvedValue(blob);
    render(<ResultView lang="es" result={result} onReset={vi.fn()} />);
    expect(renderQuoteCard).not.toHaveBeenCalled();

    await user.click(screen.getByRole("tab", { name: "Vista dual" }));
    await user.click(screen.getByRole("button", { name: "Descargar esta línea como imagen" }));

    await waitFor(() => expect(downloadBlob).toHaveBeenCalledWith(blob, "cita-abcdefghijk-0.png"));
    expect(renderQuoteCard).toHaveBeenCalledWith({
      segment: result.segments[0],
      videoTitle: "Demo",
      mode: "dual",
    });
    expect(screen.getByRole("status")).toHaveTextContent("Imagen descargada");
  });

  it("reports an export failure without claiming a download succeeded", async () => {
    const user = userEvent.setup();
    renderQuoteCard.mockRejectedValue(new Error("Canvas unavailable"));
    render(<ResultView lang="es" result={result} onReset={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Descargar esta línea como imagen" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No se pudo generar la imagen"));
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
