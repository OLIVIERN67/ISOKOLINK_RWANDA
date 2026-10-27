import commonEn from "./en/common";
import publicEn from "./en/public";
import catalogEn from "./en/catalog";
import authEn from "./en/auth";
import buyerEn from "./en/buyer";
import sellerEn from "./en/seller";
import adminEn from "./en/admin";
import adminDataEn from "./en/adminData";

import commonRw from "./rw/common";
import publicRw from "./rw/public";
import catalogRw from "./rw/catalog";
import authRw from "./rw/auth";
import buyerRw from "./rw/buyer";
import sellerRw from "./rw/seller";
import adminRw from "./rw/admin";
import adminDataRw from "./rw/adminData";

import commonFr from "./fr/common";
import publicFr from "./fr/public";
import catalogFr from "./fr/catalog";
import authFr from "./fr/auth";
import buyerFr from "./fr/buyer";
import sellerFr from "./fr/seller";
import adminFr from "./fr/admin";
import adminDataFr from "./fr/adminData";

export type Language = "en" | "rw" | "fr";

export type Dictionary = Record<string, string>;

export const dictionaries: Record<Language, Dictionary> = {
  en: { ...commonEn, ...publicEn, ...catalogEn, ...authEn, ...buyerEn, ...sellerEn, ...adminEn, ...adminDataEn },
  rw: { ...commonRw, ...publicRw, ...catalogRw, ...authRw, ...buyerRw, ...sellerRw, ...adminRw, ...adminDataRw },
  fr: { ...commonFr, ...publicFr, ...catalogFr, ...authFr, ...buyerFr, ...sellerFr, ...adminFr, ...adminDataFr },
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  rw: "Kinyarwanda",
  fr: "Français",
};

export const LANGUAGE_LOCALES: Record<Language, string> = {
  en: "en-RW",
  rw: "rw-RW",
  fr: "fr-RW",
};

export const SUPPORTED_LANGUAGES: Language[] = ["en", "rw", "fr"];

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "rw" || value === "fr";
}

export function normalizeLanguage(value: string | null | undefined): Language {
  if (!value) return "en";
  const normalized = value.trim().toLowerCase().split(/[,;-]/)[0];
  if (normalized.startsWith("rw") || normalized === "kin") return "rw";
  if (normalized.startsWith("fr")) return "fr";
  return "en";
}

export function currentLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("isokolink.language");
  if (isLanguage(stored)) return stored;
  return normalizeLanguage(window.document.documentElement.lang);
}

export function translateCurrent(
  key: string,
  fallback?: string,
  params?: Record<string, string | number>,
): string {
  const language = currentLanguage();
  const template = dictionaries[language][key] ?? dictionaries.en[key] ?? fallback ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}
