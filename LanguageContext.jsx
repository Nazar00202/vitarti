import { useState } from "react";
import { translations } from "./i18n";
import { LangContext } from "./LangContext";

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState("ua");

  const t = (key) => translations[lang][key] || key;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
};
