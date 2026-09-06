import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  defaultLang,
  getLangFromPath,
  getRouteKeyFromPath,
  langCodes,
  routes,
  translatePath,
} from "../src/i18n/config";
import { ui, useTranslations } from "../src/i18n/ui";
import ErrorState from "../src/components/ErrorState";
import ProcessingState from "../src/components/ProcessingState";

describe("dictionaries", () => {
  it("carries the same keys in every language", () => {
    // The type system already refuses a missing key, but nothing stops a stray extra one on the
    // Spanish side, which then looks translated and is never read.
    const reference = Object.keys(ui[defaultLang]).sort();
    for (const lang of langCodes) {
      expect(Object.keys(ui[lang]).sort(), `keys for ${lang}`).toEqual(reference);
    }
  });

  it("has no blank string in any language", () => {
    for (const lang of langCodes) {
      for (const [key, value] of Object.entries(ui[lang])) {
        expect(value.trim(), `${lang}.${key}`).not.toBe("");
      }
    }
  });

  it("keeps the same placeholders on both sides of a translation", () => {
    // A placeholder dropped in translation is a number that silently stops being shown; one
    // invented is a literal "{n}" on the page.
    const placeholders = (value: string) => (value.match(/\{(\w+)\}/g) ?? []).sort();
    for (const key of Object.keys(ui.en) as (keyof typeof ui.en)[]) {
      expect(placeholders(ui.es[key]), `placeholders for ${key}`).toEqual(placeholders(ui.en[key]));
    }
  });
});

describe("translate", () => {
  it("fills placeholders and leaves an unknown one alone", () => {
    const t = useTranslations("en");

    expect(t("result.lines", { count: 42 })).toBe("42 lines");
    expect(t("usage.when.hours", { h: 1 })).toContain("{m}");
  });

  it("answers in the requested language", () => {
    expect(useTranslations("es")("result.tab.dual")).toBe("Vista dual");
    expect(useTranslations("en")("result.tab.dual")).toBe("Dual view");
  });
});

describe("routing", () => {
  it("reads the language off the path, defaulting to the unprefixed one", () => {
    expect(getLangFromPath("/")).toBe("en");
    expect(getLangFromPath("/how-it-works/")).toBe("en");
    expect(getLangFromPath("/es/")).toBe("es");
    expect(getLangFromPath("/es/como-funciona/")).toBe("es");
  });

  it("moves between the two versions of the same page, in both directions", () => {
    for (const key of Object.keys(routes) as (keyof typeof routes)[]) {
      expect(translatePath(routes[key].en, "es")).toBe(routes[key].es);
      expect(translatePath(routes[key].es, "en")).toBe(routes[key].en);
    }
  });

  it("falls back to the home page for a path with no counterpart", () => {
    // A 404 has no equivalent to switch to, and a dead language switch on the page someone
    // already got lost on is the worst place for one.
    expect(getRouteKeyFromPath("/nope/")).toBeNull();
    expect(translatePath("/nope/", "es")).toBe(routes.home.es);
  });

  it("matches a path whether or not it carries a trailing slash", () => {
    expect(getRouteKeyFromPath("/privacy")).toBe("privacy");
    expect(getRouteKeyFromPath("/privacy/")).toBe("privacy");
  });
});

describe("components follow the language they are given", () => {
  it("renders an error in Spanish when asked to", () => {
    render(<ErrorState lang="es" code="VIDEO_TOO_LONG" onDismiss={vi.fn()} />);

    expect(screen.getByText("Vídeo demasiado largo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir otro vídeo" })).toBeInTheDocument();
  });

  it("renders the progress steps in Spanish when asked to", () => {
    render(<ProcessingState lang="es" stage="TRANSCRIBING" />);

    expect(screen.getByText("Transcribiendo audio")).toBeInTheDocument();
    expect(screen.getByText(/escuchando el audio entero/i)).toBeInTheDocument();
  });
});
