import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
