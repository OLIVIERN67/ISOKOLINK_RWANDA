import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "en" | "rw" | "fr";

interface Dictionary {
  [key: string]: string;
}

const dictionaries: Record<Language, Dictionary> = {
  en: {
    "nav.home": "Home",
    "nav.products": "Products",
    "nav.prices": "Food prices",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.faq": "FAQ",
    "nav.dashboard": "Dashboard",
    "nav.seller": "Seller dashboard",
    "nav.admin": "Administration",
    "common.signIn": "Sign in",
    "common.register": "Create account",
    "common.logout": "Sign out",
    "common.search": "Search",
    "common.loading": "Loading…",
    "common.retry": "Try again",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.viewAll": "View all",
    "common.language": "Language",
    "footer.tagline": "Connecting Rwandan food producers, sellers, and buyers through transparent, verified market information.",
    "footer.explore": "Explore",
    "footer.account": "Account",
    "footer.legal": "Legal",
    "footer.rights": "All rights reserved.",
  },
  rw: {
    "nav.home": "Ahabanza",
    "nav.products": "Ibicuruzwa",
    "nav.prices": "Ibiciro by'ibiribwa",
    "nav.about": "Abo turi bo",
    "nav.contact": "Twandikire",
    "nav.faq": "Ibibazo bikunze kubazwa",
    "nav.dashboard": "Ikibaho",
    "nav.seller": "Ikibaho cy'umucuruzi",
    "nav.admin": "Ubuyobozi",
    "common.signIn": "Injira",
    "common.register": "Fungura konti",
    "common.logout": "Sohoka",
    "common.search": "Shakisha",
    "common.loading": "Biratunganywa…",
    "common.retry": "Ongera ugerageze",
    "common.save": "Bika",
    "common.cancel": "Hagarika",
    "common.viewAll": "Reba byose",
    "common.language": "Ururimi",
    "footer.tagline": "Duhuza abahinzi, abacuruzi n'abaguzi b'ibiribwa mu Rwanda hifashishijwe amakuru yizewe y'isoko.",
    "footer.explore": "Shakisha",
    "footer.account": "Konti",
    "footer.legal": "Amategeko",
    "footer.rights": "Uburenganzira bwose burafitwe.",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.products": "Produits",
    "nav.prices": "Prix alimentaires",
    "nav.about": "À propos",
    "nav.contact": "Contact",
    "nav.faq": "FAQ",
    "nav.dashboard": "Tableau de bord",
    "nav.seller": "Espace vendeur",
    "nav.admin": "Administration",
    "common.signIn": "Se connecter",
    "common.register": "Créer un compte",
    "common.logout": "Se déconnecter",
    "common.search": "Rechercher",
    "common.loading": "Chargement…",
    "common.retry": "Réessayer",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.viewAll": "Voir tout",
    "common.language": "Langue",
    "footer.tagline": "Relier les producteurs, vendeurs et acheteurs rwandais grâce à des informations de marché transparentes et vérifiées.",
    "footer.explore": "Explorer",
    "footer.account": "Compte",
    "footer.legal": "Mentions légales",
    "footer.rights": "Tous droits réservés.",
  },
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  rw: "Kinyarwanda",
  fr: "Français",
};

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);
const STORAGE_KEY = "isokolink.language";

function readInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "rw" || stored === "fr") return stored;
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((next: Language) => setLanguageState(next), []);

  const t = useCallback(
    (key: string, fallback?: string) => dictionaries[language][key] ?? dictionaries.en[key] ?? fallback ?? key,
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider.");
  return context;
}
