import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import tr from "./tr.json";
import { normalizeAppLocale, SUPPORTED_LOCALES } from "./locale";

function getInitialLocale() {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const savedSettings = localStorage.getItem("cvbuilder-settings");
    const locale = savedSettings ? JSON.parse(savedSettings)?.state?.locale : undefined;
    return normalizeAppLocale(locale);
  } catch {
    return "en";
  }
}

const initialLocale = getInitialLocale();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: initialLocale,
  fallbackLng: "en",
  supportedLngs: SUPPORTED_LOCALES,
  load: "languageOnly",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
