import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LanguageSelect from "../src/components/LanguageSelect";

describe("LanguageSelect", () => {
  it("shows the selected language and keeps the list closed until asked", () => {
    render(<LanguageSelect value="en" onChange={vi.fn()} />);

    expect(screen.getByRole("combobox")).toHaveTextContent("English");
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens on click and reports the selected option to assistive tech", async () => {
    const user = userEvent.setup();
    render(<LanguageSelect value="es" onChange={vi.fn()} />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.getAllByRole("option")).toHaveLength(7);
    expect(screen.getByRole("option", { name: /Español/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /English/ })).toHaveAttribute("aria-selected", "false");
  });

  it("reports the chosen language when an option is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LanguageSelect value="es" onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /Français/ }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("fr");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("can be driven entirely from the keyboard", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LanguageSelect value="es" onChange={onChange} />);

    const trigger = screen.getByRole("combobox");
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{ArrowDown}{ArrowDown}");
    // The highlight is tracked with aria-activedescendant; focus never leaves the trigger.
    expect(trigger).toHaveAttribute("aria-activedescendant", expect.stringContaining("option-fr"));
    expect(trigger).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("fr");
  });

  it("closes on Escape without choosing anything, and hands focus back", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LanguageSelect value="es" onChange={onChange} />);

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    await user.keyboard("{ArrowDown}{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("closes when a press lands outside it", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LanguageSelect value="es" onChange={vi.fn()} />
        <button type="button">fuera</button>
      </div>,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("button", { name: "fuera" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("names itself with the visible field label, not just the current value", () => {
    render(
      <div>
        <span id="lbl">Traducir a</span>
        <LanguageSelect id="lang" labelId="lbl" value="es" onChange={vi.fn()} />
      </div>,
    );

    expect(screen.getByRole("combobox", { name: "Traducir a Español" })).toBeInTheDocument();
  });

  it("cannot be opened while disabled", async () => {
    const user = userEvent.setup();
    render(<LanguageSelect value="es" onChange={vi.fn()} disabled />);

    await user.click(screen.getByRole("combobox"));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
