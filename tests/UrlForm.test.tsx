import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UrlForm from "../src/components/UrlForm";

describe("UrlForm", () => {
  it("shows a Spanish validation message for a non-YouTube URL, without calling onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UrlForm lang="en" onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText(/paste a youtube url/i), "not-a-url");
    await user.click(screen.getByRole("button", { name: /transcribe/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Paste a link to a YouTube video.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("accepts real-world YouTube URL shapes (playlist param before v=, m.youtube.com, Shorts)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const urls = [
      "https://www.youtube.com/watch?list=PLxyz&v=dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ];

    for (const url of urls) {
      onSubmit.mockClear();
      const { unmount } = render(<UrlForm lang="en" onSubmit={onSubmit} />);
      await user.type(screen.getByPlaceholderText(/paste a youtube url/i), url);
      await user.click(screen.getByRole("button", { name: /transcribe/i }));
      expect(onSubmit).toHaveBeenCalledWith(url, "es");
      unmount();
    }
  });

  it("trims whitespace before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UrlForm lang="en" onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText(/paste a youtube url/i), "  https://youtu.be/dQw4w9WgXcQ  ");
    await user.click(screen.getByRole("button", { name: /transcribe/i }));

    expect(onSubmit).toHaveBeenCalledWith("https://youtu.be/dQw4w9WgXcQ", "es");
  });

  it("does not call onSubmit when disabled, preventing a double submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<UrlForm lang="en" onSubmit={onSubmit} disabled />);

    const submitButton = screen.getByRole("button", { name: /working/i });
    expect(submitButton).toBeDisabled();
    await user.click(submitButton);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
