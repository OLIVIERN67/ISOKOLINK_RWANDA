import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ISOKOLINK RWANDA` : "ISOKOLINK RWANDA";
    return () => {
      document.title = previous;
    };
  }, [title]);
}
