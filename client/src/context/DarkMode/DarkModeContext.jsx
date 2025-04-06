import { createContext, useContext } from "react";

export const DarkModeContext = createContext();
export const useDarkMode = () => useContext(DarkModeContext);