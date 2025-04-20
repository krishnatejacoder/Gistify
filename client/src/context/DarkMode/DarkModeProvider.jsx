import { useState, useEffect } from "react";
import { DarkModeContext } from "./DarkModeContext";

export function DarkModeProvider({children}){
    const [isDarkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem("darkModeChoiceGistify")) || false);

    useEffect(() => {
        localStorage.setItem("darkModeChoiceGistify", JSON.stringify(isDarkMode));
        document.body.style.backgroundColor = isDarkMode ? "rgba(20,20,20)" : "#FFFFFF";
        // document.body.style.color = isDarkMode ? "white" : "black";
    }, [isDarkMode]);

    return (
        <DarkModeContext.Provider value = {{isDarkMode, setDarkMode}}>
            {children}
        </DarkModeContext.Provider>
    );
}