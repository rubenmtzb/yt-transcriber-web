import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProcessingState from "../src/components/ProcessingState";

describe("ProcessingState", () => {
  it("marks steps before the current stage as done, the current one as active, and the rest as pending", () => {
    render(<ProcessingState lang="en" stage="TRANSCRIBING" />);

    expect(screen.getByText("Checking the URL").closest("li")).toHaveAttribute("data-state", "done");
    expect(screen.getByText("Fetching video details").closest("li")).toHaveAttribute("data-state", "done");
    expect(screen.getByText("Transcribing the audio").closest("li")).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Translating").closest("li")).toHaveAttribute("data-state", "pending");
    expect(screen.getByText("Preparing the result").closest("li")).toHaveAttribute("data-state", "pending");
  });

  it("treats a null stage as nothing started yet", () => {
    render(<ProcessingState lang="en" stage={null} />);

    screen.getAllByRole("listitem").forEach((item) => expect(item).toHaveAttribute("data-state", "pending"));
  });

  it("warns that transcribing the audio is the slow path, since it has no captions to read", () => {
    render(<ProcessingState lang="en" stage="TRANSCRIBING" />);

    expect(screen.getByText(/can take several minutes/i)).toBeInTheDocument();
  });

  it("keeps the ordinary note on every other stage", () => {
    render(<ProcessingState lang="en" stage="TRANSLATING" />);

    expect(screen.queryByText(/can take several minutes/i)).not.toBeInTheDocument();
    expect(screen.getByText(/you can leave this tab open/i)).toBeInTheDocument();
  });

  it("shows an elapsed timer so a long run doesn't look stuck", () => {
    render(<ProcessingState lang="en" stage="TRANSCRIBING" />);

    expect(screen.getByText("0:00")).toBeInTheDocument();
  });

  it("offers a way out only when the caller can actually cancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { rerender } = render(<ProcessingState lang="en" stage="TRANSCRIBING" />);
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();

    rerender(<ProcessingState lang="en" stage="TRANSCRIBING" onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
