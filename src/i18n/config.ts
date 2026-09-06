/**
 * Which languages exist, where each page lives in each of them, and how to get from a URL to a
 * language and back.
 *
 * English is the default and is served unprefixed, so `/` is English and `/es/` is Spanish. That
 * costs a little more than a client-side toggle and buys the things a toggle cannot: a real `lang`
 * attribute for screen readers, a URL a reader can send to someone, both languages in a search
 * index instead of one, and no flash of the wrong language before hydration.
 */

export const languages = {
  en: { name: "English", short: "EN", htmlLang: "en", ogLocale: "en_US" },
  es: { name: "Español", short: "ES", htmlLang: "es", ogLocale: "es_ES" },
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = "en";
export const langCodes = Object.keys(languages) as Lang[];

/**
 * Every page, by the path it takes in each language.
 *
 * Trailing slashes throughout, because that is the shape Astro builds and serves: writing them
 * without one here would make every internal link and every hreflang take a redirect to reach the
 * page the canonical URL already names.
 *
 * Spanish keeps Spanish slugs rather than living at a translated-prefix version of the English
 * ones: `/es/como-funciona` is what a Spanish reader would expect and what the site already used.
 * The cost is that a path cannot be translated by string surgery, which is exactly what this table
 * is for -- the language switcher and the hreflang tags both read it, so neither can drift from
 * the routes that actually exist.
 */
export const routes = {
  home: { en: "/", es: "/es/" },
  howItWorks: { en: "/how-it-works/", es: "/es/como-funciona/" },
  privacy: { en: "/privacy/", es: "/es/privacidad/" },
} as const satisfies Record<string, Record<Lang, string>>;

export type RouteKey = keyof typeof routes;

/** The language a path is served in. Anything unprefixed is the default one. */
export function getLangFromPath(pathname: string): Lang {
  const [, first] = pathname.split("/");
  return langCodes.includes(first as Lang) ? (first as Lang) : defaultLang;
}

/** Which page a path is, or null for one that has no counterpart to switch to (404). */
export function getRouteKeyFromPath(pathname: string): RouteKey | null {
  const normalized = withTrailingSlash(pathname);
  for (const key of Object.keys(routes) as RouteKey[]) {
    for (const lang of langCodes) {
      if (withTrailingSlash(routes[key][lang]) === normalized) {
        return key;
      }
    }
  }
  return null;
}

/**
 * The same page in another language, falling back to that language's home page when the current
 * one has no counterpart -- a 404 still has to offer a way across rather than a dead switch.
 */
export function translatePath(pathname: string, to: Lang): string {
  const key = getRouteKeyFromPath(pathname);
  return key ? routes[key][to] : routes.home[to];
}

/** Astro emits directory-style URLs, so `/privacy` and `/privacy/` are the same page. */
function withTrailingSlash(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}
