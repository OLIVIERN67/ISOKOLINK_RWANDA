import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LANGUAGE_LABELS,
  LANGUAGE_LOCALES,
  dictionaries,
  isLanguage,
  normalizeLanguage,
  type Language,
} from "../i18n";
import { setFormatLocale } from "../utils/format";

export { LANGUAGE_LABELS, type Language };

export type TranslationParams = Record<string, string | number>;

interface I18nContextValue {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: TranslationParams | string, fallback?: string) => string;
  tp: (key: string, count: number, params?: TranslationParams) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);
const STORAGE_KEY = "isokolink.language";

export function readStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLanguage(stored)) return stored;
  const browserLanguage = window.navigator.languages?.[0] ?? window.navigator.language;
  return normalizeLanguage(browserLanguage);
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
  );
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(STORAGE_KEY, language);
    setFormatLocale(LANGUAGE_LOCALES[language]);
  }, [language]);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);

  const t = useCallback(
    (key: string, params?: TranslationParams | string, fallback?: string) => {
      const parameters = typeof params === "object" ? params : undefined;
      const fallbackText = typeof params === "string" ? params : fallback;
      const current = dictionaries[language];
      const english = dictionaries.en;

      let template: string | undefined;
      if (parameters && typeof parameters.count === "number") {
        const pluralKey = `${key}.${parameters.count === 1 ? "one" : "other"}`;
        template = current[pluralKey] ?? english[pluralKey];
      }
      template = template ?? current[key] ?? english[key] ?? fallbackText ?? key;
      return interpolate(template, parameters);
    },
    [language],
  );

  const tp = useCallback(
    (key: string, count: number, params?: TranslationParams) =>
      t(key, { ...params, count }),
    [t],
  );

  const value = useMemo(
    () => ({ language, locale: LANGUAGE_LOCALES[language], setLanguage, t, tp }),
    [language, setLanguage, t, tp],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider.");
  return context;
}
