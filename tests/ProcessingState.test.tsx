import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProcessingState from "../src/components/ProcessingState";

describe("ProcessingState", () => {
  it("marks steps before the current stage as done, the current one as active, and the rest as pending", () => {
    render(<ProcessingState stage="TRANSCRIBING" />);

    expect(screen.getByText("Validando URL").closest("li")).toHaveAttribute("data-state", "done");
    expect(screen.getByText("Obteniendo información").closest("li")).toHaveAttribute("data-state", "done");
    expect(screen.getByText("Transcribiendo audio").closest("li")).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Traduciendo contenido").closest("li")).toHaveAttribute("data-state", "pending");
    expect(screen.getByText("Preparando resultado").closest("li")).toHaveAttribute("data-state", "pending");
  });

  it("treats a null stage as nothing started yet", () => {
    render(<ProcessingState stage={null} />);

    screen.getAllByRole("listitem").forEach((item) => expect(item).toHaveAttribute("data-state", "pending"));
  });

  it("warns that transcribing the audio is the slow path, since it has no captions to read", () => {
    render(<ProcessingState stage="TRANSCRIBING" />);

    expect(screen.getByText(/puede tardar varios minutos/i)).toBeInTheDocument();
  });

  it("keeps the ordinary note on every other stage", () => {
    render(<ProcessingState stage="TRANSLATING" />);

    expect(screen.queryByText(/puede tardar varios minutos/i)).not.toBeInTheDocument();
    expect(screen.getByText(/puedes dejar la pestaña abierta/i)).toBeInTheDocument();
  });

  it("shows an elapsed timer so a long run doesn't look stuck", () => {
    render(<ProcessingState stage="TRANSCRIBING" />);

    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("offers a way out only when the caller can actually cancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { rerender } = render(<ProcessingState stage="TRANSCRIBING" />);
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();

    rerender(<ProcessingState stage="TRANSCRIBING" onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
