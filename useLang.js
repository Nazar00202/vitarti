import { useContext } from "react";
import { LangContext } from "./LangContext";

export const useLang = () => useContext(LangContext);
